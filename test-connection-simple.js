const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
  // Try the simplest possible connection string
  const simpleUri = 'mongodb+srv://CypherMind:QYVDvKpxApZIG86v@dharshini.pitogjd.mongodb.net/cyphermind?retryWrites=true&w=majority';
  
  console.log('Testing MongoDB Atlas connection...');
  console.log('Using SRV connection string');
  
  const client = new MongoClient(simpleUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    const db = client.db('cyphermind');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await client.close();
  }
}

testConnection();
