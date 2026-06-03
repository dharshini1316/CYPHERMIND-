// Run this if login stops working: node fix-db.js
require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const servers = ['shard-00-00','shard-00-01','shard-00-02'].map(s => `ac-8iy7xp9-${s}.pitogjd.mongodb.net:27017`);

(async () => {
  for (const s of servers) {
    const uri = `mongodb://CypherMind:${process.env.MONGODB_PASS}@${s}/cyphermind?authSource=admin&tls=true&directConnection=true`;
    const c = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
      await c.connect();
      const r = await c.db('admin').command({ isMaster: 1 });
      if (r.ismaster || r.isWritablePrimary) {
        console.log('✅ PRIMARY:', s);
        const db = c.db('cyphermind');
        await db.collection('users').deleteMany({});
        for (const u of [
          { email: 'junior@cyphermind.com', password: 'Junior123!', role: 'junior_employee', clearance_level: 1 },
          { email: 'user@cyphermind.com',   password: 'User123!',   role: 'junior_employee', clearance_level: 2 },
          { email: 'admin@cyphermind.com',  password: 'Admin123!',  role: 'security_admin',  clearance_level: 3 },
        ]) {
          await db.collection('users').insertOne({ ...u, password_hash: await bcrypt.hash(u.password, 10), created_at: new Date(), last_login: null });
          console.log('✅', u.email, '/', u.password);
        }
        const fs = require('fs');
        let env = fs.readFileSync('.env', 'utf8');
        env = env.replace(/MONGODB_URI=.*/, `MONGODB_URI=mongodb://CypherMind:${process.env.MONGODB_PASS}@${s}/cyphermind?authSource=admin&tls=true&directConnection=true`);
        fs.writeFileSync('.env', env);
        console.log('\n✅ .env updated. Restart backend: npm run dev');
      }
      await c.close();
    } catch (e) { try { await c.close(); } catch {} }
  }
})();
