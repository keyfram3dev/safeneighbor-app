// src/components/LiveLocationViewer.js
// Full-screen live location viewer for contacts who open a ?live={shareId} link

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { subscribeLiveLocation } from '../utils/locationShare';
import { importLocationKey, decryptLocationData } from '../utils/locationEncryption';

const LiveLocationViewer = ({ shareId, encryptionKey, onClose }) => {
  const { t } = useTranslation();
  const [locationData, setLocationData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [decryptError, setDecryptError] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const mapInitializedRef = useRef(false);

  // Subscribe to Firestore document (with E2E decryption when key is provided)
  useEffect(() => {
    const keyPromise = encryptionKey
      ? importLocationKey(encryptionKey)
      : Promise.resolve(null);

    const unsubscribe = subscribeLiveLocation(shareId, async (data) => {
      if (!data) {
        setNotFound(true);
        return;
      }

      if (data.encryptedData) {
        try {
          const key = await keyPromise;
          if (!key) { setDecryptError(true); return; }
          const decrypted = await decryptLocationData(key, data.encryptedData);
          setLocationData({
            ...decrypted,
            active: data.active,
            updatedAt: data.updatedAt,
            createdAt: data.createdAt,
            id: data.id,
          });
          setNotFound(false);
          setDecryptError(false);
        } catch {
          setDecryptError(true);
        }
      } else {
        // Plaintext format (legacy)
        setLocationData(data);
        setNotFound(false);
      }
    });

    return () => unsubscribe();
  }, [shareId, encryptionKey]);

  // Initialize Leaflet map once we have data
  useEffect(() => {
    if (!locationData || mapInitializedRef.current) return;

    const initMap = () => {
      if (!window.L) {
        setTimeout(initMap, 200);
        return;
      }

      const map = window.L.map('live-location-map', { zoomControl: true })
        .setView([locationData.lat, locationData.lng], 16);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        crossOrigin: true,
      }).addTo(map);

      const marker = window.L.marker([locationData.lat, locationData.lng], {
        icon: window.L.divIcon({
          className: 'live-location-marker',
          html: '<div style="background:#ef4444; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 15px rgba(239,68,68,0.6);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(map);

      let circle = null;
      if (locationData.accuracy) {
        circle = window.L.circle([locationData.lat, locationData.lng], {
          radius: locationData.accuracy,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      }

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
      mapInitializedRef.current = true;
    };

    setTimeout(initMap, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        mapInitializedRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationData !== null]);

  // Update marker position on data changes
  useEffect(() => {
    if (!locationData || !markerRef.current) return;
    markerRef.current.setLatLng([locationData.lat, locationData.lng]);
    if (circleRef.current) {
      circleRef.current.setLatLng([locationData.lat, locationData.lng]);
      if (locationData.accuracy) circleRef.current.setRadius(locationData.accuracy);
    }
    if (mapRef.current) {
      mapRef.current.panTo([locationData.lat, locationData.lng]);
    }
  }, [locationData?.lat, locationData?.lng, locationData?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatLastUpdated = (isoString) => {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    if (diff < 60000) return t('liveLocation.justNow');
    if (diff < 3600000) return t('liveLocation.minutesAgo', { count: Math.floor(diff / 60000) });
    return new Date(isoString).toLocaleTimeString();
  };

  // Not found / expired state
  if (notFound) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h2 className="text-2xl font-black text-white mb-3">{t('liveLocation.linkExpired')}</h2>
          <p className="text-slate-400 text-sm mb-6">
            {t('liveLocation.linkExpiredDesc')}
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              {t('liveLocation.goToSafeNeighbor')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Decryption error state
  if (decryptError) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h2 className="text-2xl font-black text-white mb-3">{t('liveLocation.cannotDecrypt')}</h2>
          <p className="text-slate-400 text-sm mb-6">
            {t('liveLocation.cannotDecryptDesc')}
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              {t('liveLocation.goToSafeNeighbor')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (!locationData) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">{t('liveLocation.loading')}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 to-red-800 border-b-2 border-red-600 px-4 py-3 flex items-center justify-between safe-top-nav">
        <div>
          <h1 className="text-white font-black text-lg tracking-tight">{t('liveLocation.appName')}</h1>
          <p className="text-red-200 text-xs">{t('liveLocation.liveLocationSharing')}</p>
        </div>
        <div className="flex items-center gap-2">
          {locationData.active ? (
            <span className="flex items-center gap-1.5 bg-green-900/50 border border-green-600/50 text-green-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              {t('liveLocation.live')}
            </span>
          ) : (
            <span className="bg-slate-700/50 border border-slate-600/50 text-slate-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {t('liveLocation.stopped')}
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div id="live-location-map" className="flex-1" />

      {/* Info Panel */}
      <div className="bg-slate-900 border-t border-slate-700 px-4 py-4 safe-bottom-nav">
        <div className="max-w-lg mx-auto">
          <p className="text-white font-bold text-sm mb-1">
            {t('liveLocation.sharingLocation', { name: locationData.userName || t('liveLocation.someone') })}
          </p>
          {locationData.address && (
            <p className="text-slate-400 text-xs mb-1">{locationData.address}</p>
          )}
          <p className="text-slate-500 text-xs">
            {locationData.lat.toFixed(6)}, {locationData.lng.toFixed(6)}
            {locationData.accuracy && ` (\u00b1${Math.round(locationData.accuracy)}m)`}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {t('liveLocation.updated', { time: formatLastUpdated(locationData.updatedAt) })}
          </p>
          <a
            href={`https://maps.google.com/maps?q=${locationData.lat},${locationData.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-colors"
          >
            {t('liveLocation.openGoogleMaps')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default LiveLocationViewer;
