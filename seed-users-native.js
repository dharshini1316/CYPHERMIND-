const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const uri = 'mongodb://CypherMind:5DQJMYCXtnorUGGp@ac-8iy7xp9-shard-00-01.pitogjd.mongodb.net:27017/cyphermind?authSource=admin&tls=true&directConnection=true';

async function seedUsers() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    console.log('🌱 Creating users...\n');
    
    const db = client.db('cyphermind');
    const users = db.collection('users');
    
    // Hash passwords
    const juniorHash = await bcrypt.hash('Junior123!', 10);
    const userHash = await bcrypt.hash('User123!', 10);
    const adminHash = await bcrypt.hash('Admin123!', 10);
    
    // Create users
    await users.insertOne({
      email: 'junior@cyphermind.com',
      password_hash: juniorHash,
      role: 'junior_employee',
      clearance_level: 1,
      created_at: new Date(),
      last_login: null
    });
    console.log('✅ Created: junior@cyphermind.com / Junior123!');
    
    await users.insertOne({
      email: 'user@cyphermind.com',
      password_hash: userHash,
      role: 'junior_employee',
      clearance_level: 2,
      created_at: new Date(),
      last_login: null
    });
    console.log('✅ Created: user@cyphermind.com / User123!');
    
    await users.insertOne({
      email: 'admin@cyphermind.com',
      password_hash: adminHash,
      role: 'security_admin',
      clearance_level: 3,
      created_at: new Date(),
      last_login: null
    });
    console.log('✅ Created: admin@cyphermind.com / Admin123!');
    
    console.log('\n✅ All users created successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Junior: junior@cyphermind.com / Junior123!');
    console.log('User:   user@cyphermind.com / User123!');
    console.log('Admin:  admin@cyphermind.com / Admin123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

seedUsers();
