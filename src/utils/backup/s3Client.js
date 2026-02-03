// src/utils/backup/s3Client.js
// S3-compatible client for Cloudflare R2 storage
// Uses official AWS SDK for proper authentication

import {
  S3Client as AwsS3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

/**
 * S3-compatible client for Cloudflare R2
 * Handles uploads, downloads, and file management via S3 API
 */
export class S3Client {
  constructor(accountId, accessKeyId, secretAccessKey, bucket) {
    this.bucket = bucket;
    this.endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    this.client = new AwsS3Client({
      region: 'auto',
      endpoint: this.endpoint,
      forcePathStyle: true,  // R2 requires path-style URLs, not virtual-hosted
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Upload an encrypted file to R2
   * @param {string} key - File path/name in bucket
   * @param {Uint8Array|ArrayBuffer} data - Encrypted file data
   * @param {string} contentType - MIME type (default: application/octet-stream)
   * @returns {Promise<{key: string, url: string, size: number}>}
   */
  async uploadFile(key, data, contentType = 'application/octet-stream') {
    const dataArray = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: dataArray,
      ContentType: contentType,
    });

    const response = await this.client.send(command);

    return {
      key,
      url: `${this.endpoint}/${this.bucket}/${key}`,
      size: dataArray.length || dataArray.byteLength,
      etag: response.ETag,
    };
  }

  /**
   * Download and return encrypted file data
   * @param {string} key - File path in bucket
   * @returns {Promise<ArrayBuffer>}
   */
  async downloadFile(key) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    // Convert stream to ArrayBuffer
    const bytes = await response.Body.transformToByteArray();
    return bytes.buffer;
  }

  /**
   * Delete a file from storage
   * @param {string} key - File path in bucket
   * @returns {Promise<boolean>}
   */
  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
    return true;
  }

  /**
   * List files in the bucket
   * @param {string} prefix - Optional prefix to filter files
   * @returns {Promise<Array<{key: string, size: number, lastModified: string}>>}
   */
  async listFiles(prefix = '') {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix || undefined,
    });

    const response = await this.client.send(command);

    return (response.Contents || []).map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified?.toISOString() || null,
    }));
  }

  /**
   * Check if connection to R2 is working
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.listFiles();
      return true;
    } catch (error) {
      console.error('R2 connection test failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create S3Client from stored credentials
 * @param {Object} credentials - { accountId, accessKeyId, secretAccessKey, bucket }
 * @returns {S3Client}
 */
export const createS3Client = (credentials) => {
  if (!credentials.accountId || !credentials.accessKeyId || !credentials.secretAccessKey || !credentials.bucket) {
    throw new Error('Missing required R2 credentials');
  }
  return new S3Client(
    credentials.accountId,
    credentials.accessKeyId,
    credentials.secretAccessKey,
    credentials.bucket
  );
};
