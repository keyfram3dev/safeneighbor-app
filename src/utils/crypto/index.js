// src/utils/crypto/index.js
// Platform-agnostic crypto interface
// Automatically selects Web Crypto or React Native implementation

// For now, we only have the web implementation
// When porting to React Native, add crypto.native.js and update detection
export {
  generateKey,
  exportKey,
  importKey,
  encrypt,
  decrypt,
  generateRandomId,
  hash
} from './crypto.web';

// Key management exports
export {
  isEncryptionEnabled,
  setEncryptionEnabled,
  hasMasterKey,
  initializeEncryption,
  getMasterKey,
  clearCachedKey,
  rotateKey,
  deleteMasterKey,
  getEncryptionStatus,
  ensureEncryptionReady
} from './keyManager';

// Helper to check if crypto is available
export const isCryptoAvailable = () => {
  return typeof crypto !== 'undefined' &&
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.subtle.encrypt === 'function';
};
