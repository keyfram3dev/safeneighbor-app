# SafeNeighbor Security Guide

## API Key Rotation

### Firebase API Key

Your Firebase API key is visible in the client-side code. While this is expected for Firebase, you should:

1. **Restrict the key in Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com) → Project Settings → API Keys
   - Click on your Web API Key
   - Under "Application restrictions", select "HTTP referrers"
   - Add your production domain(s): `yourdomain.com/*`
   - Under "API restrictions", restrict to only the APIs you use

2. **Rotate if compromised:**
   - In Firebase Console → Project Settings → General
   - Under "Your apps", find your web app
   - Click the gear icon and select "Manage API keys"
   - Create a new key, update your app, then delete the old key

### Gemini API Key

The Gemini API key is now stored securely in a Cloudflare Worker (not in client code).

1. **Set the API key as a secret:**
   ```bash
   cd workers/gemini-proxy
   npx wrangler secret put GEMINI_API_KEY
   # Enter your API key when prompted
   ```

2. **Rotate the key:**
   - Go to [Google AI Studio](https://aistudio.google.com/apikey)
   - Create a new API key
   - Update the Cloudflare secret (command above)
   - Delete the old key from Google AI Studio

3. **Verify the key is NOT in client code:**
   ```bash
   # This should return no results (except .env files)
   grep -r "AIzaSy" src/
   ```

## Deployment Steps

### 1. Deploy Firebase Security Rules (Already Done)
```bash
npx firebase-tools deploy --only firestore:rules --project safeneighbor-33bb0
```

### 2. Deploy Cloudflare Worker

First, login to Cloudflare:
```bash
cd workers/gemini-proxy
npx wrangler login
```

Then deploy the worker:
```bash
npx wrangler deploy
```

Set the Gemini API key as a secret:
```bash
npx wrangler secret put GEMINI_API_KEY
# Enter: AIzaSyBESMcWTaZ0vY1xib1ul07JNl0BHqWZdXM (or your new key)
```

### 3. Update Your App Configuration

After deploying, get your worker URL (shown in deploy output, like `https://safeneighbor-gemini-proxy.YOUR-ACCOUNT.workers.dev`).

Add it to your `.env` file:
```
REACT_APP_GEMINI_PROXY_URL=https://safeneighbor-gemini-proxy.YOUR-ACCOUNT.workers.dev
```

### 4. Remove Old API Key from .env

Once the Cloudflare Worker is deployed and working, remove the old Gemini key:
```bash
# Remove or comment out this line from .env:
# REACT_APP_GEMINI_API_KEY=...
```

## Environment Variables

For production, set these in your hosting environment:
```
REACT_APP_GEMINI_PROXY_URL=https://your-worker.workers.dev
```

## Security Checklist

- [x] Firebase Security Rules deployed
- [x] Cloudflare Worker deployed
- [x] Gemini API key set as Cloudflare secret
- [x] REACT_APP_GEMINI_PROXY_URL configured in .env
- [x] Old REACT_APP_GEMINI_API_KEY commented out in .env
- [x] PIN hashing upgraded to PBKDF2 (100,000 iterations)
- [x] Encryption keys stored in IndexedDB (not localStorage)
- [x] Content Security Policy headers added
- [x] DOMPurify for XSS sanitization
- [x] Server-side rate limiting (Firebase Cloud Functions)
- [x] Firebase API key restricted to your domains
- [ ] No API keys in git history (consider using git-filter-repo if needed)

## Security Features Implemented

### PIN Security (PBKDF2)
- **100,000 iterations** of PBKDF2 (OWASP recommended minimum)
- **Random 16-byte per-user salt** (unique for each PIN)
- Automatic migration from legacy SHA-256 hashes
- File: `src/utils/pinAuth.js`

### Encryption Key Storage (IndexedDB)
- Keys stored in IndexedDB (not visible in DevTools localStorage)
- CryptoKey objects stored directly without plaintext export
- Automatic migration from legacy localStorage
- File: `src/utils/crypto/keyManager.js`

### Content Security Policy
- Restricts script sources to 'self' and unpkg.com (Leaflet)
- Limits API connections to Firebase, OpenStreetMap, and Cloudflare Workers
- Prevents clickjacking with `frame-ancestors 'none'`
- Blocks object embeds and form actions to external sites
- File: `public/index.html`

### XSS Sanitization (DOMPurify)
- All user-generated content sanitized with DOMPurify
- Strips all HTML tags from report descriptions
- Industry-standard library with active security maintenance
- File: `src/CommunityReports.js`

### Server-Side Rate Limiting (Firebase Cloud Functions)
- **3 reports per hour** limit per IP address (cannot be bypassed)
- IP addresses hashed for privacy (raw IPs not stored)
- Server-side data validation (coordinates, description length, etc.)
- Automatic cleanup of old rate limit records (daily)
- Files: `functions/index.js`, `src/CommunityReports.js`

## Files Overview

| File | Purpose |
|------|---------|
| `firestore.rules` | Firebase database security rules |
| `workers/gemini-proxy/worker.js` | Cloudflare Worker for Gemini API proxy |
| `workers/gemini-proxy/wrangler.toml` | Cloudflare Worker configuration |
| `src/utils/pinAuth.js` | PBKDF2 PIN hashing with per-user salts |
| `src/utils/crypto/keyManager.js` | IndexedDB-based encryption key storage |
| `public/index.html` | Content Security Policy headers |
| `functions/index.js` | Firebase Cloud Functions (rate limiting) |

## Firebase Blaze Plan

Server-side rate limiting is now active using Firebase Cloud Functions. The Blaze plan is pay-as-you-go with generous free tiers.

**Current Functions Deployed:**
- `submitReport` - Rate-limited report submission (3/hour per IP)
- `cleanupRateLimits` - Daily cleanup of expired rate limit records
- `health` - Health check endpoint

**Estimated monthly cost:** $0-2 for small community apps (likely stays within free tier)

## Reporting Security Issues

If you discover a security vulnerability, please email directly instead of opening a public issue.
