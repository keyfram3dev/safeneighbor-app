// src/utils/geo.js
// Shared geolocation utilities: distance calculation, proximity filtering, clustering.

/** Earth radius in miles (used for Haversine). */
const R_MILES = 3958.8;

/** Handy distance constants (miles). */
export const HALF_MILE = 0.5;
export const ONE_MILE = 1;
export const THREE_MILES = 3;

/** Three miles expressed in metres (kept for backward compat with CommunityReports). */
export const THREE_MILES_IN_METERS = 4828.03;

/**
 * Haversine distance between two lat/lng points.
 * @returns distance in **miles**
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R_MILES * c;
}

/**
 * Return reports that fall within `radiusMiles` of a point, sorted nearest→farthest.
 * Each result gets an added `.distance` property (miles).
 */
export function findReportsWithinRadius(lat, lng, reports, radiusMiles) {
  return reports
    .map((r) => {
      if (!r.lat || !r.lng) return null;
      const d = calculateDistance(lat, lng, r.lat, r.lng);
      return d <= radiusMiles ? { ...r, distance: d } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Simple distance-based clustering.
 * Reports within `clusterRadiusMiles` of each other get grouped together.
 * Returns array of clusters, each: `{ center: {lat, lng}, reports: [...], count }`.
 */
export function clusterReports(reports, clusterRadiusMiles = HALF_MILE) {
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < reports.length; i++) {
    if (assigned.has(i)) continue;
    const seed = reports[i];
    if (!seed.lat || !seed.lng) continue;

    const group = [seed];
    assigned.add(i);

    for (let j = i + 1; j < reports.length; j++) {
      if (assigned.has(j)) continue;
      const other = reports[j];
      if (!other.lat || !other.lng) continue;
      if (calculateDistance(seed.lat, seed.lng, other.lat, other.lng) <= clusterRadiusMiles) {
        group.push(other);
        assigned.add(j);
      }
    }

    // Cluster center = average lat/lng
    const center = {
      lat: group.reduce((s, r) => s + r.lat, 0) / group.length,
      lng: group.reduce((s, r) => s + r.lng, 0) / group.length,
    };

    clusters.push({ center, reports: group, count: group.length });
  }

  return clusters;
}
