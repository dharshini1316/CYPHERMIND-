import { connectDatabase } from './src/config/database';
import { ragService } from './src/services/rag.service';

async function test() {
  console.log("Connecting database...");
  await connectDatabase();
  console.log("Database connected. Starting query...");
  
  try {
    const p = ragService.query("How does PII redaction work?", {
      user_id: "test",
      clearance_level: 2,
      role: "junior_employee"
    });
    
    // Add a local timeout race to print where it hangs
    const timeout = new Promise((_, r) => setTimeout(() => r(new Error("MANUAL_RAG_TIMEOUT")), 8000));
    
    console.log("Waiting for ragService.query...");
    const res = await Promise.race([p, timeout]);
    console.log("SUCCESS:", !!res);
  } catch(e) {
    console.error("ERROR CAUGHT:");
    console.error(e);
  }
  process.exit(0);
}
test();
