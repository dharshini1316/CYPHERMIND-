const bcrypt = require('bcryptjs');

async function test() {
    console.log('Testing bcryptjs...');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('test-password', salt);
    console.log('Hash created:', hash);
    const match = await bcrypt.compare('test-password', hash);
    console.log('Match result:', match);
    if (match) {
        console.log('✅ bcryptjs verification successful!');
    } else {
        console.log('❌ bcryptjs verification failed!');
    }
}

test().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
