import mongoose from 'mongoose';
import { env } from '../config/env';

/**
 * Script to create MongoDB Atlas Vector Search index
 * 
 * This script creates a vector search index on the document_chunks collection
 * with support for clearance-based filtering.
 * 
 * Run this script once after setting up MongoDB Atlas:
 * npx ts-node src/scripts/create-vector-index.ts
 */

const VECTOR_INDEX_DEFINITION = {
  name: 'vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 3072,
        similarity: 'cosine',
      },
      {
        type: 'filter',
        path: 'metadata.clearance_level',
      },
      {
        type: 'filter',
        path: 'metadata.document_id',
      },
    ],
  },
};

async function createVectorIndex() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB Atlas');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('document_chunks');

    console.log('📊 Creating vector search index...');
    console.log('Index definition:', JSON.stringify(VECTOR_INDEX_DEFINITION, null, 2));

    // Note: Vector search indexes are created through MongoDB Atlas UI or Atlas CLI
    // This script provides the index definition for reference
    console.log('\n⚠️  IMPORTANT: Vector search indexes must be created through MongoDB Atlas UI');
    console.log('\nSteps to create the index:');
    console.log('1. Go to MongoDB Atlas → Your Cluster → Search');
    console.log('2. Click "Create Search Index"');
    console.log('3. Select "JSON Editor"');
    console.log('4. Use the following index definition:\n');
    console.log(JSON.stringify(VECTOR_INDEX_DEFINITION, null, 2));
    console.log('\n5. Select database:', env.MONGODB_DB_NAME);
    console.log('6. Select collection: document_chunks');
    console.log('7. Click "Create Search Index"');

    // Check if collection exists
    const collections = await db.listCollections({ name: 'document_chunks' }).toArray();

    if (collections.length === 0) {
      console.log('\n⚠️  Collection "document_chunks" does not exist yet');
      console.log('It will be created automatically when you insert the first document');
    } else {
      console.log('\n✅ Collection "document_chunks" exists');

      // Get collection stats via db command (collection.stats() removed in newer driver)
      const stats = await db.command({ collStats: 'document_chunks' });
      console.log(`📊 Documents in collection: ${stats.count}`);
    }

    console.log('\n✅ Vector index setup instructions provided');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
createVectorIndex();
