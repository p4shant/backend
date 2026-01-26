const bcrypt = require('bcryptjs');
const env = require('../config/env');

async function hashPassword(plainText) {
    const salt = await bcrypt.genSalt(env.auth.saltRounds);
    return bcrypt.hash(plainText, salt);
}

async function comparePassword(plainText, hash) {
    return bcrypt.compare(plainText, hash);
}

module.exports = {
    hashPassword,
    comparePassword
};
