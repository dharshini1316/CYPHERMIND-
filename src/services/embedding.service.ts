import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';

/**
 * Embedding service for generating vector embeddings using Google Gemini (FREE)
 */
export class EmbeddingService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  /**
   * Generate embedding vector for text using Gemini (3072 dimensions, FREE)
   * @param text - Text to generate embedding for
   * @returns 3072-dimensional embedding vector
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Generate embedding using Gemini - FREE API
      const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
      const result = await model.embedContent(text);
      const embedding = result.embedding.values;

      // Validate embedding dimensions (gemini-embedding-001 returns 3072 dimensions)
      if (embedding.length !== 3072) {
        throw new Error(`Invalid embedding dimension: expected 3072, got ${embedding.length}`);
      }

      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to generate embeddings for
   * @returns Array of 3072-dimensional embedding vectors
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await Promise.all(
        texts.map(text => this.createEmbedding(text))
      );
      return embeddings;
    } catch (error) {
      console.error('Failed to generate batch embeddings:', error);
      throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const embeddingService = new EmbeddingService();
