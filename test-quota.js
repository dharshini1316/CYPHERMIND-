const { env } = require('./dist/config/env.js');

const models = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro'
];

async function testQuota() {
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: "Hi" }] }] })
      });
      if (res.ok) {
        console.log(`✅ ${model} WORKS (Status 200)`);
      } else {
        const err = await res.json();
        console.log(`❌ ${model} FAILED (${res.status}): limit=${err.error.details?.[1]?.violations?.[0]?.quotaDimensions?.limit || 'Unknown'}`);
      }
    } catch(e) {
      console.log(`❌ ${model} ERROR:`, e.message);
    }
  }
}
testQuota();
