/**
 * Report encryption/decryption using a shared community key.
 * Key is served exclusively from a Swiss VPS (Infomaniak) outside US legal jurisdiction.
 *
 * New reports encrypt ALL sensitive fields as a single AES-256-GCM payload.
 * Legacy reports with only encrypted descriptions are still supported.
 */

import { encrypt, decrypt, importKey } from './crypto';

// Swiss key server (Infomaniak, Switzerland) — sole key source
const KEY_URL = 'https://key.safeneighbor.app/key';

let cachedCommunityKey = null;
let cachedKeyVersion = null;

/**
 * Fetch and cache the community report encryption key from Swiss key server.
 */
export const getCommunityKey = async () => {
  if (cachedCommunityKey) return { key: cachedCommunityKey, version: cachedKeyVersion };

  const response = await fetch(KEY_URL);
  if (!response.ok) throw new Error('Failed to fetch community key');
  const data = await response.json();
  cachedCommunityKey = await importKey(data.key);
  cachedKeyVersion = data.version;
  return { key: cachedCommunityKey, version: cachedKeyVersion };
};

/**
 * Encrypt all sensitive report fields as a single payload.
 * @param {Object} fields - { lat, lng, city, state, location, description, agents, vehicles, activity }
 * @returns {Promise<{encryptedPayload: string, payloadVersion: number}>}
 */
export const encryptReport = async (fields) => {
  const { key, version } = await getCommunityKey();
  const json = JSON.stringify(fields);
  const data = new TextEncoder().encode(json);
  const encrypted = await encrypt(data, key);
  const base64 = btoa(String.fromCharCode(...encrypted));
  return { encryptedPayload: base64, payloadVersion: version };
};

/**
 * Decrypt a full report payload back to an object.
 * @param {string} encryptedPayload - Base64-encoded encrypted JSON
 * @returns {Promise<Object>} Decrypted fields object
 */
export const decryptReport = async (encryptedPayload) => {
  const { key } = await getCommunityKey();
  const data = Uint8Array.from(atob(encryptedPayload), c => c.charCodeAt(0));
  const decrypted = await decrypt(data, key);
  return JSON.parse(new TextDecoder().decode(decrypted));
};

/**
 * Encrypt a report description (legacy format — kept for backward compatibility)
 * @param {string} description - Plaintext description
 * @returns {Promise<{encryptedDescription: string, descriptionVersion: number}>}
 */
export const encryptDescription = async (description) => {
  const { key, version } = await getCommunityKey();
  const data = new TextEncoder().encode(description);
  const encrypted = await encrypt(data, key);
  const base64 = btoa(String.fromCharCode(...encrypted));
  return { encryptedDescription: base64, descriptionVersion: version };
};

/**
 * Decrypt a report description (legacy format)
 * @param {string} encryptedDescription - Base64-encoded encrypted description
 * @returns {Promise<string>} Plaintext description
 */
export const decryptDescription = async (encryptedDescription) => {
  const { key } = await getCommunityKey();
  const data = Uint8Array.from(atob(encryptedDescription), c => c.charCodeAt(0));
  const decrypted = await decrypt(data, key);
  return new TextDecoder().decode(decrypted);
};

/**
 * Clear cached key (for key rotation or logout)
 */
export const clearCommunityKeyCache = () => {
  cachedCommunityKey = null;
  cachedKeyVersion = null;
};
