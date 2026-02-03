// src/utils/crypto/crypto.web.js
// Web Crypto API implementation for client-side AES-256-GCM encryption
// This file is used in web browsers. React Native will use crypto.native.js

/**
 * Generate a new AES-256-GCM encryption key
 * @param {boolean} extractable - Whether the key can be exported (default: true for backward compatibility)
 * @returns {Promise<CryptoKey>} The generated key
 */
export const generateKey = async (extractable = true) => {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt']
  );
};

/**
 * Export a CryptoKey to a base64 string for storage/sharing
 * @param {CryptoKey} key - The key to export
 * @returns {Promise<string>} Base64-encoded key
 */
export const exportKey = async (key) => {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

/**
 * Import a base64-encoded key string back to a CryptoKey
 * @param {string} keyString - Base64-encoded key
 * @returns {Promise<CryptoKey>} The imported key
 */
export const importKey = async (keyString) => {
  const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt data using AES-256-GCM
 * Prepends the 12-byte IV to the ciphertext for later decryption
 * @param {Uint8Array|ArrayBuffer} data - Data to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<Uint8Array>} IV + ciphertext combined
 */
export const encrypt = async (data, key) => {
  // Generate random 12-byte IV (recommended for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Ensure data is Uint8Array
  const dataArray = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataArray
  );

  // Prepend IV to ciphertext (IV is not secret, needed for decryption)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return combined;
};

/**
 * Decrypt data encrypted with encrypt()
 * Extracts the IV from the first 12 bytes
 * @param {Uint8Array|ArrayBuffer} encryptedData - IV + ciphertext
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<ArrayBuffer>} Decrypted data
 */
export const decrypt = async (encryptedData, key) => {
  // Ensure we're working with Uint8Array
  const dataArray = encryptedData instanceof ArrayBuffer
    ? new Uint8Array(encryptedData)
    : encryptedData;

  // Extract IV (first 12 bytes) and ciphertext (rest)
  const iv = dataArray.slice(0, 12);
  const ciphertext = dataArray.slice(12);

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
};

/**
 * Generate a cryptographically secure random ID
 * @param {number} length - Number of bytes (default 16 = 32 hex chars)
 * @returns {string} Hex string ID
 */
export const generateRandomId = (length = 16) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash data using SHA-256 (useful for integrity checks)
 * @param {Uint8Array|ArrayBuffer} data - Data to hash
 * @returns {Promise<string>} Hex string hash
 */
export const hash = async (data) => {
  const dataArray = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataArray);
  return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
};
