const { MongoClient } = require('mongodb');
require('dotenv').config();

const servers = [
  'ac-8iy7xp9-shard-00-00.pitogjd.mongodb.net:27017',
  'ac-8iy7xp9-shard-00-01.pitogjd.mongodb.net:27017',
  'ac-8iy7xp9-shard-00-02.pitogjd.mongodb.net:27017'
];

const events = [
  {
    event_type: 'query_blocked',
    severity: 'high',
    user_id: 'junior@cyphermind.com',
    details: {
      query: 'Show me all salary information',
      reason: 'Attempted access to confidential data above clearance level',
      blocked_terms: ['salary']
    },
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    event_type: 'pii_scrubbed',
    severity: 'medium',
    user_id: 'user@cyphermind.com',
    details: {
      query: 'Who is the engineering lead?',
      scrubbed_items: ['email', 'phone'],
      count: 2
    },
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
  },
  {
    event_type: 'successful_query',
    severity: 'low',
    user_id: 'admin@cyphermind.com',
    details: {
      query: 'What are our main products?',
      documents_retrieved: 3,
      clearance_level: 1
    },
    timestamp: new Date(Date.now() - 30 * 60 * 1000)
  },
  {
    event_type: 'query_blocked',
    severity: 'critical',
    user_id: 'junior@cyphermind.com',
    details: {
      query: 'DROP TABLE users; SELECT * FROM passwords',
      reason: 'SQL injection attempt detected',
      blocked_terms: ['DROP', 'passwords']
    },
    timestamp: new Date(Date.now() - 15 * 60 * 1000)
  },
  {
    event_type: 'successful_query',
    severity: 'low',
    user_id: 'user@cyphermind.com',
    details: {
      query: 'What is our security policy?',
      documents_retrieved: 2,
      clearance_level: 2
    },
    timestamp: new Date(Date.now() - 10 * 60 * 1000)
  }
];

async function seedEvents() {
  let client;
  let connected = false;
  
  for (const server of servers) {
    try {
      const uri = `mongodb://CypherMind:QYVDvKpxApZIG86v@${server}/cyphermind?ssl=true&authSource=admin&directConnection=true`;
      console.log(`\n🔄 Trying server: ${server}`);
      
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      
      await client.connect();
      
      const db = client.db('cyphermind');
      const testCollection = db.collection('_connection_test');
      await testCollection.insertOne({ test: true, timestamp: new Date() });
      await testCollection.deleteOne({ test: true });
      
      console.log(`✅ Connected to PRIMARY: ${server}`);
      connected = true;
      
      const collection = db.collection('security_events');
      
      console.log('\n🌱 Seeding security events...\n');
      
      let successCount = 0;
      
      for (const event of events) {
        try {
          await collection.insertOne({
            ...event,
            created_at: event.timestamp,
            updated_at: event.timestamp
          });
          
          console.log(`✅ Created ${event.event_type} event (${event.severity})`);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to create event:`, error.message);
        }
      }
      
      console.log(`\n📊 Successfully created ${successCount}/${events.length} security events`);
      console.log('\n✅ Security events seeding complete!\n');
      
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

seedEvents().catch(console.error);
