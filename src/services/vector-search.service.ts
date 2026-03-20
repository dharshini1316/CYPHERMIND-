import { embeddingService } from './embedding.service';
import DocumentChunk from '../models/DocumentChunk';

export interface SearchResult {
  doc_id: string;
  title: string;
  content: string;
  score: number;
  clearance_level: number;
  tags: string[];
}

class VectorSearchService {
  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Search for similar documents using vector similarity (MongoDB fallback)
   */
  async searchSimilarDocuments(
    query: string,
    userClearanceLevel: number,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query using Gemini (free)
      const queryEmbedding = await embeddingService.createEmbedding(query);

      // Get all documents from MongoDB that user has access to
      const documents = await DocumentChunk.find({
        'metadata.clearance_level': { $lte: userClearanceLevel }
      }).lean();

      // Calculate similarity scores
      const results = documents.map(doc => ({
        doc_id: doc.doc_id,
        title: doc.title,
        content: doc.content,
        clearance_level: doc.metadata.clearance_level,
        tags: doc.metadata.tags,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }));

      // Sort by score and return top results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Vector search failed:', error);
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const vectorSearchService = new VectorSearchService();
