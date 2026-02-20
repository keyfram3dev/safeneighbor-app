# SafeNeighbor — Future Options

Options that are technically feasible but not currently planned. Revisit when the time is right.

---

## Native App Wrapper (Capacitor / PWA Builder)

**What it unlocks:**
- True background geolocation — proximity alerts fire even when the phone is locked
- iOS Geofencing API — OS monitors boundaries natively, much better battery life than polling
- Native push notifications via APNS (Apple) and FCM (Google) — works even when app hasn't been opened
- App Store and Google Play distribution — increases discoverability beyond a URL

**How it works:**
Your existing React code stays exactly as-is. Capacitor wraps it in a thin native iOS/Android shell and provides JavaScript bridge APIs to native device features (geolocation plugins, push, camera, haptics, etc.).

**Requirements:**
- Apple Developer Program: $99/year
- App Store review process (typically 1–3 days, can be rejected)
- Ongoing maintenance of native build pipeline alongside the PWA
- Some plugins require Swift/Kotlin wiring for iOS/Android specifics

**Current PWA limitations this would solve:**
- No background geolocation access
- No Geofencing API
- Limited Background Sync support
- Web Push only works for home-screen installed PWAs (not Safari tabs)

**Recommended starting point:** [Capacitor](https://capacitorjs.com/) — Ionic's official bridge, well-documented, active community, works cleanly with Create React App projects.

---

## Infrastructure Scaling

### EU Data Migration
Firestore currently stores reports on US infrastructure. If user base grows internationally or EU/GDPR compliance becomes a priority:
- **Option**: Migrate to Supabase on an EU-hosted VPS (e.g., Hetzner, OVH)
- Supabase provides Postgres + real-time subscriptions as a Firebase alternative
- Encrypted payloads mean the data is opaque to any host regardless

### HERE Routing API
Currently using OpenRouteService (free, 2,000 req/day) for Check My Route. If usage exceeds that limit:
- **HERE Freemium**: 250,000 req/month, requires credit card
- Drop-in swap on the Cloudflare Worker proxy — both return GeoJSON route geometries
- No frontend changes needed, only the Worker endpoint changes
