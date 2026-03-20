/**
 * MongoDB Atlas Connection Test Script
 * Run this to verify your MongoDB Atlas connection is working
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing MongoDB Atlas Connection...\n');
  
  // Check if MONGODB_URI is set
  if (!process.env.MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not found in .env file');
    console.log('\n📝 Please add your MongoDB Atlas connection string to .env:');
    console.log('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   URI: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`   Database: ${process.env.MONGODB_DB_NAME || 'cyphermind'}\n`);

  try {
    // Attempt connection
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'cyphermind',
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ Successfully connected to MongoDB Atlas!\n');

    // Get database info
    const db = mongoose.connection.db;
    const admin = db.admin();
    
    // List databases
    console.log('📊 Database Information:');
    const dbInfo = await admin.listDatabases();
    console.log(`   Total Databases: ${dbInfo.databases.length}`);
    
    const currentDb = dbInfo.databases.find(d => d.name === (process.env.MONGODB_DB_NAME || 'cyphermind'));
    if (currentDb) {
      console.log(`   ✅ Database '${currentDb.name}' exists`);
      console.log(`   Size: ${(currentDb.sizeOnDisk / 1024 / 1024).toFixed(2)} MB\n`);
    } else {
      console.log(`   ℹ️  Database '${process.env.MONGODB_DB_NAME || 'cyphermind'}' will be created on first write\n`);
    }

    // List collections
    console.log('📁 Collections:');
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('   ℹ️  No collections yet (run seed scripts to create data)\n');
    } else {
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`   - ${collection.name}: ${count} documents`);
      }
      console.log('');
    }

    // Check for vector search index
    console.log('🔍 Vector Search Index:');
    try {
      const documentChunks = db.collection('document_chunks');
      const indexes = await documentChunks.indexes();
      const vectorIndex = indexes.find(idx => 
        idx.name && (idx.name.includes('vector') || idx.name.includes('search'))
      );
      
      if (vectorIndex) {
        console.log(`   ✅ Vector search index found: ${vectorIndex.name}`);
      } else {
        console.log('   ⚠️  No vector search index found');
        console.log('   Run: npm run create-vector-index');
        console.log('   Or create manually in Atlas UI (see MONGODB_ATLAS_SETUP.md)');
      }
    } catch (error) {
      console.log('   ℹ️  Collection not created yet (will be created when seeding data)');
    }
    console.log('');

    // Test write operation
    console.log('✍️  Testing Write Operation...');
    const testCollection = db.collection('connection_test');
    await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Connection test successful'
    });
    console.log('   ✅ Write operation successful');
    
    // Clean up test
    await testCollection.deleteMany({ test: true });
    console.log('   ✅ Cleanup successful\n');

    // Connection details
    console.log('🎉 Connection Test Complete!\n');
    console.log('✅ All checks passed. Your MongoDB Atlas is ready!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Create vector search index (if not exists):');
    console.log('      npm run create-vector-index');
    console.log('   2. Seed the database with test data:');
    console.log('      npm run seed-all');
    console.log('   3. Start the application:');
    console.log('      npm run dev');

  } catch (error) {
    console.error('\n❌ Connection Failed!\n');
    
    if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication Error:');
      console.error('   - Check your username and password in .env');
      console.error('   - Verify the user exists in Atlas (Database Access)');
      console.error('   - Make sure password is URL-encoded (no special chars issues)');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.error('🌐 Network Error:');
      console.error('   - Check your internet connection');
      console.error('   - Verify the cluster URL is correct');
      console.error('   - Check if firewall is blocking MongoDB ports');
    } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error('🚫 IP Whitelist Error:');
      console.error('   - Go to Atlas → Network Access');
      console.error('   - Add your current IP address');
      console.error('   - Or use 0.0.0.0/0 for development');
    } else {
      console.error('❓ Unknown Error:');
      console.error(`   ${error.message}`);
    }
    
    console.error('\n📖 See MONGODB_ATLAS_SETUP.md for detailed setup instructions');
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Connection closed');
  }
}

// Run the test
testConnection().catch(console.error);
