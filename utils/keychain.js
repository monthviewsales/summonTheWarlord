
import keytar from 'keytar';

const SERVICE = 'summonTheWarlord';
const ACCOUNT = 'wallet-private-key';

/**
 * Normalize a pasted secret by coercing to string and trimming whitespace/newlines.
 * @param {any} secret
 * @returns {string}
 */
function normalizeSecret(secret) {
  return String(secret ?? '').trim();
}

/**
 * Stores the Solana private key in the macOS Keychain.
 * Accepts Base58 or a JSON array string; we store it as-is.
 * @param {string} secret - The private key string.
 */
export async function storePrivateKey(secret) {
  try {
    const normalized = normalizeSecret(secret);
    if (!normalized) {
      throw new Error('No private key provided. Paste your Base58 string or JSON array.');
    }
    await keytar.setPassword(SERVICE, ACCOUNT, normalized);
    console.log('🔐 Private key securely stored in macOS Keychain.');
  } catch (err) {
    throw new Error(`Failed to store private key: ${err.message}`);
  }
}

/**
 * Retrieves the private key from the macOS Keychain.
 * Throws if not found.
 * @returns {Promise<string>}
 */
export async function getPrivateKey() {
  try {
    const key = await keytar.getPassword(SERVICE, ACCOUNT);
    if (!key) {
      throw new Error('Private key not found. Run `warlord keychain store` to save it.');
    }
    return key.trim();
  } catch (err) {
    // Re-throw with context, preserving original message
    throw new Error(`Failed to retrieve private key: ${err.message}`);
  }
}

/**
 * Returns true if a private key exists in the Keychain.
 * @returns {Promise<boolean>}
 */
export async function hasPrivateKey() {
  const key = await keytar.getPassword(SERVICE, ACCOUNT);
  return typeof key === 'string' && key.length > 0;
}

/**
 * Deletes the private key from Keychain.
 * @returns {Promise<boolean>} true if an entry was deleted, false if nothing existed
 */
export async function deletePrivateKey() {
  try {
    const deleted = await keytar.deletePassword(SERVICE, ACCOUNT);
    if (deleted) {
      console.log('💥 Private key removed from macOS Keychain.');
    } else {
      console.log('ℹ️ No private key found in macOS Keychain.');
    }
    return deleted;
  } catch (err) {
    throw new Error(`Failed to delete private key: ${err.message}`);
  }
}
