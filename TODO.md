# SafeNeighbor TODO List

## Completed

### Mobile Fixes
- [x] Fix community reports incident report forms to have uniform sized buttons for options
- [x] Make the record function use rear-facing camera by default with flip button to switch between front/rear cameras
- [x] Fix nearest address not showing in community reports (works on localhost but not production)
- [x] Make all top menus in Record section fit on mobile (stacked layout with centered buttons)

### API & Backend Issues
- [x] Fix Legal section "Ask AI" - fixed Cloud Function URL, Referer header, model name, new API key with referrer restrictions
- [x] Add client-side rate limiting to Ask AI (5/min, 30/hour per user)
- [x] Fix submitting anonymous report sometimes adds 2 reports instead of 1
- [x] Add rate limiting: IP can only submit 3 reports per hour (server-side Cloud Function)
- [x] Add modal when adding report to same location - prompt to verify existing report instead of new pin

### UI Enhancements
- [x] Make EMERGENCY button at top flash to draw the eye
- [x] Replace location pin emoji with Phosphor map-pin-simple or map-pin-simple-area icons
- [x] Replace "choose location within 3 miles" emoji with Phosphor map-trifold
- [x] On Leaflet map in community reporting, use Phosphor map-pin-simple for plotted map points
- [x] For verified reports on Leaflet map, use shield-check Phosphor icon instead of emoji
- [x] Change Signals card emojis to corresponding bold Phosphor icons
- [x] Change whistle volume icon to Phosphor
- [x] Change Visual Signaling section emojis to Phosphor hand icons
- [x] Fix Legal Constitutional Foundation icon spacing (desktop too close, mobile responsive fix)
- [x] Added disclaimer components to all major sections (Home, Scenarios, Record, Legal, De-escalation, Whistle)

### New Features
- [x] Add testing feature to community reporting - when user enters "test" a green pin is added instead of red
- [x] When clicking "focus map" in local activity feed, scroll up to Leaflet map
- [x] Download and link whistle sounds for Signals whistle section

### Cloud Backup Implementation
- [x] Create in-app guide explaining backup options and benefits (Why Backup? modal)
- [x] Add Google Drive OAuth integration via Google Identity Services
- [x] Implement Google Drive API upload for encrypted recordings
- [x] Add backup settings UI with toggle for Google Drive vs Cloudflare R2 (or both)
- [x] Add backup status indicators in vault (backed up / pending / failed per provider)
- [x] Email Key button in Backup Settings
- [x] PIN security reminder in Backup Settings

### Security & Encryption
- [x] PIN-derived key wrapping (AES-KW via Web Crypto) — master key encrypted with PBKDF2-derived KEK
- [x] Record section gated behind PIN; other sections remain open
- [x] Key cleared from memory on leaving Record or auto-lock
- [x] Duress PIN (decoy mode) — shows empty vault on duress entry
- [x] Metadata stripping for recordings (location, EXIF removal)
- [x] Privacy settings (toggle location capture, toggle metadata strip)

### Vault & Recording
- [x] Encryption labels on vault items (encrypted locally / backed up / decrypted)
- [x] .enc file download from vault (encrypted with backup key)
- [x] DECRYPT tab for restoring .enc backup files
- [x] Safari thumbnail generation fix
- [x] Native camera option for iOS (better quality and playback)
- [x] Import media from Photos at full quality

### PWA & Branding
- [x] Make install browserless app icon work (PWA with service worker, beforeinstallprompt, manifest)
- [x] Added PWA install buttons to all sections (Scenarios, Reports, Record, Legal, Signals)
- [x] Added smooth animations to Legal section expandable buttons (spring icon, height transition)
- [x] Make tab name on mobile and desktop browsers say "SafeNeighbor.us"
- [x] Create and add favicon icons (SVG shield + generated PNGs via sharp)
- [x] Create glassmorphism PWA app icon (full-bleed for iOS masking, rounded for display)
- [x] Add in-app splash screen (inline HTML div, CSS fade-out, React useEffect removal)
- [x] Generate iOS native startup splash screens (14 device-specific apple-touch-startup-image PNGs)
- [x] Add apple-mobile-web-app-capable + black-translucent status bar for native PWA feel
- [x] Fix header alignment for black-translucent status bar (safe area inset padding)
- [x] Add Welcome modal on first visit with glassmorphism styling
- [x] Fix Welcome modal flash/blink on first load (merged backdrop layers, SW reload guard)
- [x] Add blur+scale modal animations to all modals (CommunityReports, SecuritySettings, Record, BackupSettings, PinSetup)
- [x] Improve mobile responsiveness for navigation bar and header

### SEO & Discoverability
- [x] Set up comprehensive SEO (meta tags, OG, Twitter Cards, JSON-LD, sitemap, robots.txt, llms.txt)
- [x] Generate OG image for social media sharing
- [x] Google Search Console verification and sitemap submission
- [x] Add SVG favicon reference for Google search results
- [x] Add "Safe Neighbor" keyword variants for spaced search queries
- [x] Redesign app icon with new filled group people icon (noun-group-195974) across all SVGs
- [x] Update OG image with new icon + "Anonymously Report ICE Activity" CTA
- [x] Add OG image SVG source and generation to generate-icons.js script
- [x] Clean up unused icon preview files from public/

### Recent Fixes & Additions
- [x] Added PIN/Decoy PIN reminder to Welcome modal with link to Security Settings
- [x] PIN reminder only shows when PIN not yet configured
- [x] Fixed background scrolling when modals are open in Reports section
- [x] Changed contact email to SafeNeighbor.us@proton.me on all pages
- [x] Fixed offline map tile caching — tiles were never cached due to opaque response status check bug in service worker
- [x] Added crossOrigin to Leaflet TileLayer for proper CORS tile responses
- [x] Fixed offline banner text vertical centering (asymmetric padding)
- [x] Added Features modal with scannable list of all app capabilities (5 categories, 17 features)
- [x] Added Features button (violet) to Home page header alongside Security and Welcome
- [x] Added "Prepare & Plan" category to Features modal (Family Kit, Trusted Contacts, SOS Messages, Shareable Plan)

### Civil Disobedience Rights Education (Legal Section)
- [x] Full "Know Your Rights During Civil Disobedience" section in Legal
- [x] History & legal framework (1st Amendment, landmark cases, protected vs. criminal activity)
- [x] Rights if arrested (silence, attorney, booking, bail, what not to say)
- [x] Common charges explained (trespassing, disorderly conduct, unlawful assembly, obstruction, federal vs. state)
- [x] Practical safety (before/during/after: buddy system, what to bring, de-escalation, documentation, legal support)
- [x] Historical context & Stoic connection (MLK, Thoreau, Gandhi)

### Analytics
- [x] Added Umami custom event tracking (page_view, page_exit, scenario_open, emergency_mode, emergency_purge, modal_open, sos_alert, family_kit_share)
- [x] Exit page detection via beforeunload + visibilitychange for mobile
- [x] Per-page tracking for SPA navigation (custom events since Umami only sees `/` by default)

### Emergency Location Sharing (v2)
- [x] iOS SMS separator fix — uses `;` + `&body=` on iOS vs `,` + `?body=` on Android
- [x] iPadOS 13+ detection (MacIntel + maxTouchPoints > 1)
- [x] Refactored TrustedContacts SOS to use shared `buildLocationSmsUri` (iOS fix propagates)
- [x] Firestore live location streaming — `liveLocations/{shareId}` collection with `onSnapshot`
- [x] `watchPosition` continuous GPS tracking with 30s Firestore write throttle
- [x] LiveLocationViewer component — full-screen Leaflet map for contacts opening the live link
- [x] Query param routing (`?live={shareId}`) renders viewer without app chrome
- [x] Glassmorphism "Share My Location" button with 3D depth (gradient + inset shadow + drop shadow)
- [x] Persistent live tracking when emergency panel is closed (green LIVE indicator in header)
- [x] PIN-gated stop — requires PIN entry to stop live sharing (duress PIN silently dismisses)
- [x] Removed "Share Updated Location" button when live tracking is active

### Location Sharing Security Mitigations
- [x] E2E encryption — AES-256-GCM encrypts lat/lng/address/userName before Firestore write
- [x] Signal-style link — decryption key in URL fragment (`#key=...`), never sent to server
- [x] User warning before sharing — "Before You Share" panel explains SMS interception risk and E2E encryption
- [x] TTL cleanup Cloud Function — `cleanupLiveLocations` deletes docs older than 24h (runs hourly)
- [x] Firestore rules updated to accept encrypted document format (backward compatible with plaintext)
- [x] LiveLocationViewer decrypts client-side; shows "Cannot Decrypt" if key missing/invalid

### PWA & Offline Reliability
- [x] Centralized `useOnlineStatus` hook (`useSyncExternalStore`) — replaced inline online/offline listeners across App.js, CommunityReports.js, useEncounterSync.js
- [x] IndexedDB `pendingReports` store for offline report queuing (localStorageDB.js v2)
- [x] Service worker true background sync — `sync-pending-reports` tag processes IndexedDB queue when connectivity returns
- [x] Fixed missing `deviceId` in SW background sync — baked into `serverPayload` at queue time (SW can't access localStorage)
- [x] Migrated CommunityReports offline submit from localStorage to IndexedDB queuing with encrypted payloads
- [x] All rights guides, legal scripts, scenarios, and breathing guide pre-cached — static JS imports compiled into bundles, SW caches all JS/CSS from asset-manifest
- [x] i18n translations for all 21 languages cached offline — CRA compiles dynamic imports into JS chunks included in asset-manifest
- [x] Recorded evidence cached locally via IndexedDB with optional AES-256-GCM encryption
- [x] Offline indicator banner enhanced — shows what works offline (rights, scenarios, breathing, recordings) and what needs internet (live location, AI Q&A)
- [x] By Status tab expandable cards — added Home-style hover effects (lift, border glow, gradient overlay) per persona color

### Animation & UX Polish
- [x] Initial page load uses scale-up + fade animation instead of left-slide (direction=0 handling)
- [x] Security Settings button restyled with emerald gradient matching Features (violet) and Welcome (blue) button pattern
- [x] Screen Wake Lock during recording — prevents screen dimming on iOS 16.4+ and Android
- [x] PWA Manifest Shortcuts — Record, Know Your Rights, Report Incident quick actions from home screen icon
- [x] Query param routing (`?tab=record|rights|report`) for manifest shortcut deep linking

### Browser Compatibility
- [x] Instagram/Facebook/TikTok in-app WebView graceful degradation (map fallback UI, WebView detection banner)
- [x] Global ErrorBoundary component for render crash recovery (suggests opening in Safari/Chrome)
- [x] Fix "BY STATUS" tab icon misalignment on mobile (whitespace-nowrap prevents two-word label wrapping)
- [x] Fix Safari video playback (black screen / crossed-out play icon) — root cause: CSP missing `media-src 'self' blob: data:` directive, blocking blob URLs for `<video>`/`<audio>` elements
- [x] WebKit-recommended MediaRecorder pattern — `recorder.start(1000)` timeslice + `new Blob(chunks, { type: recorder.mimeType })` for proper fMP4 concatenation
- [x] Safari MIME type detection fix — detect empty blob `.type` from Safari's MediaRecorder, use `MediaRecorder.isTypeSupported` fallback
- [x] Data URL fallback for video playback — if blob URL fails on Safari, auto-retry with `FileReader.readAsDataURL`
- [x] Service worker skip `blob:` and `data:` URL requests to prevent SW interception of media playback

### Map UX Improvements
- [x] Tighten heat map radius/blur so it doesn't cover all of Ohio when zoomed out
- [x] Make cluster pin icons scale down when zooming out (zoom-aware sizing)
- [x] Add "My Pin" toggle to show/hide location selection marker on map
- [x] Auto-show location pin when "Re-Center GPS" is clicked
- [x] Fix heatmap not rendering (test reports were excluded from heat data)
- [x] Fix heatmap density — lower per-point intensity so overlapping reports create visible hotspots
- [x] Zoom-responsive heatmap radius (geographic size stays constant, dampened scaling with 14px minimum)
- [x] Tune heatmap opacity (minOpacity 0.55, gradient with balanced alpha values)
- [x] US View zoom out further (zoom 3) to see coast-to-coast activity at a glance
- [x] Initial map load centers on user GPS at zoom 7 (regional view) instead of zoom 11 (too close)
- [x] Fix Resources toggle reliability (auto-retry on failure, mapLoaded fallback, error state UI)

### Immigration Rights "By Status" Tab (Legal Section) ✅
- [x] Add 4th "BY STATUS" tab to Legal section (rose accent, IdentificationCard icon)
- [x] Create immigrationRightsData.js with all content as structured data
- [x] "Never Sign Without an Attorney" persistent warning banner with expandable form details
- [x] 3 persona selector cards: Undocumented, Green Card, Asylum Seeker
- [x] Undocumented: What NOT to Sign, Workplace Rights (FLSA/OSHA/NLRA), Public Charge, Education, Healthcare, Tax/ITIN (6 sections)
- [x] Green Card: Stronger Rights, Criminal Conviction Dangers, Padilla v. Kentucky, Travel Warnings, Maintaining Status, Path to Citizenship (6 sections)
- [x] Asylum Seeker: Right to Apply, Credible Fear Interview, One-Year Deadline, Persecution Grounds, Alternative Protections (Withholding/CAT), Work Authorization, What NOT to Do (7 sections)
- [x] "Everyone Should Know" shared section: Healthcare (EMTALA), Education (Plyler v. Doe), Tax Rights, Special Visas (U/T/VAWA/SIJS)
- [x] Home-style hover effects on persona cards, Never Sign banner, and Everyone Should Know sections
- [x] Responsive 4-tab bar for mobile (text-[10px] sm:text-sm)

### Encounter Logging (Quick-Tap Journal) ✅
- [x] Build timestamped encounter log with quick-tap options (agents at door, asked for warrant, showed warrant, detained, vehicle description, etc.)
- [x] Auto-attach GPS coordinates and timestamps to each log entry
- [x] Make log useful for attorneys — exportable as timestamped report (encounterLogDocument.js)
- [x] "Now" mode — real-time logging with auto-start from emergency panel, running timer, GPS lock
- [x] "After" mode — after-the-fact logging with date/time picker, editable event timestamps
- [x] After-the-fact reports include "logged from memory" note for attorney transparency
- [x] Split Now/After buttons in emergency panel; Encounter Log card on Home + Scenarios pages
- [x] Resume unfinished log prompt (per mode), share report via SMS/clipboard/Web Share
- [x] Send full timestamped report (not summary) to trusted contacts via SMS
- [x] Installation Help modal with 4-step iOS Safari PWA walkthrough screenshots
- [x] "Installation Help" link added under every install button across all 8 pages
- [x] Updated breathing exercise text across all pages (DeEscalation, ScenarioDetail)
- [x] Updated Welcome modal text (ICE encounter scripts, reporting description)

### Other Completed
- [x] Added contact footer to all pages (SafeNeighbor.us@proton.me)
- [x] Fixed mobile date/time input widths in incident report form
- [x] Reordered incident report form (Date → Location buttons → Time)
- [x] Added min="0" to prevent negative values in Agents/Vehicles inputs
- [x] Centered date/time input text
- [x] Fixed iOS Safari video duration extraction (was showing 00:00)
- [x] Added 1080p quality constraints to in-app camera
- [x] Changed download button to use Web Share API for iOS compatibility
- [x] Simplified vault playback for mobile
- [x] Fixed reverse geocoding on mobile Safari
- [x] Added state abbreviation to activity feed (e.g., "123 Main St, Columbus, OH")
- [x] Fixed double submission bug with isSubmitting state guard
- [x] Added dev mode bypass for testing without rate limiting
- [x] Focus map button now scrolls to Leaflet map and centers on report location
- [x] Changed submission success popup emoji to Phosphor ShieldCheck icon
- [x] Updated Record section with consistent glassmorphism styling
- [x] Added whistle sounds to all 4 community alert signals

---

## What's Left

All app features are complete. Remaining work is infrastructure, translation quality, and outreach.

### iOS Push Notifications & Proximity Alerts
**Context**: iOS 16.4+ supports Web Push API for home-screen PWAs. However, PWAs **cannot** access background geolocation, Geofencing API, or Background Sync reliably on iOS. True background proximity alerts require a native app wrapper.

#### Option 1: Foreground Proximity Alerts (PWA — no native wrapper needed)
- [ ] While app is open, periodically check user's GPS against community report clusters
- [ ] Show in-app alert when approaching an area with recent ICE activity reports
- [ ] Calculate proximity radius (e.g., 0.5–1 mile) against Firestore report data
- [ ] Visual + haptic warning with option to view nearby reports on map
- [ ] Only works while SafeNeighbor is actively open in the foreground

#### Option 2: "Check My Route" Feature (PWA — no native wrapper needed)
- [ ] User enters a destination address or drops a pin
- [ ] App draws the route and flags any ICE activity hotspots along the path
- [ ] Show report density heat overlay on the route
- [ ] Suggest alternative routes if hotspots are detected
- [ ] Uses Leaflet routing + existing community report data

#### Option 3: Scheduled Push Digests (Server-side — requires Web Push setup)
- [ ] Implement Web Push API subscription (iOS 16.4+ home screen PWAs)
- [ ] Cloud Function sends periodic digest notifications (e.g., daily or when new reports appear near saved location)
- [ ] User saves a "home area" or frequently visited locations
- [ ] Server checks new reports against saved locations and pushes alerts
- [ ] No background GPS needed — server compares report locations against user's saved zones
- [ ] Requires VAPID keys, push subscription management, and notification permission flow

#### Option 4: Native App Wrapper (Capacitor/PWA Builder — full native capabilities)
- [ ] Wrap PWA in Capacitor or PWA Builder for App Store distribution
- [ ] Enables true background geolocation via native plugins
- [ ] Enables iOS Geofencing API for automatic proximity triggers
- [ ] Can show native push notifications even when app is backgrounded
- [ ] Requires Apple Developer Program ($99/year) and App Store review
- [ ] Most capable option but highest effort and ongoing maintenance

**iOS PWA Limitations to keep in mind:**
- No background geolocation access
- No Geofencing API
- Limited Background Sync support
- Web Push only works for home-screen installed PWAs (not in Safari tabs)

### Infrastructure
- [ ] **EU data migration** — Evaluate moving Firestore report storage off US infrastructure (Supabase on EU VPS recommended)

### Translation Quality
- [ ] **Native speaker review** for Tier 2-4 translations (16 languages, all AI-translated at 100% coverage)
  - Review CSVs generated: run `node scripts/export-review-csvs.js` → outputs to `scripts/review-csvs/`
  - Tier 2: Arabic, Tagalog
  - Tier 3: French, Somali, Amharic, Dari/Farsi, Nepali, Punjabi, Hindi, Burmese, Haitian Creole, Portuguese
  - Tier 4 (lowest confidence): K'iche', Marshallese, Russian
  - Resources: [Translators Without Borders](https://translatorswithoutborders.org/volunteer/), [Respond Crisis Translation](https://respondcrisistranslation.org/en/get-involved), [Tarjimly](https://www.tarjimly.org/)

### Outreach & Marketing
- [ ] Research best platforms for target audience (TikTok, Instagram, X, Facebook, Reddit, Nextdoor)
- [ ] Create shareable social media graphics/cards (rights tips, "know before they knock" infographics)
- [ ] Write short-form video scripts for TikTok/Reels (30-60s rights education clips)
- [ ] Build social media content calendar
- [ ] Create community ambassador/volunteer outreach program
- [ ] Partner with existing immigrant rights organizations for cross-promotion
- [ ] Create printable QR code flyers for community distribution (libraries, churches, community centers)
- [ ] Set up link-in-bio landing page for social profiles
- [ ] Engage with relevant subreddits and community forums (r/immigration, local city subs)
- [ ] Create shareable "Did you know?" rights facts for story/post formats
- [ ] Word-of-mouth referral strategy (share with 3 neighbors challenge)
- [ ] Research local community orgs, mutual aid networks, and advocacy groups for partnerships

### Known iOS Safari Limitations (Cannot Fix)
- **Vault save to Photos**: iOS Safari blocks saving IndexedDB-reconstructed blobs to Photos. Workaround: save immediately after recording, use native camera, or use cloud backup.

---

## PWA Offline Customization Reference

### How Offline PWA Works (The Big Picture)
Three files control the experience:
1. **manifest.json** — controls look and feel (icon, splash screen, name, theme color, display mode)
2. **service-worker.js** — the engine. Intercepts every network request and decides: serve from cache, fetch from network, or show a fallback
3. **React app code** — detects online/offline status and adapts the UI accordingly

### What You Can Customize

#### 1. Splash Screen & Theming (manifest.json)
Controls what users see when they tap the icon before the app loads:
```json
{
  "name": "SafeNeighbor",
  "short_name": "SafeNeighbor",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- `"display": "standalone"` — looks like a native app with no browser chrome
- Maskable icon ensures icon looks right on Android's adaptive icon shapes
- `"display": "fullscreen"` for zero system UI

#### 2. Service Worker Caching Strategies
The heart of offline functionality. Pre-cache critical assets so they load instantly — even with no internet:
```js
// service-worker.js
const CACHE_NAME = 'safeneighbor-v1';

// Cached at install time — available offline immediately
const PRECACHE_URLS = [
  '/', '/index.html', '/static/js/main.js', '/static/css/main.css',
  '/rights-guide', '/emergency-breathing',
  '/scenario/traffic-stop', '/scenario/home-visit',
  '/offline.html'
];

// INSTALL: pre-cache critical resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: clean up old caches when you deploy updates
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH: intercept requests and decide what to serve
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // "Stale while revalidate" — serve cached, update in background
        fetch(event.request).then(response => {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response);
          });
        });
        return cached;
      }
      // Not in cache — try network, fall back to offline page
      return fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      });
    })
  );
});
```
- **Install event** — downloads and caches every URL in PRECACHE_URLS on first visit/install
- **Activate event** — when you push a new version (change CACHE_NAME to v2), old cache gets deleted
- **Fetch event** — every request goes through this; checks cache first (instant load), quietly updates from network in background

#### 3. Adaptive UI Based on Connection Status
Detect online/offline in React components and change the experience accordingly.

---

## Completed (Archive)

<details>
<summary>Click to expand completed items</summary>

### Privacy & Data Hardening ✅
- [x] Move encryption key server to Swiss VPS (Infomaniak) — `key.safeneighbor.app` with Let's Encrypt SSL
- [x] Remove US-hosted Cloud Function key fallback — key served exclusively from Switzerland
- [x] Delete `getReportKey` Cloud Function from Firebase

### Before an Encounter — Preparation & Education ✅
- [x] Family Preparedness Kit — 7-step walkthrough, localStorage persistence, shareable document, import from Trusted Contacts
- [x] Trusted Contact Network — 3 emergency templates, one-tap SMS alerts, local-only storage

### During an Encounter — Real-Time Tools ✅
- [x] Live Location Sharing — GPS streaming, E2E encryption (AES-256-GCM), Signal-style URL keys, 24h TTL cleanup
- [x] Encounter Logging — timestamped quick-tap journal, Now/After modes, auto-sync to cloud backup, attorney-ready export

### After an Encounter — Next Steps ✅
- [x] Post-Encounter Guide — branching scenarios, checklists, hotline buttons, shareable report
- [x] Legal Resource Directory — 200+ orgs across 50 states, searchable/filterable, collapsible cards with phone/website

### Community-Level Features ✅
- [x] ICE Activity Heat Map — leaflet.heat with zoom-responsive radius, density visualization, recency decay
- [x] Community Resources — Overpass API safe zone mapping, color-coded markers, walking directions

### Multi-Language Translation ✅
- [x] 21 languages (1 English + 20 translated) at 100% coverage (1,975 keys each)
- [x] Language selector with search + tiered grouping, lazy loading, RTL support
- [x] Tier 1 (high confidence): Spanish, Chinese, Vietnamese, Korean
- [x] Tier 2-4 (AI-translated): Arabic, Tagalog, French, Somali, Amharic, Dari/Farsi, Nepali, Punjabi, Hindi, Burmese, K'iche', Marshallese, Russian, Haitian Creole, Portuguese

### Final Features ✅
- [x] Family Kit multi-language — All FamilyKit.js content uses i18n `t()` — translates with language selector
- [x] Offline Rights Card — Two-sided know-your-rights card (dark/red), print wallet cards, share/copy/email, fully offline, all 21 languages
- [x] Translation review CSV export tooling (`scripts/export-review-csvs.js`)
- [x] Git commit & push — 138 files, +63,508 lines

</details>
