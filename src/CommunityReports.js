import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { UsersThree, MapPinSimple, MapPinSimpleArea, MapTrifold, ShieldCheckIcon, Scales, X, Check, Shield, LockKey, Eye, EyeSlash, Timer, UserCircle, Fire, Buildings, Path, FlagBannerIcon } from '@phosphor-icons/react';
import { Download } from 'lucide-react';
import Disclaimer from './components/Disclaimer';
import FaqCta from './components/FaqCta';
import InstallHelp from './components/InstallHelp';
import DOMPurify from 'dompurify';
import { detectPII } from './utils/piiDetector';
import { encryptReport, decryptReport, decryptDescription } from './utils/reportEncryption';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { reverseGeocode } from './utils/locationShare';
import { savePendingReport, getAllPendingReports, deletePendingReport } from './utils/localStorageDB';
import { calculateDistance } from './utils/geo';


// Detect standalone PWA mode (iOS adds to home screen)
const isStandalonePWA = () =>
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

// Detect Instagram/Facebook/TikTok in-app WebView browsers
const isInAppWebView = () => {
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat|Twitter/i.test(ua);
};

// IP-based geolocation (approximate, ~city level)
const getIPLocation = async () => {
  // Check pre-fetched result from inline script in index.html
  if (window.__ipLocation) {
    return { coords: { latitude: window.__ipLocation.lat, longitude: window.__ipLocation.lng, accuracy: 5000 } };
  }
  // Fallback: fetch from services (same-origin first, then external)
  const services = [
    { url: '/api/ip-location', extract: d => [d.lat, d.lng] },
    { url: 'https://ipwho.is/', extract: d => [d.latitude, d.longitude] },
    { url: 'https://ipapi.co/json/', extract: d => [d.latitude, d.longitude] },
  ];
  for (const { url, extract } of services) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const [lat, lng] = extract(data);
      if (lat && lng) return { coords: { latitude: lat, longitude: lng, accuracy: 5000 } };
    } catch (e) { /* try next */ }
  }
  throw new Error('IP geolocation failed');
};

// Robust geolocation — always falls through to IP if browser geolocation fails
const getLocation = (onSuccess, onError) => {
  let resolved = false;

  const resolve = (pos) => {
    if (resolved) return;
    resolved = true;
    onSuccess(pos);
  };

  // IP fallback — always available regardless of permissions
  const ipFallback = () => {
    getIPLocation().then(resolve).catch(() => {
      if (!resolved && onError) onError({ code: 2, message: 'All location methods failed' });
    });
  };

  // In standalone PWA mode, start IP lookup immediately in parallel
  // since iOS PWA geolocation is unreliable
  if (isStandalonePWA()) {
    ipFallback();
  }

  if (!("geolocation" in navigator)) {
    if (!isStandalonePWA()) ipFallback();
    return;
  }

  // Try browser geolocation — but NEVER block on it
  // iOS PWAs can return false "denied" or "unavailable" even after user allows
  navigator.geolocation.getCurrentPosition(resolve, (err) => {
    if (resolved) return;
    // Try watchPosition as second attempt (works better in some iOS PWA cases)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        resolve(pos);
        navigator.geolocation.clearWatch(watchId);
      },
      () => {
        navigator.geolocation.clearWatch(watchId);
        // All browser methods failed — IP fallback is our last hope
        if (!resolved && !isStandalonePWA()) ipFallback();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
    // Safety cleanup
    setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      if (!resolved && !isStandalonePWA()) ipFallback();
    }, 15000);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
};

const PENDING_KEY = 'safeneighbor_pending_reports_v1';
const EXPIRATION_MS = 12 * 60 * 60 * 1000;
const HEAT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days for heat map
const LEGAL_NOTICE_SHOWN_KEY = 'safeneighbor_legal_notice_shown';
const THREE_MILES_IN_METERS = 4828.03;
const HEATMAP_KEY = 'safeneighbor_heatmap_enabled';
const HEATMAP_CONFIG = {
  radius: 35,
  blur: 20,
  maxZoom: 13,
  max: 1.0,
  minOpacity: 0.55,
  gradient: {
    0.0: 'rgba(127,29,29,0.5)',
    0.25: 'rgba(220,38,38,0.65)',
    0.5: 'rgba(239,68,68,0.75)',
    0.75: 'rgba(251,146,60,0.85)',
    1.0: 'rgba(251,191,36,0.95)'
  }
};

// Community Resources (Overpass API) constants
const RESOURCES_KEY = 'safeneighbor_resources_enabled';
const RESOURCES_DISCLAIMER_KEY = 'safeneighbor_resources_disclaimer_shown';
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const RESOURCES_RADIUS = 5000; // 5km ~ 3.1 miles

// Server-side rate-limited report submission URL
const SUBMIT_REPORT_URL = 'https://us-central1-safeneighbor-33bb0.cloudfunctions.net/submitReport';
const VERIFY_REPORT_URL = 'https://us-central1-safeneighbor-33bb0.cloudfunctions.net/verifyReport';
const FLAG_REPORT_URL = 'https://us-central1-safeneighbor-33bb0.cloudfunctions.net/flagReport';

/**
 * Submit report via Cloud Function (server-side rate limiting)
 * @param {Object} reportData - The report data
 * @returns {Promise<{success: boolean, reportId?: string, error?: string}>}
 */
const submitReportToServer = async (reportData) => {
  try {
    // Build request body based on format: encrypted payload vs legacy
    const bodyData = reportData.encryptedPayload
      ? {
          encryptedPayload: reportData.encryptedPayload,
          payloadVersion: reportData.payloadVersion,
          timestamp: reportData.timestamp,
          coarseLat: reportData.coarseLat,
          coarseLng: reportData.coarseLng,
          deviceId: getOrCreateVerifierId()
        }
      : {
          lat: reportData.lat,
          lng: reportData.lng,
          description: reportData.description,
          ...(reportData.encryptedDescription && {
            encryptedDescription: reportData.encryptedDescription,
            descriptionVersion: reportData.descriptionVersion
          }),
          agents: reportData.agents,
          vehicles: reportData.vehicles,
          activity: reportData.activity || 'Unknown',
          location: reportData.location || '',
          city: reportData.city || '',
          state: reportData.state || '',
          coarseLat: reportData.coarseLat ?? reportData.lat,
          coarseLng: reportData.coarseLng ?? reportData.lng,
          deviceId: getOrCreateVerifierId()
        };

    const response = await fetch(SUBMIT_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || 'Failed to submit report',
        rateLimited: response.status === 429,
        retryAfter: data.retryAfter
      };
    }

    return { success: true, reportId: data.reportId };
  } catch (error) {
    console.error('Server submission error:', error);
    return { success: false, error: error.message };
  }
};

const verifyReportOnServer = async ({ reportId, lat, lng }) => {
  try {
    const response = await fetch(VERIFY_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId,
        verifierId: getOrCreateVerifierId(),
        lat,
        lng,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to verify report',
      };
    }

    return {
      success: true,
      verified: data.verified,
      verifierCount: data.verifierCount,
    };
  } catch (error) {
    console.error('Server verification error:', error);
    return { success: false, error: error.message };
  }
};

const flagReportOnServer = async (reportId) => {
  try {
    const response = await fetch(FLAG_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId,
        verifierId: getOrCreateVerifierId(),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to flag report',
      };
    }

    return {
      success: true,
      flagCount: data.flagCount,
    };
  } catch (error) {
    console.error('Server flag error:', error);
    return { success: false, error: error.message };
  }
};

// Verification system constants
const VERIFICATION_THRESHOLD = 2;  // Minimum verifiers for "verified" status
const VERIFICATION_DISTANCE_MILES = 3;  // Must be within 3 miles to verify
const VERIFIER_ID_KEY = 'safeneighbor_verifier_id';

// Get or create anonymous verifier ID (device-based, no personal data)
const getOrCreateVerifierId = () => {
  let verifierId = localStorage.getItem(VERIFIER_ID_KEY);
  if (!verifierId) {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    verifierId = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(VERIFIER_ID_KEY, verifierId);
  }
  return verifierId;
};

// Check if report meets verification threshold
const isReportVerified = (report) => {
  // Support old boolean verified field for migration
  if (!report.verifiers || report.verifiers.length === 0) {
    return report.verified === true;
  }
  // New: check verifiers array against threshold
  return report.verifiers.length >= VERIFICATION_THRESHOLD;
};

// Check if current user has already verified this report
const hasUserVerified = (report, verifierId) => {
  return report.verifiers?.some(v => v.id === verifierId) || false;
};

// Helper: Convert full state name to abbreviation
const getStateAbbreviation = (state) => {
  const stateMap = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
    'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
    'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
    'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
    'district of columbia': 'DC'
  };
  const lower = state.toLowerCase().trim();
  // Return abbreviation if found, or original if already abbreviated (2 chars)
  return stateMap[lower] || (state.length === 2 ? state.toUpperCase() : state);
};

// Security: Rate limiting configuration
const RATE_LIMIT_KEY = 'safeneighbor_report_rate_limit';
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REPORTS_PER_WINDOW = 5;
// Security: Duplicate detection settings
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const DUPLICATE_DISTANCE_KM = 0.5; // 500 meters

// Security: Check rate limit before submission
const checkRateLimit = () => {
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  const now = Date.now();
  let records = stored ? JSON.parse(stored) : [];

  // Filter to current window only
  records = records.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (records.length >= MAX_REPORTS_PER_WINDOW) {
    const oldestInWindow = Math.min(...records);
    const resetIn = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
    return {
      allowed: false,
      resetInMinutes: Math.ceil(resetIn / 60000),
      remaining: 0
    };
  }

  return {
    allowed: true,
    remaining: MAX_REPORTS_PER_WINDOW - records.length
  };
};

// Security: Record a submission for rate limiting
const recordSubmission = () => {
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  const now = Date.now();
  let records = stored ? JSON.parse(stored) : [];
  records = records.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  records.push(now);
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(records));
};

// Security: Reduce coordinate precision to ~0.25km (250m) for privacy
// Using factor of 400 gives 0.0025° steps ≈ 275m at equator
const fuzzyCoordinate = (coord) => {
  return Math.round(coord * 400) / 400;
};

// Security: Round timestamp to nearest 15 minutes for privacy
const roundTimestamp = (date) => {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const roundedMinutes = Math.round(minutes / 15) * 15;
  d.setMinutes(roundedMinutes, 0, 0);
  return d.toISOString();
};

// Security: Validate coordinates are within US bounds
const validateCoordinates = (lat, lng) => {
  // Valid lat: -90 to 90, valid lng: -180 to 180
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, error: 'Invalid coordinates' };
  }

  // Limit to US bounds (rough): lat 24-50, lng -125 to -66
  const inUS = lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66;
  if (!inUS) {
    return { valid: false, error: 'Location outside service area (US only)' };
  }

  return { valid: true };
};

// Security: Enhanced content sanitization using DOMPurify
const sanitizeDescription = (str) => {
  if (!str) return '';

  // Length limit
  const maxLength = 500;
  const trimmed = str.slice(0, maxLength);

  // Use DOMPurify to strip all HTML tags (text only)
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [] });
};

// Security: Validate numeric report data
const validateReportData = (data) => {
  const errors = [];

  // Agents count: 0-50 reasonable range
  const agents = parseInt(data.agents) || 0;
  if (agents < 0 || agents > 50) {
    errors.push('Agent count must be 0-50');
  }

  // Vehicles count: 0-20 reasonable range
  const vehicles = parseInt(data.vehicles) || 0;
  if (vehicles < 0 || vehicles > 20) {
    errors.push('Vehicle count must be 0-20');
  }

  // Description required and length check
  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  if (data.description && data.description.length > 500) {
    errors.push('Description too long (max 500 characters)');
  }

  return errors;
};

// Security: Check for duplicate reports (same location within time window)
const isDuplicateReport = (newLat, newLng, newTimestamp, existingReports, calculateDistanceFn) => {
  const newTime = new Date(newTimestamp).getTime();

  for (const existing of existingReports) {
    if (!existing.lat || !existing.lng || !existing.timestamp) continue;

    const existingTime = new Date(existing.timestamp).getTime();
    const timeDiff = Math.abs(newTime - existingTime);

    if (timeDiff > DUPLICATE_WINDOW_MS) continue;

    // Use the component's distance calculation
    const distanceMiles = calculateDistanceFn(newLat, newLng, existing.lat, existing.lng);
    const distanceKm = distanceMiles * 1.60934;

    if (distanceKm < DUPLICATE_DISTANCE_KM) {
      return true; // Likely duplicate
    }
  }
  return false;
};

const isExpired = (timestamp) => {
  const reportDate = new Date(timestamp).getTime();
  const now = new Date().getTime();
  return (now - reportDate) > EXPIRATION_MS;
};

// Check if a report is a test report based on description
const isTestReport = (report) => {
  if (!report.description) return false;
  const desc = report.description.toLowerCase().trim();
  // Match "test" as a word anywhere in the description
  // Uses word boundary \b to avoid matching "contest", "testament", etc.
  return /\btest\b/i.test(desc);
};

// Convert reports to heat map data points with weighted intensity
const reportsToHeatData = (reports) => {
  const now = Date.now();
  return reports
    .filter(r => r.lat && r.lng)
    .map(r => {
      let intensity = 0.45;
      intensity += Math.min((parseInt(r.agents) || 0) * 0.05, 0.3);
      if (isReportVerified(r)) intensity += 0.2;
      const ageMs = now - new Date(r.timestamp || 0).getTime();
      intensity *= Math.max(0, 1 - (ageMs / HEAT_EXPIRATION_MS));
      return [r.lat, r.lng, intensity];
    })
    .filter(point => point[2] > 0.01);
};

// Fetch community resources (churches, hospitals, schools, consulates) from Overpass API
const fetchCommunityResources = async (lat, lng, radius = RESOURCES_RADIUS) => {
  const query = `[out:json][timeout:15];(
    node["amenity"="place_of_worship"](around:${radius},${lat},${lng});
    node["amenity"="hospital"](around:${radius},${lat},${lng});
    node["amenity"="school"](around:${radius},${lat},${lng});
    node["office"="diplomatic"](around:${radius},${lat},${lng});
    way["amenity"="place_of_worship"](around:${radius},${lat},${lng});
    way["amenity"="hospital"](around:${radius},${lat},${lng});
    way["amenity"="school"](around:${radius},${lat},${lng});
  );out center;`;
  const body = `data=${encodeURIComponent(query)}`;

  // Try each Overpass server with a 12s timeout, fall back to next on failure
  for (const url of OVERPASS_URLS) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal
      });
      clearTimeout(tid);
      if (!response.ok) continue;
      const data = await response.json();
      return data.elements.map(el => {
        const elLat = el.type === 'way' ? el.center?.lat : el.lat;
        const elLng = el.type === 'way' ? el.center?.lon : el.lon;
        if (!elLat || !elLng) return null;
        let category = 'unknown';
        if (el.tags?.amenity === 'place_of_worship') category = 'church';
        else if (el.tags?.amenity === 'hospital') category = 'hospital';
        else if (el.tags?.amenity === 'school') category = 'school';
        else if (el.tags?.office === 'diplomatic') category = 'consulate';
        return { id: el.id, name: el.tags?.name || el.tags?.['name:en'] || `Unnamed ${category}`, category, lat: elLat, lng: elLng };
      }).filter(Boolean);
    } catch (e) {
      console.warn(`SafeNeighbor: Overpass server failed (${url}):`, e.message);
    }
  }
  throw new Error('All Overpass servers failed');
};

// Cache key rounds to 0.01° (~1.1km) so user must move >1km before re-fetch
const resourceCacheKey = (lat, lng) => `${Math.round(lat * 100) / 100},${Math.round(lng * 100) / 100}`;

// Resource category styling
const RESOURCE_STYLES = {
  church: { bg: '#581c87', border: '#a855f7', label: 'Church' },
  hospital: { bg: '#1e3a5f', border: '#3b82f6', label: 'Hospital' },
  school: { bg: '#14532d', border: '#22c55e', label: 'School' },
  consulate: { bg: '#7c2d12', border: '#f97316', label: 'Consulate' },
};

// Location Permission Modal Component
const LocationPermissionModal = ({ onClose, onRetry, errorType }) => {
  const { t } = useTranslation();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  const getErrorMessage = () => {
    switch (errorType) {
      case 'denied':
        return t('reports.locationErrorDenied');
      case 'unavailable':
        return t('reports.locationErrorUnavailable');
      case 'timeout':
        return t('reports.locationErrorTimeout');
      default:
        return t('reports.locationErrorDefault');
    }
  };

  const getInstructions = () => {
    if (isIOS && isSafari) {
      return [
        t('reports.instructionIOSSafari1'),
        t('reports.instructionIOSSafari2'),
        t('reports.instructionIOSSafari3'),
        t('reports.instructionIOSSafari4'),
        t('reports.instructionIOSSafari5')
      ];
    } else if (isIOS) {
      return [
        t('reports.instructionIOS1'),
        t('reports.instructionIOS2'),
        t('reports.instructionIOS3'),
        t('reports.instructionIOS4'),
        t('reports.instructionIOS5')
      ];
    } else if (isAndroid) {
      return [
        t('reports.instructionAndroid1'),
        t('reports.instructionAndroid2'),
        t('reports.instructionAndroid3'),
        t('reports.instructionAndroid4')
      ];
    } else {
      // Desktop
      return [
        t('reports.instructionDesktop1'),
        t('reports.instructionDesktop2'),
        t('reports.instructionDesktop3'),
        t('reports.instructionDesktop4')
      ];
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl w-full max-w-md overflow-hidden border border-slate-700/50 shadow-2xl relative"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center gap-3">
          <div className="p-2 bg-amber-600/20 rounded-lg">
            <MapPinSimple size={28} weight="bold" className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('reports.enableLocationAccess')}</h2>
            <p className="text-slate-400 text-xs">{t('reports.requiredForGps')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Error Message */}
          <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4">
            <p className="text-amber-300 text-sm font-medium">{getErrorMessage()}</p>
          </div>

          {/* Why Location is Needed */}
          <div>
            <h3 className="text-white font-bold text-sm mb-2">{t('reports.whyLocationNeeded')}</h3>
            <ul className="text-slate-400 text-xs space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {t('reports.locationReasonCenter')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {t('reports.locationReasonSort')}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {t('reports.locationReasonVerify')}
              </li>
            </ul>
          </div>

          {/* Instructions */}
          {errorType === 'denied' && (
            <div>
              <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                <span>📱</span>
                {isIOS ? t('reports.instructionsIOS') : isAndroid ? t('reports.instructionsAndroid') : t('reports.instructionsDesktop')}
              </h3>
              <ol className="text-slate-300 text-xs space-y-2">
                {getInstructions().map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="bg-slate-700 text-slate-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl transition-all text-sm"
          >
            {t('reports.useMapInstead')}
          </button>
          <button
            onClick={onRetry}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm"
          >
            {t('reports.tryAgain')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Legal Notice Modal Component
const LegalNoticeModal = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-700/50 flex flex-col relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Scales size={20} weight="bold" className="text-amber-400" />
            <h2 className="text-lg font-bold text-white">{t('reports.communitySafetyGuidelines')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Informational Purposes Section */}
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-4">
            <h3 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-3">
              {t('reports.informationalPurposesOnly')}
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              {t('reports.informationalPurposesDesc')}
            </p>
          </div>

          {/* Intended Use */}
          <div>
            <h4 className="text-green-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
              <Check size={14} weight="bold" /> {t('reports.intendedForTitle')}
            </h4>
            <ul className="text-slate-300 text-sm space-y-1.5 ms-5">
              <li>{t('reports.intendedFor1')}</li>
              <li>{t('reports.intendedFor2')}</li>
              <li>{t('reports.intendedFor3')}</li>
              <li>{t('reports.intendedFor4')}</li>
            </ul>
          </div>

          {/* NOT Intended Use */}
          <div>
            <h4 className="text-red-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
              <X size={14} weight="bold" /> {t('reports.notIntendedForTitle')}
            </h4>
            <ul className="text-slate-300 text-sm space-y-1.5 ms-5">
              <li>{t('reports.notIntendedFor1')}</li>
              <li>{t('reports.notIntendedFor2')}</li>
              <li>{t('reports.notIntendedFor3')}</li>
              <li>{t('reports.notIntendedFor4')}</li>
            </ul>
          </div>

          {/* Legal Warning Box */}
          <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4">
            <h4 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              {t('reports.importantLegalBoundaries')}
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              {t('reports.federalLawWarning')}
            </p>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              <strong className="text-white">{t('reports.protectedSpeech')}</strong> {t('reports.protectedSpeechCaveat')}
            </p>
            <p className="text-amber-300 text-sm font-semibold">
              {t('reports.responsibleForActions')}
            </p>
          </div>

          {/* Your Rights */}
          <div>
            <h4 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">
              {t('reports.yourRightsTitle')}
            </h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>{t('reports.yourRight1')}</li>
              <li>{t('reports.yourRight2')}</li>
              <li>{t('reports.yourRight3')}</li>
              <li>{t('reports.yourRight4')}</li>
            </ul>
          </div>

          {/* Resources */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
            <h4 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">
              {t('reports.resourcesTitle')}
            </h4>
            <div className="space-y-2">
              <a href="https://www.aclu.org/know-your-rights" target="_blank" rel="noopener noreferrer"
                className="block text-blue-400 hover:text-blue-300 text-sm underline">
                {t('reports.resourceACLU')}
              </a>
              <a href="https://constitution.congress.gov/constitution/amendment-1/" target="_blank" rel="noopener noreferrer"
                className="block text-blue-400 hover:text-blue-300 text-sm underline">
                {t('reports.resourceFirstAmendment')}
              </a>
              <a href="https://www.eff.org/issues/know-your-rights" target="_blank" rel="noopener noreferrer"
                className="block text-blue-400 hover:text-blue-300 text-sm underline">
                {t('reports.resourceEFF')}
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 shrink-0">
          <p className="text-slate-500 text-xs text-center mb-4">
            {t('reports.guidelinesAcknowledge')}
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg"
          >
            {t('reports.iUnderstand')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Privacy & Security Modal Component
const PrivacySecurityModal = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-700/50 flex flex-col relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={20} weight="bold" className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">{t('reports.privacyAndSecurity')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Privacy First Section */}
          <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-4">
            <h3 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-3">
              {t('reports.privacyComesFirst')}
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              {t('reports.privacyComesFirstDesc')}
            </p>
          </div>

          {/* Anonymous Reporting */}
          <div className="flex gap-4">
            <div className="p-2.5 bg-green-950/40 rounded-xl h-fit">
              <UserCircle size={24} weight="bold" className="text-green-400" />
            </div>
            <div>
              <h4 className="text-green-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                {t('reports.anonymousReportingTitle')}
              </h4>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>{t('reports.anonymousReporting1')}</li>
                <li>{t('reports.anonymousReporting2')}</li>
                <li>{t('reports.anonymousReporting3')}</li>
                <li>{t('reports.anonymousReporting4')}</li>
              </ul>
            </div>
          </div>

          {/* Location Privacy */}
          <div className="flex gap-4">
            <div className="p-2.5 bg-purple-950/40 rounded-xl h-fit">
              <Eye size={24} weight="bold" className="text-purple-400" />
            </div>
            <div>
              <h4 className="text-purple-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                {t('reports.locationPrivacyTitle')}
              </h4>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>{t('reports.locationPrivacy1')}</li>
                <li>{t('reports.locationPrivacy2')}</li>
                <li>{t('reports.locationPrivacy3')}</li>
                <li>{t('reports.locationPrivacy4')}</li>
              </ul>
            </div>
          </div>

          {/* Auto-Expiration */}
          <div className="flex gap-4">
            <div className="p-2.5 bg-amber-950/40 rounded-xl h-fit">
              <Timer size={24} weight="bold" className="text-amber-400" />
            </div>
            <div>
              <h4 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                {t('reports.autoExpirationTitle')}
              </h4>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>{t('reports.autoExpiration1')}</li>
                <li>{t('reports.autoExpiration2')}</li>
                <li>{t('reports.autoExpiration3')}</li>
                <li>{t('reports.autoExpiration4')}</li>
              </ul>
            </div>
          </div>

          {/* Abuse Prevention */}
          <div className="flex gap-4">
            <div className="p-2.5 bg-red-950/40 rounded-xl h-fit">
              <ShieldCheckIcon size={24} weight="bold" className="text-red-400" />
            </div>
            <div>
              <h4 className="text-red-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                {t('reports.abusePreventionTitle')}
              </h4>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>{t('reports.abusePrevention1')}</li>
                <li>{t('reports.abusePrevention2')}</li>
                <li>{t('reports.abusePrevention3')}</li>
                <li>{t('reports.abusePrevention4')}</li>
              </ul>
            </div>
          </div>

          {/* Community Verification */}
          <div className="flex gap-4">
            <div className="p-2.5 bg-cyan-950/40 rounded-xl h-fit">
              <UsersThree size={24} weight="bold" className="text-cyan-400" />
            </div>
            <div>
              <h4 className="text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                {t('reports.communityVerificationTitle')}
              </h4>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>{t('reports.communityVerification1')}</li>
                <li>{t('reports.communityVerification2')}</li>
                <li>{t('reports.communityVerification3')}</li>
                <li>{t('reports.communityVerification4')}</li>
              </ul>
            </div>
          </div>

          {/* Data Security */}
          <div className="flex gap-4">
            <div className="p-2.5 bg-slate-800 rounded-xl h-fit">
              <LockKey size={24} weight="bold" className="text-slate-400" />
            </div>
            <div>
              <h4 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                {t('reports.dataSecurityTitle')}
              </h4>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>{t('reports.dataSecurity1')}</li>
                <li>{t('reports.dataSecurity2')}</li>
                <li>{t('reports.dataSecurity3')}</li>
                <li>{t('reports.dataSecurity4')}</li>
                <li>{t('reports.dataSecurity5')}</li>
                <li>{t('reports.dataSecurity6')}</li>
              </ul>
            </div>
          </div>

          {/* What We Store */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
            <h4 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">
              {t('reports.whatIsStored')}
            </h4>
            <ul className="text-slate-300 text-sm space-y-1 mb-4">
              <li>{t('reports.stored1')}</li>
              <li>{t('reports.stored2')}</li>
              <li>{t('reports.stored3')}</li>
              <li>{t('reports.stored4')}</li>
            </ul>
            <h4 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">
              {t('reports.whatIsNotStored')}
            </h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>{t('reports.notStored1')}</li>
              <li>{t('reports.notStored2')}</li>
              <li>{t('reports.notStored3')}</li>
              <li>{t('reports.notStored4')}</li>
            </ul>
          </div>

          {/* Offline Support Note */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
            <h4 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">
              {t('reports.worksOfflineTitle')}
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              {t('reports.worksOfflineDesc')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 shrink-0">
          <p className="text-slate-500 text-xs text-center mb-4">
            {t('reports.privacyFooter')}
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg"
          >
            {t('reports.gotIt')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Nearby Report Modal - prompts user to verify existing report instead of creating duplicate
const NearbyReportModal = ({ report, onVerify, onCreateNew, onClose, userDistance }) => {
  const { t } = useTranslation();
  const timeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return t('reports.hoursAgo', { count: hours });
    if (minutes > 0) return t('reports.minutesAgo', { count: minutes });
    return t('reports.justNow');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl w-full max-w-md overflow-hidden border border-amber-700/50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-amber-950/30">
          <div className="flex items-center gap-2">
            <MapPinSimple size={20} weight="bold" className="text-amber-400" />
            <h2 className="text-lg font-bold text-white">{t('reports.reportAlreadyExists')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-slate-300 text-sm">
            {t('reports.reportAlreadyExistsDesc')}
          </p>

          {/* Existing Report Card */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
                <Timer size={14} weight="bold" />
                {timeAgo(report.timestamp)}
              </div>
              {report.verifiers?.length > 0 && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <ShieldCheckIcon size={12} weight="bold" />
                  {t('reports.verifiedCount', { count: report.verifiers.length })}
                </span>
              )}
            </div>
            <p className="text-white font-medium text-sm">{report.location} <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">({t('reports.approx')})</span></p>
            <p className="text-slate-400 text-xs line-clamp-2">{report.description}</p>
            <div className="flex gap-3 text-xs text-slate-500">
              {report.agents > 0 && <span>{t('reports.agentsCount', { count: report.agents })}</span>}
              {report.vehicles > 0 && <span>{t('reports.vehiclesCount', { count: report.vehicles })}</span>}
            </div>
            {userDistance !== null && (
              <p className="text-xs text-blue-400">
                {userDistance < 0.1 ? t('reports.atThisLocation') : t('reports.milesAway', { distance: userDistance.toFixed(1) })}
              </p>
            )}
          </div>

          <p className="text-slate-500 text-xs">
            {t('reports.verifyingHelps')}
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <button
            onClick={onVerify}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <ShieldCheckIcon size={18} weight="bold" />
            {t('reports.verifyThisReport')}
          </button>
          <button
            onClick={onCreateNew}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 px-6 rounded-xl transition-all text-sm"
          >
            {t('reports.submitNewReportAnyway')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Community Resources Disclaimer Modal
const ResourcesDisclaimerModal = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-700/50 flex flex-col relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Buildings size={20} weight="bold" className="text-emerald-400" />
            <h2 className="text-lg font-bold text-white">{t('reports.communityResourcesTitle')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <p className="text-slate-300 text-sm leading-relaxed">
            {t('reports.communityResourcesDesc')}
          </p>

          {/* Disclaimer */}
          <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4">
            <h4 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              {t('reports.importantNotice')}
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              {t('reports.sensitiveLocationsRescinded')}
            </p>
          </div>

          {/* Category Legend */}
          <div>
            <h4 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">
              {t('reports.mapLegend')}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: '#581c87', borderColor: '#a855f7' }} />
                <span className="text-slate-300 text-sm">{t('reports.churches')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: '#1e3a5f', borderColor: '#3b82f6' }} />
                <span className="text-slate-300 text-sm">{t('reports.hospitals')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: '#14532d', borderColor: '#22c55e' }} />
                <span className="text-slate-300 text-sm">{t('reports.schools')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: '#7c2d12', borderColor: '#f97316' }} />
                <span className="text-slate-300 text-sm">{t('reports.consulates')}</span>
              </div>
            </div>
          </div>

          <p className="text-slate-500 text-xs leading-relaxed">
            {t('reports.osmDataSource')}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg"
          >
            {t('reports.iUnderstand')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const CommunityReports = ({ isDuressMode = false, onOpenCheckRoute, onNavigateToScenario, onNavigate }) => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setSelectedReport] = useState(null);
  const { isOnline } = useOnlineStatus();
  const [pendingReports, setPendingReports] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [userCoords, setUserCoords] = useState(null);
  const [activeHubId, setActiveHubId] = useState(null);
  
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const reportMarkersRef = useRef([]);
  const heatLayerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatReports, setHeatReports] = useState([]);
  const [showPins, setShowPins] = useState(true);
  const [showLocationPin, setShowLocationPin] = useState(true);

  // Community Resources state
  const [resourcesEnabled, setResourcesEnabled] = useState(() => localStorage.getItem(RESOURCES_KEY) === 'true');
  const [resourcesData, setResourcesData] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState(false);
  const resourceMarkersRef = useRef([]);
  const reportClusterRef = useRef(null);
  const resourceClusterRef = useRef(null);
  const resourcesCacheRef = useRef({});
  const [showResourcesDisclaimer, setShowResourcesDisclaimer] = useState(false);

  const [showInlinePicker, setShowInlinePicker] = useState(false);
  const inlinePickerMapRef = useRef(null);
  const inlinePickerMarkerRef = useRef(null);
  const inlinePickerCircleRef = useRef(null);
  const [pickerError, setPickerError] = useState(null);

  // Location permission modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationError, setLocationError] = useState(null); // 'denied' | 'unavailable' | 'timeout'

  // Legal notice modal state
  const [showLegalNotice, setShowLegalNotice] = useState(false);

  // Privacy & Security modal state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Install help modal state
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  // PII warning modal state
  const [showPiiWarning, setShowPiiWarning] = useState(false);
  const [piiFindings, setPiiFindings] = useState([]);

  // Nearby report modal state (prompt to verify instead of new report)
  const [showNearbyReportModal, setShowNearbyReportModal] = useState(false);
  const [nearbyReport, setNearbyReport] = useState(null);
  const [pendingSubmission, setPendingSubmission] = useState(null);

  // Lock body scroll when any modal is open
  const anyModalOpen = showLocationModal || showLegalNotice || showPrivacyModal || showPiiWarning || showNearbyReportModal || showResourcesDisclaimer;
  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen]);

  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [dragMoved, setDragMoved] = useState(false);
  
  const [formData, setFormData] = useState({
    location: '',
    lat: window.__ipLocation?.lat || 37.7749,
    lng: window.__ipLocation?.lng || -122.4194,
    locationSource: 'manual', // 'gps' = Use My Location, 'manual' = dragged/clicked pin
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    description: '',
    agents: '',
    vehicles: ''
  });

  const [reports, setReports] = useState([]);
  const sessionReportsRef = useRef(new Map()); // Persist reports seen this session
  const prevReportIdsRef = useRef(new Set()); // Track seen report IDs for notifications

  // calculateDistance imported from utils/geo.js

  // Find existing report near the given coordinates (within ~0.5 miles, not expired)
  const findNearbyReport = (lat, lng) => {
    const NEARBY_THRESHOLD_MILES = 0.5; // Half mile radius
    const allReports = [...reports, ...pendingReports];

    for (const report of allReports) {
      if (!report.lat || !report.lng) continue;
      if (isExpired(report.timestamp || '')) continue;

      const distance = calculateDistance(lat, lng, report.lat, report.lng);
      if (distance <= NEARBY_THRESHOLD_MILES) {
        return { report, distance };
      }
    }
    return null;
  };

  // Handler for verifying an existing nearby report instead of creating duplicate
  const handleVerifyNearbyReport = async () => {
    if (nearbyReport?.report?.id) {
      // Create a mock event with stopPropagation for handleToggleVerify
      const mockEvent = { stopPropagation: () => {} };
      await handleToggleVerify(mockEvent, nearbyReport.report.id);
      setShowNearbyReportModal(false);
      setNearbyReport(null);
      setPendingSubmission(null);
      // Show success message
      setSubmitted(true);
    }
  };

  // Handler for proceeding with new report anyway
  const handleCreateNewAnyway = async () => {
    setShowNearbyReportModal(false);
    setNearbyReport(null);

    if (pendingSubmission) {
      // Re-submit after the user chose to continue despite a nearby report.
      setIsSubmitting(true);

      try {
        // Build timestamp from form data
        const reportTimestamp = new Date(`${pendingSubmission.date}T${pendingSubmission.time}`).toISOString();

        // Security: Apply privacy protections
        // Only fuzz GPS-sourced coordinates; manual pins are already user-chosen
        const isGps = pendingSubmission.locationSource === 'gps';
        const fuzzyLat = isGps ? fuzzyCoordinate(pendingSubmission.lat) : pendingSubmission.lat;
        const fuzzyLng = isGps ? fuzzyCoordinate(pendingSubmission.lng) : pendingSubmission.lng;
        const roundedTimestamp = roundTimestamp(reportTimestamp);

        // Get street address and city/state from coordinates
        const geoData = await reverseGeocode(fuzzyLat, fuzzyLng);

        // For GPS reports, snap to Nominatim's nearest road/address coordinates
        const reportLat = (isGps && geoData.snappedLat) ? geoData.snappedLat : fuzzyLat;
        const reportLng = (isGps && geoData.snappedLng) ? geoData.snappedLng : fuzzyLng;

        // Encrypt all sensitive fields as a single payload
        const sanitizedPending = sanitizeDescription(pendingSubmission.description);
        const pendingSensitiveFields = {
          lat: reportLat,
          lng: reportLng,
          city: geoData.city || '',
          state: geoData.state || '',
          location: geoData.address || `~ Near ${reportLat.toFixed(2)}, ${reportLng.toFixed(2)}`,
          description: sanitizedPending,
          agents: Math.min(50, Math.max(0, parseInt(pendingSubmission.agents) || 0)),
          vehicles: Math.min(20, Math.max(0, parseInt(pendingSubmission.vehicles) || 0)),
          activity: pendingSubmission.activity || 'Unknown'
        };

        let pendingServerReport;
        try {
          const encrypted = await encryptReport(pendingSensitiveFields);
          pendingServerReport = {
            ...encrypted,
            coarseLat: reportLat,
            coarseLng: reportLng,
            timestamp: roundedTimestamp,
            verified: false,
            verifiers: []
          };
        } catch (encErr) {
          console.warn('Encryption unavailable, using legacy format:', encErr.message);
          pendingServerReport = {
            ...pendingSensitiveFields,
            coarseLat: reportLat,
            coarseLng: reportLng,
            timestamp: roundedTimestamp,
            verified: false,
            verifiers: []
          };
        }

        if (isOnline) {
          const result = await submitReportToServer(pendingServerReport);
          if (!result.success) {
            if (result.rateLimited) {
              alert(result.error || t('reports.tooManyReports'));
            } else {
              alert(result.error || t('reports.failedToSubmit'));
            }
            setPendingSubmission(null);
            setIsSubmitting(false);
            return;
          }
          recordSubmission();
          if (window.umami) window.umami.track('report_submitted', { state: geoData.state || 'unknown' });
        } else {
          // Offline: encrypt and queue to IndexedDB for background sync
          const reportId = `pending_${Date.now()}`;
          const displayFields = {
            ...pendingSensitiveFields,
            timestamp: roundedTimestamp,
            verified: false,
            verifiers: [],
            id: reportId,
            pending: true
          };

          // Build the exact body the Cloud Function expects, including deviceId,
          // so the SW can POST it directly without needing localStorage access.
          const swPayload = pendingServerReport.encryptedPayload
            ? {
                encryptedPayload: pendingServerReport.encryptedPayload,
                payloadVersion: pendingServerReport.payloadVersion,
                timestamp: pendingServerReport.timestamp,
                deviceId: getOrCreateVerifierId()
              }
            : {
                ...pendingServerReport,
                deviceId: getOrCreateVerifierId()
              };

          await savePendingReport({
            id: reportId,
            serverPayload: swPayload,
            displayFields,
          });
          setPendingReports(prev => [...prev, displayFields]);

          // Register background sync so SW can send it headlessly
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              if ('sync' in reg) {
                reg.sync.register('sync-pending-reports').catch(() => {});
              }
            });
          }
        }

        setSubmitted(true);
        if (mapRef.current) {
          mapRef.current.flyTo([reportLat, reportLng], 11, { duration: 1.5 });
        }
        setFormData(prev => ({
          ...prev,
          description: '',
          agents: '',
          vehicles: ''
        }));
        setShowInlinePicker(false);
      } catch (error) {
        console.error('Error submitting report:', error);
        alert(t('reports.failedToSubmit'));
      } finally {
        setPendingSubmission(null);
        setIsSubmitting(false);
      }
    }
  };

  // Handler for closing the nearby report modal
  const handleCloseNearbyModal = () => {
    setShowNearbyReportModal(false);
    setNearbyReport(null);
    setPendingSubmission(null);
  };

  const dynamicHubs = useMemo(() => {
    const MAX_HOTSPOTS = 10;
    const hubs = [];

    // Helper to format report location with nearby address
    const formatReportName = (r) => {
      // Prefer the location field which has street-level "~ 123 Main St, Area"
      if (r.location) {
        const stateAbbrev = r.state ? getStateAbbreviation(r.state) : '';
        // Location already starts with "~" from reverseGeocode
        if (r.location.startsWith('~')) {
          return stateAbbrev ? `${r.location}, ${stateAbbrev}` : r.location;
        }
        return r.location;
      }
      if (r.city && r.state) {
        const stateAbbrev = getStateAbbreviation(r.state);
        return `${r.city}, ${stateAbbrev}`;
      }
      return t('reports.reportedLocation');
    };

    // 1. Get verified reports sorted by most recent
    const verifiedReports = reports
      .filter(r => isReportVerified(r) && r.lat && r.lng)
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    // 2. Get unverified reports sorted by most recent
    const unverifiedReports = reports
      .filter(r => !isReportVerified(r) && r.lat && r.lng)
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    // 3. Add verified hotspots first (up to MAX_HOTSPOTS)
    for (const r of verifiedReports.slice(0, MAX_HOTSPOTS)) {
      hubs.push({
        name: formatReportName(r),
        lat: r.lat,
        lng: r.lng,
        type: 'verified',
        verifierCount: r.verifiers?.length || 0
      });
    }

    // 4. Fill with unverified if < MAX_HOTSPOTS
    if (hubs.length < MAX_HOTSPOTS) {
      const remaining = MAX_HOTSPOTS - hubs.length;
      for (const r of unverifiedReports.slice(0, remaining)) {
        hubs.push({
          name: formatReportName(r),
          lat: r.lat,
          lng: r.lng,
          type: 'reported'
        });
      }
    }

    return hubs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  const sortedReports = useMemo(() => {
    // Reports are already filtered for expiration in the snapshot listener
    const combined = [...pendingReports, ...reports];
    return combined.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
      if (userCoords && (sortBy === 'nearest' || sortBy === 'farthest')) {
        const distA = calculateDistance(userCoords.lat, userCoords.lng, a.lat || 0, a.lng || 0);
        const distB = calculateDistance(userCoords.lat, userCoords.lng, b.lat || 0, b.lng || 0);
        return sortBy === 'nearest' ? distA - distB : distB - distA;
      }
      return 0;
    });
  }, [reports, pendingReports, sortBy, userCoords]);

  // Statistics for pills display
  const reportStats = useMemo(() => {
    const verifiedReports = reports.filter(r => isReportVerified(r));
    return {
      totalActive: reports.length,
      totalVerified: verifiedReports.length
    };
  }, [reports]);

  // Online/offline tracking handled by useOnlineStatus hook above.
  // SW message listener kept for background sync notifications.
  useEffect(() => {
    const handleSWMessage = async (event) => {
      if (event.data && (event.data.type === 'SYNC_PENDING_REPORTS' || event.data.type === 'SYNC_COMPLETED')) {
        // Reload pending reports from IndexedDB when SW signals sync completed
        try {
          const records = await getAllPendingReports();
          setPendingReports(records.map(r => ({ ...r.displayFields, id: r.id, pending: true })));
        } catch { setPendingReports([]); }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
  }, []);

  // Show legal notice on first visit + request notification permission
  useEffect(() => {
    const hasSeenLegalNotice = localStorage.getItem(LEGAL_NOTICE_SHOWN_KEY);
    if (!hasSeenLegalNotice) {
      setShowLegalNotice(true);
    }

    // Request notification permission after a longer delay to avoid competing with geolocation prompt
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => Notification.requestPermission(), 10000);
    }

    // Pick up shared data from share_target
    if (window.__safeneighbor_shared) {
      const shared = window.__safeneighbor_shared;
      const description = [shared.title, shared.text, shared.url]
        .filter(Boolean)
        .join(' - ');
      if (description) {
        setFormData(prev => ({ ...prev, description: description.slice(0, 500) }));
      }
      delete window.__safeneighbor_shared;
    }
  }, []);

  useEffect(() => {
    console.log('Setting up Firebase listener...');

    // Migrate any legacy localStorage pending reports to IndexedDB, then load from IndexedDB
    (async () => {
      try {
        // One-time migration from localStorage
        const legacy = localStorage.getItem(PENDING_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const report of parsed) {
              if (isExpired(report.timestamp || '')) continue;
              // Encrypt for serverPayload and include deviceId for SW
              const deviceId = getOrCreateVerifierId();
              let swPayload;
              try {
                const { id, pending: _p, verified, verifiers, ...sensitiveFields } = report;
                const encrypted = await encryptReport(sensitiveFields);
                swPayload = {
                  encryptedPayload: encrypted.encryptedPayload,
                  payloadVersion: encrypted.payloadVersion,
                  timestamp: report.timestamp,
                  deviceId
                };
              } catch {
                // Fallback to unencrypted
                const { id, pending: _p, verified, verifiers, ...rest } = report;
                swPayload = { ...rest, deviceId };
              }
              await savePendingReport({
                id: report.id || `pending_${Date.now()}`,
                serverPayload: swPayload,
                displayFields: report,
              });
            }
            localStorage.removeItem(PENDING_KEY);
            console.log(`Migrated ${parsed.length} pending reports from localStorage to IndexedDB`);
          }
        }

        // Load from IndexedDB
        const records = await getAllPendingReports();
        const active = records
          .map(r => ({ ...r.displayFields, id: r.id, pending: true }))
          .filter(r => !isExpired(r.timestamp || ''));
        setPendingReports(active);
      } catch (e) { console.error('Failed to load pending reports:', e); }
    })();

    const reportsRef = collection(db, 'iceReports');
    const q = query(reportsRef, orderBy('timestamp', 'desc'));

    // Sequence counter: ensures only the latest snapshot's result modifies state.
    // Concurrent processSnapshot calls (e.g. cache then server during reconnect)
    // would otherwise race and let an older stale snapshot prune fresh reports.
    let snapshotSeq = 0;

    const processSnapshot = async (snapshot) => {
      const thisSeq = ++snapshotSeq;
      console.log('Firebase snapshot received:', snapshot.size, 'documents');

      // Collect all reports within 7-day heat window for decryption
      const allDocs = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const reportAge = Date.now() - new Date(data.timestamp || 0).getTime();
        if (reportAge <= HEAT_EXPIRATION_MS) {
          allDocs.push({ id: docSnap.id, data });
        }
      });

      // Empty from-cache snapshots are stale/incomplete — they cannot tell us what
      // was deleted. Skip immediately so they never wipe sessionReportsRef.
      if (allDocs.length === 0 && snapshot.metadata.fromCache) return;

      // Decrypt all reports in parallel (handles both new encrypted payload and legacy formats)
      const decrypted = await Promise.all(allDocs.map(async ({ id, data }) => {
        let fields;
        if (data.encryptedPayload) {
          // New format: all sensitive fields in a single encrypted payload
          try {
            fields = await decryptReport(data.encryptedPayload);
          } catch {
            fields = { description: '[Unable to decrypt]' };
          }
        } else {
          // Legacy format: individual plaintext fields (with optional encrypted description)
          fields = {
            lat: data.lat, lng: data.lng,
            city: data.city || '', state: data.state || '',
            location: data.location,
            description: data.description,
            agents: data.agents, vehicles: data.vehicles,
            activity: data.activity
          };
          if (data.encryptedDescription) {
            try {
              fields.description = await decryptDescription(data.encryptedDescription);
            } catch {
              fields.description = fields.description === '[encrypted]' ? '[Unable to decrypt]' : fields.description;
            }
          }
        }
        return {
          id, ...fields,
          timestamp: data.timestamp,
          verified: data.verified || false,
          verifiers: data.verifiers || [],
          flaggers: data.flaggers || []
        };
      }));

      // Discard if a newer snapshot arrived while we were awaiting decryption
      if (thisSeq !== snapshotSeq) return;

      // Split decrypted reports: 12h → markers/feed, 7d → heat map
      // Merge-and-prune: update existing map rather than wiping it so reports
      // don't flash away mid-session during async decryption on each snapshot.
      const heatEligible = [];

      decrypted.forEach(report => {
        const age = Date.now() - new Date(report.timestamp || 0).getTime();
        if (age <= EXPIRATION_MS) {
          sessionReportsRef.current.set(report.id, report); // add or update
        } else {
          sessionReportsRef.current.delete(report.id);       // prune if now expired
        }
        if (report.lat && report.lng) {
          heatEligible.push(report);
        }
      });
      // Remove any report that was deleted from Firestore server-side.
      // Only trust server snapshots for deletions — from-cache snapshots are often
      // incomplete and would incorrectly prune reports that are still live on the server.
      if (!snapshot.metadata.fromCache) {
        const snapshotIds = new Set(decrypted.map(r => r.id));
        for (const id of sessionReportsRef.current.keys()) {
          if (!snapshotIds.has(id)) sessionReportsRef.current.delete(id);
        }
      }

      const sessionReports = [...sessionReportsRef.current.values()];
      setReports(sessionReports);
      setHeatReports(heatEligible);

      // Notify about new reports and set app badge
      const currentIds = new Set(sessionReports.map(r => r.id));
      const newReports = sessionReports.filter(r => !prevReportIdsRef.current.has(r.id));

      if (prevReportIdsRef.current.size > 0 && newReports.length > 0) {
        const currentPage = window.__safeneighbor_currentPage;
        if (currentPage !== 'reports') {
          // Local notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const report = newReports[0];
            const locationText = report.city && report.state
              ? `${report.city}, ${report.state}`
              : report.location || t('reports.unknownLocation');
            new Notification(t('reports.newActivityReportNotification'), {
              body: `${locationText} - ${t('reports.newReportsCount', { count: newReports.length })}`,
              icon: '/logo192.png',
              tag: 'new-report',
              renotify: true
            });
          }
          // App badge
          if ('setAppBadge' in navigator) {
            navigator.setAppBadge(newReports.length).catch(() => {});
          }
        }
      }
      prevReportIdsRef.current = currentIds;
    };

    let unsubscribe = onSnapshot(q, processSnapshot, (error) => {
      console.error("Error fetching reports from Firebase:", error);
    });

    // Non-destructive refresh when tab becomes visible again.
    // The old approach (unsubscribe + re-subscribe) could lose reports during the
    // cache→server snapshot transition. Instead, do a one-time getDocs and MERGE
    // results into sessionReportsRef — add/update only, never delete. The existing
    // onSnapshot listener auto-reconnects natively after backgrounding.
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const freshSnap = await getDocs(q);
        const freshDocs = [];
        freshSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const reportAge = Date.now() - new Date(data.timestamp || 0).getTime();
          if (reportAge <= EXPIRATION_MS) {
            freshDocs.push({ id: docSnap.id, data });
          }
        });
        if (freshDocs.length === 0) return;

        const freshDecrypted = await Promise.all(freshDocs.map(async ({ id, data }) => {
          let fields;
          if (data.encryptedPayload) {
            try {
              fields = await decryptReport(data.encryptedPayload);
            } catch {
              fields = { description: '[Unable to decrypt]' };
            }
          } else {
            fields = {
              lat: data.lat, lng: data.lng,
              city: data.city || '', state: data.state || '',
              location: data.location,
              description: data.description,
              agents: data.agents, vehicles: data.vehicles,
              activity: data.activity
            };
            if (data.encryptedDescription) {
              try {
                fields.description = await decryptDescription(data.encryptedDescription);
              } catch {
                fields.description = fields.description === '[encrypted]' ? '[Unable to decrypt]' : fields.description;
              }
            }
          }
          return {
            id, ...fields,
            timestamp: data.timestamp,
            verified: data.verified || false,
            verifiers: data.verifiers || [],
            flaggers: data.flaggers || []
          };
        }));

        // Merge only — add new reports and update existing ones, never delete
        let changed = false;
        freshDecrypted.forEach(report => {
          if (!sessionReportsRef.current.has(report.id)) {
            changed = true;
          }
          sessionReportsRef.current.set(report.id, report);
        });
        if (changed) {
          setReports([...sessionReportsRef.current.values()]);
        }
      } catch {
        // Network error is fine — the onSnapshot listener will reconnect on its own
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Sweep expired reports every 60s so markers disappear promptly at 12 hours
    // without needing a Firestore snapshot event to trigger the pruning.
    const expiryTimer = setInterval(() => {
      let changed = false;
      for (const [id, report] of sessionReportsRef.current) {
        const age = Date.now() - new Date(report.timestamp || 0).getTime();
        if (age > EXPIRATION_MS) {
          sessionReportsRef.current.delete(id);
          changed = true;
        }
      }
      if (changed) setReports([...sessionReportsRef.current.values()]);
    }, 60_000);

    return () => {
      console.log('Cleaning up Firebase listener...');
      unsubscribe();
      clearInterval(expiryTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const syncPendingReports = async () => {
      if (isOnline && pendingReports.length > 0) {
        console.log('Syncing', pendingReports.length, 'pending reports via Cloud Function...');
        // Read full records from IndexedDB (includes serverPayload)
        let records;
        try { records = await getAllPendingReports(); } catch { return; }
        if (!records.length) return;

        let synced = 0;
        for (const record of records) {
          const result = await submitReportToServer({
            ...record.serverPayload,
            coarseLat: record.serverPayload?.coarseLat ?? record.displayFields?.lat,
            coarseLng: record.serverPayload?.coarseLng ?? record.displayFields?.lng,
          });
          if (!result.success) {
            if (result.rateLimited) {
              console.log('Rate limited, will retry remaining reports later');
              break;
            }
            console.error('Failed to sync report:', result.error);
            continue;
          }
          console.log('Synced report:', result.reportId);
          await deletePendingReport(record.id);
          synced++;
        }

        // Refresh state from IndexedDB
        const remaining = await getAllPendingReports();
        setPendingReports(remaining.map(r => ({ ...r.displayFields, id: r.id, pending: true })));
        console.log(`${synced} reports synced, ${remaining.length} remaining`);
      }
    };

    syncPendingReports();
  }, [isOnline, pendingReports.length]);

  useEffect(() => {
    if (mapRef.current) return;
    const initMap = () => {
      try {
        const mapContainer = document.getElementById('report-map');
        if (!mapContainer || !window.L) return false;
        const mapInstance = window.L.map('report-map', { zoomControl: false, maxZoom: 19 }).setView([formData.lat, formData.lng], 7);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          crossOrigin: true,
          maxZoom: 19
        }).addTo(mapInstance);

        const selectionMarker = window.L.marker([formData.lat, formData.lng], {
          draggable: true,
          icon: window.L.divIcon({
            className: 'custom-selection-cursor',
            html: "<div style='background-color:#ef4444; width:24px; height:24px; border-radius:50%; border:4px solid white; box-shadow:0 0 20px rgba(239,68,68,0.7); display:flex; align-items:center; justify-content:center; color:white; font-size:13px; font-weight:bold;'>+</div>",
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(mapInstance);

        selectionMarker.on('dragend', () => {
          const pos = selectionMarker.getLatLng();
          setFormData(prev => ({ ...prev, lat: pos.lat, lng: pos.lng, locationSource: 'manual', location: t('reports.manualPin') }));
          setActiveHubId(null);
        });

        mapInstance.on('click', (e) => {
          const { lat, lng } = e.latlng;
          selectionMarker.setLatLng([lat, lng]);
          setFormData(prev => ({ ...prev, lat, lng, locationSource: 'manual', location: t('reports.manualPin') }));
          setActiveHubId(null);
        });

        // Scale markers based on zoom level so they don't dominate when zoomed out
        const updateMarkerScale = () => {
          const zoom = mapInstance.getZoom();
          const scale = Math.min(1, Math.max(0.4, 0.25 + zoom * 0.05));
          mapContainer.style.setProperty('--marker-scale', scale);
        };
        mapInstance.on('zoomend', updateMarkerScale);
        updateMarkerScale();

        mapRef.current = mapInstance;
        markerRef.current = selectionMarker;
        setMapLoaded(true);
        return true;
      } catch (err) {
        console.error('Map initialization failed:', err);
        setMapLoadFailed(true);
        return false;
      }
    };
    const tid = setTimeout(initMap, 100);
    // If Leaflet still hasn't loaded after 4 seconds, show fallback
    const failsafe = setTimeout(() => {
      if (!mapRef.current) setMapLoadFailed(true);
    }, 4000);
    return () => {
      clearTimeout(tid);
      clearTimeout(failsafe);
      if (heatLayerRef.current && mapRef.current) { mapRef.current.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }
      if (reportClusterRef.current && mapRef.current) { mapRef.current.removeLayer(reportClusterRef.current); reportClusterRef.current = null; }
      if (resourceClusterRef.current && mapRef.current) { mapRef.current.removeLayer(resourceClusterRef.current); resourceClusterRef.current = null; }
      resourceMarkersRef.current = [];
      reportMarkersRef.current = [];
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request geolocation AFTER map is ready and modals are dismissed
  // iOS PWAs drop geolocation responses when permission prompts compete with other modals
  const geoRequestedRef = useRef(false);
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !markerRef.current) return;
    if (geoRequestedRef.current) return;
    if (showLegalNotice) return; // Wait for legal notice to be dismissed first
    geoRequestedRef.current = true;

    getLocation((position) => {
      const { latitude, longitude } = position.coords;
      setUserCoords({ lat: latitude, lng: longitude });
      if (mapRef.current) mapRef.current.setView([latitude, longitude], 11);
      if (markerRef.current) markerRef.current.setLatLng([latitude, longitude]);
    }, (err) => { console.debug('Geolocation unavailable:', err); });
  }, [mapLoaded, showLegalNotice]);

  // Show/hide the location selection marker
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !markerRef.current) return;
    if (showLocationPin) {
      markerRef.current.addTo(mapRef.current);
    } else {
      mapRef.current.removeLayer(markerRef.current);
    }
  }, [showLocationPin, mapLoaded]);

  useEffect(() => {
    if (mapLoaded && mapRef.current && window.L) {
      // Remove previous layers
      if (reportClusterRef.current) {
        mapRef.current.removeLayer(reportClusterRef.current);
        reportClusterRef.current = null;
      }
      reportMarkersRef.current = [];

      const allReports = [...pendingReports, ...reports];
      if (allReports.length === 0) return;

      // All reports go through MarkerClusterGroup; clustering disabled at zoom 14+
      const clusterGroup = window.L.markerClusterGroup
        ? window.L.markerClusterGroup({
            maxClusterRadius: 50,
            disableClusteringAtZoom: 11,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster) => {
              const count = cluster.getChildCount();
              const zoom = mapRef.current ? mapRef.current.getZoom() : 10;
              const zoomScale = Math.min(1, Math.max(0.5, (zoom - 3) / 10));
              const baseSize = count < 10 ? 36 : count < 50 ? 44 : 52;
              const size = Math.round(baseSize * zoomScale);
              const fontSize = Math.round((count < 10 ? 13 : 12) * zoomScale);
              return window.L.divIcon({
                html: `<div style="background:rgba(153,27,27,0.9); width:${size}px; height:${size}px; border-radius:50%; border:2px solid #ef4444; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:${fontSize}px; box-shadow:0 3px 10px rgba(0,0,0,0.6);">${count}</div>`,
                className: 'report-cluster-icon',
                iconSize: [size, size]
              });
            }
          })
        : window.L.layerGroup();

      // Zoom-responsive pin size: smaller when zoomed out, full at zoom 15+
      const pinSize = (zoom) => {
        if (zoom >= 15) return 26;
        if (zoom >= 13) return 20;
        if (zoom >= 11) return 17;
        return 14;
      };
      const svgSize = (zoom) => {
        if (zoom >= 15) return 14;
        if (zoom >= 13) return 11;
        return 8;
      };

      // Helper: build icon for a report at a given zoom
      const buildIcon = (report, zoom) => {
        const isPending = pendingReports.some(pr => pr.id === report.id);
        const isTest = isTestReport(report);
        const sz = pinSize(zoom);
        const half = Math.round(sz / 2);
        const svSz = svgSize(zoom);

        let bgColor = isTest ? '#166534' : '#991b1b';
        let borderColor = isTest ? '#22c55e' : '#ef4444';
        let pulseColor = isTest ? 'bg-green-600' : 'bg-red-600';

        let iconContent = isReportVerified(report)
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="${svSz}" height="${svSz}" fill="currentColor" viewBox="0 0 256 256"><path d="M208,40H48A16,16,0,0,0,32,56v58.77c0,89.62,75.82,119.34,91,124.38a15.44,15.44,0,0,0,10,0c15.2-5.05,91-34.77,91-124.39V56A16,16,0,0,0,208,40Zm-30.46,77.68-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L116,156.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="${svSz}" height="${svSz}" fill="currentColor" viewBox="0 0 256 256"><path d="M128,12A84.09,84.09,0,0,0,44,96c0,30.42,14.17,62.79,42.09,96.25a254.09,254.09,0,0,0,38.49,37.12,12,12,0,0,0,14.84,0,254.09,254.09,0,0,0,38.49-37.12C205.83,158.79,220,126.42,220,96A84.09,84.09,0,0,0,128,12Zm0,196.37C109.54,193.75,68,155.36,68,96a60,60,0,0,1,120,0C188,155.35,146.47,193.74,128,208.37ZM128,64a36,36,0,1,0,36,36A36,36,0,0,0,128,64Zm0,48a12,12,0,1,1,12-12A12,12,0,0,1,128,112Z"/></svg>`;

        if (isPending) {
          bgColor = '#d97706';
          borderColor = '#fbbf24';
          pulseColor = 'bg-amber-500';
          iconContent = '🕒';
        }

        const showPulse = zoom >= 13;
        const pulseHtml = showPulse
          ? (isPending ? '<div class="absolute -inset-1.5 bg-amber-500 rounded-full animate-ping opacity-25"></div>' : `<div class="absolute -inset-2 ${pulseColor} rounded-full animate-pulse opacity-20"></div>`)
          : '';

        return window.L.divIcon({
          className: 'custom-report-marker',
          html: `<div class="relative flex items-center justify-center">${pulseHtml}<div style='background-color:${bgColor}; width:${sz}px; height:${sz}px; border-radius:50%; border:${zoom >= 13 ? 2 : 1}px solid ${borderColor}; box-shadow:0 2px 6px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; font-size:${Math.round(svSz * 0.8)}px;'>${iconContent}</div></div>`,
          iconSize: [sz, sz],
          iconAnchor: [half, half]
        });
      };

      // Helper: create a marker for a report
      const makeMarker = (report) => {
        const zoom = mapRef.current ? mapRef.current.getZoom() : 10;
        const m = window.L.marker([report.lat, report.lng], {
          icon: buildIcon(report, zoom)
        });
        m._reportData = report; // stash for zoom-based icon updates

        m.on('click', () => {
          setSelectedReport(report);
          mapRef.current.flyTo([report.lat, report.lng], 15, { duration: 1.5 });
          setTimeout(() => {
            const reportCard = document.getElementById(`report-card-${report.id}`);
            if (reportCard) {
              reportCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 500);
        });

        return m;
      };

      allReports.forEach(report => {
        if (!report.lat || !report.lng) return;
        if ((report.flaggers?.length || 0) >= 4) return; // hidden — under community review
        const m = makeMarker(report);
        clusterGroup.addLayer(m);
        reportMarkersRef.current.push(m);
      });

      // Resize pins on zoom change
      const updatePinSizes = () => {
        const zoom = mapRef.current ? mapRef.current.getZoom() : 10;
        reportMarkersRef.current.forEach(m => {
          if (m._reportData) m.setIcon(buildIcon(m._reportData, zoom));
        });
      };
      mapRef.current.on('zoomend', updatePinSizes);

      if (showPins) {
        mapRef.current.addLayer(clusterGroup);
      }
      reportClusterRef.current = clusterGroup;
    }
  }, [reports, pendingReports, mapLoaded, showPins]);

  // Heat map layer lifecycle — radius scales with zoom to keep geographic size constant
  const HEAT_REFERENCE_ZOOM = 13;
  const HEAT_BASE_RADIUS = HEATMAP_CONFIG.radius;

  const getScaledHeatRadius = (zoom) => {
    const scale = Math.pow(2, (zoom - HEAT_REFERENCE_ZOOM) * 0.5);
    return Math.max(14, Math.round(HEAT_BASE_RADIUS * scale));
  };

  const rebuildHeatLayer = () => {
    if (!mapRef.current || !window.L?.heatLayer) return;
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    if (!heatmapEnabled) return;
    const heatData = reportsToHeatData([...pendingReports, ...heatReports]);
    if (heatData.length === 0) return;
    const zoom = mapRef.current.getZoom();
    const scaledRadius = getScaledHeatRadius(zoom);
    heatLayerRef.current = window.L.heatLayer(heatData, {
      ...HEATMAP_CONFIG,
      radius: scaledRadius,
      blur: Math.max(3, Math.round(scaledRadius * 0.65))
    }).addTo(mapRef.current);
  };

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.L?.heatLayer) return;
    rebuildHeatLayer();
    const onZoom = () => rebuildHeatLayer();
    mapRef.current.on('zoomend', onZoom);
    return () => { if (mapRef.current) mapRef.current.off('zoomend', onZoom); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatReports, pendingReports, mapLoaded, heatmapEnabled]);

  // Resource markers lifecycle
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.L) return;

    // Remove previous resource cluster group
    if (resourceClusterRef.current) {
      mapRef.current.removeLayer(resourceClusterRef.current);
      resourceClusterRef.current = null;
    }
    resourceMarkersRef.current = [];

    if (!resourcesEnabled || resourcesData.length === 0) return;

    // Create cluster group (falls back to plain layer group if plugin not loaded)
    const clusterGroup = window.L.markerClusterGroup
      ? window.L.markerClusterGroup({
          maxClusterRadius: 40,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          iconCreateFunction: (cluster) => {
            const count = cluster.getChildCount();
            const zoom = mapRef.current ? mapRef.current.getZoom() : 10;
            const zoomScale = Math.min(1, Math.max(0.5, (zoom - 3) / 10));
            const baseSize = count < 10 ? 32 : count < 50 ? 40 : 48;
            const size = Math.round(baseSize * zoomScale);
            const fontSize = Math.round((count < 10 ? 12 : 11) * zoomScale);
            return window.L.divIcon({
              html: `<div style="background:rgba(6,78,59,0.9); width:${size}px; height:${size}px; border-radius:50%; border:2px solid #34d399; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:${fontSize}px; box-shadow:0 2px 8px rgba(0,0,0,0.5);">${count}</div>`,
              className: 'resource-cluster-icon',
              iconSize: [size, size]
            });
          }
        })
      : window.L.layerGroup();

    resourcesData.forEach(resource => {
      const style = RESOURCE_STYLES[resource.category] || RESOURCE_STYLES.church;
      const iconSvgs = {
        church: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M128,8a8,8,0,0,1,8,8V56h40a8,8,0,0,1,0,16H136v40h64a8,8,0,0,1,8,8v96h16a8,8,0,0,1,0,16H32a8,8,0,0,1,0-16H48V120a8,8,0,0,1,8-8h64V72H96a8,8,0,0,1,0-16h24V16A8,8,0,0,1,128,8Z"/></svg>',
        hospital: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M216,88H168V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V88H40a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16H88v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V168h48a16,16,0,0,0,16-16V104A16,16,0,0,0,216,88Z"/></svg>',
        school: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M251.76,88.94l-120-64a8,8,0,0,0-7.52,0l-120,64a8,8,0,0,0,0,14.12L32,117.87v48.42a15.91,15.91,0,0,0,4.06,10.65C49.16,191.53,78.51,216,128,216a130.13,130.13,0,0,0,48-8.76V240a8,8,0,0,0,16,0V199.51a115.63,115.63,0,0,0,27.94-22.57A15.91,15.91,0,0,0,224,166.29V117.87l27.76-14.81a8,8,0,0,0,0-14.12Z"/></svg>',
        consulate: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M42.76,50A8,8,0,0,0,32,56V168a8,8,0,0,0,2.76,6l48,48A8,8,0,0,0,96,216V104a8,8,0,0,0-2.76-6ZM224,48H160a8,8,0,0,0-5.66,2.34l-48,48A8,8,0,0,0,104,104V216a8,8,0,0,0,13.66,5.66l48-48A8,8,0,0,0,168,168V56A8,8,0,0,0,224,48Z"/></svg>',
      };

      let distanceText = '';
      if (userCoords) {
        const dist = calculateDistance(userCoords.lat, userCoords.lng, resource.lat, resource.lng);
        distanceText = dist < 0.1 ? t('reports.nearby') : t('reports.miAway', { distance: dist.toFixed(1) });
      }

      const sanitizedName = DOMPurify.sanitize(resource.name, { ALLOWED_TAGS: [] });

      const m = window.L.marker([resource.lat, resource.lng], {
        zIndexOffset: -100,
        icon: window.L.divIcon({
          className: 'custom-resource-marker',
          html: `<div style='background-color:${style.bg}; width:22px; height:22px; border-radius:50%; border:2px solid ${style.border}; box-shadow:0 2px 8px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:${style.border};'>${iconSvgs[resource.category] || iconSvgs.church}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        })
      });

      // Deep-link to native maps app (Apple Maps on iOS, Google Maps otherwise)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const directionsUrl = isIOS
        ? `https://maps.apple.com/?daddr=${resource.lat},${resource.lng}&dirflg=w`
        : `https://www.google.com/maps/dir/?api=1&destination=${resource.lat},${resource.lng}&travelmode=walking`;

      m.bindPopup(
        `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:${style.border};margin-bottom:4px;">${t(`reports.resourceType_${resource.category}`)}</div>
          <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:4px;">${sanitizedName}</div>
          ${distanceText ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">${distanceText}</div>` : ''}
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:#34d399;text-decoration:none;padding:4px 8px;background:rgba(6,78,59,0.4);border:1px solid rgba(52,211,153,0.3);border-radius:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,109.66l-48,48A8,8,0,0,1,168,152V120H128a72.08,72.08,0,0,0-72,72,8,8,0,0,1-16,0A88.1,88.1,0,0,1,128,104h40V72a8,8,0,0,1,13.66-5.66l48,48A8,8,0,0,1,229.66,109.66Z"/></svg>
            ${t('reports.walk')}
          </a>
        </div>`,
        { className: 'resource-popup', closeButton: false, offset: [0, -5] }
      );

      clusterGroup.addLayer(m);
      resourceMarkersRef.current.push(m);
    });

    if (showPins) {
      mapRef.current.addLayer(clusterGroup);
    }
    resourceClusterRef.current = clusterGroup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourcesData, resourcesEnabled, mapLoaded, userCoords, showPins]);

  // Auto-fetch resources if toggle was persisted as enabled
  useEffect(() => {
    if (resourcesEnabled && resourcesData.length === 0 && !resourcesLoading) {
      if (userCoords || mapLoaded) {
        fetchResources();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourcesEnabled, userCoords, mapLoaded]);

  useEffect(() => {
    if (showInlinePicker && !inlinePickerMapRef.current && window.L) {
      const initPicker = () => {
        const container = document.getElementById('inline-precision-map');
        if (!container) return;

        if (!userCoords) {
           getLocation(
             (pos) => {
               const { latitude, longitude } = pos.coords;
               setUserCoords({ lat: latitude, lng: longitude });
               setupPickerMap(latitude, longitude);
             },
             (error) => {
               const errorType = error.code === 1 ? 'denied' : error.code === 2 ? 'unavailable' : 'timeout';
               setLocationError(errorType);
               setShowLocationModal(true);
               setShowInlinePicker(false);
             }
           );
           return;
        }

        setupPickerMap(userCoords.lat, userCoords.lng);
      };

      const setupPickerMap = (centerLat, centerLng) => {
        const mInstance = window.L.map('inline-precision-map', { zoomControl: false, maxZoom: 19 }).setView([centerLat, centerLng], 14);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OSM',
          crossOrigin: true,
          maxZoom: 19
        }).addTo(mInstance);

        const circle = window.L.circle([centerLat, centerLng], {
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.15,
          radius: THREE_MILES_IN_METERS,
          dashArray: '5, 10'
        }).addTo(mInstance);

        const marker = window.L.marker([centerLat, centerLng], {
          draggable: true,
          icon: window.L.divIcon({
            className: 'precision-marker',
            html: "<div style='background-color:#ef4444; width:34px; height:34px; border-radius:50%; border:4px solid white; box-shadow:0 10px 20px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white;'><svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='currentColor' viewBox='0 0 256 256'><path d='M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z'/></svg></div>",
            iconSize: [34, 34],
            iconAnchor: [17, 17]
          })
        }).addTo(mInstance);

        const validatePos = (pos) => {
          const dist = calculateDistance(centerLat, centerLng, pos.lat, pos.lng);
          if (dist > 3) {
            setPickerError(t('reports.mustBeWithin3Miles'));
            marker.setLatLng([centerLat, centerLng]);
            return false;
          }
          setPickerError(null);
          setFormData(prev => ({
            ...prev,
            lat: pos.lat,
            lng: pos.lng,
            locationSource: 'manual',
            location: `${t('reports.neighborReport')} (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`
          }));
          return true;
        };

        marker.on('dragend', (e) => validatePos(e.target.getLatLng()));
        mInstance.on('click', (e) => {
           marker.setLatLng(e.latlng);
           validatePos(e.latlng);
        });

        // Initialize formData immediately with the marker's starting position
        // so that locationSource is 'manual' even if the user never drags the pin
        validatePos({ lat: centerLat, lng: centerLng });

        inlinePickerMapRef.current = mInstance;
        inlinePickerMarkerRef.current = marker;
        inlinePickerCircleRef.current = circle;
      };

      setTimeout(initPicker, 200);
    }

    return () => {
      if (!showInlinePicker && inlinePickerMapRef.current) {
        inlinePickerMapRef.current.remove();
        inlinePickerMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInlinePicker, userCoords]);

  const handleHubSelect = (hub) => {
    if (mapRef.current && markerRef.current) {
      setActiveHubId(hub.name);
      markerRef.current.setLatLng([hub.lat, hub.lng]);
      mapRef.current.flyTo([hub.lat, hub.lng], 13, { duration: 1.8 });
      setFormData(prev => ({ ...prev, lat: hub.lat, lng: hub.lng, locationSource: 'manual', location: hub.name }));
    }
  };

  const handleToggleHeatmap = () => {
    setHeatmapEnabled(prev => {
      const next = !prev;
      localStorage.setItem(HEATMAP_KEY, String(next));
      if (!next) setShowPins(true); // Always show pins when heat map is off
      return next;
    });
  };

  // Fetch resources from Overpass API with caching and auto-retry
  const fetchResources = async (isRetry = false) => {
    const center = mapRef.current?.getCenter();
    const lat = userCoords?.lat || center?.lat;
    const lng = userCoords?.lng || center?.lng;
    if (!lat || !lng) return;

    const cacheKey = resourceCacheKey(lat, lng);
    if (resourcesCacheRef.current[cacheKey]) {
      setResourcesData(resourcesCacheRef.current[cacheKey]);
      setResourcesError(false);
      return;
    }

    if (!isRetry) {
      setResourcesLoading(true);
      setResourcesError(false);
    }

    try {
      const data = await fetchCommunityResources(lat, lng);
      resourcesCacheRef.current[cacheKey] = data;
      setResourcesData(data);
      setResourcesError(false);
      setResourcesLoading(false);
    } catch (err) {
      console.error('SafeNeighbor: Resources fetch error:', err);
      if (!isRetry) {
        setTimeout(() => fetchResources(true), 3000);
      } else {
        setResourcesError(true);
        setResourcesLoading(false);
      }
    }
  };

  const handleToggleResources = () => {
    // First time: show disclaimer
    if (!resourcesEnabled && localStorage.getItem(RESOURCES_DISCLAIMER_KEY) !== 'true') {
      setShowResourcesDisclaimer(true);
      return;
    }
    // If in error state, retry instead of toggling off
    if (resourcesEnabled && resourcesError) {
      setResourcesError(false);
      fetchResources();
      return;
    }
    // Toggle off
    if (resourcesEnabled) {
      setResourcesEnabled(false);
      localStorage.setItem(RESOURCES_KEY, 'false');
      return;
    }
    // Toggle on
    setResourcesEnabled(true);
    localStorage.setItem(RESOURCES_KEY, 'true');
    fetchResources();
  };

  const handleCloseResourcesDisclaimer = () => {
    setShowResourcesDisclaimer(false);
    localStorage.setItem(RESOURCES_DISCLAIMER_KEY, 'true');
    setResourcesEnabled(true);
    localStorage.setItem(RESOURCES_KEY, 'true');
    fetchResources();
  };

  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      getLocation(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });
          setFormData(prev => ({ ...prev, lat: latitude, lng: longitude, locationSource: 'gps', location: t('reports.currentPosition') }));
          setShowLocationPin(true);
          if (mapRef.current && markerRef.current) {
            mapRef.current.flyTo([latitude, longitude], 12, { duration: 1.5 });
            markerRef.current.setLatLng([latitude, longitude]);
          }
          setPickerError(null);
          setShowLocationModal(false);
        },
        (error) => {
          const errorType = error.code === 1 ? 'denied' : error.code === 2 ? 'unavailable' : 'timeout';
          setLocationError(errorType);
          setShowLocationModal(true);
        }
      );
    } else {
      setLocationError('unavailable');
      setShowLocationModal(true);
    }
  };

  const handleOverviewUS = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([39.8283, -98.5795], 3, { duration: 1.5 });
    }
  };

  const handleTogglePicker = () => {
    setShowInlinePicker(!showInlinePicker);
    setPickerError(null);
  };

  const handleCloseLegalNotice = () => {
    localStorage.setItem(LEGAL_NOTICE_SHOWN_KEY, 'true');
    setShowLegalNotice(false);
  };

  const handleFeedItemClick = (report) => {
    // Scroll to the map first
    const mapContainer = document.getElementById('report-map');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Then fly to the report location
    if (mapRef.current && report.lat && report.lng) {
      // Small delay to let scroll complete before flying
      setTimeout(() => {
        mapRef.current.flyTo([report.lat, report.lng], 16, { duration: 2.0 });
      }, 300);
    }
  };

  const handleToggleVerify = async (e, id) => {
    e.stopPropagation();

    const report = reports.find(r => r.id === id);
    if (!report) return;

    // Get user's anonymous verifier ID
    const verifierId = getOrCreateVerifierId();

    // Check if user has already verified
    if (hasUserVerified(report, verifierId)) {
      alert(t('reports.alreadyVerified'));
      return;
    }

    // Check distance requirement
    if (!userCoords) {
      alert(t('reports.locationRequiredToVerify'));
      return;
    }

    const distance = calculateDistance(
      userCoords.lat, userCoords.lng,
      report.lat || 0, report.lng || 0
    );

    if (distance > VERIFICATION_DISTANCE_MILES) {
      alert(t('reports.mustBeWithinMiles', { miles: VERIFICATION_DISTANCE_MILES, distance: distance.toFixed(1) }));
      return;
    }

    try {
      const result = await verifyReportOnServer({
        reportId: id,
        lat: userCoords.lat,
        lng: userCoords.lng,
      });
      if (!result.success) {
        alert(result.error || t('reports.failedToVerify'));
        return;
      }
    } catch (error) {
      console.error("Error updating verification:", error);
      alert(t('reports.failedToVerify'));
    }
  };

  const handleFlagReport = async (reportId) => {
    const report = [...reports, ...pendingReports].find(r => r.id === reportId);
    if (!report || report.pending) return;

    const verifierId = getOrCreateVerifierId();

    if (report.flaggers?.some(f => f.id === verifierId)) return;

    try {
      const result = await flagReportOnServer(reportId);
      if (!result.success) {
        console.error('Failed to flag report:', result.error);
      }
    } catch (err) {
      console.error('Failed to flag report:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Security: Client-side rate limit check (server enforces the authoritative limit)
      const rateCheck = checkRateLimit();
      if (!rateCheck.allowed) {
        alert(t('reports.rateLimitReached', { max: MAX_REPORTS_PER_WINDOW, minutes: rateCheck.resetInMinutes }));
        return;
      }

      // Security: Validate coordinates (US bounds)
      const coordCheck = validateCoordinates(formData.lat, formData.lng);
      if (!coordCheck.valid) {
        alert(coordCheck.error);
        return;
      }

      // Security: Validate report data (agents, vehicles, description)
      const validationErrors = validateReportData(formData);
      if (validationErrors.length > 0) {
        alert(validationErrors.join('\n'));
        return;
      }

      // Security: Check for PII in description (warn, don't block)
      const piiResults = detectPII(formData.description);
      if (piiResults.length > 0 && !showPiiWarning) {
        setPiiFindings(piiResults);
        setShowPiiWarning(true);
        setIsSubmitting(false);
        return;
      }
      // Reset PII warning state if user chose to proceed
      if (showPiiWarning) {
        setShowPiiWarning(false);
        setPiiFindings([]);
      }

      // Check for nearby existing reports (prompt to verify instead of duplicate)
      const nearbyResult = findNearbyReport(formData.lat, formData.lng);
      if (nearbyResult) {
        // Store the pending submission and show the modal
        setPendingSubmission({ ...formData });
        setNearbyReport(nearbyResult);
        setShowNearbyReportModal(true);
        setIsSubmitting(false);
        return;
      }

      // Build timestamp from form data
      const reportTimestamp = new Date(`${formData.date}T${formData.time}`).toISOString();

      // Security: Check for duplicate reports
      const allReports = [...reports, ...pendingReports];
      const isDuplicate = isDuplicateReport(formData.lat, formData.lng, reportTimestamp, allReports, calculateDistance);
      if (isDuplicate) {
        alert(t('reports.duplicateReport'));
        return;
      }

      // Security: Apply privacy protections
      // Only fuzz GPS-sourced coordinates; manual pins are already user-chosen
      const isGps = formData.locationSource === 'gps';
      const fuzzyLat = isGps ? fuzzyCoordinate(formData.lat) : formData.lat;
      const fuzzyLng = isGps ? fuzzyCoordinate(formData.lng) : formData.lng;
      const roundedTimestamp = roundTimestamp(reportTimestamp);

      // Get street address and city/state from coordinates
      const geoData = await reverseGeocode(fuzzyLat, fuzzyLng);

      // For GPS reports, snap to Nominatim's nearest road/address coordinates
      const reportLat = (isGps && geoData.snappedLat) ? geoData.snappedLat : fuzzyLat;
      const reportLng = (isGps && geoData.snappedLng) ? geoData.snappedLng : fuzzyLng;

      // Encrypt all sensitive fields as a single payload
      const sanitized = sanitizeDescription(formData.description);
      const sensitiveFields = {
        lat: reportLat,
        lng: reportLng,
        city: geoData.city || '',
        state: geoData.state || '',
        location: geoData.address || `~ Near ${reportLat.toFixed(2)}, ${reportLng.toFixed(2)}`,
        description: sanitized,
        agents: Math.min(50, Math.max(0, parseInt(formData.agents) || 0)),
        vehicles: Math.min(20, Math.max(0, parseInt(formData.vehicles) || 0)),
        activity: formData.activity || 'Unknown'
      };

      // serverReport goes to Cloud Function / Firestore (encrypted)
      // localReport stays in memory for display (plaintext)
      let serverReport;
        try {
          const encrypted = await encryptReport(sensitiveFields);
          serverReport = {
            ...encrypted,
            coarseLat: reportLat,
            coarseLng: reportLng,
            timestamp: roundedTimestamp,
            verified: false,
            verifiers: []
        };
        } catch (encErr) {
          console.warn('Encryption unavailable, using legacy format:', encErr.message);
          serverReport = {
            ...sensitiveFields,
            coarseLat: reportLat,
            coarseLng: reportLng,
            timestamp: roundedTimestamp,
            verified: false,
            verifiers: []
        };
      }

      const localReport = {
        ...sensitiveFields,
        timestamp: roundedTimestamp,
        verified: false,
        verifiers: []
      };

      if (isOnline) {
        const result = await submitReportToServer(serverReport);

        if (!result.success) {
          if (result.rateLimited) {
            alert(result.error || t('reports.tooManyReports'));
          } else {
            alert(result.error || t('reports.failedToSubmit'));
          }
          return;
        }

        // Record submission for client-side tracking (backup)
        recordSubmission();

        // Track successful submission (privacy-safe: only state, no precise location)
        if (window.umami) window.umami.track('report_submitted', { state: geoData.state || 'unknown' });

        console.log('Report submitted successfully! ID:', result.reportId);
        setSubmitted(true);

        if (mapRef.current) {
          mapRef.current.flyTo([reportLat, reportLng], 11, { duration: 1.5 });
        }

        setFormData(prev => ({
          ...prev,
          description: '',
          agents: '',
          vehicles: ''
        }));
        setShowInlinePicker(false);
      } else {
        console.log('Offline - queuing report...');
        setPendingReports(prev => [{...localReport, id: Date.now().toString()}, ...prev]);
        // Track offline submission (will be sent when user comes back online)
        if (window.umami) window.umami.track('report_submitted', { state: geoData.state || 'unknown', mode: 'offline' });
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      alert(t('reports.failedToSubmit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onMouseDown = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setDragMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftPos(scrollRef.current.scrollLeft);
  };

  const onMouseLeave = () => { setIsDragging(false); };
  const onMouseUp = () => { setIsDragging(false); };
  const onMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 5) setDragMoved(true);
    scrollRef.current.scrollLeft = scrollLeftPos - walk;
  };

  const onWheel = (e) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY || e.deltaX;
    }
  };

  const handleFilterClick = (option) => {
    if (dragMoved) return;
    setSortBy(option);
  };

  return (
    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* In-app browser warning banner */}
        {isInAppWebView() && (
          <div className="bg-amber-950/60 border border-amber-700/60 rounded-xl p-4 flex items-start gap-3">
            <Fire size={20} weight="bold" className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 text-sm font-bold">{t('reports.openInBrowser')}</p>
              <p className="text-amber-400/80 text-xs mt-1">
                {t('reports.inAppBrowserWarning')}
              </p>
            </div>
          </div>
        )}

        <section className="text-center relative pt-4">
          <div className="flex justify-center mb-4">
            <UsersThree size={48} weight="bold" className="text-blue-400" />
          </div>
          <h2 className="text-4xl font-black text-slate-100 mb-2 tracking-tight">{t('reports.communityReporting')}</h2>
          <p className="text-slate-400 max-w-lg mx-auto font-medium leading-relaxed">{t('reports.communityReportingDesc')}</p>
          <div className="flex justify-center mt-6 flex-wrap gap-3">
            {/* Systems Status Pill */}
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-lg transition-all ${isOnline ? 'bg-green-900/30 text-green-400 border-green-800/60' : 'bg-amber-900/30 text-amber-400 border-amber-800/60'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_12px_#22c55e]' : 'bg-amber-500 shadow-[0_0_12px_#f59e0b]'}`}></span>
              {isOnline ? t('reports.systemsOnline') : t('reports.offlineQueuing')}
            </div>

            {/* Incidents Reported Pill */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-lg bg-blue-900/30 text-blue-400 border-blue-800/60">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_#3b82f6]"></span>
              {t('reports.incidentsReported')}: {reportStats.totalActive}
            </div>

            {/* Verified Pill */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-lg bg-red-900/30 text-red-400 border-red-800/60">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]"></span>
              {t('reports.verified')}: {reportStats.totalVerified}
            </div>

            {/* Privacy & Security Button */}
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white text-[11px] font-black uppercase tracking-widest rounded-full border border-blue-400/30 hover:from-blue-500/80 hover:to-blue-400/80 transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              <Shield size={14} weight="bold" />
              {t('reports.privacy')}
            </button>

            {/* Legal Guidelines Button */}
            <button
              onClick={() => setShowLegalNotice(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600/80 to-amber-500/80 text-white text-[11px] font-black uppercase tracking-widest rounded-full border border-amber-400/30 hover:from-amber-500/80 hover:to-amber-400/80 transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              <Scales size={14} weight="bold" />
              {t('reports.guidelines')}
            </button>
          </div>
        </section>

        <div className="bg-slate-900 p-1 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative">
          <div className="p-3 bg-slate-950/60 border-b border-slate-800/50 backdrop-blur-md space-y-2">
            {/* Row 1: Title + Toggle buttons */}
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('reports.neighborhoodActivityMap')}</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleHeatmap}
                  className={`text-[10px] font-black flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all active:scale-95 whitespace-nowrap ${
                    heatmapEnabled
                      ? 'text-amber-300 bg-amber-950/60 border-amber-700/50 shadow-[0_0_10px_rgba(251,191,36,0.15)]'
                      : 'text-slate-300 bg-slate-700/50 border-slate-500/50 hover:text-slate-200'
                  }`}
                >
                  <Fire size={14} weight="bold" /> {t('reports.heatMap')}
                </button>
                <button
                  type="button"
                  onClick={handleToggleResources}
                  className={`text-[10px] font-black flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    resourcesEnabled
                      ? 'text-green-300 bg-green-950/60 border-green-700/50 shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                      : 'text-slate-300 bg-slate-700/50 border-slate-500/50 hover:text-slate-200'
                  }`}
                >
                  <Buildings size={14} weight="bold" />
                  {resourcesLoading ? t('reports.loading') : resourcesError ? t('reports.resourcesError', 'Retry') : `${t('reports.resources')}${resourcesEnabled && resourcesData.length ? ` (${resourcesData.length})` : ''}`}
                </button>
              </div>
            </div>
            {/* Row 2: Action buttons */}
            <div className="flex justify-end items-stretch gap-1.5">
              {heatmapEnabled && (
                <button
                  type="button"
                  onClick={() => setShowPins(prev => !prev)}
                  className={`text-[10px] font-black flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    showPins
                      ? 'text-slate-300 bg-slate-700/50 border-slate-500/50 hover:text-slate-200'
                      : 'text-violet-300 bg-violet-950/60 border-violet-700/50 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
                  }`}
                >
                  {showPins ? <Eye size={14} weight="bold" /> : <EyeSlash size={14} weight="bold" />}
                  {showPins ? t('reports.pins') : t('reports.pinsOff')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLocationPin(prev => !prev)}
                className={`text-[10px] font-black flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                  showLocationPin
                    ? 'text-red-300 bg-red-950/60 border-red-700/50 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                    : 'text-slate-300 bg-slate-700/50 border-slate-500/50 hover:text-slate-200'
                }`}
              >
                <MapPinSimple size={14} weight="bold" />
                {showLocationPin ? t('reports.myPin') : t('reports.myPinOff')}
              </button>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="text-[10px] font-black text-red-400 hover:text-red-300 flex items-center gap-1.5 bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-900/30 transition-all hover:scale-105 active:scale-95"
              >
                <MapPinSimple size={14} weight="bold" /> {t('reports.recenterGps')}
              </button>
              <button
                type="button"
                onClick={handleOverviewUS}
                className="text-[10px] font-black text-sky-400 hover:text-sky-300 flex items-center gap-1.5 bg-sky-950/40 px-3 py-1.5 rounded-lg border border-sky-900/30 transition-all hover:scale-105 active:scale-95"
              >
                <MapTrifold size={14} weight="bold" /> {t('reports.usView')}
              </button>
              <button
                type="button"
                onClick={() => onOpenCheckRoute?.()}
                className="text-[10px] font-black text-blue-400 hover:text-blue-300 flex items-center gap-1.5 bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-900/30 transition-all hover:scale-105 active:scale-95"
              >
                <Path size={14} weight="bold" /> {t('route.title')}
              </button>
            </div>
          </div>
          {mapLoadFailed && !mapLoaded ? (
            <div className="h-72 md:h-96 w-full bg-slate-900/80 border border-slate-700/50 rounded-xl flex flex-col items-center justify-center gap-4 px-6 text-center">
              <MapTrifold size={48} weight="bold" className="text-slate-500" />
              <div>
                <p className="text-slate-300 font-bold text-sm">{t('reports.mapUnavailable')}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {isInAppWebView()
                    ? t('reports.mapUnavailableInApp')
                    : t('reports.mapUnavailableConnection')}
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
              >
                {t('reports.reloadPage')}
              </button>
            </div>
          ) : (
            <div id="report-map" className="h-72 md:h-96 w-full z-0"></div>
          )}
          <div className="p-5 bg-slate-950/40 flex flex-wrap gap-2.5">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-full mb-1">{t('reports.hotspots', { count: dynamicHubs.length })}:</span>
             {dynamicHubs.map(hub => {
               // Visual distinction based on hotspot type
               const isActive = activeHubId === hub.name;
               let baseStyle = '';
               let activeStyle = '';

               if (hub.type === 'verified') {
                 // Verified reports: red theme
                 baseStyle = 'bg-red-950/80 border-red-800 text-red-300 hover:bg-red-900 hover:text-red-200';
                 activeStyle = 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]';
               } else if (hub.type === 'reported') {
                 // Unverified reports: amber theme
                 baseStyle = 'bg-amber-950/80 border-amber-800 text-amber-300 hover:bg-amber-900 hover:text-amber-200';
                 activeStyle = 'bg-amber-600 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]';
               } else {
                 // City hubs: slate/gray theme
                 baseStyle = 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200';
                 activeStyle = 'bg-slate-600 border-slate-400 text-white shadow-[0_0_15px_rgba(100,116,139,0.5)]';
               }

               return (
                 <button
                   key={`${hub.name}-${hub.lat}`}
                   type="button"
                   onClick={() => handleHubSelect(hub)}
                   className={`text-[10px] border px-3.5 py-1.5 rounded-full transition-all font-black uppercase tracking-tighter hover:scale-105 active:scale-95 ${
                     isActive ? `${activeStyle} scale-105` : baseStyle
                   }`}
                 >
                   {hub.type === 'verified' && <ShieldCheckIcon size={12} weight="bold" className="inline me-1" />}
                   {hub.name}
                   {hub.type === 'verified' && hub.verifierCount > 0 && (
                     <span className="ms-1 opacity-80">({hub.verifierCount})</span>
                   )}
                 </button>
               );
             })}
          </div>

          {/* Resource category summary */}
          {resourcesEnabled && resourcesData.length > 0 && (
            <div className="px-5 pb-4 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-full mb-1">{t('reports.nearbyResources', { count: resourcesData.length })}:</span>
              {(() => {
                const counts = { church: 0, hospital: 0, school: 0, consulate: 0 };
                resourcesData.forEach(r => { if (counts[r.category] !== undefined) counts[r.category]++; });
                return Object.entries(counts).filter(([, c]) => c > 0).map(([cat, count]) => {
                  const style = RESOURCE_STYLES[cat];
                  return (
                    <span key={cat} className="text-[10px] border px-3 py-1 rounded-full font-bold uppercase tracking-tight" style={{ backgroundColor: `${style.bg}80`, borderColor: style.border, color: style.border }}>
                      {count} {t(`reports.resourceLabel_${cat}`, { count })}
                    </span>
                  );
                });
              })()}
            </div>
          )}
        </div>

        <div className="relative">
          {submitted ? (
            <div className="bg-green-900/20 border-2 border-green-800/60 p-10 rounded-[2.5rem] text-center shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-center mb-6">
                <ShieldCheckIcon size={72} weight="bold" className="text-green-400" />
              </div>
              <h3 className="text-3xl font-black text-green-400 mb-3">{t('reports.reportTransmitted')}</h3>
              <p className="text-slate-300 mb-8 font-medium">{t('reports.reportTransmittedDesc')}</p>
              <button onClick={() => setSubmitted(false)} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-wide">{t('reports.logNewIncident')}</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-slate-900 px-4 py-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-5 sm:space-y-8 overflow-hidden">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight border-b border-slate-800 pb-4">{t('reports.incidentReportForm')}</h3>

              <div className="space-y-3 overflow-hidden">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('reports.eventDate')}</label>
                  <input type="date" required className="w-full box-border bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 sm:p-4 text-white text-sm text-center focus:border-red-600 outline-none transition-all" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-red-600/50 px-3 py-2.5 sm:p-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 text-[11px] font-black uppercase tracking-widest text-white shadow-lg"
                >
                  <MapPinSimpleArea size={20} weight="bold" /> {t('reports.useMyLocation')}
                </button>
                <button
                  type="button"
                  onClick={handleTogglePicker}
                  className={`w-full border px-3 py-2.5 sm:p-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 text-[11px] font-black uppercase tracking-widest shadow-lg ${showInlinePicker ? 'bg-red-700 border-red-500 text-white' : 'bg-slate-950 border-slate-800 text-white hover:border-red-600/50'}`}
                >
                  <MapTrifold size={20} weight="bold" /> {t('reports.chooseLocationWithin3Miles')}
                </button>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ms-1">{t('reports.timeNoted')}</label>
                  <input type="time" required className="w-full box-border bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 sm:p-4 text-white text-sm text-center focus:border-red-600 outline-none transition-all" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                </div>

                {showInlinePicker && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-slate-950 p-1 rounded-3xl border border-slate-800 overflow-hidden relative shadow-2xl">
                      <div id="inline-precision-map" className="h-64 w-full z-10"></div>
                      <div className="absolute top-4 end-4 z-20 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                         {t('reports.dragPinToPrecision')}
                      </div>
                    </div>
                    {pickerError && (
                      <div className="bg-red-950/40 text-red-400 p-3 rounded-xl border border-red-900/30 text-[10px] font-black text-center uppercase tracking-widest">
                        ⚠️ {pickerError}
                      </div>
                    )}
                    {!pickerError && (
                      <div className="text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {t('reports.selected')}: <span className="text-blue-400">{formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('reports.observations')}</label>
                <textarea required rows={4} placeholder={t('reports.describeActivity')} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-red-600 outline-none resize-none transition-all" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 text-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('reports.agentsLabel')}</label>
                  <input type="number" placeholder="0" min="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-red-600 outline-none font-black text-center text-xl" value={formData.agents} onChange={(e) => setFormData({...formData, agents: e.target.value})} />
                </div>
                <div className="space-y-3 text-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('reports.vehiclesLabel')}</label>
                  <input type="number" placeholder="0" min="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-red-600 outline-none font-black text-center text-xl" value={formData.vehicles} onChange={(e) => setFormData({...formData, vehicles: e.target.value})} />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full ${isSubmitting ? 'bg-slate-700 cursor-not-allowed' : isOnline ? 'bg-red-700' : 'bg-amber-700'} text-white py-6 rounded-3xl font-black text-2xl shadow-2xl hover:brightness-110 uppercase tracking-widest transition-all ${isSubmitting ? '' : 'active:scale-95'}`}
              >
                {isSubmitting ? t('reports.transmitting') : isOnline ? t('reports.transmitReportAnonymously') : t('reports.secureOfflineSync')}
              </button>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-300 mt-3 transition-colors"
              >
                <Shield size={12} weight="bold" className="inline me-1 -mt-0.5" />
                {t('reports.howWeProtectPrivacy')}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-8 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-visible relative">
            <h3 className="text-2xl font-black text-slate-100 flex items-center gap-3 uppercase tracking-tight shrink-0">
              <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">🕒</span> {t('reports.localActivityFeed')}
            </h3>
            
            <div className="flex-1 flex items-center bg-slate-900/60 rounded-2xl border border-slate-800 relative overflow-hidden h-[60px] shadow-lg">
              <div className="shrink-0 h-full flex items-center bg-[#0d1526] pe-4 border-e border-slate-800/80 z-20 py-2.5 relative shadow-[10px_0_15px_rgba(0,0,0,0.5)]">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 whitespace-nowrap">{t('reports.filter')}:</span>
              </div>
              
              <div 
                ref={scrollRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                onWheel={onWheel}
                className={`flex-1 h-full overflow-x-auto no-scrollbar flex items-center px-4 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} z-10`}
                style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
              >
                <div className="flex gap-2 items-center">
                  {(['newest', 'oldest', 'nearest', 'farthest']).map((option) => (
                    <button 
                      key={option} 
                      onClick={() => handleFilterClick(option)} 
                      disabled={(option === 'nearest' || option === 'farthest') && !userCoords} 
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${sortBy === option ? 'bg-red-700 text-white border-red-500 shadow-lg' : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-200 disabled:opacity-20'}`}
                    >
                      {t(`reports.filter_${option}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {/* Show empty state in duress mode to hide user's report activity */}
            {isDuressMode ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                {t('reports.noActivityYet')}
              </div>
            ) : sortedReports.map((report) => {
              const isPending = pendingReports.some(pr => pr.id === report.id);
              const distance = userCoords && report.lat && report.lng ? calculateDistance(userCoords.lat, userCoords.lng, report.lat, report.lng).toFixed(1) : null;
              const displayTime = new Date(report.timestamp || '').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
              return (
                <button
                  key={report.id}
                  id={`report-card-${report.id}`}
                  onClick={() => handleFeedItemClick(report)}
                  className={`group relative flex flex-col p-8 rounded-[2rem] border transition-all duration-300 min-h-[260px] text-start shadow-2xl ${isPending ? 'bg-slate-900/40 border-dashed border-amber-800/40 border-2' : 'bg-slate-900/60 border-slate-800 hover:border-red-600/50'}`}
                >
                  <div className="absolute end-6 top-6 flex flex-col items-end gap-2.5">
                    <span className="text-[10px] font-black text-red-500 group-hover:brightness-125 transition-colors uppercase tracking-[0.1em]">{t('reports.focusMap')}</span>
                    {distance && (
                      <span className="bg-[#1e293b] px-3 py-1.5 rounded-lg text-[10px] font-black text-blue-400 border border-slate-700 shadow-lg">
                        {t('reports.milesAway', { distance })}
                      </span>
                    )}
                  </div>

                  <div className="pe-32 mb-6">
                    <h4 className="font-black text-white text-2xl leading-tight mb-1 tracking-tight">
                      {report.location}{report.state ? `, ${getStateAbbreviation(report.state)}` : ''}
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ms-2">({t('reports.approx')})</span>
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500 mb-2">
                      {report.lat?.toFixed(4)}, {report.lng?.toFixed(4)}
                    </p>
                    <div className="flex gap-3 items-center">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{displayTime}</p>
                      {isPending && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">{t('reports.syncing')}</span>}
                    </div>
                  </div>

                  <p className={`mb-6 leading-relaxed font-bold flex-grow text-[15px] ${isPending ? 'text-slate-500 italic' : 'text-slate-200'}`}>
                    {report.description}
                  </p>

                  <div className="mt-auto pt-6 flex flex-col gap-6 border-t border-slate-800/50">
                    <div className="flex gap-4">
                      <div className="bg-slate-950/80 px-5 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-3 text-xs shadow-inner">
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">{t('reports.agentsLabel')}</span>
                        <span className="text-red-500 font-black text-xl leading-none">{report.agents || 0}</span>
                      </div>
                      <div className="bg-slate-950/80 px-5 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-3 text-xs shadow-inner">
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">{t('reports.vehiclesLabel')}</span>
                        <span className="text-red-500 font-black text-xl leading-none">{report.vehicles || 0}</span>
                      </div>
                    </div>

                    {/* Verify + Flag row — combined, center-aligned */}
                    {(() => {
                      const verifierCount = report.verifiers?.length || 0;
                      const reportIsVerified = isReportVerified(report);
                      const verifierId = getOrCreateVerifierId();
                      const userHasVerified = hasUserVerified(report, verifierId);
                      const flagCount = report.flaggers?.length || 0;
                      const userHasFlagged = report.flaggers?.some(f => f.id === verifierId);
                      const isUnderReview = flagCount >= 4;

                      if (isPending) return null;

                      return (
                        <div className="flex flex-col items-center gap-2">
                          {verifierCount > 0 && !reportIsVerified && (
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {t('reports.verificationsProgress', { count: verifierCount, threshold: VERIFICATION_THRESHOLD })}
                            </span>
                          )}
                          <div className="flex items-center justify-center gap-3">
                            {/* Verify side */}
                            {reportIsVerified ? (
                              <div className="flex items-center gap-2 bg-red-950/40 text-red-500 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-red-900/40 shadow-xl shadow-red-950/20">
                                <ShieldCheckIcon size={14} weight="bold" className="shrink-0" />
                                <span>{t('reports.verifiedBadge')}</span>
                                <span className="bg-red-900/60 px-2 py-0.5 rounded-full text-[9px]">{verifierCount}</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handleToggleVerify(e, report.id || '')}
                                disabled={userHasVerified}
                                className={`px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all shadow-xl active:scale-95 ${
                                  userHasVerified
                                    ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                                    : 'bg-slate-800/60 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border-slate-700 hover:border-red-900'
                                }`}
                              >
                                {userHasVerified ? t('reports.youVerified') : t('reports.vouchForReport')}
                              </button>
                            )}

                            {/* Divider */}
                            <div className="w-px h-6 bg-slate-700/50 shrink-0" />

                            {/* Flag side */}
                            {isUnderReview ? (
                              <div className="flex items-center gap-1.5 text-amber-500 bg-amber-950/30 border border-amber-900/40 px-3 py-3 rounded-2xl">
                                <FlagBannerIcon size={11} weight="bold" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{t('reports.underReview')}</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleFlagReport(report.id); }}
                                disabled={userHasFlagged}
                                className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all px-4 py-3 rounded-2xl border active:scale-95 ${
                                  userHasFlagged
                                    ? 'text-slate-600 border-slate-800 bg-slate-800/30 cursor-default'
                                    : 'text-slate-500 border-slate-700 bg-slate-800/60 hover:text-amber-400 hover:border-amber-900/60'
                                }`}
                              >
                                <FlagBannerIcon size={11} weight={userHasFlagged ? 'fill' : 'bold'} />
                                {userHasFlagged ? t('reports.alreadyFlagged') : t('reports.flagReport')}
                                {flagCount > 0 && !userHasFlagged && (
                                  <span className="text-slate-600 font-normal normal-case tracking-normal ml-0.5">({flagCount}/4)</span>
                                )}
                              </button>
                            )}
                          </div>
                          {onNavigateToScenario && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onNavigateToScenario({ id: 'community-witnessing' }); }}
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-teal-400 border border-teal-800/50 bg-teal-950/30 hover:bg-teal-900/40 px-4 py-2.5 rounded-2xl transition-all active:scale-95"
                            >
                              <Eye size={12} weight="bold" />
                              {t('reports.witnessedThis')}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </button>
              );
            })}
            {!isDuressMode && sortedReports.length === 0 && (
              <div className="py-24 text-center border-4 border-dashed border-slate-900 rounded-[3rem]">
                 <div className="text-5xl mb-4 opacity-20 grayscale">🕒</div>
                 <p className="text-slate-600 font-black uppercase tracking-[0.2em]">{t('reports.noActivityLast12Hours')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAQ Link */}
      <FaqCta onNavigate={onNavigate} className="max-w-7xl mx-auto mt-10 mb-4 px-4" />

      {/* Disclaimer */}
      <div className="max-w-7xl mx-auto mt-4 mb-6 px-4">
        <Disclaimer>
          {t('reports.disclaimerLine1')}
          <br />{t('reports.disclaimerLine2')}
          <br />{t('reports.disclaimerLine3')}
          <br />{t('reports.disclaimerLine4')}
        </Disclaimer>
      </div>

      {/* Install App Button */}
      <div className="max-w-7xl mx-auto mt-8 mb-6 px-4 text-center">
        <button
          onClick={() => {
            if (window.deferredPrompt) {
              window.deferredPrompt.prompt();
            } else {
              setShowInstallHelp(true);
            }
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 inline-flex items-center gap-2"
        >
          <Download size={18} />
          {t('home.installApp')}
        </button>
        <p className="text-slate-500 text-[10px] mt-2 tracking-widest uppercase">
          {t('home.offlineSecure')}
        </p>
      </div>
      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />

      {/* Location Permission Modal */}
      {showLocationModal && (
        <LocationPermissionModal
          errorType={locationError}
          onClose={() => setShowLocationModal(false)}
          onRetry={() => {
            setShowLocationModal(false);
            // Retry getting location
            handleUseCurrentLocation();
          }}
        />
      )}

      {/* Legal Notice Modal */}
      {showLegalNotice && (
        <LegalNoticeModal onClose={handleCloseLegalNotice} />
      )}

      {/* Privacy & Security Modal */}
      {showPrivacyModal && (
        <PrivacySecurityModal onClose={() => setShowPrivacyModal(false)} />
      )}

      {/* PII Warning Modal */}
      {showPiiWarning && piiFindings.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl w-full max-w-md overflow-hidden border border-amber-700/50 shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-amber-950/30">
              <div className="flex items-center gap-2">
                <Eye size={20} weight="bold" className="text-amber-400" />
                <h2 className="text-lg font-bold text-white">{t('reports.privacyWarning')}</h2>
              </div>
              <button
                onClick={() => { setShowPiiWarning(false); setPiiFindings([]); }}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-slate-300 text-sm">
                {t('reports.piiWarningDesc')}
              </p>
              <div className="space-y-3">
                {piiFindings.map((finding, i) => (
                  <div key={i} className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{finding.type}</span>
                    </div>
                    <p className="text-white text-sm font-mono mb-1">"{finding.match}"</p>
                    <p className="text-slate-400 text-xs">{finding.suggestion}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowPiiWarning(false); setPiiFindings([]); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm uppercase tracking-widest"
                >
                  {t('reports.edit')}
                </button>
                <button
                  onClick={() => { handleSubmit(new Event('submit')); }}
                  className="flex-1 bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm uppercase tracking-widest"
                >
                  {t('reports.submitAnyway')}
                </button>
              </div>
              <p className="text-slate-500 text-[10px] text-center">
                {t('reports.piiFooterNote')}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Nearby Report Modal */}
      {showNearbyReportModal && nearbyReport && (
        <NearbyReportModal
          report={nearbyReport.report}
          userDistance={nearbyReport.distance}
          onVerify={handleVerifyNearbyReport}
          onCreateNew={handleCreateNewAnyway}
          onClose={handleCloseNearbyModal}
        />
      )}

      {/* Community Resources Disclaimer Modal */}
      {showResourcesDisclaimer && (
        <ResourcesDisclaimerModal onClose={handleCloseResourcesDisclaimer} />
      )}
    </div>
  );
};

export default CommunityReports;
