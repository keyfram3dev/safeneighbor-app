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
const CARDINAL_LABELS = {
  north: 'north',
  south: 'south',
  east: 'east',
  west: 'west',
};

function buildNominatimSearchUrl(address, bias = null, limit = 1) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: address,
    limit: String(limit),
    countrycodes: 'us',
    dedupe: '1',
    addressdetails: '1',
  });

  if (bias?.lat && bias?.lng) {
    const west = bias.lng - 0.38;
    const east = bias.lng + 0.38;
    const north = bias.lat + 0.26;
    const south = bias.lat - 0.26;
    params.set('viewbox', `${west},${north},${east},${south}`);
    params.set('bounded', '0');
  }

  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

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
    steps: feature.properties?.segments?.flatMap((segment) => segment.steps || []) || [],
    provider: 'ors',
  }));
}

/**
 * Fallback: try OSRM demo servers.
 */
async function tryOSRM(startLat, startLng, endLat, endLng) {
  const coordinatePath = `${startLng},${startLat};${endLng},${endLat}`;
  const queryVariants = [
    '?overview=full&geometries=geojson&alternatives=true&steps=true',
    '?overview=full&geometries=geojson&alternatives=false&steps=true',
    '?overview=full&geometries=geojson&alternatives=false&steps=false',
  ];

  for (const base of OSRM_SERVERS) {
    for (const query of queryVariants) {
      try {
        const res = await fetchWithTimeout(`${base}/${coordinatePath}${query}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.routes || data.routes.length === 0) continue;

        return data.routes.map((route) => ({
          geometry: route.geometry, // GeoJSON LineString
          distance: route.distance / 1609.34, // metres → miles
          duration: route.duration / 60, // seconds → minutes
          waypoints: data.waypoints,
          steps: route.legs?.flatMap((leg) => leg.steps || []) || [],
          provider: 'osrm',
        }));
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Get a driving route. Tries providers in order:
 * 1. OpenRouteService (reliable, API key required)
 * 2. OSRM demo servers (free, no key, but unreliable)
 * 3. No fake fallback. If routing providers fail, return null.
 *
 * Returns [{ geometry, distance (miles), duration (minutes), waypoints, steps }].
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

  return null;
}

function getOverallDirection(start, end) {
  const latDelta = end[1] - start[1];
  const lngDelta = end[0] - start[0];

  if (Math.abs(latDelta) >= Math.abs(lngDelta)) {
    return latDelta >= 0 ? CARDINAL_LABELS.north : CARDINAL_LABELS.south;
  }

  return lngDelta >= 0 ? CARDINAL_LABELS.east : CARDINAL_LABELS.west;
}

function normalizeRoadName(step) {
  const raw = step?.name || step?.ref || step?.street_name || '';
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (/unnamed/i.test(trimmed)) return null;
  if (/^[-–—]+$/.test(trimmed)) return null;
  return trimmed;
}

function collectPrimaryRoads(route) {
  const roads = new Map();
  const steps = route?.steps || [];

  steps.forEach((step) => {
    const roadName = normalizeRoadName(step);
    if (!roadName) return;

    const distance = step.distance || step.length || 0;
    roads.set(roadName, (roads.get(roadName) || 0) + distance);
  });

  return [...roads.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name);
}

export function summarizeDrivingRoute(route) {
  const coordinates = route?.geometry?.coordinates || [];
  if (coordinates.length < 2) return 'Route summary unavailable.';

  const direction = getOverallDirection(coordinates[0], coordinates[coordinates.length - 1]);
  const roads = collectPrimaryRoads(route);

  if (roads.length >= 2) {
    return `Mostly via ${roads[0]}, then ${roads[1]}.`;
  }

  if (roads.length === 1) {
    return `Mostly via ${roads[0]} heading ${direction}.`;
  }

  return `Mostly local streets heading ${direction}.`;
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
export async function forwardGeocode(address, bias = null) {
  const normalizedAddress = address
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());

  let url = buildNominatimSearchUrl(normalizedAddress, bias, 1);
  let res = await fetchWithTimeout(url, {}, 10000);
  if (!res.ok) return null;
  let data = await res.json();

  if ((!data || data.length === 0) && normalizedAddress !== address.trim()) {
    url = buildNominatimSearchUrl(address.trim(), bias, 1);
    res = await fetchWithTimeout(url, {}, 10000);
    if (!res.ok) return null;
    data = await res.json();
  }

  if (!data || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}
