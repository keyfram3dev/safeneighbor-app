// src/utils/pinAuth.js
// PIN authentication utilities for app lock feature
// Uses PBKDF2 hashing via Web Crypto API (100,000 iterations)
// Supports duress PIN (decoy mode) for plausible deniability
// Includes failed attempts protection with progressive lockout

const PIN_HASH_KEY = 'safeneighbor_pin_hash';
const PIN_SALT_KEY = 'safeneighbor_pin_salt';
const PIN_ENABLED_KEY = 'safeneighbor_pin_enabled';
const DURESS_PIN_HASH_KEY = 'safeneighbor_duress_pin_hash';
const DURESS_PIN_SALT_KEY = 'safeneighbor_duress_pin_salt';
const DURESS_PIN_ENABLED_KEY = 'safeneighbor_duress_pin_enabled';

// Legacy static salt for backward compatibility migration
const LEGACY_SALT = 'safeneighbor_salt_v1';

// PBKDF2 configuration - 100,000 iterations is OWASP recommended minimum
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 128 bits

// Failed attempts protection keys
const FAILED_ATTEMPTS_KEY = 'safeneighbor_failed_attempts';
const LOCKOUT_UNTIL_KEY = 'safeneighbor_lockout_until';
const LOCKOUT_LEVEL_KEY = 'safeneighbor_lockout_level';

// Lockout configuration
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
// Progressive lockout durations in milliseconds: 1min, 5min, 15min, 30min
const LOCKOUT_DURATIONS_MS = [
  1 * 60 * 1000,   // 1 minute
  5 * 60 * 1000,   // 5 minutes
  15 * 60 * 1000,  // 15 minutes
  30 * 60 * 1000,  // 30 minutes
];

/**
 * Generate a random salt for PBKDF2
 * @returns {Uint8Array} Random 16-byte salt
 */
const generateSalt = () => {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
};

/**
 * Convert Uint8Array to hex string
 * @param {Uint8Array} bytes
 * @returns {string}
 */
const bytesToHex = (bytes) => {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Convert hex string to Uint8Array
 * @param {string} hex
 * @returns {Uint8Array}
 */
const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

/**
 * Hash a PIN using PBKDF2 with 100,000 iterations
 * @param {string} pin - The PIN to hash
 * @param {Uint8Array} salt - The salt to use
 * @returns {Promise<string>} Hex-encoded hash
 */
export const hashPinPBKDF2 = async (pin, salt) => {
  const encoder = new TextEncoder();

  // Import the PIN as a key for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive bits using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 32 bytes
  );

  return bytesToHex(new Uint8Array(hashBuffer));
};

/**
 * Legacy hash function for migration (SHA-256 with static salt)
 * @param {string} pin - The PIN to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
const hashPinLegacy = async (pin) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + LEGACY_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
};

/**
 * Hash a PIN (for backward compatibility, wraps PBKDF2)
 * @param {string} pin - The PIN to hash
 * @param {Uint8Array} [salt] - Optional salt (generates new one if not provided)
 * @returns {Promise<{hash: string, salt: string}>} Hash and salt as hex strings
 */
export const hashPin = async (pin, salt = null) => {
  const actualSalt = salt || generateSalt();
  const hash = await hashPinPBKDF2(pin, actualSalt);
  return { hash, salt: bytesToHex(actualSalt) };
};

/**
 * Check if PIN authentication is enabled
 * @returns {boolean}
 */
export const isPinEnabled = () => {
  return localStorage.getItem(PIN_ENABLED_KEY) === 'true';
};

/**
 * Set up a new PIN
 * @param {string} pin - The PIN to set (4-6 digits)
 * @throws {Error} If PIN is invalid format
 */
export const setupPin = async (pin) => {
  // Validate PIN format
  if (!pin || pin.length < 4 || pin.length > 6) {
    throw new Error('PIN must be 4-6 digits');
  }
  if (!/^\d+$/.test(pin)) {
    throw new Error('PIN must contain only numbers');
  }

  const { hash, salt } = await hashPin(pin);
  localStorage.setItem(PIN_HASH_KEY, hash);
  localStorage.setItem(PIN_SALT_KEY, salt);
  localStorage.setItem(PIN_ENABLED_KEY, 'true');
};

/**
 * Verify a PIN against stored hashes (normal and duress)
 * Handles migration from legacy SHA-256 to PBKDF2
 * @param {string} pin - The PIN to verify
 * @returns {Promise<{valid: boolean, isDuress: boolean}>} Result with duress flag
 */
export const verifyPin = async (pin) => {
  const storedHash = localStorage.getItem(PIN_HASH_KEY);
  const storedSalt = localStorage.getItem(PIN_SALT_KEY);
  const duressHash = localStorage.getItem(DURESS_PIN_HASH_KEY);
  const duressSalt = localStorage.getItem(DURESS_PIN_SALT_KEY);

  if (!storedHash) return { valid: false, isDuress: false };

  // Check duress PIN first (if enabled)
  if (duressHash) {
    let duressValid = false;
    if (duressSalt) {
      // New PBKDF2 format
      const inputHash = await hashPinPBKDF2(pin, hexToBytes(duressSalt));
      duressValid = inputHash === duressHash;
    } else {
      // Legacy format - migrate on successful verification
      const legacyHash = await hashPinLegacy(pin);
      if (legacyHash === duressHash) {
        duressValid = true;
        // Migrate to PBKDF2
        const { hash, salt } = await hashPin(pin);
        localStorage.setItem(DURESS_PIN_HASH_KEY, hash);
        localStorage.setItem(DURESS_PIN_SALT_KEY, salt);
      }
    }
    if (duressValid) {
      return { valid: true, isDuress: true };
    }
  }

  // Check normal PIN
  let normalValid = false;
  if (storedSalt) {
    // New PBKDF2 format
    const inputHash = await hashPinPBKDF2(pin, hexToBytes(storedSalt));
    normalValid = inputHash === storedHash;
  } else {
    // Legacy format - migrate on successful verification
    const legacyHash = await hashPinLegacy(pin);
    if (legacyHash === storedHash) {
      normalValid = true;
      // Migrate to PBKDF2
      const { hash, salt } = await hashPin(pin);
      localStorage.setItem(PIN_HASH_KEY, hash);
      localStorage.setItem(PIN_SALT_KEY, salt);
    }
  }

  if (normalValid) {
    return { valid: true, isDuress: false };
  }

  return { valid: false, isDuress: false };
};

/**
 * Clear the stored PIN (disable PIN authentication)
 */
export const clearPin = () => {
  localStorage.removeItem(PIN_HASH_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
  localStorage.removeItem(PIN_ENABLED_KEY);
};

/**
 * Change the PIN (requires verification of old PIN)
 * @param {string} oldPin - Current PIN for verification
 * @param {string} newPin - New PIN to set
 * @returns {Promise<boolean>} True if change was successful
 */
export const changePin = async (oldPin, newPin) => {
  // Verify old PIN first
  const result = await verifyPin(oldPin);
  if (!result.valid) {
    return false;
  }

  // Set new PIN
  await setupPin(newPin);
  return true;
};

// ============================================
// DURESS PIN (Decoy Mode) Functions
// ============================================

/**
 * Check if duress PIN is enabled
 * @returns {boolean}
 */
export const isDuressEnabled = () => {
  return localStorage.getItem(DURESS_PIN_ENABLED_KEY) === 'true';
};

/**
 * Set up a duress PIN (decoy mode)
 * @param {string} duressPin - The duress PIN to set (4-6 digits)
 * @throws {Error} If PIN is invalid or matches normal PIN
 */
export const setupDuressPin = async (duressPin) => {
  // Validate PIN format
  if (!duressPin || duressPin.length < 4 || duressPin.length > 6) {
    throw new Error('Duress PIN must be 4-6 digits');
  }
  if (!/^\d+$/.test(duressPin)) {
    throw new Error('Duress PIN must contain only numbers');
  }

  // Verify duress PIN is different from normal PIN by checking verification
  const normalResult = await verifyPin(duressPin);
  if (normalResult.valid && !normalResult.isDuress) {
    throw new Error('Duress PIN must be different from your normal PIN');
  }

  const { hash, salt } = await hashPin(duressPin);
  localStorage.setItem(DURESS_PIN_HASH_KEY, hash);
  localStorage.setItem(DURESS_PIN_SALT_KEY, salt);
  localStorage.setItem(DURESS_PIN_ENABLED_KEY, 'true');
};

/**
 * Clear the duress PIN
 */
export const clearDuressPin = () => {
  localStorage.removeItem(DURESS_PIN_HASH_KEY);
  localStorage.removeItem(DURESS_PIN_SALT_KEY);
  localStorage.removeItem(DURESS_PIN_ENABLED_KEY);
};

/**
 * Verify only the duress PIN (for settings verification)
 * @param {string} pin - The PIN to verify
 * @returns {Promise<boolean>} True if matches duress PIN
 */
export const verifyDuressPin = async (pin) => {
  const duressHash = localStorage.getItem(DURESS_PIN_HASH_KEY);
  const duressSalt = localStorage.getItem(DURESS_PIN_SALT_KEY);
  if (!duressHash) return false;

  if (duressSalt) {
    // New PBKDF2 format
    const inputHash = await hashPinPBKDF2(pin, hexToBytes(duressSalt));
    return inputHash === duressHash;
  } else {
    // Legacy format
    const legacyHash = await hashPinLegacy(pin);
    return legacyHash === duressHash;
  }
};

// ============================================
// FAILED ATTEMPTS PROTECTION
// ============================================

/**
 * Get the current failed attempts count
 * @returns {number}
 */
export const getFailedAttempts = () => {
  const stored = localStorage.getItem(FAILED_ATTEMPTS_KEY);
  return stored ? parseInt(stored, 10) : 0;
};

/**
 * Get the current lockout level (0-3, determines duration)
 * @returns {number}
 */
export const getLockoutLevel = () => {
  const stored = localStorage.getItem(LOCKOUT_LEVEL_KEY);
  return stored ? parseInt(stored, 10) : 0;
};

/**
 * Check if currently locked out
 * @returns {{isLocked: boolean, remainingMs: number, remainingFormatted: string}}
 */
export const checkLockout = () => {
  const lockoutUntil = localStorage.getItem(LOCKOUT_UNTIL_KEY);

  if (!lockoutUntil) {
    return { isLocked: false, remainingMs: 0, remainingFormatted: '' };
  }

  const lockoutTime = parseInt(lockoutUntil, 10);
  const now = Date.now();
  const remainingMs = lockoutTime - now;

  if (remainingMs <= 0) {
    // Lockout expired, clear it
    localStorage.removeItem(LOCKOUT_UNTIL_KEY);
    return { isLocked: false, remainingMs: 0, remainingFormatted: '' };
  }

  // Format remaining time
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const remainingFormatted = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  return { isLocked: true, remainingMs, remainingFormatted };
};

/**
 * Record a failed PIN attempt
 * Triggers lockout if max attempts exceeded
 * @returns {{isLocked: boolean, attemptsRemaining: number, lockoutDuration: string}}
 */
export const recordFailedAttempt = () => {
  const currentAttempts = getFailedAttempts() + 1;
  localStorage.setItem(FAILED_ATTEMPTS_KEY, currentAttempts.toString());

  if (currentAttempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
    // Trigger lockout
    const currentLevel = getLockoutLevel();
    const newLevel = Math.min(currentLevel + 1, LOCKOUT_DURATIONS_MS.length - 1);
    const lockoutDuration = LOCKOUT_DURATIONS_MS[newLevel];
    const lockoutUntil = Date.now() + lockoutDuration;

    localStorage.setItem(LOCKOUT_UNTIL_KEY, lockoutUntil.toString());
    localStorage.setItem(LOCKOUT_LEVEL_KEY, newLevel.toString());
    localStorage.setItem(FAILED_ATTEMPTS_KEY, '0'); // Reset attempts

    // Format duration for display
    const minutes = Math.floor(lockoutDuration / 60000);
    const lockoutDurationFormatted = `${minutes} minute${minutes !== 1 ? 's' : ''}`;

    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockoutDuration: lockoutDurationFormatted
    };
  }

  return {
    isLocked: false,
    attemptsRemaining: MAX_ATTEMPTS_BEFORE_LOCKOUT - currentAttempts,
    lockoutDuration: ''
  };
};

/**
 * Clear failed attempts on successful login
 * Also resets lockout level after some time
 */
export const clearFailedAttempts = () => {
  localStorage.setItem(FAILED_ATTEMPTS_KEY, '0');
  // Note: We don't reset lockout level immediately to maintain
  // progressive lockout for persistent attackers
};

/**
 * Reset all lockout state (for testing or manual reset)
 */
export const resetLockoutState = () => {
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_UNTIL_KEY);
  localStorage.removeItem(LOCKOUT_LEVEL_KEY);
};

/**
 * Get lockout status for display
 * @returns {{failedAttempts: number, maxAttempts: number, lockoutLevel: number, isLocked: boolean, remainingFormatted: string}}
 */
export const getLockoutStatus = () => {
  const lockout = checkLockout();
  return {
    failedAttempts: getFailedAttempts(),
    maxAttempts: MAX_ATTEMPTS_BEFORE_LOCKOUT,
    lockoutLevel: getLockoutLevel(),
    isLocked: lockout.isLocked,
    remainingFormatted: lockout.remainingFormatted
  };
};
