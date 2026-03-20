import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '../config/env';
import { vectorSearchService } from './vector-search.service';
import { scrubberService } from './scrubber.service';
import { guardianService } from './guardian.service';
import { AuditLog } from '../models/AuditLog';

/**
 * Document reference in RAG response
 */
export interface DocumentReference {
  document_id: string;
  chunk_index: number;
  relevance_score: number;
}

/**
 * RAG response interface
 */
export interface RAGResponse {
  answer: string;
  sources: DocumentReference[];
  redactions_count: number;
  processing_time_ms: number;
}

/**
 * User token payload
 */
export interface TokenPayload {
  user_id: string;
  clearance_level: number;
  role: string;
}

/**
 * Zod schema for validating Gemini response
 */
const RAGResponseSchema = z.object({
  answer: z.string().min(1, 'Answer cannot be empty'),
});

/**
 * RAG Pipeline Service
 * Orchestrates the complete RAG workflow:
 * 1. Guardian analyzes prompt for threats
 * 2. Vector search retrieves relevant documents (clearance-filtered)
 * 3. Scrubber redacts PII from chunks
 * 4. Gemini generates answer from redacted context
 * 5. Zod validates response
 */
export class RAGService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  }

  /**
   * Process a user query through the RAG pipeline
   * @param prompt - User's question
   * @param user - User token payload with clearance level
   * @returns RAG response with answer, sources, and metadata
   */
  async query(prompt: string, user: TokenPayload): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Guardian analyzes prompt for threats
      const guardianResult = await guardianService.analyzePrompt(
        prompt,
        user.clearance_level,
        user.user_id
      );

      if (!guardianResult.approved) {
        throw new Error(`Security violation: ${guardianResult.reason}`);
      }

      // Step 2: Retrieve relevant chunks with clearance filtering
      const chunks = await vectorSearchService.search(
        prompt,
        user.clearance_level,
        5 // Retrieve top 5 chunks
      );

      if (chunks.length === 0) {
        // Log search with no results
        await this.logAudit(user.user_id, 'rag_query', 'no_results', {
          prompt: prompt.substring(0, 100),
          clearance_level: user.clearance_level,
        });

        return {
          answer: 'I could not find any relevant information to answer your question. This might be because the information is not available in the knowledge base or is above your clearance level.',
          sources: [],
          redactions_count: 0,
          processing_time_ms: Date.now() - startTime,
        };
      }

      // Step 3: Redact PII from chunks
      const redactionResult = await scrubberService.redact(
        chunks.map(c => c.document.content),
        user.user_id
      );

      // Step 4: Build context and call Gemini
      const context = redactionResult.redacted_chunks.join('\n\n');
      const ragPrompt = this.buildRAGPrompt(context, prompt);

      const result = await this.model.generateContent(ragPrompt);
      const answer = result.response.text();

      // Step 5: Validate response with Zod
      const validated = RAGResponseSchema.parse({ answer });

      // Extract sources
      const sources: DocumentReference[] = chunks.map((chunk, index) => ({
        document_id: chunk.document.metadata.document_id,
        chunk_index: chunk.document.metadata.chunk_index,
        relevance_score: chunk.score || 0,
      }));

      // Log successful query
      await this.logAudit(user.user_id, 'rag_query', 'success', {
        prompt: prompt.substring(0, 100),
        clearance_level: user.clearance_level,
        chunks_retrieved: chunks.length,
        redactions_count: redactionResult.redactions_count,
        processing_time_ms: Date.now() - startTime,
      });

      return {
        answer: validated.answer,
        sources,
        redactions_count: redactionResult.redactions_count,
        processing_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      // Log failed query
      await this.logAudit(user.user_id, 'rag_query', 'failure', {
        prompt: prompt.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error('RAG query failed:', error);
      throw new Error(
        `Query processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build RAG prompt template
   * @param context - Redacted document chunks
   * @param question - User's question
   * @returns Formatted prompt for Gemini
   */
  private buildRAGPrompt(context: string, question: string): string {
    return `You are a helpful assistant with access to a knowledge base. Answer the user's question based ONLY on the provided context below.

IMPORTANT RULES:
1. Only use information from the context provided
2. If the context doesn't contain enough information to answer the question, say so clearly
3. Do not make up information or use external knowledge
4. Be concise and direct in your answer
5. If you see [REDACTED_*] placeholders, acknowledge that some information was redacted for privacy

Context:
${context}

User Question: ${question}

Answer:`;
  }

  /**
   * Log audit entry for RAG operations
   * @param userId - User ID
   * @param action - Action performed
   * @param result - Result of action
   * @param metadata - Additional metadata
   */
  private async logAudit(
    userId: string,
    action: string,
    result: 'success' | 'failure' | 'no_results',
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await AuditLog.create({
        action,
        user_id: userId,
        resource: 'rag_pipeline',
        result: result === 'success' || result === 'no_results' ? 'success' : 'failure',
        timestamp: new Date(),
        metadata,
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }
}

export const ragService = new RAGService();
