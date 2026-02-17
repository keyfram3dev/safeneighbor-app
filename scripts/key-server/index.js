/**
 * SafeNeighbor Community Key Server
 *
 * Serves the AES-256-GCM community encryption key from a Swiss VPS (Infomaniak).
 * Designed to be outside US legal jurisdiction to resist subpoenas.
 *
 * Deploy: copy to Infomaniak VPS, run with PM2 behind nginx + Let's Encrypt.
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// CORS: only allow requests from the SafeNeighbor app
app.use(cors({
  origin: [
    'https://safeneighbor-33bb0.web.app',
    'https://safeneighbor.org',
    'http://localhost:3000'
  ]
}));

// Rate limit: 100 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get('/key', (req, res) => {
  const key = process.env.COMMUNITY_REPORT_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Key not configured' });
  }
  res.set('Cache-Control', 'private, max-age=3600');
  res.json({ key, version: 1 });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Key server listening on port ${PORT}`);
});
