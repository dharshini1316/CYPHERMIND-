import { connectDatabase } from '../config/database';
import { DocumentChunk } from '../models/DocumentChunk';
import { embeddingService } from '../services/embedding.service';

/**
 * Sample documents for testing
 * Includes documents with various clearance levels and some with PII
 */
const sampleDocuments = [
  // Clearance Level 1 - Public information
  {
    content: 'CypherMIND is a Zero-Trust AI Governance Engine that enforces identity-linked access control and semantic redaction of PII.',
    clearance_level: 1,
    document_id: 'doc_001',
    source: 'public_docs',
  },
  {
    content: 'The system uses MongoDB Atlas with Vector Search for semantic retrieval and Google Gemini for AI-powered security analysis.',
    clearance_level: 1,
    document_id: 'doc_002',
    source: 'public_docs',
  },
  {
    content: 'Security policies require all users to authenticate with JWT tokens and maintain least privilege access based on clearance levels.',
    clearance_level: 1,
    document_id: 'doc_003',
    source: 'security_policies',
  },
  
  // Clearance Level 2 - Internal information
  {
    content: 'The Guardian semantic firewall uses dual-layer detection: regex patterns for known attacks and Gemini for semantic threat analysis with confidence scoring.',
    clearance_level: 2,
    document_id: 'doc_004',
    source: 'internal_docs',
  },
  {
    content: 'The Scrubber performs dual-pass PII redaction: Pass 1 uses regex for emails, SSNs, phone numbers, and credit cards. Pass 2 uses Gemini for contextual PII like names and addresses.',
    clearance_level: 2,
    document_id: 'doc_005',
    source: 'internal_docs',
  },
  {
    content: 'Rate limiting is configured with three tiers: auth routes at 5 requests per minute, query routes at 30 per minute, and global fallback at 100 per minute.',
    clearance_level: 2,
    document_id: 'doc_006',
    source: 'internal_docs',
  },
  {
    content: 'Contact the security team at security@cyphermind.com for any security concerns. The team lead is John Smith, reachable at 555-123-4567.',
    clearance_level: 2,
    document_id: 'doc_007',
    source: 'internal_contacts',
  },
  
  // Clearance Level 3 - Confidential information
  {
    content: 'The MongoDB connection string uses Atlas cluster with automatic retry logic. Database credentials are rotated every 90 days.',
    clearance_level: 3,
    document_id: 'doc_008',
    source: 'admin_docs',
  },
  {
    content: 'Admin access requires clearance level 3. The SOC Dashboard provides real-time security monitoring via WebSocket connections on port 3000.',
    clearance_level: 3,
    document_id: 'doc_009',
    source: 'admin_docs',
  },
  {
    content: 'Incident response protocol: Contact Sarah Johnson at sarah.johnson@cyphermind.com or 555-987-6543. Escalate to CEO if breach detected.',
    clearance_level: 3,
    document_id: 'doc_010',
    source: 'incident_response',
  },
  {
    content: 'The Gemini API key is stored in environment variables. Current monthly usage is approximately $500 with 1M tokens processed.',
    clearance_level: 3,
    document_id: 'doc_011',
    source: 'admin_docs',
  },
  {
    content: 'Employee salary information: Junior employees earn $60,000-$80,000. Standard employees earn $80,000-$120,000. Admins earn $120,000-$180,000.',
    clearance_level: 3,
    document_id: 'doc_012',
    source: 'hr_confidential',
  },
];

/**
 * Seed documents with embeddings
 */
async function seedDocuments() {
  try {
    console.log('🌱 Seeding documents...');

    // Check if documents already exist
    const existingDocs = await DocumentChunk.countDocuments();
    if (existingDocs > 0) {
      console.log(`⚠️  Found ${existingDocs} existing documents. Skipping document creation.`);
      console.log('💡 To recreate documents, delete them from MongoDB first.');
      return;
    }

    console.log(`📄 Creating ${sampleDocuments.length} documents with embeddings...`);
    console.log('⏳ This may take a minute (generating embeddings with Gemini)...\n');

    let created = 0;
    for (const doc of sampleDocuments) {
      try {
        // Generate embedding
        const embedding = await embeddingService.createEmbedding(doc.content);

        // Create document chunk
        await DocumentChunk.create({
          content: doc.content,
          embedding,
          metadata: {
            clearance_level: doc.clearance_level,
            document_id: doc.document_id,
            source: doc.source,
            chunk_index: 0,
            created_at: new Date(),
          },
        });

        created++;
        console.log(`✅ [${created}/${sampleDocuments.length}] Created: ${doc.document_id} (clearance ${doc.clearance_level})`);
      } catch (error) {
        console.error(`❌ Failed to create ${doc.document_id}:`, error);
      }
    }

    console.log('\n📊 Document Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const level1 = sampleDocuments.filter(d => d.clearance_level === 1).length;
    const level2 = sampleDocuments.filter(d => d.clearance_level === 2).length;
    const level3 = sampleDocuments.filter(d => d.clearance_level === 3).length;
    console.log(`Clearance Level 1 (Public): ${level1} documents`);
    console.log(`Clearance Level 2 (Internal): ${level2} documents`);
    console.log(`Clearance Level 3 (Confidential): ${level3} documents`);
    console.log(`Total: ${created} documents created`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Note: Some documents contain PII for testing the Scrubber:');
    console.log('  - Email addresses (security@cyphermind.com)');
    console.log('  - Phone numbers (555-123-4567)');
    console.log('  - Names (John Smith, Sarah Johnson)');
    console.log('  - Salary information\n');

    console.log('✅ Document seeding complete!');
    console.log('⚠️  Remember to create the vector search index in MongoDB Atlas!');
    console.log('   See: src/scripts/create-vector-index.ts for instructions\n');
  } catch (error) {
    console.error('❌ Failed to seed documents:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  connectDatabase()
    .then(() => seedDocuments())
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { seedDocuments };
