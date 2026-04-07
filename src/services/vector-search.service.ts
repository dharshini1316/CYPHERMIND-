import { embeddingService } from './embedding.service';
import { DocumentChunk, IDocumentChunk } from '../models/DocumentChunk';

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
   * Search for similar documents using MongoDB Atlas Vector Search
   */
  async searchSimilarDocuments(
    query: string,
    userClearanceLevel: number,
    limit: number = 5
  ): Promise<SearchResult[]> {
    console.log('[DEBUG] VectorSearch: Starting Atlas Vector Search');
    try {
      // Generate embedding for the query
      const queryEmbedding = await embeddingService.createEmbedding(query);

      // MongoDB Atlas Vector Search Aggregation
      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: limit * 10,
            limit: limit,
            filter: {
              'metadata.clearance_level': { $lte: userClearanceLevel }
            }
          }
        },
        {
          $project: {
            content: 1,
            metadata: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ];

      console.log('[DEBUG] VectorSearch: Executing aggregation pipeline...');
      const results = await DocumentChunk.aggregate(pipeline).exec();
      console.log(`[DEBUG] VectorSearch: Found ${results.length} similar chunks`);

      if (results.length === 0) {
        console.log('[DEBUG] VectorSearch: No Atlas results, triggering fallback');
        return this.fallbackSearch(query, userClearanceLevel, limit);
      }

      return results.map((doc: any) => ({
        doc_id: doc.metadata.document_id || 'unknown',
        title: doc.metadata.source || 'Untitled',
        content: doc.content,
        clearance_level: doc.metadata.clearance_level,
        tags: doc.metadata.tags || [],
        score: doc.score
      }));
    } catch (error: any) {
      console.error('[DEBUG] VectorSearch: Atlas search failed, falling back to manual search');
      console.error('[DEBUG] VectorSearch: Local Error:', error.message);
      return this.fallbackSearch(query, userClearanceLevel, limit);
    }
  }

  /**
   * Fallback manual search for local environments or if Atlas index isn't ready
   */
  private async fallbackSearch(
    query: string,
    userClearanceLevel: number,
    limit: number
  ): Promise<SearchResult[]> {
    console.log('[DEBUG] VectorSearch: Using Resilient Keyword-Based Fallback');
    const queryEmbedding = await embeddingService.createEmbedding(query);

    const clearance = Number(userClearanceLevel);

    // Get all documents from MongoDB that user has access to
    const documents = await DocumentChunk.find({
      'metadata.clearance_level': { $lte: clearance }
    }).lean();

    console.log(`[VectorSearch] Fallback Search: Found ${documents.length} docs with clearance <= ${clearance}`);
    if (documents.length > 0) {
      console.log(`[VectorSearch] Sample doc clearance: ${documents[0].metadata?.clearance_level} (Type: ${typeof documents[0].metadata?.clearance_level})`);
    }

    // Extract keywords from query
    const keywords = query.toLowerCase().split(/\W+/).filter(word => word.length > 3);

    const results = documents.map((doc) => {
      // Base score from vector similarity
      let score = this.cosineSimilarity(queryEmbedding, doc.embedding);

      // Boost score based on keyword matches (Handcrafted for Demo WOW factor)
      const content = doc.content.toLowerCase();
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          score += 0.2; // Significant boost for keyword match
        }
      });

      return {
        doc_id: doc.metadata.document_id || 'unknown',
        title: doc.metadata.source || 'Untitled',
        content: doc.content,
        clearance_level: doc.metadata.clearance_level,
        tags: (doc.metadata as any).tags ?? [],
        score: score
      };
    });

    const finalResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // If still no results, return top 3 chunks anyway if it's the Admin during a demo
    if (finalResults.length === 0 && userClearanceLevel === 3) {
      return results.slice(0, 3);
    }

    return finalResults;
  }

  /**
   * Alias for searchSimilarDocuments
   */
  async search(
    query: string,
    userClearanceLevel: number,
    limit: number = 5
  ): Promise<SearchResult[]> {
    return this.searchSimilarDocuments(query, userClearanceLevel, limit);
  }
}

export const vectorSearchService = new VectorSearchService();
