// src/components/CheckMyRoute.js
// Modal: enter start + destination, see route on map with hotspot analysis.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Path,
  Warning,
  ShieldCheck,
  MapPin,
  Crosshair,
  Globe,
  Shield,
  NavigationArrow,
  Gps,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useReports } from '../contexts/ReportsContext';
import { getRoute, sampleRoutePoints, analyzeRouteHotspots, forwardGeocode, summarizeDrivingRoute } from '../utils/routing';
import { acquireLocation, getLastKnownLocation } from '../utils/locationShare';

const CONSENT_KEY = 'safeneighbor_route_consent';
const NOMINATIM_SUGGEST_URL = 'https://nominatim.openstreetmap.org/search';
const ROUTE_COLORS = ['#3b82f6', '#14b8a6', '#f59e0b'];
const ROUTE_ACCENTS = ['text-blue-400', 'text-teal-400', 'text-amber-400'];

/* ── Open Google Maps with optional waypoints ── */
function openInGoogleMaps(startCoords, destCoords, waypoints = []) {
  const base = 'https://www.google.com/maps/dir/?api=1';
  const params = new URLSearchParams({
    origin: `${startCoords.lat},${startCoords.lng}`,
    destination: `${destCoords.lat},${destCoords.lng}`,
    travelmode: 'driving',
  });
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map((w) => `${w.lat},${w.lng}`).join('|'));
  }
  window.open(`${base}&${params.toString()}`, '_blank');
}

/* ── Extract N evenly-spaced interior points from a route geometry ── */
function extractRouteWaypoints(geometry, count = 2) {
  const coords = geometry.coordinates; // [lng, lat]
  if (!coords || coords.length < 3) return [];
  const result = [];
  for (let i = 1; i <= count; i++) {
    const idx = Math.round((i / (count + 1)) * (coords.length - 1));
    result.push({ lat: coords[idx][1], lng: coords[idx][0] });
  }
  return result;
}

/* ── Build Google Maps waypoints for a given route ── */
function buildGoogleWaypoints(route, startCoords, destCoords) {
  if (route.hotspots.length > 0) {
    return computeDetourWaypoints(
      route.hotspots,
      startCoords.lat, startCoords.lng,
      destCoords.lat, destCoords.lng
    );
  }
  if (route.isFallback) return [];
  return extractRouteWaypoints(route.geometry, 2);
}

/* ── Compute detour waypoints perpendicular to route, around each hotspot cluster ── */
function computeDetourWaypoints(hotspots, startLat, startLng, endLat, endLng) {
  const dx = endLng - startLng;
  const dy = endLat - startLat;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return [];

  // Perpendicular unit vector (left of direction)
  const perpLat = dx / len;
  const perpLng = -dy / len;
  const OFFSET = 0.003; // ~300m

  // Cluster nearby hotspots (within 0.005°)
  const clusters = [];
  hotspots.forEach((h) => {
    const existing = clusters.find(
      (c) => Math.abs(c.lat - h.report.lat) < 0.005 && Math.abs(c.lng - h.report.lng) < 0.005
    );
    if (existing) { existing.count++; }
    else { clusters.push({ lat: h.report.lat, lng: h.report.lng, count: 1 }); }
  });

  // Sort clusters by position along route
  clusters.sort((a, b) => {
    const tA = ((a.lat - startLat) * dy + (a.lng - startLng) * dx) / (len * len);
    const tB = ((b.lat - startLat) * dy + (b.lng - startLng) * dx) / (len * len);
    return tA - tB;
  });

  return clusters.slice(0, 3).map((c) => ({
    lat: c.lat + perpLat * OFFSET,
    lng: c.lng + perpLng * OFFSET,
  }));
}

/* ── Debounced Nominatim autocomplete ── */
function useAddressSuggestions(getBias) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const search = useCallback((query) => {
    clearTimeout(timerRef.current);
    if (!query || query.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const bias = typeof getBias === 'function' ? getBias() : null;
        const normalizedQuery = query
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\b([a-z])/g, (match) => match.toUpperCase());
        const params = new URLSearchParams({
          format: 'jsonv2',
          q: normalizedQuery,
          limit: '5',
          addressdetails: '1',
          countrycodes: 'us',
          dedupe: '1',
        });

        if (bias?.lat && bias?.lng) {
          const west = bias.lng - 0.38;
          const east = bias.lng + 0.38;
          const north = bias.lat + 0.26;
          const south = bias.lat - 0.26;
          params.set('viewbox', `${west},${north},${east},${south}`);
          params.set('bounded', '0');
        }

        let res = await fetch(`${NOMINATIM_SUGGEST_URL}?${params.toString()}`);
        if (!res.ok) { setSuggestions([]); setLoading(false); return; }
        let data = await res.json();

        if ((!data || data.length === 0) && normalizedQuery !== query.trim()) {
          params.set('q', query.trim());
          res = await fetch(`${NOMINATIM_SUGGEST_URL}?${params.toString()}`);
          if (res.ok) {
            data = await res.json();
          }
        }

        const mapped = (data || []).map((d) => ({
            display: d.display_name,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
          }));

        if (bias?.lat && bias?.lng) {
          mapped.sort((a, b) => {
            const distA = Math.abs(a.lat - bias.lat) + Math.abs(a.lng - bias.lng);
            const distB = Math.abs(b.lat - bias.lat) + Math.abs(b.lng - bias.lng);
            return distA - distB;
          });
        }

        setSuggestions(mapped);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 400);
  }, [getBias]);

  const clear = useCallback(() => { setSuggestions([]); clearTimeout(timerRef.current); }, []);
  return { suggestions, loading, search, clear };
}

function CheckMyRoute({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { reports } = useReports();

  // Start / destination
  const [startMode, setStartMode] = useState('gps'); // 'gps' | 'address'
  const [startAddress, setStartAddress] = useState('');
  const [startCoords, setStartCoords] = useState(null); // { lat, lng }
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [lastKnownLocation, setLastKnownLocation] = useState(null);
  const [modalViewportHeight, setModalViewportHeight] = useState(null);
  const [modalViewportWidth, setModalViewportWidth] = useState(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [mobileStep, setMobileStep] = useState('start');

  // Autocomplete
  const startAC = useAddressSuggestions(() => lastKnownLocation);
  const destAC = useAddressSuggestions(() => startCoords || lastKnownLocation);
  const [focusedField, setFocusedField] = useState(null); // 'start' | 'dest'

  // Route state
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [routes, setRoutes] = useState(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [showConsent, setShowConsent] = useState(false);

  // Map refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef([]); // per-route layer groups
  const startEndRef = useRef([]); // start/end markers + bounds helpers

  // Stored refs for re-rendering selected route
  const analyzedRef = useRef(null);
  const startLocRef = useRef(null);
  const destLocRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const startFieldRef = useRef(null);
  const destinationFieldRef = useRef(null);
  const startInputRef = useRef(null);
  const destinationInputRef = useRef(null);
  const mapSectionRef = useRef(null);
  const inputSectionRef = useRef(null);
  const isKeyboardOpen = keyboardInset > 100;
  const isNarrowModal = modalViewportWidth ? modalViewportWidth < 768 : false;
  const useMobileStepper = isNarrowModal && !routes && !isChecking;
  const isMobileDestinationTyping = useMobileStepper && mobileStep === 'dest' && isKeyboardOpen;

  const scrollToDestinationFrame = useCallback((behavior = 'smooth') => {
    const scroller = bodyScrollRef.current;
    const destinationSection = destinationFieldRef.current;
    if (!scroller) return;

    if (isMobileDestinationTyping) {
      scroller.scrollTo({
        top: 0,
        behavior,
      });
      return;
    }

    if (destinationSection) {
      const sectionTop = destinationSection.offsetTop;
      const targetTop = Math.max(0, sectionTop - Math.round(scroller.clientHeight * 0.18));
      scroller.scrollTo({
        top: targetTop,
        behavior,
      });
      return;
    }

    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior,
    });
  }, [isMobileDestinationTyping]);

  const scrollToMapFrame = useCallback((behavior = 'smooth') => {
    const scroller = bodyScrollRef.current;
    const mapSection = mapSectionRef.current;
    const mapEl = mapRef.current;
    if (!scroller || !mapSection) return;

    const anchorTop = mapEl?.offsetTop ?? mapSection.offsetTop;
    const targetTop = Math.max(0, anchorTop - 88);
    scroller.scrollTo({
      top: targetTop,
      behavior,
    });
  }, []);

  const hasConsented = useCallback(() => localStorage.getItem(CONSENT_KEY) === 'true', []);

  const pause = useCallback((ms) => new Promise((resolve) => window.setTimeout(resolve, ms)), []);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRoutes(null);
      setSelectedRouteIdx(0);
      setError('');
      setShowConsent(false);
      setStartAddress('');
      setStartCoords(null);
      setDestination('');
      setDestCoords(null);
      setStartMode('gps');
      startAC.clear();
      destAC.clear();
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      routeLayersRef.current = [];
      startEndRef.current = [];
      analyzedRef.current = null;
      startLocRef.current = null;
      destLocRef.current = null;
      setFocusedField(null);
      setMobileStep('start');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    getLastKnownLocation()
      .then((location) => {
        if (!cancelled) setLastKnownLocation(location);
      })
      .catch(() => {
        if (!cancelled) setLastKnownLocation(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;

    const updateViewportMetrics = () => {
      const viewport = window.visualViewport;
      const height = Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
      const width = Math.round(viewport?.width || window.innerWidth || document.documentElement.clientWidth || 0);
      const layoutHeight = window.innerHeight || document.documentElement.clientHeight || height;
      const inset = viewport ? Math.max(0, Math.round(layoutHeight - viewport.height - viewport.offsetTop)) : 0;
      setModalViewportHeight(height);
      setModalViewportWidth(width);
      setKeyboardInset(inset);
    };

    updateViewportMetrics();

    window.addEventListener('resize', updateViewportMetrics);
    window.visualViewport?.addEventListener('resize', updateViewportMetrics);
    window.visualViewport?.addEventListener('scroll', updateViewportMetrics);

    return () => {
      window.removeEventListener('resize', updateViewportMetrics);
      window.visualViewport?.removeEventListener('resize', updateViewportMetrics);
      window.visualViewport?.removeEventListener('scroll', updateViewportMetrics);
    };
  }, [isOpen]);

  /* ── Trigger map render after React commits the routes state update ── */
  useEffect(() => {
    if (routes && analyzedRef.current && startLocRef.current && destLocRef.current) {
      renderMap(startLocRef.current, destLocRef.current, analyzedRef.current, 0);
      window.setTimeout(() => {
        scrollToMapFrame('smooth');
      }, 240);
    }
  }, [routes, scrollToMapFrame]); // eslint-disable-line

  useEffect(() => {
    if (!isOpen || focusedField !== 'dest') return undefined;

    const frame = window.requestAnimationFrame(() => {
      scrollToDestinationFrame('smooth');
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, focusedField, keyboardInset, scrollToDestinationFrame]);

  useEffect(() => {
    if (!isOpen || focusedField !== 'dest') return undefined;

    const timer = window.setTimeout(() => {
      scrollToDestinationFrame('auto');
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isOpen, focusedField, destination, destAC.loading, destAC.suggestions.length, scrollToDestinationFrame]);

  useEffect(() => {
    if (!isOpen || focusedField !== 'dest' || keyboardInset <= 0) return undefined;

    const settleTimer = window.setTimeout(() => {
      scrollToDestinationFrame('auto');
    }, 180);

    return () => window.clearTimeout(settleTimer);
  }, [isOpen, focusedField, keyboardInset, scrollToDestinationFrame]);

  /* ── Route check logic ── */
  const doRouteCheck = async () => {
    setIsChecking(true);
    setError('');
    setRoutes(null);

    try {
      // 1. Resolve start location
      let start;
      if (startMode === 'gps') {
        try { start = await acquireLocation(); }
        catch { setError(t('route.locationNeeded')); setIsChecking(false); return; }
      } else if (startCoords) {
        start = startCoords;
      } else {
        const geo = await forwardGeocode(startAddress, lastKnownLocation);
        if (!geo) { setError(t('route.geocodeFailed')); setIsChecking(false); return; }
        start = geo;
        setStartCoords(geo);
      }

      // 2. Resolve destination
      let dest;
      if (destCoords) {
        dest = destCoords;
      } else {
        dest = await forwardGeocode(destination, start);
        if (!dest) { setError(t('route.geocodeFailed')); setIsChecking(false); return; }
        setDestCoords(dest);
      }

      // 3. Get route
      let routeData;
      try {
        routeData = await getRoute(start.lat, start.lng, dest.lat, dest.lng);
        if (!routeData || routeData.length === 0) {
          await pause(350);
          routeData = await getRoute(start.lat, start.lng, dest.lat, dest.lng);
        }
        if (!routeData || routeData.length === 0) {
          await pause(650);
          routeData = await getRoute(start.lat, start.lng, dest.lat, dest.lng);
        }
      }
      catch { setError(t('route.routingServiceError')); setIsChecking(false); return; }
      if (!routeData || routeData.length === 0) { setError(t('route.noRoute')); setIsChecking(false); return; }

      // 4. Analyze each route for hotspots
      const analyzed = routeData.map((route) => {
        const points = sampleRoutePoints(route.geometry, 200);
        const hotspots = analyzeRouteHotspots(points, reports, 0.5);
        return {
          ...route,
          hotspots,
          samplePoints: points,
          routeSummary: summarizeDrivingRoute(route),
        };
      });
      analyzed.sort((a, b) => a.hotspots.length - b.hotspots.length);

      analyzedRef.current = analyzed;
      startLocRef.current = start;
      destLocRef.current = dest;

      setRoutes(analyzed);
      setSelectedRouteIdx(0);
      // renderMap is triggered by useEffect after React commits the DOM update
      // (map div goes from h-0 to h-64 only after routes state is set)
    } catch (err) {
      console.error('Route check error:', err);
      setError(t('route.noRoute'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheck = () => {
    const hasStart = startMode === 'gps' || startAddress.trim();
    if (!hasStart || !destination.trim()) return;
    startInputRef.current?.blur?.();
    destinationInputRef.current?.blur?.();
    document.activeElement?.blur?.();
    setFocusedField(null);
    if (!hasConsented()) { setShowConsent(true); return; }
    doRouteCheck();
  };

  const handleConsentAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setShowConsent(false);
    doRouteCheck();
  };

  const goToDestinationStep = useCallback(() => {
    setMobileStep('dest');
    setFocusedField('dest');
    window.setTimeout(() => {
      destinationInputRef.current?.focus?.();
    }, 60);
  }, []);

  const goToStartStep = useCallback(() => {
    setMobileStep('start');
    setFocusedField('start');
    window.setTimeout(() => {
      if (startMode === 'address') {
        startInputRef.current?.focus?.();
      }
    }, 60);
  }, [startMode]);

  /* ── Highlight selected route on map ── */
  const highlightRoute = useCallback((idx) => {
    const map = mapInstanceRef.current;
    if (!map || !routeLayersRef.current.length) return;

    routeLayersRef.current.forEach((entry, i) => {
      if (!entry?.group) return;
      const { group, line, color } = entry;
      if (i === idx) {
        group.eachLayer((l) => {
          if (l === line && l.setStyle) {
            l.setStyle({ color, opacity: 0.95, weight: 5, dashArray: null });
          } else if (l.setStyle) {
            l.setStyle({ opacity: 0.22, weight: 1.5 });
          }
          l.bringToFront?.();
        });
      } else {
        group.eachLayer((l) => {
          if (l === line && l.setStyle) {
            l.setStyle({ color, opacity: 0.36, weight: 3, dashArray: '8 6' });
          } else if (l.setStyle) {
            l.setStyle({ opacity: 0.08, weight: 1 });
          }
        });
      }
    });
  }, []);

  /* ── Render map ── */
  const renderMap = (start, dest, analyzed, activeIdx) => {
    if (!mapRef.current || typeof window.L === 'undefined') return;

    if (mapInstanceRef.current) mapInstanceRef.current.remove();
    routeLayersRef.current = [];
    startEndRef.current = [];

    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: false, maxZoom: 19 }).setView([start.lat, start.lng], 13);
    mapInstanceRef.current = map;

    // Force recalculate after modal animation completes
    setTimeout(() => map.invalidateSize(), 350);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);

    // Start marker (blue)
    L.circleMarker([start.lat, start.lng], { radius: 8, fillColor: '#3b82f6', color: '#1d4ed8', weight: 2, fillOpacity: 0.9 })
      .addTo(map).bindPopup(t('route.startLabel'));

    // End marker (green)
    L.circleMarker([dest.lat, dest.lng], { radius: 8, fillColor: '#10b981', color: '#047857', weight: 2, fillOpacity: 0.9 })
      .addTo(map).bindPopup(dest.displayName || destination);

    const bounds = L.latLngBounds([[start.lat, start.lng], [dest.lat, dest.lng]]);

    // Draw each route as a separate layer group
    analyzed.forEach((route, idx) => {
      const group = L.layerGroup().addTo(map);
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const isActive = idx === activeIdx;
      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];

      const line = L.polyline(coords, {
        color,
        weight: isActive ? 5 : 3,
        opacity: isActive ? 0.95 : 0.36,
        dashArray: isActive ? null : '8 6',
      });
      group.addLayer(line);

      // Hotspot circles
      route.hotspots.forEach((h) => {
        const circle = L.circle([h.report.lat, h.report.lng], {
          radius: 400, fillColor: color, color, weight: 1.5, fillOpacity: isActive ? 0.18 : 0.06,
        });
        group.addLayer(circle);
      });

      routeLayersRef.current.push({ group, line, color, coords });
      coords.forEach(([lat, lng]) => bounds.extend([lat, lng]));
    });

    map.fitBounds(bounds.pad(0.1));
  };

  /* ── When user selects an alternative route, update map highlight ── */
  const handleSelectRoute = (idx) => {
    setSelectedRouteIdx(idx);
    highlightRoute(idx);

    const map = mapInstanceRef.current;
    const selectedLayer = routeLayersRef.current[idx];
    if (map && selectedLayer?.coords?.length) {
      const L = window.L;
      const bounds = L.latLngBounds(selectedLayer.coords);
      if (startLocRef.current) bounds.extend([startLocRef.current.lat, startLocRef.current.lng]);
      if (destLocRef.current) bounds.extend([destLocRef.current.lat, destLocRef.current.lng]);
      map.fitBounds(bounds.pad(0.12));
    }

    window.setTimeout(() => {
      scrollToMapFrame('smooth');
    }, 80);
  };

  const focusField = (field) => {
    setFocusedField(field);
    if (field === 'dest') {
      window.requestAnimationFrame(() => {
        scrollToDestinationFrame('smooth');
      });
    }
  };

  const renderSuggestions = (items, accentClassName, onSelect) => {
    if (!items.length) return null;

    return (
      <div
        className="mt-2 overflow-y-auto rounded-2xl border border-slate-700/70 bg-slate-800/95 shadow-[0_18px_44px_rgba(2,6,23,0.32)]"
        style={{ maxHeight: `${compactSuggestionMaxHeight}px` }}
      >
        {items.map((s, i) => (
          <button
            key={`${s.display}-${i}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(s)}
            className="flex w-full items-start gap-2.5 border-b border-slate-700/60 px-3 py-3 text-left text-sm text-slate-200 transition-colors hover:bg-slate-700/70 last:border-b-0"
          >
            <MapPin size={15} weight="bold" className={`mt-0.5 shrink-0 ${accentClassName}`} />
            <span className="min-w-0 leading-[1.4] text-slate-300">
              {s.display}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const selectedStartLabel = startMode === 'gps' ? (lastKnownLocation?.address || lastKnownLocation?.label || '') : startAddress;
  const selectedDestinationLabel = destination;
  const availableModalHeight = modalViewportHeight
    ? Math.max(420, modalViewportHeight - (isKeyboardOpen ? 8 : 28))
    : undefined;
  const modalBottomOffset = 12;
  const compactKeyboardMode = isKeyboardOpen && focusedField !== 'dest' && !useMobileStepper;
  const compactStartSection = compactKeyboardMode && focusedField === 'dest' && Boolean(selectedStartLabel);
  const compactSuggestionMaxHeight = isMobileDestinationTyping
    ? Math.max(220, Math.min(availableModalHeight ? availableModalHeight * 0.42 : 300, 340))
    : compactKeyboardMode
      ? Math.max(190, Math.min(availableModalHeight ? availableModalHeight * 0.5 : 260, 320))
      : 240;
  const canAdvanceToDestination = startMode === 'gps' || Boolean(startAddress.trim() || startCoords);
  const showStartStep = !useMobileStepper || mobileStep === 'start';
  const showDestinationStep = !useMobileStepper || mobileStep === 'dest';
  const showMapPreview = !compactKeyboardMode && !useMobileStepper;
  const showInlineCheckButton = (!useMobileStepper || mobileStep === 'dest') && !isMobileDestinationTyping;
  const showMobileBackButton = useMobileStepper && !isMobileDestinationTyping;
  const shouldCenterModal = !isKeyboardOpen || isMobileDestinationTyping;

  const selected = routes?.[selectedRouteIdx];
  const canCheck = (startMode === 'gps' || startAddress.trim()) && destination.trim();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-black/80 backdrop-blur-sm safe-modal-frame">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0"
      />

      {/* Modal */}
      <div
        className={`relative z-10 flex h-full justify-center overflow-hidden px-3 pt-3 sm:px-4 sm:pt-5 ${
          shouldCenterModal ? 'items-center' : 'items-start'
        }`}
        style={{ paddingBottom: `${modalBottomOffset}px` }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.985, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.985, y: 18 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          style={availableModalHeight ? { maxHeight: `${availableModalHeight}px` } : undefined}
          className="safe-modal-panel relative flex w-full max-w-4xl flex-col overflow-hidden overflow-x-hidden rounded-[26px] border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 shadow-[0_28px_90px_rgba(2,6,23,0.55)] overscroll-contain"
        >
        {/* Header */}
        <div className="safe-modal-header flex items-center justify-between border-b border-slate-800/90 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-blue-600/20 p-2.5 shadow-[0_0_0_1px_rgba(59,130,246,0.12)]">
              <Path size={18} weight="bold" className="text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white sm:text-[1.05rem]">{t('route.title')}</h2>
              {!compactKeyboardMode && (
                <p className="mt-0.5 text-xs text-slate-500">{t('route.subtitle')}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="safe-modal-close ml-3 rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            aria-label="Close route checker"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Scrollable body */}
        <div ref={bodyScrollRef} className="safe-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Input section */}
          <div ref={inputSectionRef} className={`${compactKeyboardMode ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}`}>
            <div className={`grid ${compactKeyboardMode ? 'gap-3' : 'gap-5'} ${useMobileStepper ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)] lg:items-start'}`}>
              <div className={compactKeyboardMode ? 'space-y-3' : 'space-y-4'}>
            {useMobileStepper && !isMobileDestinationTyping && (
              <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${mobileStep === 'start' ? 'bg-blue-400' : 'bg-slate-700'}`} />
                  <span className={`text-xs font-bold uppercase tracking-[0.18em] ${mobileStep === 'start' ? 'text-blue-300' : 'text-slate-500'}`}>Start</span>
                </div>
                <div className="mx-3 h-px flex-1 bg-slate-800" />
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-[0.18em] ${mobileStep === 'dest' ? 'text-blue-300' : 'text-slate-500'}`}>Destination</span>
                  <div className={`h-2.5 w-2.5 rounded-full ${mobileStep === 'dest' ? 'bg-blue-400' : 'bg-slate-700'}`} />
                </div>
              </div>
            )}

            {/* Start location */}
            {showStartStep && <div ref={startFieldRef}>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">{t('route.startLabel')}</label>
              {!compactStartSection && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setStartMode('gps'); setStartAddress(''); setStartCoords(null); startAC.clear(); }}
                    className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-bold transition-all active:scale-95 ${
                      startMode === 'gps'
                        ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <Gps size={14} weight="bold" /> {t('route.useMyLocation')}
                  </button>
                  <button
                    onClick={() => setStartMode('address')}
                    className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-bold transition-all active:scale-95 ${
                      startMode === 'address'
                        ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <NavigationArrow size={14} weight="bold" /> {t('route.typeAddress')}
                  </button>
                </div>
              )}

              {startMode === 'address' && (
                <div className="mt-2">
                  <input
                    ref={startInputRef}
                    type="text"
                    value={startAddress}
                    onChange={(e) => {
                      setFocusedField('start');
                      setStartAddress(e.target.value);
                      setStartCoords(null);
                      startAC.search(e.target.value);
                    }}
                    onFocus={() => focusField('start')}
                    onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    placeholder={t('route.startPlaceholder')}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-white placeholder-slate-600 outline-none transition-colors focus:border-blue-500"
                  />
                  {startAC.loading && focusedField === 'start' && (
                    <p className="mt-2 text-xs text-slate-500">Searching addresses...</p>
                  )}
                  {(focusedField === 'start' || startAC.loading || startAC.suggestions.length > 0) && renderSuggestions(startAC.suggestions, 'text-blue-400', (s) => {
                    setStartAddress(s.display);
                    setStartCoords({ lat: s.lat, lng: s.lng });
                    startAC.clear();
                    setFocusedField(null);
                    startInputRef.current?.blur?.();
                    destinationInputRef.current?.blur?.();
                    document.activeElement?.blur?.();
                    if (useMobileStepper) {
                      window.setTimeout(() => goToDestinationStep(), 80);
                    }
                  })}
                </div>
              )}

              {selectedStartLabel && (
                <div className={`mt-2 rounded-2xl border border-slate-700/70 bg-slate-800/70 ${compactStartSection ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {startMode === 'gps' ? t('route.useMyLocation') : t('route.typeAddress')}
                  </p>
                  <p className={`mt-1 break-words text-slate-200 ${compactStartSection ? 'line-clamp-2 text-[13px] leading-[1.35]' : 'text-sm leading-[1.45]'}`}>
                    {selectedStartLabel}
                  </p>
                </div>
              )}
              {useMobileStepper && (
                <button
                  onClick={goToDestinationStep}
                  disabled={!canAdvanceToDestination}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-colors active:scale-95 disabled:opacity-50 hover:bg-blue-500"
                >
                  Continue to destination
                </button>
              )}
            </div>}

            {/* Destination */}
            {showDestinationStep && <div ref={destinationFieldRef}>
              {useMobileStepper && selectedStartLabel && !isMobileDestinationTyping && (
                <div className="mb-3 rounded-2xl border border-slate-700/70 bg-slate-800/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Start</p>
                      <p className="mt-1 break-words text-sm leading-[1.45] text-slate-200">{selectedStartLabel}</p>
                    </div>
                    <button
                      onClick={goToStartStep}
                      className="shrink-0 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">{t('route.destination')}</label>
              <div>
                <input
                  ref={destinationInputRef}
                  type="text"
                  value={destination}
                  onChange={(e) => {
                    setFocusedField('dest');
                    setDestination(e.target.value);
                    setDestCoords(null);
                    destAC.search(e.target.value);
                  }}
                  onFocus={() => focusField('dest')}
                  onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                  onKeyDown={(e) => e.key === 'Enter' && canCheck && handleCheck()}
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  placeholder={t('route.destinationPlaceholder')}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-white placeholder-slate-600 outline-none transition-colors focus:border-blue-500"
                />
                {destAC.loading && focusedField === 'dest' && (
                  <p className="mt-2 text-xs text-slate-500">Searching addresses...</p>
                )}
                {(focusedField === 'dest' || destAC.loading || destAC.suggestions.length > 0) && renderSuggestions(destAC.suggestions, 'text-emerald-400', (s) => {
                  setDestination(s.display);
                  setDestCoords({ lat: s.lat, lng: s.lng });
                  destAC.clear();
                  setFocusedField(null);
                  startInputRef.current?.blur?.();
                  destinationInputRef.current?.blur?.();
                  document.activeElement?.blur?.();
                })}
              </div>

              {selectedDestinationLabel && destCoords && !destAC.suggestions.length && (
                <div className="mt-2 rounded-2xl border border-slate-700/70 bg-slate-800/70 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {t('route.destination')}
                  </p>
                  <p className="mt-1 break-words text-sm leading-[1.45] text-slate-200">
                    {selectedDestinationLabel}
                  </p>
                </div>
              )}
              {showMobileBackButton && (
                <button
                  onClick={goToStartStep}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold uppercase tracking-wider text-slate-200 transition-colors active:scale-95 hover:border-slate-600 hover:text-white"
                >
                  Back
                </button>
              )}
            </div>}

            {/* Check Route button */}
            {showInlineCheckButton && (
              <button
                onClick={handleCheck}
                disabled={isChecking || !canCheck}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-colors active:scale-95 disabled:opacity-50 hover:bg-blue-500"
              >
                {isChecking ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Path size={16} weight="bold" />
                )}
                {isChecking ? t('route.checking') : t('route.checkRoute')}
              </button>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <Warning size={14} weight="bold" />
                <span>{error}</span>
              </div>
            )}
              </div>

              <div ref={mapSectionRef} className={`min-h-0 ${selected ? 'space-y-4' : ''} ${showMapPreview ? '' : 'hidden lg:block'}`}>
                <div
                  ref={mapRef}
                  className={`w-full overflow-hidden rounded-[24px] border border-slate-800/80 bg-slate-800 ${
                    routes ? 'h-[240px] sm:h-[300px] lg:h-full lg:min-h-[420px]' : 'hidden lg:flex lg:min-h-[220px] lg:items-center lg:justify-center'
                  }`}
                >
                  {!routes && (
                    <div className="px-6 text-center text-sm leading-[1.6] text-slate-500">
                      {t('route.subtitle')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Route Analysis Panel */}
          {selected && (
            <div className="border-t border-slate-800/80 p-4 sm:p-5">
              <div className="space-y-3">
              {/* Fallback notice */}
              {selected.isFallback && (
                <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-700/30 rounded-xl px-3 py-2">
                  <Warning size={14} weight="bold" className="text-amber-400 shrink-0" />
                  <p className="text-amber-400/80 text-xs">{t('route.fallbackNotice')}</p>
                </div>
              )}

              {/* Route stats */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Path size={13} weight="bold" />
                  <span>{t('route.routeDistance', { distance: selected.distance.toFixed(1) })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Crosshair size={13} weight="bold" />
                  <span>{t('route.routeTime', { time: Math.round(selected.duration) })}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Route summary
                </p>
                <p className="mt-1 text-sm leading-[1.5] text-slate-300">
                  {selected.routeSummary}
                </p>
              </div>

              {/* Safety badge */}
              {selected.hotspots.length === 0 ? (
                <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-700/30 rounded-xl px-4 py-3">
                  <ShieldCheck size={20} weight="bold" className="text-emerald-400" />
                  <div>
                    <p className="text-emerald-400 font-bold text-sm">{t('route.safeRoute')}</p>
                    <p className="text-slate-400 text-xs">{t('route.safeRouteDesc')}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Warning size={20} weight="bold" className="text-amber-400" />
                    <p className="text-amber-400 font-bold text-sm">
                      {t('route.hotspots', { count: selected.hotspots.length })}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {selected.hotspots.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <MapPin size={11} weight="bold" className="text-red-400 shrink-0" />
                        <span className="text-slate-300">
                          {h.report.activity || h.report.description?.slice(0, 40)}
                        </span>
                        <span className="text-slate-500 ms-auto shrink-0">
                          {t('route.hotspotDistance', { distance: h.distanceMiles.toFixed(1) })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigate section */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {selected.hotspots.length === 0 ? t('route.navigate') : t('route.navigateDetour')}
                </p>
                <button
                  onClick={() => openInGoogleMaps(
                    startLocRef.current, destLocRef.current,
                    buildGoogleWaypoints(selected, startLocRef.current, destLocRef.current)
                  )}
                  className={`w-full flex items-center justify-center gap-2 text-white font-bold text-sm py-3 rounded-xl transition-all active:scale-95 ${
                    selected.hotspots.length === 0
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  <NavigationArrow size={16} weight="bold" />
                  {t('route.openInGoogleMaps')}
                </button>
              </div>

              {/* Alternative routes — auto-expanded */}
              {routes && routes.length > 1 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('route.showAlternatives')}</p>
                  {routes.map((route, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectRoute(idx)}
                      className={`w-full rounded-xl px-3 py-2.5 text-start transition-all cursor-pointer ${
                        idx === selectedRouteIdx
                          ? 'bg-blue-950/40 border border-blue-700/40'
                          : 'bg-slate-800/50 border border-slate-700/40 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${
                          route.hotspots.length === 0 ? 'bg-emerald-500' : 'bg-amber-500'
                        } ${idx === selectedRouteIdx ? 'ring-2 ring-offset-1 ring-offset-slate-900 ring-blue-400' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] ${ROUTE_ACCENTS[idx % ROUTE_ACCENTS.length]}`}>●</span>
                            <span className="text-white text-xs font-bold">
                              {route.hotspots.length === 0
                                ? t('route.iceFreeRoute')
                                : idx === 0
                                  ? t('route.leastExposure')
                                  : t('route.routeN', { number: idx + 1 })}
                            </span>
                            {route.hotspots.length === 0 ? (
                              <ShieldCheck size={12} weight="bold" className="text-emerald-400" />
                            ) : (
                              <span className="text-amber-400 text-[10px] font-bold">
                                {route.hotspots.length} {t('route.reports')}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-[1.4] text-slate-400">
                            {route.routeSummary}
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            {route.distance.toFixed(1)} mi · {Math.round(route.duration)} min
                          </p>
                        </div>
                      </div>
                      {/* Per-route Google Maps button */}
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          openInGoogleMaps(
                            startLocRef.current, destLocRef.current,
                            buildGoogleWaypoints(route, startLocRef.current, destLocRef.current)
                          );
                        }}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/20 text-blue-400 font-bold text-[10px] py-1.5 rounded-lg transition-all active:scale-95"
                      >
                        <NavigationArrow size={11} weight="bold" />
                        {t('route.openInGoogleMaps')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Privacy Consent Dialog */}
        <AnimatePresence>
          {showConsent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-700 overflow-hidden mx-auto my-6"
              >
                <div className="p-5 pb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-blue-600/20">
                      <Globe size={22} weight="bold" className="text-blue-400" />
                    </div>
                    <h3 className="text-white font-bold text-lg">{t('route.consentTitle')}</h3>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{t('route.consentBody')}</p>
                </div>
                <div className="px-5 py-4">
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5 space-y-2.5">
                    {['consentPoint1', 'consentPoint2', 'consentPoint3'].map((key) => (
                      <div key={key} className="flex items-start gap-2.5">
                        <Shield size={14} weight="bold" className="text-emerald-400 mt-0.5 shrink-0" />
                        <p className="text-slate-400 text-xs leading-relaxed">{t(`route.${key}`)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 p-5 pt-0">
                  <button onClick={() => setShowConsent(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors text-sm">
                    {t('route.consentDecline')}
                  </button>
                  <button onClick={handleConsentAccept} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                    {t('route.consentAccept')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default CheckMyRoute;
