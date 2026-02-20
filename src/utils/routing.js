// src/utils/routing.js
// Route analysis + hotspot detection.
// Primary: OpenRouteService (free, 2k req/day).
// Fallback: OSRM demo servers.
// Last resort: straight-line corridor.
// Future scalability: consider HERE Routing API (requires credit card).

const ORS_PROXY_URL = process.env.REACT_APP_ORS_PROXY_URL;

const OSRM_SERVERS = [
  'https://router.project-osrm.org/route/v1/driving',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
];

const FETCH_TIMEOUT_MS = 12000;

/**
 * Fetch with a timeout (AbortController). Accepts fetch options for POST requests.
 */
function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Try OpenRouteService via Cloudflare Worker proxy (keeps API key server-side).
 */
async function tryORS(startLat, startLng, endLat, endLng) {
  if (!ORS_PROXY_URL) return null;

  const body = {
    coordinates: [
      [startLng, startLat],
      [endLng, endLat],
    ],
    alternative_routes: { target_count: 3 },
  };

  const res = await fetchWithTimeout(ORS_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.features || data.features.length === 0) return null;

  return data.features.map((feature) => ({
    geometry: feature.geometry, // GeoJSON LineString
    distance: (feature.properties.summary?.distance || 0) / 1609.34, // metres → miles
    duration: (feature.properties.summary?.duration || 0) / 60, // seconds → minutes
    waypoints: [],
  }));
}

/**
 * Fallback: try OSRM demo servers.
 */
async function tryOSRM(startLat, startLng, endLat, endLng) {
  const params = `${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=true`;

  for (const base of OSRM_SERVERS) {
    try {
      const res = await fetchWithTimeout(`${base}/${params}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.routes || data.routes.length === 0) continue;

      return data.routes.map((route) => ({
        geometry: route.geometry, // GeoJSON LineString
        distance: route.distance / 1609.34, // metres → miles
        duration: route.duration / 60, // seconds → minutes
        waypoints: data.waypoints,
      }));
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Get a driving route. Tries providers in order:
 * 1. OpenRouteService (reliable, API key required)
 * 2. OSRM demo servers (free, no key, but unreliable)
 * 3. Straight-line fallback (always works, flagged with isFallback)
 *
 * Returns [{ geometry, distance (miles), duration (minutes), waypoints }].
 */
export async function getRoute(startLat, startLng, endLat, endLng) {
  // 1. OpenRouteService
  try {
    const orsResult = await tryORS(startLat, startLng, endLat, endLng);
    if (orsResult) return orsResult;
  } catch {
    // ORS failed — try OSRM
  }

  // 2. OSRM demo servers
  try {
    const osrmResult = await tryOSRM(startLat, startLng, endLat, endLng);
    if (osrmResult) return osrmResult;
  } catch {
    // OSRM failed too
  }

  // 3. Straight-line fallback
  const distM = haversineMeters(startLat, startLng, endLat, endLng);
  const numPoints = Math.max(2, Math.ceil(distM / 200));
  const coords = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    coords.push([
      startLng + t * (endLng - startLng),
      startLat + t * (endLat - startLat),
    ]);
  }

  return [{
    geometry: { type: 'LineString', coordinates: coords },
    distance: distM / 1609.34,
    duration: (distM / 1609.34) * 2.5, // rough driving estimate
    waypoints: [],
    isFallback: true,
  }];
}

/**
 * Sample points along a GeoJSON LineString at roughly `intervalMeters` apart.
 * Returns [{ lat, lng }, ...].
 */
export function sampleRoutePoints(geometry, intervalMeters = 200) {
  const coords = geometry.coordinates; // [lng, lat] pairs
  if (!coords || coords.length < 2) return [];

  const points = [];
  let accumulated = 0;

  points.push({ lat: coords[0][1], lng: coords[0][0] });

  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const segDist = haversineMeters(lat1, lng1, lat2, lng2);
    accumulated += segDist;

    if (accumulated >= intervalMeters) {
      points.push({ lat: lat2, lng: lng2 });
      accumulated = 0;
    }
  }

  // Always include the last point
  const last = coords[coords.length - 1];
  points.push({ lat: last[1], lng: last[0] });

  return points;
}

/**
 * Haversine distance in metres (internal helper).
 */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find reports that are close to any sampled point along the route.
 * Returns [{ report, nearestRoutePoint, distanceMiles }] sorted by distance along route.
 */
export function analyzeRouteHotspots(routePoints, reports, radiusMiles = 0.5) {
  const found = new Map(); // reportId → best match

  for (const point of routePoints) {
    for (const report of reports) {
      if (!report.lat || !report.lng) continue;

      const dist = haversineMeters(point.lat, point.lng, report.lat, report.lng) / 1609.34; // → miles
      if (dist > radiusMiles) continue;

      const existing = found.get(report.id);
      if (!existing || dist < existing.distanceMiles) {
        found.set(report.id, {
          report,
          nearestRoutePoint: point,
          distanceMiles: dist,
        });
      }
    }
  }

  return [...found.values()].sort((a, b) => a.distanceMiles - b.distanceMiles);
}

/**
 * Forward geocode an address via Nominatim (free, no API key).
 * Returns { lat, lng, displayName } or null.
 */
export async function forwardGeocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetchWithTimeout(url, {}, 10000);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}
