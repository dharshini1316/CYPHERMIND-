import { connectDatabase } from './src/config/database';
import { ragService } from './src/services/rag.service';

async function test() {
  console.log("TRACE: Connecting database...");
  await connectDatabase();
  console.log("TRACE: Database connected.");
  const start = Date.now();
  
  try {
    const user = { user_id: "test", clearance_level: 2, role: "junior_employee" };
    console.log("TRACE: Calling ragService.query...");
    const res = await ragService.query("How does PII redaction work?", user);
    console.log(`TRACE: Finished in ${Date.now() - start}ms`, res);
  } catch(e) {
    console.error("TRACE: ERROR CAUGHT:");
    console.error(e);
  }
  process.exit(0);
}
test();
