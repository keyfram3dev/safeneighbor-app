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
import { getRoute, sampleRoutePoints, analyzeRouteHotspots, forwardGeocode } from '../utils/routing';
import { acquireLocation } from '../utils/locationShare';

const CONSENT_KEY = 'safeneighbor_route_consent';
const NOMINATIM_SUGGEST_URL = 'https://nominatim.openstreetmap.org/search';

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
function useAddressSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const search = useCallback((query) => {
    clearTimeout(timerRef.current);
    if (!query || query.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${NOMINATIM_SUGGEST_URL}?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=us`
        );
        if (!res.ok) { setSuggestions([]); setLoading(false); return; }
        const data = await res.json();
        setSuggestions(
          data.map((d) => ({
            display: d.display_name,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
          }))
        );
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 400);
  }, []);

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

  // Autocomplete
  const startAC = useAddressSuggestions();
  const destAC = useAddressSuggestions();
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

  const hasConsented = useCallback(() => localStorage.getItem(CONSENT_KEY) === 'true', []);

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
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Trigger map render after React commits the routes state update ── */
  useEffect(() => {
    if (routes && analyzedRef.current && startLocRef.current && destLocRef.current) {
      renderMap(startLocRef.current, destLocRef.current, analyzedRef.current, 0);
    }
  }, [routes]); // eslint-disable-line

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
        const geo = await forwardGeocode(startAddress);
        if (!geo) { setError(t('route.geocodeFailed')); setIsChecking(false); return; }
        start = geo;
        setStartCoords(geo);
      }

      // 2. Resolve destination
      let dest;
      if (destCoords) {
        dest = destCoords;
      } else {
        dest = await forwardGeocode(destination);
        if (!dest) { setError(t('route.geocodeFailed')); setIsChecking(false); return; }
        setDestCoords(dest);
      }

      // 3. Get route
      let routeData;
      try { routeData = await getRoute(start.lat, start.lng, dest.lat, dest.lng); }
      catch { setError(t('route.routingServiceError')); setIsChecking(false); return; }
      if (!routeData || routeData.length === 0) { setError(t('route.noRoute')); setIsChecking(false); return; }

      // 4. Analyze each route for hotspots
      const analyzed = routeData.map((route) => {
        const points = sampleRoutePoints(route.geometry, 200);
        const hotspots = analyzeRouteHotspots(points, reports, 0.5);
        return { ...route, hotspots, samplePoints: points };
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
    if (!hasConsented()) { setShowConsent(true); return; }
    doRouteCheck();
  };

  const handleConsentAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setShowConsent(false);
    doRouteCheck();
  };

  /* ── Highlight selected route on map ── */
  const highlightRoute = useCallback((idx) => {
    const map = mapInstanceRef.current;
    if (!map || !routeLayersRef.current.length) return;

    routeLayersRef.current.forEach((group, i) => {
      if (!group) return;
      if (i === idx) {
        group.eachLayer((l) => {
          if (l.setStyle) l.setStyle({ opacity: 0.9, weight: 5, dashArray: null });
          l.bringToFront?.();
        });
      } else {
        group.eachLayer((l) => {
          if (l.setStyle) l.setStyle({ opacity: 0.3, weight: 3, dashArray: '8 6' });
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

      const line = L.polyline(coords, {
        color: route.hotspots.length === 0 ? '#10b981' : (isActive ? '#3b82f6' : '#6b7280'),
        weight: isActive ? 5 : 3,
        opacity: isActive ? 0.9 : 0.3,
        dashArray: isActive ? null : '8 6',
      });
      group.addLayer(line);

      // Hotspot circles
      route.hotspots.forEach((h) => {
        const circle = L.circle([h.report.lat, h.report.lng], {
          radius: 400, fillColor: '#ef4444', color: '#b91c1c', weight: 1.5, fillOpacity: isActive ? 0.25 : 0.08,
        });
        group.addLayer(circle);
      });

      routeLayersRef.current.push(group);
      coords.forEach(([lat, lng]) => bounds.extend([lat, lng]));
    });

    map.fitBounds(bounds.pad(0.1));
  };

  /* ── When user selects an alternative route, update map highlight ── */
  const handleSelectRoute = (idx) => {
    setSelectedRouteIdx(idx);
    highlightRoute(idx);
  };

  const selected = routes?.[selectedRouteIdx];
  const canCheck = (startMode === 'gps' || startAddress.trim()) && destination.trim();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden overflow-x-hidden border border-slate-700 relative z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20">
              <Path size={18} weight="bold" className="text-blue-400" />
            </div>
            <h2 className="text-white font-bold text-base">{t('route.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Input section */}
          <div className="p-5 space-y-3">
            <p className="text-slate-400 text-xs">{t('route.subtitle')}</p>

            {/* Start location */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">{t('route.startLabel')}</label>
              <div className="flex gap-2 mb-1.5">
                <button
                  onClick={() => { setStartMode('gps'); setStartAddress(''); setStartCoords(null); startAC.clear(); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                    startMode === 'gps'
                      ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <Gps size={14} weight="bold" /> {t('route.useMyLocation')}
                </button>
                <button
                  onClick={() => setStartMode('address')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                    startMode === 'address'
                      ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <NavigationArrow size={14} weight="bold" /> {t('route.typeAddress')}
                </button>
              </div>

              {startMode === 'address' && (
                <div className="relative">
                  <input
                    type="text"
                    value={startAddress}
                    onChange={(e) => { setStartAddress(e.target.value); setStartCoords(null); startAC.search(e.target.value); }}
                    onFocus={() => setFocusedField('start')}
                    onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                    placeholder={t('route.startPlaceholder')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:border-blue-500 outline-none"
                  />
                  {focusedField === 'start' && startAC.suggestions.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                      {startAC.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setStartAddress(s.display); setStartCoords({ lat: s.lat, lng: s.lng }); startAC.clear(); }}
                          className="w-full text-left px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-b-0"
                        >
                          <MapPin size={11} weight="bold" className="inline mr-1.5 text-blue-400" />
                          {s.display}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Destination */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">{t('route.destination')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); setDestCoords(null); destAC.search(e.target.value); }}
                  onFocus={() => setFocusedField('dest')}
                  onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                  onKeyDown={(e) => e.key === 'Enter' && canCheck && handleCheck()}
                  placeholder={t('route.destinationPlaceholder')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:border-blue-500 outline-none"
                />
                {focusedField === 'dest' && destAC.suggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                    {destAC.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setDestination(s.display); setDestCoords({ lat: s.lat, lng: s.lng }); destAC.clear(); }}
                        className="w-full text-left px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-b-0"
                      >
                        <MapPin size={11} weight="bold" className="inline mr-1.5 text-emerald-400" />
                        {s.display}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Check Route button */}
            <button
              onClick={handleCheck}
              disabled={isChecking || !canCheck}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-wider py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              {isChecking ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Path size={16} weight="bold" />
              )}
              {isChecking ? t('route.checking') : t('route.checkRoute')}
            </button>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <Warning size={14} weight="bold" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Map — always in DOM so mapRef is valid when renderMap is called */}
          <div ref={mapRef} className={`w-full bg-slate-800 ${routes ? 'h-64 md:h-80' : 'h-0'}`} />

          {/* Route Analysis Panel */}
          {selected && (
            <div className="p-5 space-y-3">
              {/* Fallback notice */}
              {selected.isFallback && (
                <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-700/30 rounded-xl px-3 py-2">
                  <Warning size={14} weight="bold" className="text-amber-400 shrink-0" />
                  <p className="text-amber-400/80 text-xs">{t('route.fallbackNotice')}</p>
                </div>
              )}

              {/* Route stats */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Path size={13} weight="bold" />
                  <span>{t('route.routeDistance', { distance: selected.distance.toFixed(1) })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Crosshair size={13} weight="bold" />
                  <span>{t('route.routeTime', { time: Math.round(selected.duration) })}</span>
                </div>
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
  );
}

export default CheckMyRoute;
