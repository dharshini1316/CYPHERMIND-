require('dotenv').config();

console.log('=== Environment Variables Check ===');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('Connection type:', process.env.MONGODB_URI?.startsWith('mongodb+srv://') ? 'SRV (DNS lookup)' : 'Direct connection');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set ✓' : 'Missing ✗');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set ✓' : 'Missing ✗');
