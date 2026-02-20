const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const crypto = require('crypto');
const webpush = require('web-push');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Load environment variables from .env file for local development
require('dotenv').config();

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REPORTS_PER_WINDOW = 3; // Max 3 reports per hour per IP

/**
 * Proxy for Gemini API calls
 * Keeps API key secure on the server side
 *
 * Set GEMINI_API_KEY as environment variable or in functions/.env
 */
exports.geminiProxy = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Get API key from environment variable
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.error('Gemini API key not configured');
        return res.status(500).json({
          error: 'API key not configured. Set GEMINI_API_KEY environment variable.'
        });
      }

      // Get the prompt from request body - using stable model name
      const { prompt, model = 'gemini-2.0-flash' } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Call Gemini API
      // Include Referer header to satisfy API key referrer restrictions
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://safeneighbor-33bb0.web.app/',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        return res.status(response.status).json({
          error: 'Gemini API error',
          details: errorText
        });
      }

      const data = await response.json();
      return res.status(200).json(data);

    } catch (error) {
      console.error('Proxy error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

/**
 * Health check endpoint
 */
exports.health = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'SafeNeighbor Functions'
    });
  });
});

/**
 * Hash an IP address for privacy (we don't store raw IPs)
 */
const hashIP = (ip) => {
  return crypto.createHash('sha256').update(ip + 'safeneighbor_salt').digest('hex').substring(0, 16);
};

/**
 * Get client IP from request (handles proxies)
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         'unknown';
};

/**
 * Rate-limited report submission
 * Enforces server-side rate limiting that can't be bypassed
 */
exports.submitReport = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const clientIP = getClientIP(req);
      const ipHash = hashIP(clientIP);
      const now = Date.now();

      // Check rate limit
      const rateLimitRef = db.collection('rateLimits').doc(ipHash);
      const rateLimitDoc = await rateLimitRef.get();

      if (rateLimitDoc.exists) {
        const data = rateLimitDoc.data();
        const windowStart = data.windowStart || 0;
        const count = data.count || 0;

        // Check if we're still in the rate limit window
        if (now - windowStart < RATE_LIMIT_WINDOW_MS) {
          if (count >= MAX_REPORTS_PER_WINDOW) {
            const remainingMs = RATE_LIMIT_WINDOW_MS - (now - windowStart);
            const remainingMin = Math.ceil(remainingMs / 60000);
            return res.status(429).json({
              error: 'Rate limit exceeded',
              message: `Too many reports. Please wait ${remainingMin} minutes.`,
              retryAfter: remainingMs
            });
          }
        }
      }

      // Determine submission format: encrypted payload vs legacy plaintext
      const { encryptedPayload, payloadVersion, timestamp: clientTimestamp, deviceId } = req.body;
      const isFullyEncrypted = !!encryptedPayload;

      let report;

      if (isFullyEncrypted) {
        // New format: all sensitive fields encrypted client-side
        if (typeof encryptedPayload !== 'string' || encryptedPayload.length < 10) {
          return res.status(400).json({ error: 'Invalid encrypted payload' });
        }
        if (!clientTimestamp || typeof clientTimestamp !== 'string') {
          return res.status(400).json({ error: 'Timestamp is required' });
        }

        report = {
          encryptedPayload,
          payloadVersion: payloadVersion || 1,
          timestamp: clientTimestamp,
          verified: false,
          verifiers: [],
          deviceId: deviceId || 'unknown',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
      } else {
        // Legacy format: individual plaintext fields (backward compat)
        const { lat, lng, description, agents, vehicles, activity, location, city, state, encryptedDescription, descriptionVersion } = req.body;
        const isDescEncrypted = !!encryptedDescription;

        if (typeof lat !== 'number' || lat < 24 || lat > 50) {
          return res.status(400).json({ error: 'Invalid latitude (must be in US)' });
        }
        if (typeof lng !== 'number' || lng < -125 || lng > -66) {
          return res.status(400).json({ error: 'Invalid longitude (must be in US)' });
        }
        if (!isDescEncrypted && (!description || typeof description !== 'string' || description.length < 10 || description.length > 500)) {
          return res.status(400).json({ error: 'Description must be 10-500 characters' });
        }

        const agentCount = parseInt(agents) || 0;
        const vehicleCount = parseInt(vehicles) || 0;
        if (agentCount < 0 || agentCount > 50) {
          return res.status(400).json({ error: 'Agent count must be 0-50' });
        }
        if (vehicleCount < 0 || vehicleCount > 20) {
          return res.status(400).json({ error: 'Vehicle count must be 0-20' });
        }

        let sanitizedDescription = description.replace(/<[^>]*>/g, '').trim();
        sanitizedDescription = sanitizedDescription
          .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[phone removed]')
          .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email removed]');

        const roundedLat = Math.round(lat * 400) / 400;
        const roundedLng = Math.round(lng * 400) / 400;

        const timestamp = new Date();
        timestamp.setMinutes(Math.floor(timestamp.getMinutes() / 15) * 15);
        timestamp.setSeconds(0);
        timestamp.setMilliseconds(0);

        report = {
          lat: roundedLat,
          lng: roundedLng,
          description: isDescEncrypted ? '[encrypted]' : sanitizedDescription,
          ...(isDescEncrypted && { encryptedDescription, descriptionVersion: descriptionVersion || 1 }),
          agents: agentCount,
          vehicles: vehicleCount,
          activity: activity || 'Unknown',
          location: location || `Near ${roundedLat.toFixed(2)}, ${roundedLng.toFixed(2)}`,
          city: city || '',
          state: state || '',
          timestamp: timestamp.toISOString(),
          verified: false,
          verifiers: [],
          deviceId: (deviceId || 'unknown'),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
      }

      // Save to Firestore
      const docRef = await db.collection('iceReports').add(report);

      // Update rate limit
      const rateLimitData = rateLimitDoc.exists ? rateLimitDoc.data() : {};
      const windowStart = rateLimitData.windowStart || 0;

      if (now - windowStart >= RATE_LIMIT_WINDOW_MS) {
        // Start new window
        await rateLimitRef.set({
          windowStart: now,
          count: 1,
          lastReport: now
        });
      } else {
        // Increment count in current window
        await rateLimitRef.update({
          count: admin.firestore.FieldValue.increment(1),
          lastReport: now
        });
      }

      return res.status(201).json({
        success: true,
        reportId: docRef.id,
        message: 'Report submitted successfully'
      });

    } catch (error) {
      console.error('Submit report error:', error.message);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

/**
 * Cleanup old rate limit records (run daily via Cloud Scheduler)
 * This keeps the rateLimits collection from growing indefinitely
 */
exports.cleanupRateLimits = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

  const snapshot = await db.collection('rateLimits')
    .where('lastReport', '<', cutoff)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));

  await batch.commit();
  console.log(`Cleaned up ${snapshot.size} old rate limit records`);
});

/**
 * Serve the community report encryption key
 * Key is stored in environment variable (set via Firebase functions:config or .env)
 */
exports.getReportKey = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const key = process.env.COMMUNITY_REPORT_KEY;
    if (!key) {
      return res.status(500).json({ error: 'Report encryption key not configured' });
    }

    // Cache for 1 hour on the client
    res.set('Cache-Control', 'private, max-age=3600');
    return res.status(200).json({
      key: key,
      version: 1
    });
  });
});

/**
 * Delete expired live location docs (runs every hour)
 * Live location docs older than 24 hours are permanently deleted.
 * This prevents stale location data from persisting in Firestore.
 */
exports.cleanupLiveLocations = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
  const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const cutoffDate = new Date(Date.now() - TTL_MS);
  const cutoffISO = cutoffDate.toISOString();

  const snapshot = await db.collection('liveLocations')
    .where('createdAt', '<', cutoffISO)
    .limit(500)
    .get();

  if (snapshot.empty) {
    console.log('No expired live locations to clean up');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  console.log(`Deleted ${snapshot.size} expired live location docs (older than 24h)`);
});

/**
 * Delete expired reports (runs every 6 hours)
 * Reports older than 48 hours are permanently deleted from Firestore.
 * This ensures no report data persists beyond the heat map window.
 */
exports.cleanupExpiredReports = functions.pubsub.schedule('every 6 hours').onRun(async (context) => {
  const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
  const cutoffDate = new Date(Date.now() - TTL_MS);
  const cutoffISO = cutoffDate.toISOString();

  const snapshot = await db.collection('iceReports')
    .where('timestamp', '<', cutoffISO)
    .limit(500)
    .get();

  if (snapshot.empty) {
    console.log('No expired reports to clean up');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  console.log(`Deleted ${snapshot.size} expired reports (older than 48h)`);
});

/**
 * Returns approximate location based on the requester's IP address.
 * Used as a same-origin fallback when browser geolocation fails in iOS PWAs.
 */
exports.ipLocation = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
      // Try multiple services
      const services = [
        `https://ipwho.is/${ip}`,
        `https://ipapi.co/${ip}/json/`,
      ];
      for (const url of services) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const data = await response.json();
          const lat = data.latitude;
          const lng = data.longitude;
          if (lat && lng) {
            return res.status(200).json({ lat, lng });
          }
        } catch (e) { /* try next */ }
      }
      return res.status(503).json({ error: 'Could not determine location' });
    } catch (error) {
      return res.status(500).json({ error: 'Internal error' });
    }
  });
});

// ─── Web Push Notifications ───────────────────────────────────

// Configure VAPID (set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL in functions/.env)
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:SafeNeighbor.us@proton.me';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

/**
 * Register a push subscription with coarse geohash prefixes for digest alerts.
 * PRIVACY: Only geohash-5 prefixes (~5km grid) are stored — no precise
 * coordinates, labels, or IDs ever reach the server.
 */
exports.registerPushSubscription = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
      const { subscription, geoHashPrefixes } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Subscription endpoint required' });
      }

      // Validate prefixes are strings of length 5
      const prefixes = (geoHashPrefixes || []).filter(p => typeof p === 'string' && p.length === 5);

      const endpointHash = crypto.createHash('sha256').update(subscription.endpoint).digest('hex').substring(0, 32);

      await db.collection('pushSubscriptions').doc(endpointHash).set({
        subscription,
        geoHashPrefixes: prefixes,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return res.status(200).json({ success: true, id: endpointHash });
    } catch (error) {
      console.error('registerPushSubscription error:', error);
      return res.status(500).json({ error: 'Internal error' });
    }
  });
});

/**
 * Unregister a push subscription.
 */
exports.unregisterPushSubscription = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
      const { endpoint } = req.body;
      if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });

      const endpointHash = crypto.createHash('sha256').update(endpoint).digest('hex').substring(0, 32);
      await db.collection('pushSubscriptions').doc(endpointHash).delete();

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('unregisterPushSubscription error:', error);
      return res.status(500).json({ error: 'Internal error' });
    }
  });
});

/**
 * Server-side geohash-5 encoder (same algorithm as client).
 * Used to convert report lat/lng to a geohash prefix for matching.
 */
const GH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
function encodeGeohash(lat, lng, precision) {
  precision = precision || 5;
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  let hash = '', bit = 0, ch = 0, isLng = true;
  while (hash.length < precision) {
    if (isLng) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { ch |= (1 << (4 - bit)); lngMin = mid; } else { lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { ch |= (1 << (4 - bit)); latMin = mid; } else { latMax = mid; }
    }
    isLng = !isLng;
    bit++;
    if (bit === 5) { hash += GH_BASE32[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

/**
 * Scheduled push digest — runs every 2 hours.
 * PRIVACY: Matches reports to subscribers using geohash-5 prefixes only.
 * No precise coordinates or location labels are stored or transmitted
 * through the push notification infrastructure.
 */
exports.sendPushDigests = functions.pubsub.schedule('every 2 hours').onRun(async () => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log('VAPID keys not configured — skipping push digests');
    return;
  }

  // 1. Get reports from the last 2 hours that have plaintext lat/lng
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const reportsSnap = await db.collection('iceReports')
    .where('timestamp', '>', cutoff)
    .get();

  // Convert each report's lat/lng to a geohash-5 prefix
  const reportGeohashes = new Set();
  let reportCount = 0;
  reportsSnap.forEach((doc) => {
    const data = doc.data();
    if (typeof data.lat === 'number' && typeof data.lng === 'number') {
      reportGeohashes.add(encodeGeohash(data.lat, data.lng));
      reportCount++;
    }
  });

  if (reportCount === 0) {
    console.log('No recent unencrypted reports — skipping digest');
    return;
  }

  // 2. Get all push subscriptions
  const subsSnap = await db.collection('pushSubscriptions').get();
  if (subsSnap.empty) {
    console.log('No push subscribers');
    return;
  }

  let sent = 0;
  let cleaned = 0;

  for (const subDoc of subsSnap.docs) {
    const { subscription, geoHashPrefixes } = subDoc.data();
    if (!subscription || !geoHashPrefixes || geoHashPrefixes.length === 0) continue;

    // Check if any report geohash matches any subscriber prefix
    const prefixSet = new Set(geoHashPrefixes);
    let matched = false;
    for (const gh of reportGeohashes) {
      if (prefixSet.has(gh)) { matched = true; break; }
    }

    if (!matched) continue;

    // PRIVACY: Generic notification body — never include location labels or counts
    const payload = JSON.stringify({
      title: 'SafeNeighbor',
      body: 'Activity reported near your area',
      icon: '/logo192.png',
      badge: '/favicon-32x32.png',
      data: { url: '/?tab=report' },
    });

    try {
      await webpush.sendNotification(subscription, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await subDoc.ref.delete();
        cleaned++;
      } else {
        console.error('Push send error:', err.statusCode, err.message);
      }
    }
  }

  console.log(`Push digest: ${sent} sent, ${cleaned} expired subscriptions cleaned`);
});
