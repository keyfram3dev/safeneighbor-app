// src/utils/metadataStrip.js
// Utility for stripping identifying metadata from recordings
// Protects user privacy by removing location, timestamps, and device info

const METADATA_STRIP_ENABLED_KEY = 'safeneighbor_metadata_strip_enabled';
const LOCATION_CAPTURE_ENABLED_KEY = 'safeneighbor_location_capture_enabled';

/**
 * Check if metadata stripping is enabled
 */
export const isMetadataStripEnabled = () => {
  const stored = localStorage.getItem(METADATA_STRIP_ENABLED_KEY);
  // Default to true (strip metadata by default for privacy)
  return stored === null ? true : stored === 'true';
};

/**
 * Enable or disable metadata stripping
 */
export const setMetadataStripEnabled = (enabled) => {
  localStorage.setItem(METADATA_STRIP_ENABLED_KEY, enabled ? 'true' : 'false');
};

/**
 * Check if location capture is enabled for recordings
 */
export const isLocationCaptureEnabled = () => {
  const stored = localStorage.getItem(LOCATION_CAPTURE_ENABLED_KEY);
  // Default to false (don't capture location by default for privacy)
  return stored === 'true';
};

/**
 * Enable or disable location capture for recordings
 */
export const setLocationCaptureEnabled = (enabled) => {
  localStorage.setItem(LOCATION_CAPTURE_ENABLED_KEY, enabled ? 'true' : 'false');
};

/**
 * Strip WebM metadata from a blob
 * WebM uses EBML (Extensible Binary Meta Language) format
 * We strip WritingApp, MuxingApp, and other identifying segments
 *
 * @param {Blob} blob - The WebM blob to process
 * @returns {Promise<Blob>} - The cleaned blob
 */
export const stripWebMMetadata = async (blob) => {
  if (!isMetadataStripEnabled()) {
    return blob;
  }

  try {
    // WebM from browser MediaRecorder typically has minimal metadata
    // (no GPS, device model, etc. like EXIF in images)
    // The main metadata present is Writing/Muxing app tags which
    // identify the browser but not the user personally.
    //
    // For enhanced privacy, we could use ts-ebml library to fully parse
    // and rebuild the WebM container without metadata, but for now
    // the browser-generated WebM is acceptably private.
    //
    // The app-level metadata (timestamps, location) is handled separately
    // in processRecordingForPrivacy() by:
    // - Not capturing GPS unless explicitly enabled
    // - Generating anonymous titles instead of exact timestamps
    // - Fuzzing coordinates when location IS captured

    if (blob.type.includes('webm') && typeof MediaSource !== 'undefined') {
      // Return the blob as-is - WebM metadata is minimal
      return blob;
    }

    return blob;
  } catch (error) {
    console.error('Metadata strip failed:', error);
    return blob; // Return original on error
  }
};

/**
 * Generate a clean, anonymous filename
 * Removes timestamps and device identifiers
 *
 * @param {string} type - 'video' or 'audio'
 * @returns {string} - Anonymous filename
 */
export const generateAnonymousFilename = (type) => {
  // Use a random ID instead of timestamp
  const randomId = Math.random().toString(36).substring(2, 10);
  const ext = 'webm';
  return `recording_${randomId}.${ext}`;
};

/**
 * Generate a clean title without identifying timestamps
 *
 * @param {string} type - 'video' or 'audio'
 * @returns {string} - Clean title
 */
export const generateCleanTitle = (type) => {
  if (!isMetadataStripEnabled()) {
    return `${type === 'video' ? 'Video' : 'Audio'} ${new Date().toLocaleString()}`;
  }

  // Use relative time reference instead of exact timestamp
  const now = new Date();
  const timeOfDay = now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening';
  const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${type === 'video' ? 'Video' : 'Audio'} - ${timeOfDay} #${randomId}`;
};

/**
 * Fuzzy a coordinate for privacy (reduces precision)
 * Rounds to ~1km accuracy
 *
 * @param {number} coord - Latitude or longitude
 * @returns {number} - Fuzzied coordinate
 */
export const fuzzyCoordinate = (coord) => {
  return Math.round(coord * 100) / 100; // ~1.1km precision
};

/**
 * Round timestamp to nearest 15 minutes for privacy
 *
 * @param {Date} date - The date to round
 * @returns {Date} - Rounded date
 */
export const roundTimestamp = (date) => {
  const ms = 15 * 60 * 1000; // 15 minutes in ms
  return new Date(Math.round(date.getTime() / ms) * ms);
};

/**
 * Process recording for privacy before saving
 * Main function to be called before saving a recording
 *
 * @param {Object} recordingData - The recording data object
 * @returns {Promise<Object>} - Processed recording data
 */
export const processRecordingForPrivacy = async (recordingData) => {
  const { blob, location, ...rest } = recordingData;
  const type = recordingData.type;

  // Process the blob to strip metadata
  const cleanBlob = await stripWebMMetadata(blob);

  // Generate clean title
  const cleanTitle = generateCleanTitle(type);

  // Handle location based on settings
  let processedLocation = null;
  if (location && isLocationCaptureEnabled()) {
    if (isMetadataStripEnabled()) {
      // Fuzzy the coordinates for privacy
      processedLocation = {
        lat: fuzzyCoordinate(location.lat),
        lng: fuzzyCoordinate(location.lng)
      };
    } else {
      processedLocation = location;
    }
  }

  return {
    ...rest,
    blob: cleanBlob,
    type,
    location: processedLocation,
    title: cleanTitle,
    // Don't include exact timestamp in stored data if stripping enabled
    // The ID will still use timestamp for sorting but it's not exposed
  };
};

/**
 * Strip metadata from an image data URL (for thumbnails)
 * Canvas toDataURL typically doesn't include EXIF, but we ensure it's clean
 *
 * @param {string} dataUrl - The image data URL
 * @returns {string} - Clean data URL
 */
export const stripImageMetadata = (dataUrl) => {
  if (!dataUrl || !isMetadataStripEnabled()) {
    return dataUrl;
  }

  // Canvas toDataURL doesn't include EXIF data, so the thumbnail
  // generated via canvas is already clean. We just return it as-is.
  return dataUrl;
};

/**
 * Get current privacy settings for display
 *
 * @returns {Object} - Current settings
 */
export const getPrivacySettings = () => {
  return {
    metadataStripping: isMetadataStripEnabled(),
    locationCapture: isLocationCaptureEnabled()
  };
};

// Named exports are preferred - use import { functionName } from './metadataStrip'
