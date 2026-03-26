// src/utils/encryptedStorage.js
// Encrypted localStorage wrapper for PII data.
// Uses the master encryption key (AES-256-GCM) when available.
// Reads can fall back to legacy plaintext for migration purposes.
// Writes NEVER fall back to plaintext — if the key is unavailable, the write is skipped.

import { getMasterKey } from './crypto/keyManager';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Encrypt a JSON-serializable value to a base64 string
 */
async function encryptJSON(obj, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), 12);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64 string back to a JSON value
 */
async function decryptJSON(b64, key) {
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(decoder.decode(plaintext));
}

/**
 * Read a JSON value from localStorage, decrypting if possible.
 * Auto-migrates plaintext data to encrypted on next write.
 * @param {string} storageKey - localStorage key
 * @param {*} defaultValue - value to return if key doesn't exist
 * @returns {Promise<*>} parsed value
 */
export async function readEncrypted(storageKey, defaultValue = null) {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) return defaultValue;

  const key = await getMasterKey();

  if (key) {
    try {
      return await decryptJSON(raw, key);
    } catch {
      // Likely legacy plaintext — fall through to JSON.parse
    }
  }

  // No key or decryption failed — try plaintext
  try {
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/**
 * Write a JSON value to localStorage, encrypting with the master key.
 * If the master key is unavailable, the write is skipped to prevent
 * sensitive data from being stored in plaintext.
 * @param {string} storageKey - localStorage key
 * @param {*} value - JSON-serializable value
 * @returns {Promise<boolean>} true if written, false if key unavailable
 */
export async function writeEncrypted(storageKey, value) {
  const key = await getMasterKey();
  if (key) {
    localStorage.setItem(storageKey, await encryptJSON(value, key));
    return true;
  }
  // Never write sensitive data in plaintext — skip the write
  console.warn('[encryptedStorage] Master key unavailable; write to', storageKey, 'skipped until key is ready');
  return false;
}

/**
 * Remove a key from localStorage
 * @param {string} storageKey - localStorage key
 */
export function removeEncrypted(storageKey) {
  localStorage.removeItem(storageKey);
}
