/*
  Generate bcrypt hash for a password
  Usage: node scripts/generateHash.js
*/

const { hashPassword } = require('../src/utils/password');

async function generateHash() {
    const password = 'Kaman@123';
    const hash = await hashPassword(password);

    console.log('\n=================================');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('=================================\n');
    console.log('Use this hash in your SQL INSERT statement');
}

generateHash()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err.message);
        process.exit(1);
    });
