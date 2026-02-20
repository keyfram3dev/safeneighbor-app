// src/hooks/useProximityAlerts.js
// Privacy-first proximity alert hook.
//
// Security properties:
//   - GPS: getCurrentPosition() on a configurable interval — coordinates exist only in the
//     Promise callback closure and are never written to any persistent store.
//   - Saved locations: fixed watchpoints (home, work, school) checked without GPS.
//     If GPS permission is denied, saved-location checks still run every poll tick.
//   - Report cache: encrypted in memory with a session AES-256-GCM key generated fresh on
//     mount (extractable: false). Key and ciphertext evaporate when the tab closes.
//   - `enabled`, `pollInterval`, and `cooldown` are all reactive — changes in
//     NotificationSettings take effect immediately via StorageEvent, no reload needed.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useReports } from '../contexts/ReportsContext';
import { findReportsWithinRadius, clusterReports, HALF_MILE } from '../utils/geo';
import { alertHaptic, warningHaptic } from '../utils/haptics';
import { getSavedLocations } from '../utils/savedLocations';

// Alert distance thresholds for GPS-based checks
const CRITICAL_MILES = 0.5;
const HIGH_MILES     = 1.5;
const MODERATE_MILES = 4.0;

// ── Session-key helpers ────────────────────────────────────────────────────

async function generateSessionKey() {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // not extractable — can never be exported or written to disk
    ['encrypt', 'decrypt']
  );
}

async function encryptCoords(key, lat, lng) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify({ lat, lng }));
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv, ciphertext };
}

async function decryptCoords(key, { iv, ciphertext }) {
  const plain = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plain));
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * useProximityAlerts
 * Returns { activeAlert, dismissAlert } where activeAlert is null or
 * { tier: 'critical'|'high'|'moderate', count, distance, clusterCenter }.
 *
 * Each poll tick checks:
 *   1. User's current GPS position against CRITICAL/HIGH/MODERATE thresholds
 *   2. Each saved location against its user-configured radiusMiles
 * The highest-priority match across all check points becomes the active alert.
 */
export default function useProximityAlerts() {
  const { reports } = useReports();

  // Reactive enabled state
  const [enabled, setEnabled] = useState(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem('safeneighbor_proximity_alerts') === 'true'
  );

  // Configurable poll interval (ms) — default 1 min
  const [pollInterval, setPollInterval] = useState(
    () => parseInt(localStorage.getItem('safeneighbor_proximity_interval') || '60000', 10)
  );

  // Configurable re-alert cooldown (ms) — default 15 min
  const [cooldown, setCooldown] = useState(
    () => parseInt(localStorage.getItem('safeneighbor_proximity_cooldown') || '900000', 10)
  );

  const [activeAlert, setActiveAlert] = useState(null);

  // Session-only AES-GCM key — generated once on mount, never leaves memory
  const sessionKeyRef = useRef(null);
  // Encrypted cache of report coords { id → { iv, ciphertext } }
  const encCacheRef   = useRef(new Map());
  // Cooldown tracking: clusterKey → lastAlertTime
  const cooldowns     = useRef(new Map());
  const intervalRef   = useRef(null);

  // Generate session key on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !window.crypto?.subtle) return;
    generateSessionKey().then((key) => {
      sessionKeyRef.current = key;
    });
  }, []);

  // React to StorageEvents dispatched by NotificationSettings (same-tab)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'safeneighbor_proximity_alerts')
        setEnabled(e.newValue === 'true');
      if (e.key === 'safeneighbor_proximity_interval')
        setPollInterval(parseInt(e.newValue, 10));
      if (e.key === 'safeneighbor_proximity_cooldown')
        setCooldown(parseInt(e.newValue, 10));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Keep encrypted report cache in sync with incoming reports
  useEffect(() => {
    const key = sessionKeyRef.current;
    if (!key || !reports || reports.length === 0) return;

    const incoming = new Set(reports.map((r) => r.id));

    // Prune deleted
    for (const id of encCacheRef.current.keys()) {
      if (!incoming.has(id)) encCacheRef.current.delete(id);
    }

    // Add new
    reports.forEach((r) => {
      if (!r.lat || !r.lng || encCacheRef.current.has(r.id)) return;
      encryptCoords(key, r.lat, r.lng).then((enc) => {
        encCacheRef.current.set(r.id, { enc, id: r.id });
      });
    });
  }, [reports]);

  /**
   * runAllChecks(gpsLat, gpsLng)
   * Pass null/null when GPS is unavailable — saved locations are checked regardless.
   */
  const runAllChecks = useCallback(
    async (gpsLat, gpsLng) => {
      const key = sessionKeyRef.current;
      if (!key || encCacheRef.current.size === 0) return;

      // Decrypt all cached report coords (plaintext lives only in this scope)
      const decryptedReports = await Promise.all(
        [...encCacheRef.current.values()].map(async ({ enc, id }) => {
          try {
            const coords = await decryptCoords(key, enc);
            return { id, lat: coords.lat, lng: coords.lng };
          } catch {
            return null;
          }
        })
      );
      const validReports = decryptedReports.filter(Boolean);

      // Build check points: GPS position + each saved location
      const checkPoints = [];
      if (gpsLat != null) {
        checkPoints.push({ lat: gpsLat, lng: gpsLng, radius: MODERATE_MILES });
      }
      for (const loc of getSavedLocations()) {
        if (loc.lat && loc.lng && loc.radiusMiles) {
          checkPoints.push({ lat: loc.lat, lng: loc.lng, radius: loc.radiusMiles });
        }
      }

      if (checkPoints.length === 0) {
        setActiveAlert(null);
        return;
      }

      // Check each point independently, track best (highest tier → shortest distance)
      const tierOrder = { critical: 0, high: 1, moderate: 2 };
      let best = null;

      for (const cp of checkPoints) {
        const nearby = findReportsWithinRadius(cp.lat, cp.lng, validReports, cp.radius);
        if (nearby.length === 0) continue;

        const clusters = clusterReports(nearby, HALF_MILE);
        const largest = clusters.sort((a, b) => b.count - a.count)[0];
        if (!largest) continue;

        const distance = nearby[0].distance;
        const tier =
          distance <= CRITICAL_MILES ? 'critical' :
          distance <= HIGH_MILES     ? 'high'     :
          'moderate';

        if (
          !best ||
          tierOrder[tier] < tierOrder[best.tier] ||
          (tier === best.tier && distance < best.distance)
        ) {
          best = { tier, count: largest.count, distance, clusterCenter: largest.center };
        }
      }

      // Plaintext coords go out of scope here — GC will clear them

      if (!best) {
        setActiveAlert(null);
        return;
      }

      // Cooldown check
      const ck = `${best.clusterCenter.lat.toFixed(3)},${best.clusterCenter.lng.toFixed(3)}`;
      if (Date.now() - (cooldowns.current.get(ck) || 0) < cooldown) return;
      cooldowns.current.set(ck, Date.now());

      best.tier === 'critical' ? warningHaptic() : alertHaptic();
      setActiveAlert(best);
    },
    [cooldown]
  );

  // Start/stop interval polling — restarts immediately when interval or enabled changes
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    const poll = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => runAllChecks(pos.coords.latitude, pos.coords.longitude),
        ()    => runAllChecks(null, null), // GPS denied — still check saved locations
        { enableHighAccuracy: false, maximumAge: 30_000, timeout: 10_000 }
      );
    };

    poll();
    intervalRef.current = setInterval(poll, pollInterval);

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [enabled, pollInterval, runAllChecks]);

  const dismissAlert = useCallback(() => setActiveAlert(null), []);

  return { activeAlert, dismissAlert };
}
