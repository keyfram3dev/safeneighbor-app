// src/utils/geohash.js
// Geohash encoder for privacy-preserving location matching.
// Precision 5 ≈ 4.9km × 4.9km grid — coarse enough that a geohash
// prefix never reveals a specific address.

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode lat/lng to a geohash string.
 * @param {number} lat
 * @param {number} lng
 * @param {number} precision — number of characters (default 5 ≈ ~5km grid)
 * @returns {string}
 */
export function encodeGeohash(lat, lng, precision = 5) {
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { ch |= (1 << (4 - bit)); lngMin = mid; }
      else { lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { ch |= (1 << (4 - bit)); latMin = mid; }
      else { latMax = mid; }
    }
    isLng = !isLng;
    bit++;
    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/**
 * Get the 8 neighboring geohash cells surrounding a given hash.
 * Uses the decode→shift→re-encode approach.
 */
export function getNeighbors(hash) {
  const { lat, lng, latErr, lngErr } = decodeGeohash(hash);
  const precision = hash.length;
  const dlat = 2 * latErr;
  const dlng = 2 * lngErr;

  return [
    encodeGeohash(lat + dlat, lng - dlng, precision), // N-W
    encodeGeohash(lat + dlat, lng, precision),         // N
    encodeGeohash(lat + dlat, lng + dlng, precision), // N-E
    encodeGeohash(lat, lng - dlng, precision),         // W
    encodeGeohash(lat, lng + dlng, precision),         // E
    encodeGeohash(lat - dlat, lng - dlng, precision), // S-W
    encodeGeohash(lat - dlat, lng, precision),         // S
    encodeGeohash(lat - dlat, lng + dlng, precision), // S-E
  ];
}

/**
 * Decode a geohash back to its center lat/lng and error margins.
 */
function decodeGeohash(hash) {
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let isLng = true;

  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    for (let bit = 4; bit >= 0; bit--) {
      if (isLng) {
        const mid = (lngMin + lngMax) / 2;
        if (idx & (1 << bit)) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (idx & (1 << bit)) latMin = mid;
        else latMax = mid;
      }
      isLng = !isLng;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
    latErr: (latMax - latMin) / 2,
    lngErr: (lngMax - lngMin) / 2,
  };
}

/**
 * Convert a location + radius to a set of geohash prefixes that cover the area.
 * Returns the center cell plus its 8 neighbors (always covers ≥5km in each direction).
 * @param {number} lat
 * @param {number} lng
 * @returns {string[]} unique geohash-5 prefixes
 */
export function locationToGeohashSet(lat, lng) {
  const center = encodeGeohash(lat, lng, 5);
  const neighbors = getNeighbors(center);
  return [...new Set([center, ...neighbors])];
}
