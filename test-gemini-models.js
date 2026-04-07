const { env } = require('./dist/config/env.js');

async function listModels() {
  const apiKey = env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log("Available models:");
      data.models.forEach(m => {
        if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
          console.log(`- ${m.name}`);
        }
      });
    } else {
      console.error("No models array found:", data);
    }
  } catch (e) {
    console.error("Failed:", e.message);
  }
}
listModels();
