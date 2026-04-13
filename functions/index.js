const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const webpush = require('web-push');

// Restrict CORS to SafeNeighbor domains only
const ALLOWED_ORIGINS = [
  'https://safeneighbor.us',
  'https://www.safeneighbor.us',
  'https://safeneighbor-33bb0.web.app',
  'https://safeneighbor-33bb0.firebaseapp.com',
];
const cors = require('cors')({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server, curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
});

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Load environment variables from .env file for local development
require('dotenv').config();

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REPORTS_PER_WINDOW = 3; // Max 3 reports per hour per IP
const GEMINI_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_GEMINI_PER_WINDOW = 10; // Max 10 Gemini calls per minute per IP
const PROXY_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_PROXY_PER_WINDOW = 15; // Max 15 proxy calls per minute per IP
const REPORT_ACTION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REPORT_ACTIONS_PER_WINDOW = 20; // Max 20 verify/flag actions per window per IP
const COARSE_COORDINATE_FACTOR = 740; // ~150m latitude resolution

/**
 * Reusable rate limiter — checks/increments a Firestore rate limit doc
 * @returns {Promise<boolean>} true if request is allowed, false if rate-limited
 */
const checkRateLimit = async (prefix, ipHash, windowMs, maxPerWindow, res) => {
  const now = Date.now();
  const ref = db.collection('rateLimits').doc(`${prefix}_${ipHash}`);
  const doc = await ref.get();

  if (doc.exists) {
    const data = doc.data();
    if (now - (data.windowStart || 0) < windowMs) {
      if ((data.count || 0) >= maxPerWindow) {
        res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
        return false;
      }
    }
  }

  // Update after the call succeeds (caller is responsible)
  return true;
};

const incrementRateLimit = async (prefix, ipHash, windowMs) => {
  const now = Date.now();
  const ref = db.collection('rateLimits').doc(`${prefix}_${ipHash}`);
  const doc = await ref.get();
  const data = doc.exists ? doc.data() : {};

  if (now - (data.windowStart || 0) >= windowMs) {
    await ref.set({ windowStart: now, count: 1, lastReport: now });
  } else {
    await ref.update({ count: admin.firestore.FieldValue.increment(1), lastReport: now });
  }
};

/**
 * Proxy for Gemini API calls
 * Keeps API key secure on the server side
 * Rate-limited to prevent abuse
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
      // Rate limit Gemini calls per IP
      const clientIP = getClientIP(req);
      const ipHash = hashIP(clientIP);
      const now = Date.now();
      const geminiRateLimitRef = db.collection('rateLimits').doc(`gemini_${ipHash}`);
      const geminiRateLimitDoc = await geminiRateLimitRef.get();

      if (geminiRateLimitDoc.exists) {
        const data = geminiRateLimitDoc.data();
        if (now - (data.windowStart || 0) < GEMINI_RATE_LIMIT_WINDOW_MS) {
          if ((data.count || 0) >= MAX_GEMINI_PER_WINDOW) {
            return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
          }
        }
      }

      // Get API key from environment variable
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.error('Gemini API key not configured');
        return res.status(500).json({ error: 'Service temporarily unavailable' });
      }

      // Get the prompt from request body - using stable model name
      const { prompt, model = 'gemini-2.0-flash' } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Enforce prompt length limit to prevent quota abuse
      if (prompt.length > 4000) {
        return res.status(400).json({ error: 'Prompt too long (max 4000 characters)' });
      }

      // Validate model name to prevent injection into URL
      const ALLOWED_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      const safeModel = ALLOWED_MODELS.includes(model) ? model : 'gemini-2.0-flash';

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${apiKey}`,
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
        console.error('Gemini API error:', response.status);
        return res.status(502).json({ error: 'AI service error' });
      }

      // Update rate limit after successful call
      const geminiRateData = geminiRateLimitDoc.exists ? geminiRateLimitDoc.data() : {};
      if (now - (geminiRateData.windowStart || 0) >= GEMINI_RATE_LIMIT_WINDOW_MS) {
        await geminiRateLimitRef.set({ windowStart: now, count: 1, lastReport: now });
      } else {
        await geminiRateLimitRef.update({ count: admin.firestore.FieldValue.increment(1), lastReport: now });
      }

      const data = await response.json();
      return res.status(200).json(data);

    } catch (error) {
      console.error('Proxy error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
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
 * Uses HMAC with a secret key from env (falls back to static salt for backward compat)
 */
const IP_HASH_SECRET = process.env.IP_HASH_SECRET || 'safeneighbor_salt';
const hashIP = (ip) => {
  return crypto.createHmac('sha256', IP_HASH_SECRET).update(ip).digest('hex').substring(0, 16);
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

const sanitizeDeviceId = (value) => {
  if (typeof value !== 'string') return 'unknown';
  const cleaned = value.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 128);
  return cleaned || 'unknown';
};

const isValidUSCoordinatePair = (lat, lng) => (
  typeof lat === 'number' &&
  typeof lng === 'number' &&
  lat >= 24 && lat <= 50 &&
  lng >= -125 && lng <= -66
);

const calculateDistanceMiles = (lat1, lng1, lat2, lng2) => {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
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
      const {
        encryptedPayload,
        payloadVersion,
        timestamp: clientTimestamp,
        deviceId,
        coarseLat,
        coarseLng,
      } = req.body;
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
        if (!isValidUSCoordinatePair(coarseLat, coarseLng)) {
          return res.status(400).json({ error: 'Generalized report location is required' });
        }

        report = {
          encryptedPayload,
          payloadVersion: payloadVersion || 1,
          timestamp: clientTimestamp,
          coarseLat,
          coarseLng,
          geoHash5: encodeGeohash(coarseLat, coarseLng, 5),
          verified: false,
          verifiers: [],
          flaggers: [],
          deviceId: sanitizeDeviceId(deviceId),
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

        const roundedLat = Math.round(lat * COARSE_COORDINATE_FACTOR) / COARSE_COORDINATE_FACTOR;
        const roundedLng = Math.round(lng * COARSE_COORDINATE_FACTOR) / COARSE_COORDINATE_FACTOR;

        const timestamp = new Date();
        timestamp.setMinutes(Math.floor(timestamp.getMinutes() / 15) * 15);
        timestamp.setSeconds(0);
        timestamp.setMilliseconds(0);

        report = {
          lat: roundedLat,
          lng: roundedLng,
          coarseLat: roundedLat,
          coarseLng: roundedLng,
          geoHash5: encodeGeohash(roundedLat, roundedLng, 5),
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
          flaggers: [],
          deviceId: sanitizeDeviceId(deviceId),
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
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

/**
 * Add a verification to a community report.
 * Server-enforced so verification cannot be forged with direct Firestore writes.
 */
exports.verifyReport = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const clientIP = getClientIP(req);
      const ipHash = hashIP(clientIP);
      const allowed = await checkRateLimit('verify', ipHash, REPORT_ACTION_WINDOW_MS, MAX_REPORT_ACTIONS_PER_WINDOW, res);
      if (!allowed) return;

      const { reportId, verifierId, lat, lng } = req.body;
      const safeVerifierId = sanitizeDeviceId(verifierId);
      if (typeof reportId !== 'string' || reportId.length < 5 || reportId.length > 128) {
        return res.status(400).json({ error: 'Invalid report id' });
      }
      if (!isValidUSCoordinatePair(lat, lng)) {
        return res.status(400).json({ error: 'Current location is required to verify reports' });
      }

      const reportRef = db.collection('iceReports').doc(reportId);
      const actionRef = db.collection('reportActionLocks').doc(
        crypto.createHash('sha256').update(`verify:${reportId}:${ipHash}:${safeVerifierId}`).digest('hex').substring(0, 32)
      );

      const result = await db.runTransaction(async (tx) => {
        const [reportSnap, actionSnap] = await Promise.all([tx.get(reportRef), tx.get(actionRef)]);
        if (!reportSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'Report not found');
        }
        if (actionSnap.exists) {
          throw new functions.https.HttpsError('already-exists', 'You have already verified this report');
        }

        const data = reportSnap.data();
        const reportLat = typeof data.coarseLat === 'number' ? data.coarseLat : data.lat;
        const reportLng = typeof data.coarseLng === 'number' ? data.coarseLng : data.lng;
        if (!isValidUSCoordinatePair(reportLat, reportLng)) {
          throw new functions.https.HttpsError('failed-precondition', 'This report cannot be verified');
        }

        const distance = calculateDistanceMiles(lat, lng, reportLat, reportLng);
        if (distance > 3) {
          throw new functions.https.HttpsError('permission-denied', `You must be within 3 miles to verify this report`);
        }

        const verifiers = Array.isArray(data.verifiers) ? data.verifiers : [];
        if (verifiers.some((entry) => entry?.id === safeVerifierId)) {
          throw new functions.https.HttpsError('already-exists', 'You have already verified this report');
        }

        const nextVerifiers = [
          ...verifiers,
          {
            id: safeVerifierId,
            timestamp: new Date().toISOString(),
            distance: parseFloat(distance.toFixed(2)),
          }
        ].slice(0, 50);

        tx.set(actionRef, {
          action: 'verify',
          reportId,
          ipHash,
          verifierId: safeVerifierId,
          createdAt: new Date().toISOString(),
        });
        tx.update(reportRef, {
          verifiers: nextVerifiers,
          verified: nextVerifiers.length >= 2,
        });

        return {
          verified: nextVerifiers.length >= 2,
          verifierCount: nextVerifiers.length,
        };
      });

      await incrementRateLimit('verify', ipHash, REPORT_ACTION_WINDOW_MS);
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      const code = error?.code || error?.details;
      if (code === 'not-found') {
        return res.status(404).json({ error: 'Report not found' });
      }
      if (code === 'already-exists') {
        return res.status(409).json({ error: error.message || 'Already verified' });
      }
      if (code === 'permission-denied') {
        return res.status(403).json({ error: error.message || 'Verification denied' });
      }
      if (code === 'failed-precondition') {
        return res.status(409).json({ error: error.message || 'Report cannot be verified' });
      }
      console.error('verifyReport error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

/**
 * Flag a community report for review.
 * Server-enforced so the same client cannot repeatedly flag a report.
 */
exports.flagReport = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const clientIP = getClientIP(req);
      const ipHash = hashIP(clientIP);
      const allowed = await checkRateLimit('flag', ipHash, REPORT_ACTION_WINDOW_MS, MAX_REPORT_ACTIONS_PER_WINDOW, res);
      if (!allowed) return;

      const { reportId, verifierId } = req.body;
      const safeVerifierId = sanitizeDeviceId(verifierId);
      if (typeof reportId !== 'string' || reportId.length < 5 || reportId.length > 128) {
        return res.status(400).json({ error: 'Invalid report id' });
      }

      const reportRef = db.collection('iceReports').doc(reportId);
      const actionRef = db.collection('reportActionLocks').doc(
        crypto.createHash('sha256').update(`flag:${reportId}:${ipHash}:${safeVerifierId}`).digest('hex').substring(0, 32)
      );

      const result = await db.runTransaction(async (tx) => {
        const [reportSnap, actionSnap] = await Promise.all([tx.get(reportRef), tx.get(actionRef)]);
        if (!reportSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'Report not found');
        }
        if (actionSnap.exists) {
          throw new functions.https.HttpsError('already-exists', 'You have already flagged this report');
        }

        const data = reportSnap.data();
        const flaggers = Array.isArray(data.flaggers) ? data.flaggers : [];
        if (flaggers.some((entry) => entry?.id === safeVerifierId)) {
          throw new functions.https.HttpsError('already-exists', 'You have already flagged this report');
        }

        const nextFlaggers = [
          ...flaggers,
          {
            id: safeVerifierId,
            timestamp: new Date().toISOString(),
          }
        ].slice(0, 50);

        tx.set(actionRef, {
          action: 'flag',
          reportId,
          ipHash,
          verifierId: safeVerifierId,
          createdAt: new Date().toISOString(),
        });
        tx.update(reportRef, { flaggers: nextFlaggers });

        return { flagCount: nextFlaggers.length };
      });

      await incrementRateLimit('flag', ipHash, REPORT_ACTION_WINDOW_MS);
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      const code = error?.code || error?.details;
      if (code === 'not-found') {
        return res.status(404).json({ error: 'Report not found' });
      }
      if (code === 'already-exists') {
        return res.status(409).json({ error: error.message || 'Already flagged' });
      }
      console.error('flagReport error:', error);
      return res.status(500).json({ error: 'Internal server error' });
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
 * Restricted to allowed origins only
 */
exports.getReportKey = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Require an allowed origin or referer — no-origin requests are not permitted
    // for this sensitive endpoint since CORS alone doesn't protect server-to-server calls
    const origin = req.headers.origin || '';
    const referer = req.headers.referer || '';
    const isAllowed = ALLOWED_ORIGINS.some(o => origin === o || referer.startsWith(o));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const key = process.env.COMMUNITY_REPORT_KEY;
    if (!key) {
      return res.status(500).json({ error: 'Service temporarily unavailable' });
    }

    // Sensitive key — do not cache
    res.set('Cache-Control', 'no-store');
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
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
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

      // Validate subscription structure (must be a valid Web Push subscription)
      if (typeof subscription.endpoint !== 'string' ||
          !subscription.endpoint.startsWith('https://') ||
          subscription.endpoint.length > 2048) {
        return res.status(400).json({ error: 'Invalid subscription endpoint' });
      }
      if (subscription.keys && (
          typeof subscription.keys.p256dh !== 'string' ||
          typeof subscription.keys.auth !== 'string')) {
        return res.status(400).json({ error: 'Invalid subscription keys' });
      }

      // Only store the fields we need (strip any extra properties)
      const cleanSubscription = {
        endpoint: subscription.endpoint,
        ...(subscription.keys && {
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          }
        }),
      };

      // Validate prefixes are strings of length 5, cap at 20
      const prefixes = (geoHashPrefixes || [])
        .filter(p => typeof p === 'string' && p.length === 5)
        .slice(0, 20);

      const endpointHash = crypto.createHash('sha256').update(subscription.endpoint).digest('hex').substring(0, 32);

      await db.collection('pushSubscriptions').doc(endpointHash).set({
        subscription: cleanSubscription,
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
 * Register or update a training reminder push subscription.
 * Stores the subscription + nextReviewAt timestamp.
 * A scheduled function checks this hourly and fires the reminder push.
 */
exports.registerTrainingReminder = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
      const { subscription, nextReviewAt } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Subscription endpoint required' });
      }
      if (typeof subscription.endpoint !== 'string' ||
          !subscription.endpoint.startsWith('https://') ||
          subscription.endpoint.length > 2048) {
        return res.status(400).json({ error: 'Invalid subscription endpoint' });
      }
      if (subscription.keys && (
          typeof subscription.keys.p256dh !== 'string' ||
          typeof subscription.keys.auth !== 'string')) {
        return res.status(400).json({ error: 'Invalid subscription keys' });
      }

      // nextReviewAt must be a valid future ISO date string
      const reviewAt = nextReviewAt ? new Date(nextReviewAt) : null;
      const isValidDate = reviewAt && !isNaN(reviewAt.getTime());

      const cleanSubscription = {
        endpoint: subscription.endpoint,
        ...(subscription.keys && { keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } }),
      };

      const endpointHash = crypto.createHash('sha256').update(subscription.endpoint).digest('hex').substring(0, 32);

      await db.collection('pushSubscriptions').doc(endpointHash).set({
        subscription: cleanSubscription,
        trainingReminderAt: isValidDate ? reviewAt.toISOString() : null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('registerTrainingReminder error:', error);
      return res.status(500).json({ error: 'Internal error' });
    }
  });
});

/**
 * Scheduled training reminder sender — runs every hour.
 * Finds subscriptions with trainingReminderAt <= now and sends a push.
 */
exports.sendTrainingReminders = functions.pubsub.schedule('every 1 hours').onRun(async () => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log('VAPID keys not configured — skipping training reminders');
    return;
  }

  const now = new Date().toISOString();
  const subsSnap = await db.collection('pushSubscriptions').get();
  if (subsSnap.empty) return;

  let sent = 0;
  let cleaned = 0;

  for (const subDoc of subsSnap.docs) {
    const data = subDoc.data();
    const { subscription, trainingReminderAt } = data;
    if (!subscription || !trainingReminderAt) continue;
    if (trainingReminderAt > now) continue; // not yet due

    const payload = JSON.stringify({
      title: 'Review time',
      body: 'Questions are scheduled for review. Keep your knowledge close.',
      icon: '/logo192.png',
      badge: '/favicon-32x32.png',
      data: { url: '/?tab=legal', type: 'training-reminder' },
    });

    try {
      await webpush.sendNotification(subscription, payload);
      // Clear so it doesn't fire again until next registration
      await subDoc.ref.update({ trainingReminderAt: null });
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await subDoc.ref.delete();
        cleaned++;
      } else {
        console.error('Training reminder send error:', err.statusCode, err.message);
      }
    }
  }

  console.log(`Training reminders: ${sent} sent, ${cleaned} expired subscriptions cleaned`);
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
    if (typeof data.geoHash5 === 'string' && data.geoHash5.length === 5) {
      reportGeohashes.add(data.geoHash5);
      reportCount++;
    } else if (typeof data.coarseLat === 'number' && typeof data.coarseLng === 'number') {
      reportGeohashes.add(encodeGeohash(data.coarseLat, data.coarseLng));
      reportCount++;
    } else if (typeof data.lat === 'number' && typeof data.lng === 'number') {
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

/**
 * Proxy for Federal Register API
 * Returns recent immigration-related policy documents (executive orders, rules, notices)
 * No API key required — public government API
 */
exports.federalRegisterAlerts = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const ipHash = hashIP(getClientIP(req));
      const allowed = await checkRateLimit('fedreg', ipHash, PROXY_RATE_LIMIT_WINDOW_MS, MAX_PROXY_PER_WINDOW, res);
      if (!allowed) return;

      const safePage = Math.max(1, parseInt(req.body.page, 10) || 1);

      const url = `https://www.federalregister.gov/api/v1/documents.json?` +
        `conditions[agencies][]=homeland-security-department` +
        `&conditions[agencies][]=executive-office-for-immigration-review` +
        `&conditions[term]=immigration` +
        `&order=newest` +
        `&per_page=10` +
        `&page=${safePage}` +
        `&fields[]=title&fields[]=type&fields[]=abstract&fields[]=publication_date&fields[]=html_url&fields[]=pdf_url&fields[]=agencies`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'SafeNeighbor/1.0 (+https://safeneighbor-33bb0.web.app)',
          Referer: 'https://safeneighbor-33bb0.web.app/',
          Origin: 'https://safeneighbor-33bb0.web.app',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Federal Register API error: ${response.status} ${errorBody.slice(0, 300)}`);
      }

      const data = await response.json();

      const documents = (data.results || []).map((doc) => ({
        title: doc.title,
        type: doc.type,
        abstractText: doc.abstract || '',
        publicationDate: doc.publication_date,
        htmlUrl: doc.html_url,
        pdfUrl: doc.pdf_url,
        agencies: (doc.agencies || []).map((a) => a.name),
      }));

      await incrementRateLimit('fedreg', ipHash, PROXY_RATE_LIMIT_WINDOW_MS);

      return res.status(200).json({
        documents,
        totalPages: data.total_pages || 1,
        count: data.count || 0,
      });
    } catch (error) {
      console.error('Federal Register proxy error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

/**
 * Proxy for CourtListener API
 * Searches immigration-related case law and court opinions
 *
 * Set COURTLISTENER_API_KEY as environment variable or in functions/.env
 * Get a free API key at https://www.courtlistener.com/sign-in/
 */
exports.courtListenerSearch = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const ipHash = hashIP(getClientIP(req));
      const allowed = await checkRateLimit('court', ipHash, PROXY_RATE_LIMIT_WINDOW_MS, MAX_PROXY_PER_WINDOW, res);
      if (!allowed) return;

      const apiKey = process.env.COURTLISTENER_API_KEY;
      if (!apiKey) {
        return res.status(501).json({ error: 'CourtListener API not configured' });
      }

      const { query } = req.body;
      const safePage = Math.max(1, parseInt(req.body.page, 10) || 1);
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      const response = await fetch(
        `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(query)}&type=o&page_size=5&page=${safePage}`,
        {
          headers: {
            Authorization: `Token ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CourtListener API error: ${response.status}`);
      }

      const data = await response.json();
      const cases = (data.results || []).map((c) => ({
        caseName: c.caseName || c.case_name || 'Untitled Case',
        court: c.court || '',
        dateFiled: c.dateFiled || c.date_filed || '',
        snippet: c.snippet || '',
        absoluteUrl: c.absolute_url ? `https://www.courtlistener.com${c.absolute_url}` : '',
      }));

      await incrementRateLimit('court', ipHash, PROXY_RATE_LIMIT_WINDOW_MS);

      return res.status(200).json({
        cases,
        count: data.count || 0,
      });
    } catch (error) {
      console.error('CourtListener proxy error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});
