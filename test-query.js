const { ragService } = require('./dist/services/rag.service.js');
const { connectDatabase } = require('./dist/config/database.js');

async function test() {
  await connectDatabase();
  try {
    const res = await ragService.query("How does PII redaction work?", {
      user_id: "test_user_id",
      clearance_level: 2,
      role: "junior_employee"
    });
    console.log("SUCCESS:", res);
  } catch(e) {
    console.error("ERROR CAUGHT:");
    console.error(e);
  }
  process.exit();
}
test();
