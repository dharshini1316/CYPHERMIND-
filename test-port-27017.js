const net = require('net');

const hosts = [
  'ac-8iy7xp9-shard-00-00.pitogjd.mongodb.net',
  'ac-8iy7xp9-shard-00-01.pitogjd.mongodb.net',
  'ac-8iy7xp9-shard-00-02.pitogjd.mongodb.net'
];

console.log('Testing connectivity to MongoDB Atlas servers on port 27017...\n');

hosts.forEach((host, index) => {
  const socket = net.createConnection({
    host: host,
    port: 27017,
    timeout: 5000
  });

  socket.on('connect', () => {
    console.log(`✅ Server ${index + 1}: ${host} - Port 27017 is OPEN`);
    socket.destroy();
  });

  socket.on('timeout', () => {
    console.log(`❌ Server ${index + 1}: ${host} - Connection TIMEOUT (port likely blocked)`);
    socket.destroy();
  });

  socket.on('error', (err) => {
    console.log(`❌ Server ${index + 1}: ${host} - ${err.message}`);
  });
});

setTimeout(() => {
  console.log('\n=== Diagnosis ===');
  console.log('If all connections timed out or failed:');
  console.log('1. Your firewall/antivirus is blocking port 27017');
  console.log('2. Your network (ISP/corporate) blocks MongoDB connections');
  console.log('3. Try disabling Windows Firewall temporarily');
  console.log('4. Try using a VPN or mobile hotspot');
}, 6000);
