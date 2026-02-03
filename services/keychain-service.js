const keytar = require('keytar');

const SERVICE_PREFIX = 'project-navigator';

async function setSecret(serviceName, account, secret) {
    try {
        await keytar.setPassword(serviceName, account, secret);
        return true;
    } catch (error) {
        console.error('Error storing secret in keychain:', error);
        throw error;
    }
}

async function getSecret(serviceName, account) {
    try {
        const secret = await keytar.getPassword(serviceName, account);
        return secret;
    } catch (error) {
        console.error('Error retrieving secret from keychain:', error);
        return null;
    }
}

async function deleteSecret(serviceName, account) {
    try {
        const deleted = await keytar.deletePassword(serviceName, account);
        return deleted;
    } catch (error) {
        console.error('Error deleting secret from keychain:', error);
        return false;
    }
}

async function findCredentials(serviceName) {
    try {
        const credentials = await keytar.findCredentials(serviceName);
        return credentials;
    } catch (error) {
        console.error('Error finding credentials in keychain:', error);
        return [];
    }
}

module.exports = {
    setSecret,
    getSecret,
    deleteSecret,
    findCredentials
};
