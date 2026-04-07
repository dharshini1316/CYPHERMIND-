const mongoose = require('mongoose');
require('dotenv').config();

async function testDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully!');
    
    const User = mongoose.model('User', new mongoose.Schema({
        email: String,
        is_blocked: Boolean
    }));
    
    const count = await User.countDocuments();
    console.log('User count:', count);
    
    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (err) {
    console.error('Error:', err);
  }
}

testDB();
