const { MongoClient } = require('mongodb');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Try each server individually until we find the primary
const servers = [
  'ac-8iy7xp9-shard-00-00.pitogjd.mongodb.net:27017',
  'ac-8iy7xp9-shard-00-01.pitogjd.mongodb.net:27017',
  'ac-8iy7xp9-shard-00-02.pitogjd.mongodb.net:27017'
];

async function generateEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

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

async function seedDocuments() {
  let client;
  let connected = false;
  
  // Try each server
  for (const server of servers) {
    try {
      const uri = `mongodb://CypherMind:QYVDvKpxApZIG86v@${server}/cyphermind?ssl=true&authSource=admin&directConnection=true`;
      console.log(`\n🔄 Trying server: ${server}`);
      
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      
      await client.connect();
      
      // Test if this is the primary by trying a write
      const db = client.db('cyphermind');
      const testCollection = db.collection('_connection_test');
      await testCollection.insertOne({ test: true, timestamp: new Date() });
      await testCollection.deleteOne({ test: true });
      
      console.log(`✅ Connected to PRIMARY: ${server}`);
      connected = true;
      
      // Now seed the documents
      const collection = db.collection('document_chunks');
      
      console.log('\n🌱 Seeding documents with embeddings...');
      console.log('⏳ This may take a minute (generating embeddings with Gemini)...\n');
      
      let successCount = 0;
      
      for (const doc of documents) {
        try {
          const embedding = await generateEmbedding(doc.content);
          
          await collection.insertOne({
            ...doc,
            embedding: embedding,
            metadata: {
              clearance_level: doc.clearance_level,
              tags: doc.tags,
              created_at: new Date()
            },
            created_at: new Date(),
            updated_at: new Date()
          });
          
          console.log(`✅ Created ${doc.doc_id}: ${doc.title}`);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to create ${doc.doc_id}:`, error.message);
        }
      }
      
      console.log(`\n📊 Successfully created ${successCount}/${documents.length} documents`);
      console.log('\n✅ Document seeding complete!');
      console.log('⚠️  Remember to create the vector search index in MongoDB Atlas!');
      
      break;
    } catch (error) {
      console.log(`❌ Server ${server} failed: ${error.message}`);
      if (client) {
        await client.close();
      }
    }
  }
  
  if (!connected) {
    console.error('\n❌ Could not connect to any MongoDB server');
    process.exit(1);
  }
  
  if (client) {
    await client.close();
  }
}

seedDocuments().catch(console.error);
