const { env } = require('./dist/config/env.js');

async function testRawFetch() {
  const model = 'gemma-3-4b-it';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  
  console.log('Sending request...');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: "Hello" }] }] })
    });
    
    console.log('Status:', res.status);
    if (!res.ok) {
       console.log('Error detected. Parsing text...');
       const text = await res.text();
       console.log('Text length:', text.length);
       console.log('Text preview:', text.substring(0, 100));
    } else {
       const data = await res.json();
       console.log('Success data keys:', Object.keys(data));
    }
  } catch (e) {
    console.log('Caught Error:', e.message);
  }
}

testRawFetch().then(() => process.exit(0));
