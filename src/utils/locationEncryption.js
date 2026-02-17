// src/utils/locationEncryption.js
// End-to-end encryption for live location data using AES-256-GCM
// The encryption key is shared via URL fragment (#key=...) — never sent to the server

const IV_LENGTH = 12;

// ── Base64url encode/decode (RFC 4648 §5) ──────────────────

const toBase64Url = (uint8Array) => {
  const base64 = btoa(String.fromCharCode(...uint8Array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (b64url) => {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

// ── Key Generation / Import ─────────────────────────────────

export const generateLocationKey = async () => {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const raw = await crypto.subtle.exportKey('raw', key);
  return { key, keyString: toBase64Url(new Uint8Array(raw)) };
};

export const importLocationKey = async (keyString) => {
  const keyData = fromBase64Url(keyString);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// ── Encrypt / Decrypt ───────────────────────────────────────

export const encryptLocationData = async (key, data) => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return toBase64Url(combined);
};

export const decryptLocationData = async (key, encryptedBase64url) => {
  const combined = fromBase64Url(encryptedBase64url);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
};
