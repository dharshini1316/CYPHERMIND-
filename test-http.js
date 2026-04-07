const http = require('http');

async function doQuery() {
  console.log("Starting query...");
  const loginData = JSON.stringify({ email: "junior@cyphermind.com", password: "Junior123!" });
  
  const token = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data).data.token));
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
  
  console.log("Logged in, token:", token.substring(0, 10) + "...");
  
  const queryData = JSON.stringify({ prompt: "How does PII redaction work?" });
  const result = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3000, path: '/api/query', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': queryData.length, 'Authorization': `Bearer ${token}` }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(queryData);
    req.end();
  });
  
  console.log("QUERY RESULT:", result.status, result.data);
}
doQuery().catch(console.error);
