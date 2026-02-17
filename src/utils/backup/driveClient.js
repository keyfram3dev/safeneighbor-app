// src/utils/backup/driveClient.js
// Google Drive API v3 client for encrypted recording backup
// Mirrors the S3Client interface for interoperability with uploadQueue

import { getAccessToken } from './googleAuth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'SafeNeighbor Backups';

export class DriveClient {
  constructor() {
    this._folderId = null;
  }

  /**
   * Get a valid access token, refreshing if needed
   */
  async _getValidToken() {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Google Drive not authenticated. Please sign in again.');
    }
    return token;
  }

  /**
   * Make an authenticated fetch request to Drive API
   */
  async _fetch(url, options = {}) {
    const token = await this._getValidToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drive API error (${response.status}): ${errorText}`);
    }

    return response;
  }

  /**
   * Find or create the "SafeNeighbor Backups" folder
   * Caches the folder ID for the session
   */
  async _ensureFolder() {
    if (this._folderId) return this._folderId;

    // Search for existing folder
    const query = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchRes = await this._fetch(
      `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`
    );
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      this._folderId = searchData.files[0].id;
      return this._folderId;
    }

    // Create the folder
    const createRes = await this._fetch(`${DRIVE_API}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const folderData = await createRes.json();
    this._folderId = folderData.id;
    return this._folderId;
  }

  /**
   * Find a file by exact name in the SafeNeighbor folder
   */
  async _findFileByName(name) {
    const folderId = await this._ensureFolder();
    const query = `name='${name}' and '${folderId}' in parents and trashed=false`;
    const res = await this._fetch(
      `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,modifiedTime)&spaces=drive`
    );
    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  /**
   * Upload an encrypted file to Google Drive
   * @param {string} key - File name (used as the Drive file name)
   * @param {Uint8Array|ArrayBuffer} data - Encrypted file data
   * @param {string} contentType - MIME type (default: application/octet-stream)
   * @returns {Promise<{key: string, driveFileId: string, size: number}>}
   */
  async uploadFile(key, data, contentType = 'application/octet-stream') {
    const folderId = await this._ensureFolder();

    // Check if file already exists (avoid duplicates)
    const existing = await this._findFileByName(key);
    if (existing) {
      // Update existing file
      const token = await this._getValidToken();
      const boundary = '---safeneighbor-' + Date.now();

      const metadata = JSON.stringify({
        name: key,
      });

      const body = buildMultipartBody(boundary, metadata, data, contentType);

      const response = await fetch(
        `${DRIVE_UPLOAD_API}/files/${existing.id}?uploadType=multipart`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Drive upload error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return {
        key,
        driveFileId: result.id,
        size: data.byteLength || data.length,
      };
    }

    // Create new file with multipart upload
    const token = await this._getValidToken();
    const boundary = '---safeneighbor-' + Date.now();

    const metadata = JSON.stringify({
      name: key,
      parents: [folderId],
      description: 'SafeNeighbor encrypted backup',
    });

    const body = buildMultipartBody(boundary, metadata, data, contentType);

    const response = await fetch(
      `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drive upload error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return {
      key,
      driveFileId: result.id,
      size: data.byteLength || data.length,
    };
  }

  /**
   * Download a file from Google Drive by name
   * @param {string} key - File name to find and download
   * @returns {Promise<ArrayBuffer>}
   */
  async downloadFile(key) {
    const file = await this._findFileByName(key);
    if (!file) {
      throw new Error(`File not found: ${key}`);
    }

    const res = await this._fetch(
      `${DRIVE_API}/files/${file.id}?alt=media`
    );
    return res.arrayBuffer();
  }

  /**
   * Delete a file from Google Drive by name
   * @param {string} key - File name to find and delete
   * @returns {Promise<boolean>}
   */
  async deleteFile(key) {
    const file = await this._findFileByName(key);
    if (!file) return true; // Already gone

    const token = await this._getValidToken();
    const res = await fetch(`${DRIVE_API}/files/${file.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok && res.status !== 204) {
      const errorText = await res.text();
      throw new Error(`Drive delete error (${res.status}): ${errorText}`);
    }

    return true;
  }

  /**
   * List files in the SafeNeighbor Backups folder
   * @param {string} prefix - Optional prefix to filter file names
   * @returns {Promise<Array<{key: string, size: number, lastModified: string, driveFileId: string}>>}
   */
  async listFiles(prefix = '') {
    const folderId = await this._ensureFolder();

    let query = `'${folderId}' in parents and trashed=false`;
    if (prefix) {
      query += ` and name contains '${prefix}'`;
    }

    const res = await this._fetch(
      `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,modifiedTime)&spaces=drive&pageSize=1000`
    );
    const data = await res.json();

    return (data.files || []).map(file => ({
      key: file.name,
      size: parseInt(file.size) || 0,
      lastModified: file.modifiedTime || null,
      driveFileId: file.id,
    }));
  }

  /**
   * Test connection by listing files in the folder
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this._ensureFolder();
      return true;
    } catch (error) {
      console.error('Google Drive connection test failed:', error);
      // Re-throw with details so UI can show the actual error
      throw error;
    }
  }
}

/**
 * Build a multipart/related body for Drive API upload
 */
function buildMultipartBody(boundary, metadataJson, data, contentType) {
  const encoder = new TextEncoder();

  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = encoder.encode(
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadataJson}`
  );
  const dataPreamble = encoder.encode(
    `${delimiter}Content-Type: ${contentType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`
  );
  const closing = encoder.encode(closeDelimiter);

  // Convert data to Uint8Array if needed
  const dataBytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer || data);

  // Combine all parts into a single ArrayBuffer
  const totalLength = metadataPart.length + dataPreamble.length + dataBytes.length + closing.length;
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  combined.set(metadataPart, offset); offset += metadataPart.length;
  combined.set(dataPreamble, offset); offset += dataPreamble.length;
  combined.set(dataBytes, offset); offset += dataBytes.length;
  combined.set(closing, offset);

  return combined.buffer;
}

/**
 * Factory function to create DriveClient
 * @returns {DriveClient}
 */
export const createDriveClient = () => {
  return new DriveClient();
};
