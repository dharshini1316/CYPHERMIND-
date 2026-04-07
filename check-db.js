const mongoose = require('mongoose');
const { env } = require('./dist/config/env.js');

async function checkDocs() {
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  const collection = db.collection('document_chunks');
  
  const doc = await collection.findOne({});
  if (doc) {
    console.log(`Total documents found: YES`);
    console.log(`Embedding dimension: ${doc.embedding ? doc.embedding.length : 'NULL'}`);
    console.log(`Clearance level: ${doc.metadata.clearance_level}`);
  } else {
    console.log('No documents found in document_chunks');
  }

  process.exit(0);
}
checkDocs();
