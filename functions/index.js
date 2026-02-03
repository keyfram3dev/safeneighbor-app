const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const crypto = require('crypto');

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

      // Get the prompt from request body
      const { prompt, model = 'gemini-2.0-flash-exp' } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

      // Validate report data
      const { lat, lng, description, agents, vehicles, activity, deviceId } = req.body;

      // Validation
      if (typeof lat !== 'number' || lat < 24 || lat > 50) {
        return res.status(400).json({ error: 'Invalid latitude (must be in US)' });
      }
      if (typeof lng !== 'number' || lng < -125 || lng > -66) {
        return res.status(400).json({ error: 'Invalid longitude (must be in US)' });
      }
      if (!description || typeof description !== 'string' || description.length < 10 || description.length > 500) {
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

      // Sanitize description (strip HTML)
      const sanitizedDescription = description.replace(/<[^>]*>/g, '').trim();

      // Round coordinates for privacy (~275m precision)
      const roundedLat = Math.round(lat * 400) / 400;
      const roundedLng = Math.round(lng * 400) / 400;

      // Round timestamp to 15-minute intervals for privacy
      const timestamp = new Date();
      timestamp.setMinutes(Math.floor(timestamp.getMinutes() / 15) * 15);
      timestamp.setSeconds(0);
      timestamp.setMilliseconds(0);

      // Create the report
      const report = {
        lat: roundedLat,
        lng: roundedLng,
        description: sanitizedDescription,
        agents: agentCount,
        vehicles: vehicleCount,
        activity: activity || 'Unknown',
        timestamp: timestamp.toISOString(),
        verified: false,
        verifiers: [],
        deviceId: deviceId || 'unknown',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

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
      console.error('Submit report error:', error);
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
