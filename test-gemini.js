const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env } = require('./dist/config/env.js');

async function testGemini() {
  console.log("Testing Gemini API with key length:", env.GEMINI_API_KEY.length);
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  try {
    console.log("Calling model.generateContent...");
    const timeout = new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 8000));
    const req = model.generateContent("Hello?");
    const result = await Promise.race([req, timeout]);
    console.log("Success:", result.response.text());
  } catch(e) {
    console.error("Failed:", e.message);
  }
  process.exit();
}

testGemini();
