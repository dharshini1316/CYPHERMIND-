const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjlkMjEzODE0ZjUxYzUyMTc5MTFhODA2IiwiZW1haWwiOiJqdW5pb3JAY3lwaGVybWluZC5jb20iLCJjbGVhcmFuY2VfbGV2ZWwiOjEsInJvbGUiOiJqdW5pb3JfZW1wbG95ZWUiLCJpYXQiOjE3NzUzOTU5MDEsImV4cCI6MTc3NTQ4MjMwMX0.7_73aCYVUZGR8Pi6MZE9sV7iajdmin0zdwR38cGDoiQ';
const data = JSON.stringify({ prompt: 'What is CypherMind?' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    const parsed = JSON.parse(body);
    console.log('Risk Level:', parsed.data.risk_level);
    console.log('Risk Score:', parsed.data.risk_score);
    console.log('Answer:', parsed.data.answer.substring(0, 50) + '...');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
