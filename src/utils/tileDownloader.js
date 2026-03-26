// src/utils/tileDownloader.js
// Utility for computing OSM tile coordinates and orchestrating
// bulk tile downloads via the service worker.

// ─── Tile Math ──────────────────────────────────────────────

/**
 * Convert lat/lng to OSM tile coordinates at a given zoom level.
 * Standard "slippy map" formula: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
 */
export function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/**
 * Compute all tile URLs for given zoom levels around a center point.
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {{ zoom: number, gridRadius: number }[]} levels
 * @returns {string[]} Array of tile URLs
 */
export function computeTileList(lat, lng, levels) {
  const subdomains = ['a', 'b', 'c'];
  const urls = [];
  for (const { zoom, gridRadius } of levels) {
    const center = latLngToTile(lat, lng, zoom);
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        const x = center.x + dx;
        const y = center.y + dy;
        const s = subdomains[Math.abs(x + y) % 3];
        urls.push(`https://${s}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
      }
    }
  }
  return urls;
}

/**
 * Default tile levels: zooms 11–14 with increasing grid radius.
 * Total: 9 + 25 + 81 + 289 = 404 tiles ≈ 8 MB
 */
export const DEFAULT_TILE_LEVELS = [
  { zoom: 11, gridRadius: 1 },  // 3x3   =   9 tiles — regional overview
  { zoom: 12, gridRadius: 2 },  // 5x5   =  25 tiles — city level
  { zoom: 13, gridRadius: 4 },  // 9x9   =  81 tiles — neighborhood
  { zoom: 14, gridRadius: 8 },  // 17x17 = 289 tiles — street level
];

const BYTES_PER_TILE = 20 * 1024; // 20KB average

/**
 * Estimate storage in MB for a given tile count.
 */
export function estimateStorageMB(tileCount) {
  return ((tileCount * BYTES_PER_TILE) / (1024 * 1024)).toFixed(1);
}

// ─── Service Worker Message Helpers ─────────────────────────

async function postToSW(message) {
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage(message);
}

/**
 * Request the service worker to bulk-download tile URLs.
 */
export function requestTileDownload(urls) {
  return postToSW({ type: 'DOWNLOAD_TILES', urls });
}

/**
 * Listen for tile download progress messages from the service worker.
 * @returns {Function} Cleanup function to stop listening.
 */
export function listenForTileProgress(callback) {
  const handler = (event) => {
    if (event.data?.type === 'TILE_PROGRESS') {
      callback(event.data);
    }
    if (event.data?.type === 'TILE_DOWNLOAD_COMPLETE') {
      callback({ ...event.data, done: true });
    }
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}

/**
 * Cancel an in-progress tile download.
 */
export function requestCancelTileDownload() {
  return postToSW({ type: 'CANCEL_TILE_DOWNLOAD' });
}

/**
 * Ask the service worker how many tiles are cached.
 */
export function requestTileCacheSize() {
  return postToSW({ type: 'GET_TILE_CACHE_SIZE' });
}

/**
 * Clear all cached map tiles.
 */
export function requestClearTileCache() {
  return postToSW({ type: 'CLEAR_TILE_CACHE' });
}
