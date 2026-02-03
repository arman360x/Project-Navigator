const crypto = require('crypto');

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

function hashPassword(password) {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
}

function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateSecureToken
};
