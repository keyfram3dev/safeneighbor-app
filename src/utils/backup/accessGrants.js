// src/utils/backup/accessGrants.js
// Manages trusted contacts and access sharing for encrypted backups
// Allows sharing encryption keys and access instructions with lawyers/family

import { exportKey, generateRandomId } from '../crypto';

// LocalStorage keys for trusted contacts
const CONTACTS_STORAGE_KEY = 'safeneighbor_trusted_contacts';

/**
 * Access Grant Manager
 * Handles creation and sharing of access packages for trusted contacts
 */
export class AccessGrantManager {
  constructor(encryptionKey, r2Credentials) {
    this.encryptionKey = encryptionKey;
    this.r2Credentials = r2Credentials;
  }

  /**
   * Generate a complete access package for a trusted contact
   * Contains everything needed to access and decrypt recordings
   * @param {Object} contactInfo - { name, email, relationship }
   * @returns {Promise<Object>} Access package
   */
  async generateAccessPackage(contactInfo) {
    // Export the encryption key for sharing
    const exportedKey = await exportKey(this.encryptionKey);

    const accessPackage = {
      id: generateRandomId(),
      version: 1,
      createdAt: new Date().toISOString(),
      contact: {
        name: contactInfo.name,
        email: contactInfo.email,
        relationship: contactInfo.relationship || 'trusted contact',
      },
      // R2 access credentials
      r2: {
        endpoint: `https://${this.r2Credentials.accountId}.r2.cloudflarestorage.com`,
        accountId: this.r2Credentials.accountId,
        bucket: this.r2Credentials.bucket,
        accessKeyId: this.r2Credentials.accessKeyId,
        secretAccessKey: this.r2Credentials.secretAccessKey,
        prefix: 'recordings/', // Limit to recordings folder
      },
      // Encryption key needed to decrypt files
      encryption: {
        algorithm: 'AES-256-GCM',
        key: exportedKey,
      },
      // Human-readable instructions
      instructions: this.generateInstructions(contactInfo.name),
    };

    return accessPackage;
  }

  /**
   * Generate human-readable access instructions
   */
  generateInstructions(contactName) {
    return `
═══════════════════════════════════════════════════════════════
                    EMERGENCY ACCESS PACKAGE
                        SafeNeighbor App
═══════════════════════════════════════════════════════════════

Dear ${contactName},

If you're reading this, someone has given you emergency access
to their SafeNeighbor encrypted recordings. These may contain
important audio/video evidence.

───────────────────────────────────────────────────────────────
                    HOW TO ACCESS THE FILES
───────────────────────────────────────────────────────────────

OPTION 1: Using Cloudflare Dashboard (Recommended)
──────────────────────────────────────────────────
1. Go to: https://dash.cloudflare.com
2. Navigate to R2 Object Storage
3. Select the bucket from this package
4. Navigate to the "recordings/" folder
5. Download the .enc files

OPTION 2: Using AWS CLI
───────────────────────
1. Install AWS CLI: https://aws.amazon.com/cli/
2. Configure with these credentials:
   - Access Key: [see r2.accessKeyId]
   - Secret Key: [see r2.secretAccessKey]
3. Run: aws s3 ls s3://[bucket]/recordings/ --endpoint-url [r2.endpoint]
4. Download: aws s3 cp s3://[bucket]/recordings/ ./downloads/ --recursive --endpoint-url [r2.endpoint]

OPTION 3: Using any S3-compatible tool
──────────────────────────────────────
Cloudflare R2 is S3-compatible. Use any S3 browser/tool with:
- Endpoint: [see r2.endpoint]
- Access Key ID: [see r2.accessKeyId]
- Secret Access Key: [see r2.secretAccessKey]
- Bucket: [see r2.bucket]

───────────────────────────────────────────────────────────────
                    HOW TO DECRYPT THE FILES
───────────────────────────────────────────────────────────────

The downloaded files are encrypted with AES-256-GCM.
The encryption key is included in this package.

Using Python:
─────────────
The files use a custom format (12-byte IV prepended to ciphertext).
For technical users, you can use this Python script:

  from Crypto.Cipher import AES
  import base64

  key = base64.b64decode('[encryption.key from package]')
  with open('file.enc', 'rb') as f:
      data = f.read()
  iv = data[:12]
  ciphertext = data[12:]
  cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
  decrypted = cipher.decrypt(ciphertext[:-16])
  # Write to original format (.mp4 or .webm)

Using SafeNeighbor App:
──────────────────────
If you have access to a SafeNeighbor app installation, you can
import the encryption key and download files directly.

───────────────────────────────────────────────────────────────
                        LEGAL NOTICE
───────────────────────────────────────────────────────────────

These recordings may be evidence in legal proceedings.

• Preserve the original encrypted files
• Document when and how you accessed them
• Consult with an attorney before sharing
• The recordings may be protected by privilege

───────────────────────────────────────────────────────────────
                        CONTACT
───────────────────────────────────────────────────────────────

If you need technical assistance, the open-source SafeNeighbor
project documentation may help: [project URL]

This access package was generated on: ${new Date().toISOString()}

═══════════════════════════════════════════════════════════════
    `.trim();
  }

  /**
   * Encode access package for easy sharing (QR code, copy/paste)
   */
  encodePackage(accessPackage) {
    // Create a minimal shareable version
    const minimalPackage = {
      v: 1, // version
      r: {
        e: accessPackage.r2.endpoint,
        i: accessPackage.r2.accountId,
        b: accessPackage.r2.bucket,
        a: accessPackage.r2.accessKeyId,
        k: accessPackage.r2.secretAccessKey,
      },
      e: {
        k: accessPackage.encryption.key,
      },
    };

    return btoa(JSON.stringify(minimalPackage));
  }

  /**
   * Decode a shared access package
   */
  static decodePackage(encoded) {
    try {
      const minimalPackage = JSON.parse(atob(encoded));
      return {
        r2: {
          endpoint: minimalPackage.r.e,
          accountId: minimalPackage.r.i,
          bucket: minimalPackage.r.b,
          accessKeyId: minimalPackage.r.a,
          secretAccessKey: minimalPackage.r.k,
        },
        encryption: {
          key: minimalPackage.e.k,
        },
      };
    } catch (error) {
      throw new Error('Invalid access package format');
    }
  }

  /**
   * Generate a shareable link (for future use with a web viewer)
   */
  generateShareLink(accessPackage) {
    const encoded = this.encodePackage(accessPackage);
    // This could link to a hosted viewer in the future
    return `safeneighbor://access/${encoded}`;
  }
}

// ─────────────────────────────────────────────────────────────
// Trusted Contacts Storage (localStorage for now, IndexedDB later)
// ─────────────────────────────────────────────────────────────

/**
 * Get all trusted contacts
 * @returns {Array} List of contacts
 */
export const getTrustedContacts = () => {
  try {
    const stored = localStorage.getItem(CONTACTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Add a trusted contact
 * @param {Object} contact - { name, email, relationship }
 * @returns {Object} The added contact with ID
 */
export const addTrustedContact = (contact) => {
  const contacts = getTrustedContacts();
  const newContact = {
    id: generateRandomId(),
    createdAt: new Date().toISOString(),
    ...contact,
    accessShared: false,
    lastSharedAt: null,
  };
  contacts.push(newContact);
  localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  return newContact;
};

/**
 * Update a trusted contact
 * @param {string} id - Contact ID
 * @param {Object} updates - Fields to update
 */
export const updateTrustedContact = (id, updates) => {
  const contacts = getTrustedContacts();
  const index = contacts.findIndex(c => c.id === id);
  if (index !== -1) {
    contacts[index] = { ...contacts[index], ...updates };
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    return contacts[index];
  }
  return null;
};

/**
 * Remove a trusted contact
 * @param {string} id - Contact ID
 */
export const removeTrustedContact = (id) => {
  const contacts = getTrustedContacts();
  const filtered = contacts.filter(c => c.id !== id);
  localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
};

/**
 * Mark a contact as having received access
 */
export const markAccessShared = (contactId) => {
  return updateTrustedContact(contactId, {
    accessShared: true,
    lastSharedAt: new Date().toISOString(),
  });
};
