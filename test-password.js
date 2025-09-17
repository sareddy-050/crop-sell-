const bcrypt = require('bcryptjs');

const hash = '$2a$10$csFvqtP9GGf/JTFMvvT4le7GahtcNss6u3.1/ZN3b6BEgFchXxgiO';

async function testPassword(password) {
    try {
        const matches = await bcrypt.compare(password, hash);
        return matches;
    } catch (error) {
        console.error('Error testing password:', error.message);
        return false;
    }
}

// Get password from command line argument
const password = process.argv[2];

if (!password) {
    console.log('🔐 PASSWORD TESTER');
    console.log('='.repeat(50));
    console.log('Usage: node test-password.js "your_password"');
    console.log('');
    console.log('Example:');
    console.log('  node test-password.js "password123"');
    console.log('  node test-password.js "farmer123"');
    console.log('');
    console.log('⚠️  This will test if your password matches the hash:');
    console.log('   ' + hash.substring(0, 50) + '...');
    process.exit(1);
}

console.log('🔍 Testing password...');
console.log('─'.repeat(50));

testPassword(password).then(matches => {
    if (matches) {
        console.log('✅ SUCCESS! Password matches the hash!');
        console.log(`   Password: "${password}"`);
        console.log(`   Hash: ${hash}`);
    } else {
        console.log('❌ Password does not match this hash');
        console.log(`   Password: "${password}"`);
        console.log('   Try a different password or create a new account');
    }
}).catch(error => {
    console.error('❌ Error:', error.message);
});
