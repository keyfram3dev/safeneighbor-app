import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UsersThree } from '@phosphor-icons/react';
import DOMPurify from 'dompurify';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from './firebase';

const CITY_HUBS = [
  { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
  { name: 'Oakland, CA', lat: 37.8044, lng: -122.2712 },
  { name: 'New York, NY', lat: 40.7128, lng: -74.0060 },
  { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  { name: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
  { name: 'San Diego, CA', lat: 32.7157, lng: -117.1611 },
  { name: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
  { name: 'Miami, FL', lat: 25.7617, lng: -80.1918 },
  { name: 'Philadelphia, PA', lat: 39.9526, lng: -75.1652 },
  { name: 'Boston, MA', lat: 42.3601, lng: -71.0589 },
  { name: 'Phoenix, AZ', lat: 33.4484, lng: -112.0740 }
];

const PENDING_KEY = 'safeneighbor_pending_reports_v1';
const EXPIRATION_MS = 8 * 60 * 60 * 1000;
const THREE_MILES_IN_METERS = 4828.03;

// Server-side rate-limited report submission URL
const SUBMIT_REPORT_URL = 'https://us-central1-safeneighbor-33bb0.cloudfunctions.net/submitReport';

/**
 * Submit report via Cloud Function (server-side rate limiting)
 * @param {Object} reportData - The report data
 * @returns {Promise<{success: boolean, reportId?: string, error?: string}>}
 */
const submitReportToServer = async (reportData) => {
  try {
    const response = await fetch(SUBMIT_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: reportData.lat,
        lng: reportData.lng,
        description: reportData.description,
        agents: reportData.agents,
        vehicles: reportData.vehicles,
        activity: reportData.activity || 'Unknown',
        deviceId: getOrCreateVerifierId()
      })
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
const DEV_MODE_KEY = 'safeneighbor_dev_mode'; // Set via console: localStorage.setItem('safeneighbor_dev_mode', 'enabled')

// Security: Duplicate detection settings
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const DUPLICATE_DISTANCE_KM = 0.5; // 500 meters

// Security: Check rate limit before submission
const checkRateLimit = () => {
  // Developer bypass for testing
  if (localStorage.getItem(DEV_MODE_KEY) === 'enabled') {
    return { allowed: true, devMode: true };
  }

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

const CommunityReports = ({ isDuressMode = false }) => {
  const [submitted, setSubmitted] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingReports, setPendingReports] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [userCoords, setUserCoords] = useState(null);
  const [activeHubId, setActiveHubId] = useState(null);
  
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const reportMarkersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [showInlinePicker, setShowInlinePicker] = useState(false);
  const inlinePickerMapRef = useRef(null);
  const inlinePickerMarkerRef = useRef(null);
  const inlinePickerCircleRef = useRef(null);
  const [pickerError, setPickerError] = useState(null);

  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [dragMoved, setDragMoved] = useState(false);
  
  const [formData, setFormData] = useState({
    location: '',
    lat: 37.7749,
    lng: -122.4194,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    description: '',
    agents: '',
    vehicles: ''
  });

  const [reports, setReports] = useState([]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Reverse geocode coordinates to street address
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'SafeNeighbor App' } }
      );
      const data = await response.json();

      const addr = data.address || {};
      const street = addr.road || addr.pedestrian || addr.footway || '';
      const number = addr.house_number || '';
      const area = addr.neighbourhood || addr.suburb || addr.city || addr.town || '';

      // Extract city and state for hotspot display
      const city = addr.city || addr.town || addr.village || addr.suburb || area || '';
      const state = addr.state || '';

      let address;
      if (street && area) {
        address = `${number ? number + ' ' : ''}${street}, ${area}`;
      } else if (street) {
        address = `${number ? number + ' ' : ''}${street}`;
      } else if (data.display_name) {
        address = data.display_name.split(',').slice(0, 2).join(',').trim();
      } else {
        address = null;
      }

      return { address, city, state };
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return { address: null, city: '', state: '' };
    }
  };

  const dynamicHubs = useMemo(() => {
    const MAX_HOTSPOTS = 10;
    const hubs = [];

    // Helper to format report location as "City, State" or fallback
    const formatReportName = (r) => {
      if (r.city && r.state) {
        // Use state abbreviation if available (e.g., "California" -> "CA")
        const stateAbbrev = getStateAbbreviation(r.state);
        return `${r.city}, ${stateAbbrev}`;
      }
      // Fallback: try to extract from location string
      if (r.location) {
        const parts = r.location.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          return parts.slice(-2).join(', ');
        }
        return parts[0];
      }
      return 'Reported Location';
    };

    // 1. Get active (not expired) verified reports sorted by most recent
    const verifiedReports = reports
      .filter(r => isReportVerified(r) && r.lat && r.lng && !isExpired(r.timestamp || ''))
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    // 2. Get active unverified reports sorted by most recent
    const unverifiedReports = reports
      .filter(r => !isReportVerified(r) && r.lat && r.lng && !isExpired(r.timestamp || ''))
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    // 3. Add verified hotspots first (up to MAX_HOTSPOTS)
    for (const r of verifiedReports.slice(0, MAX_HOTSPOTS)) {
      hubs.push({
        name: formatReportName(r),
        lat: r.lat,
        lng: r.lng,
        type: 'verified'
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

    // 5. Fill with general city hubs if still < MAX_HOTSPOTS
    if (hubs.length < MAX_HOTSPOTS) {
      const remaining = MAX_HOTSPOTS - hubs.length;
      for (const cityHub of CITY_HUBS.slice(0, remaining)) {
        hubs.push({ ...cityHub, type: 'city' });
      }
    }

    return hubs;
  }, [reports]);

  const sortedReports = useMemo(() => {
    const validReports = reports.filter(r => !isExpired(r.timestamp || ''));
    const validPending = pendingReports.filter(r => !isExpired(r.timestamp || ''));
    
    const combined = [...validPending, ...validReports];
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
    const activeReports = reports.filter(r => !isExpired(r.timestamp || ''));
    const verifiedReports = activeReports.filter(r => isReportVerified(r));
    return {
      totalActive: activeReports.length,
      totalVerified: verifiedReports.length
    };
  }, [reports]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    console.log('Setting up Firebase listener...');
    
    const pending = localStorage.getItem(PENDING_KEY);
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        if (Array.isArray(parsed)) {
          setPendingReports(parsed.filter(r => !isExpired(r.timestamp || '')));
        }
      } catch (e) { console.error(e); }
    }
    
    const reportsRef = collection(db, 'iceReports');
    const q = query(reportsRef, orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Firebase snapshot received:', snapshot.size, 'documents');
      const fetchedReports = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!isExpired(data.timestamp)) {
          fetchedReports.push({
            id: docSnap.id,
            timestamp: data.timestamp,
            location: data.location,
            lat: data.lat,
            lng: data.lng,
            description: data.description,
            agents: data.agents,
            vehicles: data.vehicles,
            verified: data.verified || false,
            verifiers: data.verifiers || []
          });
        }
      });
      
      setReports(fetchedReports);
    }, (error) => {
      console.error("Error fetching reports from Firebase:", error);
    });

    return () => {
      console.log('Cleaning up Firebase listener...');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncPendingReports = async () => {
      if (isOnline && pendingReports.length > 0) {
        console.log('Syncing', pendingReports.length, 'pending reports via Cloud Function...');
        const failedReports = [];

        for (const report of pendingReports) {
          const { id, ...reportData } = report;
          const result = await submitReportToServer(reportData);

          if (!result.success) {
            if (result.rateLimited) {
              // Rate limited - keep remaining reports for later
              console.log('Rate limited, will retry remaining reports later');
              failedReports.push(report, ...pendingReports.slice(pendingReports.indexOf(report) + 1));
              break;
            } else {
              console.error('Failed to sync report:', result.error);
              failedReports.push(report);
            }
          } else {
            console.log('Synced report:', result.reportId);
          }
        }

        if (failedReports.length === 0) {
          console.log('All pending reports synced!');
          setPendingReports([]);
          localStorage.removeItem(PENDING_KEY);
        } else {
          console.log(`${pendingReports.length - failedReports.length} reports synced, ${failedReports.length} remaining`);
          setPendingReports(failedReports);
        }
      }
    };

    syncPendingReports();
  }, [isOnline, pendingReports]);

  useEffect(() => {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingReports));
  }, [pendingReports]);

  useEffect(() => {
    if (mapRef.current) return;
    const initMap = () => {
      const mapContainer = document.getElementById('report-map');
      if (!mapContainer || !window.L) return;
      const mapInstance = window.L.map('report-map', { zoomControl: false }).setView([formData.lat, formData.lng], 11);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      const selectionMarker = window.L.marker([formData.lat, formData.lng], {
        draggable: true,
        icon: window.L.divIcon({
          className: 'custom-selection-cursor',
          html: "<div style='background-color:#ef4444; width:30px; height:30px; border-radius:50%; border:5px solid white; box-shadow:0 0 20px rgba(239,68,68,0.7); display:flex; align-items:center; justify-content:center; color:white; font-size:16px; font-weight:bold;'>+</div>",
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(mapInstance);

      selectionMarker.on('dragend', () => {
        const pos = selectionMarker.getLatLng();
        setFormData(prev => ({ ...prev, lat: pos.lat, lng: pos.lng, location: `Manual Pin` }));
        setActiveHubId(null);
      });

      mapInstance.on('click', (e) => {
        const { lat, lng } = e.latlng;
        selectionMarker.setLatLng([lat, lng]);
        setFormData(prev => ({ ...prev, lat, lng, location: `Manual Pin` }));
        setActiveHubId(null);
      });

      mapRef.current = mapInstance;
      markerRef.current = selectionMarker;
      setMapLoaded(true);

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });
          mapInstance.setView([latitude, longitude], 11);
          selectionMarker.setLatLng([latitude, longitude]);
        }, (err) => { console.debug(err); });
      }
    };
    const tid = setTimeout(initMap, 100);
    return () => {
      clearTimeout(tid);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (mapLoaded && mapRef.current && window.L) {
      reportMarkersRef.current.forEach(m => mapRef.current.removeLayer(m));
      reportMarkersRef.current = [];
      
      const activeReports = reports.filter(r => !isExpired(r.timestamp || ''));
      const activePending = pendingReports.filter(r => !isExpired(r.timestamp || ''));
      const allReports = [...activePending, ...activeReports];
      
      allReports.forEach(report => {
        if (report.lat && report.lng) {
          const isPending = activePending.some(pr => pr.id === report.id);
          let bgColor = '#991b1b';
          let borderColor = '#ef4444';
          let iconContent = isReportVerified(report) ? '🛡️' : '📍'; 
          
          if (isPending) { 
            bgColor = '#d97706'; 
            borderColor = '#fbbf24'; 
            iconContent = '🕒'; 
          }

          const m = window.L.marker([report.lat, report.lng], {
            icon: window.L.divIcon({
              className: 'custom-report-marker',
              html: `<div class="relative flex items-center justify-center">${isPending ? '<div class="absolute -inset-1.5 bg-amber-500 rounded-full animate-ping opacity-25"></div>' : '<div class="absolute -inset-2 bg-red-600 rounded-full animate-pulse opacity-20"></div>'}<div style='background-color:${bgColor}; width:26px; height:26px; border-radius:50%; border:2px solid ${borderColor}; box-shadow:0 3px 10px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 11px;'>${iconContent}</div></div>`,
              iconSize: [26, 26],
              iconAnchor: [13, 13]
            })
          }).addTo(mapRef.current);
          
          m.on('click', () => {
            setSelectedReport(report);
            mapRef.current.flyTo([report.lat, report.lng], 15, { duration: 1.5 });

            // Scroll to the corresponding report card in the feed
            setTimeout(() => {
              const reportCard = document.getElementById(`report-card-${report.id}`);
              if (reportCard) {
                reportCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 500);
          });
          reportMarkersRef.current.push(m);
        }
      });
    }
  }, [reports, pendingReports, mapLoaded]);

  useEffect(() => {
    if (showInlinePicker && !inlinePickerMapRef.current && window.L) {
      const initPicker = () => {
        const container = document.getElementById('inline-precision-map');
        if (!container) return;

        if (!userCoords) {
           navigator.geolocation.getCurrentPosition((pos) => {
             const { latitude, longitude } = pos.coords;
             setUserCoords({ lat: latitude, lng: longitude });
             setupPickerMap(latitude, longitude);
           }, () => {
             setPickerError("Precision picking requires your GPS location.");
           });
           return;
        }

        setupPickerMap(userCoords.lat, userCoords.lng);
      };

      const setupPickerMap = (centerLat, centerLng) => {
        const mInstance = window.L.map('inline-precision-map', { zoomControl: false }).setView([centerLat, centerLng], 14);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OSM'
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
            html: "<div style='background-color:#ef4444; width:34px; height:34px; border-radius:50%; border:4px solid white; box-shadow:0 10px 20px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white; font-size:18px;'>📍</div>",
            iconSize: [34, 34],
            iconAnchor: [17, 17]
          })
        }).addTo(mInstance);

        const validatePos = (pos) => {
          const dist = calculateDistance(centerLat, centerLng, pos.lat, pos.lng);
          if (dist > 3) {
            setPickerError("Must be within 3 miles of your position.");
            marker.setLatLng([centerLat, centerLng]);
            return false;
          }
          setPickerError(null);
          setFormData(prev => ({ 
            ...prev, 
            lat: pos.lat, 
            lng: pos.lng, 
            location: `Neighbor Report (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})` 
          }));
          return true;
        };

        marker.on('dragend', (e) => validatePos(e.target.getLatLng()));
        mInstance.on('click', (e) => {
           marker.setLatLng(e.latlng);
           validatePos(e.latlng);
        });

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
  }, [showInlinePicker, userCoords]);

  const handleHubSelect = (hub) => {
    if (mapRef.current && markerRef.current) {
      setActiveHubId(hub.name);
      markerRef.current.setLatLng([hub.lat, hub.lng]);
      mapRef.current.flyTo([hub.lat, hub.lng], 13, { duration: 1.8 });
      setFormData(prev => ({ ...prev, lat: hub.lat, lng: hub.lng, location: hub.name }));
    }
  };

  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setFormData(prev => ({ ...prev, lat: latitude, lng: longitude, location: 'Current Position' }));
        if (mapRef.current && markerRef.current) {
          mapRef.current.flyTo([latitude, longitude], 12, { duration: 1.5 });
          markerRef.current.setLatLng([latitude, longitude]);
        }
        setPickerError(null);
      }, () => alert("Location access required for this feature."));
    }
  };

  const handleTogglePicker = () => {
    setShowInlinePicker(!showInlinePicker);
    setPickerError(null);
  };

  const handleFeedItemClick = (report) => {
    if (mapRef.current && report.lat && report.lng) {
      mapRef.current.flyTo([report.lat, report.lng], 16, { duration: 2.0 });
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
      alert('You have already verified this report.');
      return;
    }

    // Check distance requirement
    if (!userCoords) {
      alert('Location required to verify reports. Please enable GPS.');
      return;
    }

    const distance = calculateDistance(
      userCoords.lat, userCoords.lng,
      report.lat || 0, report.lng || 0
    );

    if (distance > VERIFICATION_DISTANCE_MILES) {
      alert(`You must be within ${VERIFICATION_DISTANCE_MILES} miles of the incident to verify. You are ${distance.toFixed(1)} miles away.`);
      return;
    }

    try {
      console.log('Adding verification for report:', id);
      const reportRef = doc(db, 'iceReports', id);

      // Build new verifier entry
      const newVerifier = {
        id: verifierId,
        timestamp: new Date().toISOString(),
        distance: parseFloat(distance.toFixed(2))
      };

      // Get current verifiers and add new one
      const currentVerifiers = report.verifiers || [];
      const updatedVerifiers = [...currentVerifiers, newVerifier];

      await updateDoc(reportRef, {
        verifiers: updatedVerifiers,
        // Update legacy field for backwards compatibility
        verified: updatedVerifiers.length >= VERIFICATION_THRESHOLD
      });

      console.log('Verification added!');
    } catch (error) {
      console.error("Error updating verification:", error);
      alert("Failed to add verification.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Security: Rate limit check
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      alert(`Rate limit reached. You can submit ${MAX_REPORTS_PER_WINDOW} reports per hour. Try again in ${rateCheck.resetInMinutes} minutes.`);
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

    // Build timestamp from form data
    const reportTimestamp = new Date(`${formData.date}T${formData.time}`).toISOString();

    // Security: Check for duplicate reports
    const allReports = [...reports, ...pendingReports];
    if (isDuplicateReport(formData.lat, formData.lng, reportTimestamp, allReports, calculateDistance)) {
      alert('A similar report was already submitted for this location recently. Please wait before submitting another report for the same area.');
      return;
    }

    // Security: Apply privacy protections
    const fuzzyLat = fuzzyCoordinate(formData.lat);
    const fuzzyLng = fuzzyCoordinate(formData.lng);
    const roundedTimestamp = roundTimestamp(reportTimestamp);

    // Get street address and city/state from fuzzed coordinates
    const geoData = await reverseGeocode(fuzzyLat, fuzzyLng);

    const newReport = {
      timestamp: roundedTimestamp,
      location: geoData.address || `Near ${fuzzyLat.toFixed(2)}, ${fuzzyLng.toFixed(2)}`,
      city: geoData.city || '',
      state: geoData.state || '',
      lat: fuzzyLat,
      lng: fuzzyLng,
      description: sanitizeDescription(formData.description),
      agents: Math.min(50, Math.max(0, parseInt(formData.agents) || 0)),
      vehicles: Math.min(20, Math.max(0, parseInt(formData.vehicles) || 0)),
      verified: false,
      verifiers: []
    };

    try {
      if (isOnline) {
        console.log('Submitting report via Cloud Function (server-side rate limiting)...');
        const result = await submitReportToServer(newReport);

        if (!result.success) {
          if (result.rateLimited) {
            alert(result.error || 'Too many reports. Please wait before submitting again.');
          } else {
            alert(result.error || 'Failed to submit report. Please try again.');
          }
          return;
        }

        // Record submission for client-side tracking (backup)
        recordSubmission();

        console.log('Report submitted successfully! ID:', result.reportId);
        setSubmitted(true);

        if (mapRef.current) {
          mapRef.current.flyTo([fuzzyLat, fuzzyLng], 11, { duration: 1.5 });
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
        setPendingReports(prev => [{...newReport, id: Date.now().toString()}, ...prev]);
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="text-center relative pt-4">
          <div className="flex justify-center mb-4">
            <UsersThree size={48} weight="bold" className="text-blue-400" />
          </div>
          <h2 className="text-4xl font-black text-slate-100 mb-2 tracking-tight">Community Reporting</h2>
          <p className="text-slate-400 max-w-lg mx-auto font-medium leading-relaxed">Anonymously report ICE activity. Reports expire and vanish after 8 hours.</p>
          <div className="flex justify-center mt-6 flex-wrap gap-3">
            {/* Systems Status Pill */}
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-lg transition-all ${isOnline ? 'bg-green-900/30 text-green-400 border-green-800/60' : 'bg-amber-900/30 text-amber-400 border-amber-800/60'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_12px_#22c55e]' : 'bg-amber-500 shadow-[0_0_12px_#f59e0b]'}`}></span>
              {isOnline ? 'Systems Online' : 'Offline - Queuing Reports'}
            </div>

            {/* Incidents Reported Pill */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-lg bg-blue-900/30 text-blue-400 border-blue-800/60">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_#3b82f6]"></span>
              Incidents Reported: {reportStats.totalActive}
            </div>

            {/* Verified Pill */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-lg bg-red-900/30 text-red-400 border-red-800/60">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]"></span>
              Verified: {reportStats.totalVerified}
            </div>
          </div>
        </section>

        <div className="bg-slate-900 p-1 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative">
          <div className="p-4 flex justify-between items-center bg-slate-950/60 border-b border-slate-800/50 backdrop-blur-md">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neighborhood Activity Map</p>
             <button 
              type="button"
              onClick={handleUseCurrentLocation}
              className="text-[10px] font-black text-red-400 hover:text-red-300 flex items-center gap-1.5 bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-900/30 transition-all hover:scale-105 active:scale-95"
            >
              <span>📍</span> RE-CENTER GPS
            </button>
          </div>
          <div id="report-map" className="h-72 md:h-96 w-full z-0"></div>
          <div className="p-5 bg-slate-950/40 flex flex-wrap gap-2.5">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-full mb-1">Hotspots ({dynamicHubs.length}):</span>
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
                   {hub.type === 'verified' && <span className="mr-1">🛡️</span>}
                   {hub.name}
                 </button>
               );
             })}
          </div>
        </div>

        <div className="relative">
          {submitted ? (
            <div className="bg-green-900/20 border-2 border-green-800/60 p-10 rounded-[2.5rem] text-center shadow-2xl animate-in zoom-in-95">
              <div className="text-6xl mb-6">🛡️</div>
              <h3 className="text-3xl font-black text-green-400 mb-3">Report Transmitted</h3>
              <p className="text-slate-300 mb-8 font-medium">Incident pinned for 8 hours. Thank you for protecting your neighbors.</p>
              <button onClick={() => setSubmitted(false)} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-wide">Log New Incident</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-8 overflow-hidden">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight border-b border-slate-800 pb-4">Incident Report Form</h3>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Event Date</label>
                  <input type="date" required className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-red-600 outline-none transition-all" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={handleUseCurrentLocation}
                    className="bg-slate-950 border border-slate-800 hover:border-red-600/50 p-5 rounded-2xl flex items-center justify-start gap-3 transition-all active:scale-95 text-[11px] font-black uppercase tracking-widest text-white shadow-lg"
                  >
                    <span className="text-xl">📍</span> Use My Location
                  </button>
                  <button 
                    type="button" 
                    onClick={handleTogglePicker}
                    className={`border p-5 rounded-2xl flex items-center justify-start gap-3 transition-all active:scale-95 text-[11px] font-black uppercase tracking-widest shadow-lg ${showInlinePicker ? 'bg-red-700 border-red-500 text-white' : 'bg-slate-950 border-slate-800 text-white hover:border-red-600/50'}`}
                  >
                    <span className="text-xl">🗺️</span> Choose location within 3 miles
                  </button>
                </div>

                {showInlinePicker && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-slate-950 p-1 rounded-3xl border border-slate-800 overflow-hidden relative shadow-2xl">
                      <div id="inline-precision-map" className="h-64 w-full z-10"></div>
                      <div className="absolute top-4 right-4 z-20 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                         Drag Pin to Precision Location
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
                          Selected: <span className="text-blue-400">{formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Time Noted</label>
                  <input type="time" required className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-red-600 outline-none transition-all" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observations</label>
                <textarea required rows={4} placeholder="Describe the activity..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-red-600 outline-none resize-none transition-all" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 text-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Agents</label>
                  <input type="number" placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-red-600 outline-none font-black text-center text-xl" value={formData.agents} onChange={(e) => setFormData({...formData, agents: e.target.value})} />
                </div>
                <div className="space-y-3 text-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vehicles</label>
                  <input type="number" placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white focus:border-red-600 outline-none font-black text-center text-xl" value={formData.vehicles} onChange={(e) => setFormData({...formData, vehicles: e.target.value})} />
                </div>
              </div>
              
              <button type="submit" className={`w-full ${isOnline ? 'bg-red-700' : 'bg-amber-700'} text-white py-6 rounded-3xl font-black text-2xl shadow-2xl hover:brightness-110 uppercase tracking-widest transition-all active:scale-95`}>
                {isOnline ? 'TRANSMIT REPORT ANONYMOUSLY' : 'SECURE OFFLINE SYNC'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-8 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-visible relative">
            <h3 className="text-2xl font-black text-slate-100 flex items-center gap-3 uppercase tracking-tight shrink-0">
              <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">🕒</span> Local Activity Feed
            </h3>
            
            <div className="flex-1 flex items-center bg-slate-900/60 rounded-2xl border border-slate-800 relative overflow-hidden h-[60px] shadow-lg">
              <div className="shrink-0 h-full flex items-center bg-[#0d1526] pr-4 border-r border-slate-800/80 z-20 py-2.5 relative shadow-[10px_0_15px_rgba(0,0,0,0.5)]">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 whitespace-nowrap">Filter:</span>
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
                      {option}
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
                No activity reported in your area yet.
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
                  className={`group relative flex flex-col p-8 rounded-[2rem] border transition-all duration-300 min-h-[260px] text-left shadow-2xl ${isPending ? 'bg-slate-900/40 border-dashed border-amber-800/40 border-2' : 'bg-slate-900/60 border-slate-800 hover:border-red-600/50'}`}
                >
                  <div className="absolute right-6 top-6 flex flex-col items-end gap-2.5">
                    <span className="text-[10px] font-black text-red-500 group-hover:brightness-125 transition-colors uppercase tracking-[0.1em]">Focus Map →</span>
                    {distance && (
                      <span className="bg-[#1e293b] px-3 py-1.5 rounded-lg text-[10px] font-black text-blue-400 border border-slate-700 shadow-lg">
                        {distance} miles away
                      </span>
                    )}
                  </div>

                  <div className="pr-32 mb-6">
                    <h4 className="font-black text-white text-2xl leading-tight mb-1 tracking-tight">{report.location}</h4>
                    <p className="text-[10px] font-bold text-slate-500 mb-2">
                      {report.lat?.toFixed(4)}, {report.lng?.toFixed(4)}
                    </p>
                    <div className="flex gap-3 items-center">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{displayTime}</p>
                      {isPending && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Syncing...</span>}
                    </div>
                  </div>

                  <p className={`mb-6 leading-relaxed font-bold flex-grow text-[15px] ${isPending ? 'text-slate-500 italic' : 'text-slate-200'}`}>
                    {report.description}
                  </p>

                  <div className="mt-auto pt-6 flex flex-col gap-6 border-t border-slate-800/50">
                    <div className="flex gap-4">
                      <div className="bg-slate-950/80 px-5 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-3 text-xs shadow-inner">
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Agents</span>
                        <span className="text-red-500 font-black text-xl leading-none">{report.agents || 0}</span>
                      </div>
                      <div className="bg-slate-950/80 px-5 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-3 text-xs shadow-inner">
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Vehicles</span>
                        <span className="text-red-500 font-black text-xl leading-none">{report.vehicles || 0}</span>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      {(() => {
                        const verifierCount = report.verifiers?.length || 0;
                        const reportIsVerified = isReportVerified(report);
                        const verifierId = getOrCreateVerifierId();
                        const userHasVerified = hasUserVerified(report, verifierId);

                        if (reportIsVerified) {
                          return (
                            <div className="flex items-center gap-3 bg-red-950/40 text-red-500 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border border-red-900/40 shadow-xl shadow-red-950/20">
                              <span className="text-lg">🛡️</span> VERIFIED
                              <span className="bg-red-900/60 px-2 py-0.5 rounded-full text-[10px] ml-1">
                                {verifierCount} {verifierCount === 1 ? 'neighbor' : 'neighbors'}
                              </span>
                            </div>
                          );
                        } else if (!isPending) {
                          return (
                            <div className="flex flex-col items-center gap-2">
                              {verifierCount > 0 && (
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  {verifierCount}/{VERIFICATION_THRESHOLD} verifications
                                </span>
                              )}
                              <button
                                onClick={(e) => handleToggleVerify(e, report.id || '')}
                                disabled={userHasVerified}
                                className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all shadow-xl active:scale-95 ${
                                  userHasVerified
                                    ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                                    : 'bg-slate-800/60 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border-slate-700 hover:border-red-900'
                                }`}
                              >
                                {userHasVerified ? 'You Verified' : 'Vouch for Report'}
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </button>
              );
            })}
            {!isDuressMode && sortedReports.length === 0 && (
              <div className="py-24 text-center border-4 border-dashed border-slate-900 rounded-[3rem]">
                 <div className="text-5xl mb-4 opacity-20 grayscale">🕒</div>
                 <p className="text-slate-600 font-black uppercase tracking-[0.2em]">No activity reported in the last 8 hours.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityReports;