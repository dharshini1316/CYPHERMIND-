require('dotenv').config();
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  password_hash: String,
  role: String,
  clearance_level: Number
});

const User = mongoose.model('User', userSchema);

async function resetUsers() {
  try {
    const uri = process.env.MONGODB_URI
      .replace(/[&?]replicaSet=[^&]*/g, '')
      .replace(/[&?]directConnection=[^&]*/g, '')
      + (process.env.MONGODB_URI.includes('?') ? '&' : '?') + 'directConnection=true';
    
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');
    
    // Delete all users
    const result = await User.deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} users\n`);
    
    await mongoose.disconnect();
    console.log('✅ Done! Now run: npm run seed:users');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resetUsers();
