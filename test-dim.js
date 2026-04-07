const { env } = require('./dist/config/env.js');

async function testEmbeddingDim() {
  const model = 'gemini-embedding-001';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${env.GEMINI_API_KEY}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text: "Hello world" }] } })
    });
    const data = await res.json();
    console.log(`Model: ${model}`);
    console.log(`Status: ${res.status}`);
    if (data.embedding) {
      console.log(`Dimension: ${data.embedding.values.length}`);
    } else {
      console.log('Error:', JSON.stringify(data, null, 2));
    }
  } catch(e) {
    console.log('Fetch Error:', e.message);
  }
}
testEmbeddingDim();
