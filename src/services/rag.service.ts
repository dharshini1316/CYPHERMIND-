import { GoogleGenerativeAI } from '../utils/gemini';
import { z } from 'zod';
import { env } from '../config/env';
import { vectorSearchService, SearchResult } from './vector-search.service';
import { scrubberService } from './scrubber.service';
import { guardianService } from './guardian.service';
// import { analystService } from './analyst.service';
// import { remediationService } from './remediation.service';
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
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Process a user query through the RAG pipeline
   * @param prompt - User's question
   * @param user - User token payload with clearance level
   * @returns RAG response with answer, sources, and metadata
   */
  async query(prompt: string, user: TokenPayload): Promise<RAGResponse> {
    const startTime = Date.now();
    console.log(`[RAG] 🟢 Starting query orchestration for user: ${user.user_id}`);

    try {
      console.log('[RAG] Step 1: Guardian analysis starting...');
      const guardianResult = await guardianService.analyzePrompt(
        prompt,
        user.clearance_level,
        user.user_id
      );
      console.log('[RAG] Step 1: Guardian analysis complete. Approved:', guardianResult.approved);

      if (!guardianResult.approved) {
        const error: any = new Error(guardianResult.reason || 'Security violation detected');
        error.status = 403;
        error.code = 'SECURITY_VIOLATION';
        throw error;
      }

      // Step 2: Retrieve relevant chunks with clearance filtering
      console.log('[RAG] Step 2: Vector Search starting...');
      const chunks = await vectorSearchService.search(
        prompt,
        user.clearance_level,
        5
      );
      console.log(`[RAG] Step 2: Vector Search complete. Found ${chunks.length} chunks.`);

      if (chunks.length === 0) {
        console.log('[RAG] ⚠️ No chunks found. Ending early.');
        return {
          answer: 'I could not find any relevant information to answer your question.',
          sources: [],
          redactions_count: 0,
          processing_time_ms: Date.now() - startTime,
        };
      }

      // Step 3: Redact PII from chunks
      console.log('[RAG] Step 3: Semantic Redaction starting...');
      const redactionResult = await scrubberService.redact(
        chunks.map((c: SearchResult) => c.content),
        user.user_id
      );
      console.log(`[RAG] Step 3: Semantic Redaction complete. Redactions: ${redactionResult.redactions_count}`);

      // Step 4: Build context and call Gemini
      console.log('[RAG] Step 4: Neural Synthesis starting...');
      const context = redactionResult.redacted_chunks.join('\n\n');
      const ragPrompt = this.buildRAGPrompt(context, prompt);

      const result = await this.model.generateContent(ragPrompt);
      const answer = result.response.text();
      console.log(`[RAG] Step 4: Neural Synthesis complete. Length: ${answer.length}`);

      // Step 5: Validate response with Zod
      const validated = RAGResponseSchema.parse({ answer });

      // Extract sources
      const sources: DocumentReference[] = chunks.map((chunk: SearchResult, index: number) => ({
        document_id: chunk.doc_id,
        chunk_index: index,
        relevance_score: chunk.score || 0,
      }));

      // Step 6: Final Redaction pass on the generated answer
      console.log('[RAG] Step 6: Final Redaction starting...');
      const finalRedaction = await scrubberService.redact([validated.answer], user.user_id);
      const redactedAnswer = finalRedaction.redacted_chunks[0];
      const totalRedactions = redactionResult.redactions_count + finalRedaction.redactions_count;

      console.log(`[RAG] ✅ Query successful. Total time: ${Date.now() - startTime}ms`);

      return {
        answer: redactedAnswer,
        sources,
        redactions_count: totalRedactions,
        processing_time_ms: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error('[RAG] ❌ Query failed at some step:', error);
      if (error.stack) console.error(error.stack);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw error; // Throw original error to preserve status codes if any
    }
  }

  /**
   * Build RAG prompt template
   * @param context - Redacted document chunks
   * @param question - User's question
   * @returns Formatted prompt for Gemini
   */
  private buildRAGPrompt(context: string, question: string): string {
    return `
Task: Answer the user question based ONLY on the provided context.
Input: { "context": "${context}", "question": "${question}" }
Output: A concise, direct answer. 
Constraints: If the answer isn't in context, say "Information not found". Acknowledge [REDACTED_*] placeholders.`;
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
