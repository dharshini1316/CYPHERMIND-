require('dotenv').config();
const { MongoClient } = require('mongodb');

async function resetUsers() {
  const uri = 'mongodb://CypherMind:5DQJMYCXtnorUGGp@ac-8iy7xp9-shard-00-01.pitogjd.mongodb.net:27017/cyphermind?authSource=admin&tls=true&directConnection=true';

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    const result = await db.collection('users').deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} users\n`);
    
    console.log('✅ Done! Now run: npm run seed:users');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

resetUsers();
