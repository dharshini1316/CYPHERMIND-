import { connectDatabase, disconnectDatabase } from '../config/database';
import { vectorSearchService } from '../services/vector-search.service';

const documents = [
  {
    doc_id: 'doc_001',
    title: 'Company Overview',
    content: 'CypherMind is a leading cybersecurity company specializing in threat intelligence and security operations. Founded in 2020, we serve enterprise clients worldwide.',
    clearance_level: 1,
    tags: ['public', 'company-info']
  },
  {
    doc_id: 'doc_002',
    title: 'Product Catalog',
    content: 'Our main products include: CypherShield (endpoint protection), CypherWatch (SIEM solution), and CypherGuard (threat intelligence platform).',
    clearance_level: 1,
    tags: ['public', 'products']
  },
  {
    doc_id: 'doc_003',
    title: 'Contact Information',
    content: 'For inquiries, contact us at info@cyphermind.com or call +1-555-CYBER-01. Our headquarters is located in San Francisco, CA.',
    clearance_level: 1,
    tags: ['public', 'contact']
  },
  {
    doc_id: 'doc_004',
    title: 'Internal Security Policy',
    content: 'All employees must use MFA for system access. Password rotation is required every 90 days. VPN access is mandatory for remote work.',
    clearance_level: 2,
    tags: ['internal', 'policy']
  },
  {
    doc_id: 'doc_005',
    title: 'Q4 Revenue Report',
    content: 'Q4 2023 revenue reached $12.5M, a 23% increase from Q3. Enterprise contracts grew by 15%. Customer retention rate: 94%.',
    clearance_level: 2,
    tags: ['internal', 'financial']
  },
  {
    doc_id: 'doc_006',
    title: 'Employee Directory',
    content: 'Engineering team contacts: John Smith (john.smith@cyphermind.com, 555-123-4567), Sarah Johnson (sarah.j@cyphermind.com, 555-234-5678).',
    clearance_level: 2,
    tags: ['internal', 'hr', 'pii']
  },
  {
    doc_id: 'doc_007',
    title: 'Incident Response Plan',
    content: 'In case of security breach: 1) Isolate affected systems, 2) Contact security@cyphermind.com, 3) Preserve logs, 4) Initiate forensics.',
    clearance_level: 2,
    tags: ['internal', 'security']
  },
  {
    doc_id: 'doc_008',
    title: 'Classified Project Alpha',
    content: 'Project Alpha involves development of next-gen AI-powered threat detection. Budget: $5M. Expected launch: Q2 2024. Team lead: Dr. Emily Chen.',
    clearance_level: 3,
    tags: ['confidential', 'project']
  },
  {
    doc_id: 'doc_009',
    title: 'Executive Compensation',
    content: 'CEO base salary: $450K. CTO: $380K. CFO: $360K. Annual bonuses range from 20-40% based on performance metrics.',
    clearance_level: 3,
    tags: ['confidential', 'hr', 'pii']
  },
  {
    doc_id: 'doc_010',
    title: 'M&A Strategy',
    content: 'Confidential: Evaluating acquisition of ThreatScope Inc. for $25M. Due diligence in progress. Target close date: March 2024.',
    clearance_level: 3,
    tags: ['confidential', 'business']
  },
  {
    doc_id: 'doc_011',
    title: 'Customer Database Credentials',
    content: 'Production DB: prod-db.cyphermind.internal, Port: 5432. Admin user: db_admin. Backup schedule: Daily at 2 AM UTC.',
    clearance_level: 3,
    tags: ['confidential', 'infrastructure']
  },
  {
    doc_id: 'doc_012',
    title: 'Vulnerability Research',
    content: 'Discovered zero-day in popular firewall software. CVE pending. Vendor notified. Exploit code stored in secure vault. Public disclosure: 90 days.',
    clearance_level: 3,
    tags: ['confidential', 'research']
  }
];

async function seedPinecone() {
  try {
    console.log('🚀 Starting Pinecone seeding process...\n');

    // Connect to MongoDB (to store metadata)
    await connectDatabase();
    console.log('✅ Connected to MongoDB\n');

    console.log('📄 Seeding 12 documents to Pinecone...');
    console.log('⏳ Generating embeddings with OpenAI (2048 dimensions)...\n');

    let successCount = 0;

    for (const doc of documents) {
      try {
        // Index in Pinecone
        await vectorSearchService.indexDocument(doc);
        
        console.log(`✅ Indexed ${doc.doc_id}: ${doc.title}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to index ${doc.doc_id}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log(`\n📊 Successfully indexed ${successCount}/${documents.length} documents in Pinecone`);
    
    console.log('\n📊 Document Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Clearance Level 1 (Public): 3 documents');
    console.log('Clearance Level 2 (Internal): 4 documents');
    console.log('Clearance Level 3 (Confidential): 5 documents');
    console.log(`Total: ${successCount} documents indexed`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n💡 Note: Documents contain PII for testing the Scrubber:');
    console.log('  - Email addresses (security@cyphermind.com)');
    console.log('  - Phone numbers (555-123-4567)');
    console.log('  - Names (John Smith, Sarah Johnson)');
    console.log('  - Salary information');

    console.log('\n✅ Pinecone seeding complete!');
    console.log('🎉 Vector search is now ready!\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    console.log('✅ Done!\n');
    process.exit(0);
  }
}

seedPinecone();
