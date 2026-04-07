require('dotenv').config();
const { MongoClient } = require('mongodb');

const servers = [
  'ac-8iy7xp9-shard-00-00.pitogjd.mongodb.net:27017',
  'ac-8iy7xp9-shard-00-01.pitogjd.mongodb.net:27017',
  'ac-8iy7xp9-shard-00-02.pitogjd.mongodb.net:27017'
];

const password = process.env.MONGODB_PASS;

async function findPrimary() {
  for (const server of servers) {
    const uri = `mongodb://CypherMind:${password}@${server}/cyphermind?authSource=admin&tls=true&directConnection=true`;
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    
    try {
      console.log(`\n🔄 Trying: ${server}`);
      await client.connect();
      const admin = client.db('admin');
      const status = await admin.command({ isMaster: 1 });
      
      if (status.ismaster || status.isWritablePrimary) {
        console.log(`✅ PRIMARY FOUND: ${server}`);
        console.log(`\nUpdate your .env with:`);
        console.log(`MONGODB_URI=mongodb://CypherMind:${password}@${server}/cyphermind?authSource=admin&tls=true&directConnection=true`);
        await client.close();
        return;
      } else {
        console.log(`❌ Not primary: ${server}`);
      }
      await client.close();
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

findPrimary();
