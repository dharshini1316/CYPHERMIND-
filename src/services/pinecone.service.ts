import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config/env';

class PineconeService {
  private client: Pinecone;
  private indexName: string;

  constructor() {
    this.client = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });
    this.indexName = config.pinecone.indexName;
  }

  async upsertVectors(vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, any>;
  }>) {
    const index = this.client.index(this.indexName);
    // Correct Pinecone v3 API format
    await index.upsert(vectors as any);
  }

  async queryVectors(
    queryVector: number[],
    topK: number = 5,
    filter?: Record<string, any>
  ) {
    const index = this.client.index(this.indexName);
    const results = await index.query({
      vector: queryVector,
      topK,
      filter,
      includeMetadata: true,
    });
    return results.matches || [];
  }

  async deleteVector(id: string) {
    const index = this.client.index(this.indexName);
    // Correct Pinecone v3 API format
    await index.deleteOne(id as any);
  }

  async describeIndex() {
    return await this.client.describeIndex(this.indexName);
  }
}

export const pineconeService = new PineconeService();
