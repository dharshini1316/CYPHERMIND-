const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return console.error('No API key');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log("Available models:");
      data.models.forEach(m => {
        console.log(`- ${m.name}`);
      });
    } else {
      console.error("No models found", data);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}
listModels();
