// src/components/NotificationSettings.js
// Proximity alert settings: foreground alerts (toggle, interval, cooldown),
// saved location watchpoints, and location data wipe.

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Crosshair, Eye, MapPin, Plus, Trash, MagnifyingGlass, Warning } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import {
  getSavedLocations,
  addSavedLocation,
  removeSavedLocation,
  updateSavedLocation,
} from '../utils/savedLocations';
import { acquireLocation } from '../utils/locationShare';
import { deleteLocationsKey } from '../utils/locationsKey';

// ── Constants ─────────────────────────────────────────────────────────────────

const INTERVAL_OPTIONS = [
  { ms: 60_000,    label: '1 min'  },
  { ms: 300_000,   label: '5 min'  },
  { ms: 600_000,   label: '10 min' },
  { ms: 1_800_000, label: '30 min' },
];

const COOLDOWN_OPTIONS = [
  { ms: 300_000,   label: '5 min'  },
  { ms: 900_000,   label: '15 min' },
  { ms: 1_800_000, label: '30 min' },
  { ms: 3_600_000, label: '1 hr'   },
  { ms: 7_200_000, label: '2 hr'   },
];

// All localStorage keys cleared on data wipe
const LOCATION_LS_KEYS = [
  'safeneighbor_proximity_alerts',
  'safeneighbor_proximity_interval',
  'safeneighbor_proximity_cooldown',
  'safeneighbor_saved_locations',
  'safeneighbor_witness_mode',
];

// ── Nominatim forward geocoder ────────────────────────────────────────────────

async function geocodeAddress(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  if (!data.length) throw new Error('No results');
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    address: data[0].display_name.split(',').slice(0, 2).join(',').trim(),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

function NotificationSettings() {
  const { t } = useTranslation();

  // ── Proximity toggle ───────────────────────────────────────────────────────
  const [proximityEnabled, setProximityEnabled] = useState(
    () => localStorage.getItem('safeneighbor_proximity_alerts') === 'true'
  );
  const [proximityToast, setProximityToast] = useState('');
  const toastTimerRef = useRef(null);

  const handleToggleProximity = () => {
    const next = !proximityEnabled;
    const newValue = next ? 'true' : 'false';
    setProximityEnabled(next);
    localStorage.setItem('safeneighbor_proximity_alerts', newValue);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'safeneighbor_proximity_alerts',
      newValue,
    }));
    clearTimeout(toastTimerRef.current);
    setProximityToast(t(next ? 'proximity.enabledToast' : 'proximity.disabledToast'));
    toastTimerRef.current = setTimeout(() => setProximityToast(''), 3000);
  };

  // ── Witness mode toggle ───────────────────────────────────────────────────
  const [witnessMode, setWitnessMode] = useState(
    () => localStorage.getItem('safeneighbor_witness_mode') === 'true'
  );
  const [witnessToast, setWitnessToast] = useState('');
  const witnessTimerRef = useRef(null);

  const handleToggleWitness = () => {
    const next = !witnessMode;
    const newValue = next ? 'true' : 'false';
    setWitnessMode(next);
    localStorage.setItem('safeneighbor_witness_mode', newValue);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'safeneighbor_witness_mode',
      newValue,
    }));
    clearTimeout(witnessTimerRef.current);
    setWitnessToast(t(next ? 'notifications.witnessEnabled' : 'notifications.witnessDisabled'));
    witnessTimerRef.current = setTimeout(() => setWitnessToast(''), 3000);
  };

  // ── Poll interval ──────────────────────────────────────────────────────────
  const [pollInterval, setPollInterval] = useState(
    () => parseInt(localStorage.getItem('safeneighbor_proximity_interval') || '60000', 10)
  );

  const handleIntervalChange = (ms) => {
    setPollInterval(ms);
    const newValue = String(ms);
    localStorage.setItem('safeneighbor_proximity_interval', newValue);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'safeneighbor_proximity_interval',
      newValue,
    }));
  };

  // ── Re-alert cooldown ──────────────────────────────────────────────────────
  const [cooldown, setCooldown] = useState(
    () => parseInt(localStorage.getItem('safeneighbor_proximity_cooldown') || '900000', 10)
  );

  const handleCooldownChange = (ms) => {
    setCooldown(ms);
    const newValue = String(ms);
    localStorage.setItem('safeneighbor_proximity_cooldown', newValue);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'safeneighbor_proximity_cooldown',
      newValue,
    }));
  };

  // ── Saved locations ────────────────────────────────────────────────────────
  const [savedLocations, setSavedLocations] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState('gps'); // 'gps' | 'address'
  const [newLabel, setNewLabel] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [newRadius, setNewRadius] = useState(1);
  const [acquiring, setAcquiring] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addError, setAddError] = useState('');

  // Load saved locations asynchronously (encrypted)
  const refreshLocations = useCallback(async () => {
    const locs = await getSavedLocations();
    setSavedLocations(locs);
  }, []);

  useEffect(() => { refreshLocations(); }, [refreshLocations]);

  const resetAddForm = () => {
    setShowAddForm(false);
    setNewLabel('');
    setAddressQuery('');
    setNewRadius(1);
    setAddError('');
  };

  const handleAddByGPS = async () => {
    if (!newLabel.trim()) return;
    setAcquiring(true);
    setAddError('');
    try {
      const { lat, lng } = await acquireLocation();
      await addSavedLocation({ label: newLabel.trim(), lat, lng, radiusMiles: newRadius });
      await refreshLocations();
      resetAddForm();
    } catch {
      setAddError(t('notifications.locationFailed'));
    } finally {
      setAcquiring(false);
    }
  };

  const handleAddByAddress = async () => {
    if (!newLabel.trim() || !addressQuery.trim()) return;
    setSearching(true);
    setAddError('');
    try {
      const { lat, lng } = await geocodeAddress(addressQuery.trim());
      await addSavedLocation({ label: newLabel.trim(), lat, lng, radiusMiles: newRadius });
      await refreshLocations();
      resetAddForm();
    } catch {
      setAddError(t('notifications.searchFailed'));
    } finally {
      setSearching(false);
    }
  };

  const handleRemove = async (id) => {
    await removeSavedLocation(id);
    await refreshLocations();
  };

  const handleRadiusChange = async (id, radiusMiles) => {
    await updateSavedLocation(id, { radiusMiles });
    await refreshLocations();
  };

  // ── Clear location data ────────────────────────────────────────────────────
  const [clearStatus, setClearStatus] = useState('');
  const clearTimerRef = useRef(null);

  const handleClearData = async () => {
    if (!window.confirm(t('notifications.clearDataConfirm'))) return;
    LOCATION_LS_KEYS.forEach(k => localStorage.removeItem(k));
    await deleteLocationsKey();
    setSavedLocations([]);
    setProximityEnabled(false);
    setWitnessMode(false);
    clearTimeout(clearTimerRef.current);
    setClearStatus(t('notifications.clearDataSuccess'));
    clearTimerRef.current = setTimeout(() => setClearStatus(''), 3000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-amber-700/50 rounded-xl p-4 space-y-5">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-600/20">
          <Bell size={20} weight="bold" className="text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold mb-1">{t('notifications.title')}</h3>
          <p className="text-slate-400 text-sm">{t('notifications.description')}</p>
        </div>
      </div>

      {/* Foreground Proximity Alerts Toggle */}
      <div>
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Crosshair size={16} weight="bold" className="text-amber-400" />
            <span className="text-white text-sm font-semibold">{t('notifications.proximityAlerts')}</span>
          </div>
          <button
            type="button"
            onClick={handleToggleProximity}
            role="switch"
            aria-checked={proximityEnabled}
            aria-label={t('notifications.proximityAlerts')}
            className={`relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
              proximityEnabled ? 'bg-amber-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                proximityEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <p className="text-slate-500 text-xs mt-1">{t('notifications.proximityDesc')}</p>
        <p className="text-slate-600 text-xs mt-0.5">{t('proximity.pollNote')}</p>
        {proximityToast && (
          <p aria-live="polite" className="text-amber-400 text-xs font-semibold mt-1">{proximityToast}</p>
        )}
      </div>

      {/* Community Witness Mode — only shown when proximity alerts are on */}
      {proximityEnabled && (
        <div>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Eye size={16} weight="bold" className="text-teal-400" />
              <span className="text-white text-sm font-semibold">{t('notifications.witnessMode')}</span>
            </div>
            <button
              type="button"
              onClick={handleToggleWitness}
              role="switch"
              aria-checked={witnessMode}
              aria-label={t('notifications.witnessMode')}
              className={`relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                witnessMode ? 'bg-teal-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  witnessMode ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-1">{t('notifications.witnessModeDesc')}</p>
          <p className="text-slate-600 text-[10px] mt-0.5">{t('notifications.witnessModeAck')}</p>
          {witnessToast && (
            <p aria-live="polite" className="text-teal-400 text-xs font-semibold mt-1">{witnessToast}</p>
          )}
        </div>
      )}

      {/* Check Interval */}
      <div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">
          {t('notifications.checkEvery')}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {INTERVAL_OPTIONS.map(({ ms, label }) => (
            <button
              key={ms}
              type="button"
              onClick={() => handleIntervalChange(ms)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                pollInterval === ms
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Re-alert Cooldown */}
      <div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">
          {t('notifications.reAlertAfter')}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {COOLDOWN_OPTIONS.map(({ ms, label }) => (
            <button
              key={ms}
              type="button"
              onClick={() => handleCooldownChange(ms)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                cooldown === ms
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700/60" />

      {/* Saved Alert Zones */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
              {t('notifications.savedLocations')}
            </p>
            <p className="text-slate-600 text-[10px] mt-0.5">{t('notifications.locationsProtectedNote')}</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddForm((v) => !v); setAddError(''); }}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-lg"
          >
            <Plus size={13} weight="bold" />
            {t('notifications.addLocation')}
          </button>
        </div>

        {/* Add location form */}
        {showAddForm && (
          <div className="mb-3 bg-slate-900/60 rounded-xl p-3 space-y-3 border border-slate-700/40">

            {/* Mode pills: GPS vs Address */}
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setAddMode('gps')}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  addMode === 'gps'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                }`}
              >
                {t('notifications.useCurrentLocation')}
              </button>
              <button
                type="button"
                onClick={() => setAddMode('address')}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  addMode === 'address'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                }`}
              >
                {t('notifications.searchAddress')}
              </button>
            </div>

            {/* Label */}
            <label htmlFor="notification-location-label" className="sr-only">
              {t('notifications.locationLabel')}
            </label>
            <input
              id="notification-location-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={t('notifications.locationLabel')}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            />

            {/* Address search input */}
            {addMode === 'address' && (
              <div className="relative">
                <label htmlFor="notification-address-search" className="sr-only">
                  {t('notifications.searchAddress')}
                </label>
                <MagnifyingGlass
                  size={14}
                  weight="bold"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="notification-address-search"
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddByAddress(); }}
                  placeholder={t('notifications.searchPlaceholder')}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white text-sm placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                />
              </div>
            )}

            {/* Radius slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-xs">{t('notifications.radius')}</span>
                <span className="text-amber-400 text-xs font-bold">{newRadius} mi</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.5"
                value={newRadius}
                onChange={(e) => setNewRadius(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {addError && <p className="text-red-400 text-xs">{addError}</p>}

            {/* Cancel / Add buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetAddForm}
                className="flex-1 text-xs font-bold py-2 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                {t('notifications.cancel')}
              </button>
              {addMode === 'gps' ? (
                <button
                  type="button"
                  onClick={handleAddByGPS}
                  disabled={!newLabel.trim() || acquiring}
                  className="flex-1 text-xs font-bold py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {acquiring ? t('notifications.acquiring') : t('notifications.useCurrentLocation')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddByAddress}
                  disabled={!newLabel.trim() || !addressQuery.trim() || searching}
                  className="flex-1 text-xs font-bold py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  {searching ? t('notifications.searching') : t('notifications.addLocation')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Saved locations list */}
        {savedLocations.length === 0 ? (
          <p className="text-slate-600 text-xs text-center py-2">{t('notifications.noLocations')}</p>
        ) : (
          <div className="space-y-2">
            {savedLocations.map((loc) => (
              <div
                key={loc.id}
                className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin size={14} weight="bold" className="text-amber-400 shrink-0" />
                    <span className="text-white text-sm font-semibold truncate">{loc.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(loc.id)}
                    aria-label={`Remove ${loc.label}`}
                    className="p-1 text-slate-600 hover:text-red-400 transition-colors shrink-0 ml-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">{t('notifications.radius')}</span>
                  <span className="text-amber-400 text-xs font-bold">{loc.radiusMiles} mi</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={loc.radiusMiles}
                  onChange={(e) => handleRadiusChange(loc.id, parseFloat(e.target.value))}
                  className="w-full mt-1 accent-amber-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear Location Data */}
      <div className="border-t border-slate-700/60 pt-4">
        <div className="flex items-start gap-2 mb-3">
          <Warning size={14} weight="bold" className="text-slate-500 mt-0.5 shrink-0" />
          <p className="text-slate-500 text-xs">{t('notifications.clearDataDesc')}</p>
        </div>
        <button
          type="button"
          onClick={handleClearData}
          className="w-full text-xs font-bold py-2.5 rounded-lg bg-slate-800 border border-red-900/40 text-red-400 hover:bg-red-900/20 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {t('notifications.clearData')}
        </button>
        {clearStatus && (
          <p aria-live="polite" className="text-emerald-400 text-xs font-semibold text-center mt-2">{clearStatus}</p>
        )}
      </div>
    </div>
  );
}

export default NotificationSettings;
