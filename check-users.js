require('dotenv').config();
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  password_hash: String,
  role: String,
  clearance_level: Number
});

const User = mongoose.model('User', userSchema);

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const users = await User.find({}, 'email role clearance_level');
    console.log('📋 Users in database:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}, clearance: ${user.clearance_level})`);
    });
    
    console.log(`\n📊 Total users: ${users.length}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUsers();
