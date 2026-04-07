const { ragService } = require('./dist/services/rag.service.js');
const { vectorSearchService } = require('./dist/services/vector-search.service.js');
const { scrubberService } = require('./dist/services/scrubber.service.js');
const mongoose = require('mongoose');
const { env } = require('./dist/config/env.js');

async function debugCrash() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('--- DB CONNECTED ---');
  
  const user = { user_id: '69d213814f51c5217911a807', clearance_level: 1, role: 'junior_employee' };
  const prompt = 'What is CypherMIND?';

  try {
    console.log('1. Testing Vector Search...');
    const chunks = await vectorSearchService.search(prompt, user.clearance_level, 5);
    console.log('   RESULT: Success, found', chunks.length, 'chunks');

    console.log('2. Testing Scrubber...');
    const redaction = await scrubberService.redact(chunks.map(c => c.content), user.user_id);
    console.log('   RESULT: Success, redacted', redaction.redactions_count, 'items');

    console.log('3. Testing Generator...');
    // We already know this might be the hang/crash point since it uses the model
    const response = await ragService.query(prompt, user);
    console.log('   RESULT: Full Pipeline Success!');
  } catch (err) {
    console.error('   JS_ERROR:', err.message);
  }
  process.exit(0);
}

debugCrash();
