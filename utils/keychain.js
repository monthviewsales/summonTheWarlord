import keytar from 'keytar';

const SERVICE = 'summonTheWarlord';
const ACCOUNT = 'wallet-private-key';

/**
 * Stores the Solana private key in the macOS Keychain.
 * @param {string} secret - The private key string (Base58 or base64).
 */
async function storePrivateKey(secret) {
    await keytar.setPassword(SERVICE, ACCOUNT, secret);
    console.log('🔐 Private key securely stored in macOS Keychain.');
}

/**
 * Retrieves the private key from the macOS Keychain.
 * Throws if not found.
 * @returns {Promise<string>}
 */
async function getPrivateKey() {
    const key = await keytar.getPassword(SERVICE, ACCOUNT);
    if (!key) throw new Error('Private key not found. Run `warlord store-key` to save it.');
    return key;
}

/**
 * Deletes the private key from Keychain.
 */
async function deletePrivateKey() {
    await keytar.deletePassword(SERVICE, ACCOUNT);
    console.log('💥 Private key removed from macOS Keychain.');
}

export { storePrivateKey, getPrivateKey, deletePrivateKey };
