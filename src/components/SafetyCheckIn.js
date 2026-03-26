// src/components/SafetyCheckIn.js
// Safety Check-In Timer — if the user doesn't check in before expiry,
// an alert is auto-composed to trusted contacts with last known location.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  X, Timer, CheckCircle, WarningCircle, PaperPlaneTilt,
  Plus, Stop, UserCircle,
} from '@phosphor-icons/react';
import { getTrustedContacts } from '../utils/backup/accessGrants';
import { acquireLocation, reverseGeocode, buildLocationSmsUri, getLastKnownLocation } from '../utils/locationShare';

const DURATIONS = [
  { minutes: 15, key: 'duration15' },
  { minutes: 30, key: 'duration30' },
  { minutes: 60, key: 'duration60' },
  { minutes: 120, key: 'duration120' },
];

const CHECKIN_STORAGE_KEY = 'safeneighbor_checkin_timer';

// ─── Timer Display ──────────────────────────────────────────
const TimerCircle = ({ remaining, total }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? remaining / total : 0;
  const offset = circumference * (1 - progress);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        {/* Background circle */}
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#1e293b" strokeWidth="6" />
        {/* Progress circle */}
        <circle
          cx="80" cy="80" r={radius} fill="none"
          stroke={remaining < 60 ? '#ef4444' : remaining < 300 ? '#f59e0b' : '#10b981'}
          strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-mono font-bold ${remaining < 60 ? 'text-red-400' : 'text-white'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <span className="text-slate-500 text-xs mt-1">{remaining < 60 ? 'EXPIRING' : 'REMAINING'}</span>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────
const SafetyCheckIn = ({ isOpen, onClose, onOpenTrustedContacts }) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('setup'); // setup | active | expired
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [remaining, setRemaining] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [alertSent, setAlertSent] = useState(false);
  const [allClearSent, setAllClearSent] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [contacts, setContacts] = useState([]);
  const timerRef = useRef(null);
  const endTimeRef = useRef(null);

  useEffect(() => {
    (async () => {
      setContacts((await getTrustedContacts()).filter(c => c.phone));
    })();
  }, []);
  const userName = localStorage.getItem('safeneighbor_user_name') || t('safetyCheckIn.anonymousUser');

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Restore timer on re-open if one was running
  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = sessionStorage.getItem(CHECKIN_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const endTime = new Date(data.endTime).getTime();
        const now = Date.now();
        if (endTime > now) {
          endTimeRef.current = endTime;
          setTotalDuration(data.duration * 60);
          setRemaining(Math.ceil((endTime - now) / 1000));
          setPhase('active');
        } else {
          // Timer expired while away
          setPhase('expired');
          setTotalDuration(data.duration * 60);
          setRemaining(0);
        }
      }
    } catch { /* ignore */ }
  }, [isOpen]);

  // Countdown tick
  useEffect(() => {
    if (phase !== 'active') return;
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const end = endTimeRef.current;
      const diff = Math.max(0, Math.ceil((end - now) / 1000));
      setRemaining(diff);
      if (diff <= 0) {
        clearInterval(timerRef.current);
        setPhase('expired');
        sessionStorage.removeItem(CHECKIN_STORAGE_KEY);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Acquire location on timer start and each check-in
  const captureLocation = useCallback(async () => {
    try {
      const pos = await Promise.race([
        acquireLocation(),
        new Promise((_, rej) => setTimeout(rej, 5000)),
      ]);
      const geo = await reverseGeocode(pos.lat, pos.lng).catch(() => ({}));
      const loc = { lat: pos.lat, lng: pos.lng, address: geo.address || '' };
      setLastLocation(loc);
      return loc;
    } catch {
      const fallback = await getLastKnownLocation();
      if (fallback) setLastLocation(fallback);
      return fallback;
    }
  }, []);

  // ── Actions ─────────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (contacts.length === 0) return;
    const durationSec = selectedDuration * 60;
    const endTime = Date.now() + durationSec * 1000;
    endTimeRef.current = endTime;
    setTotalDuration(durationSec);
    setRemaining(durationSec);
    setPhase('active');
    setAlertSent(false);
    setAllClearSent(false);
    sessionStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify({
      endTime: new Date(endTime).toISOString(),
      duration: selectedDuration,
      startedAt: new Date().toISOString(),
    }));
    captureLocation();
  }, [selectedDuration, contacts.length, captureLocation]);

  const handleCheckIn = useCallback(() => {
    const durationSec = totalDuration;
    const endTime = Date.now() + durationSec;
    endTimeRef.current = endTime;
    setRemaining(Math.ceil(durationSec / 1000));
    sessionStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify({
      endTime: new Date(endTime).toISOString(),
      duration: totalDuration / 60,
      startedAt: new Date().toISOString(),
    }));
    captureLocation();
  }, [totalDuration, captureLocation]);

  const handleExtend = useCallback(() => {
    const extraMs = 15 * 60 * 1000;
    endTimeRef.current = (endTimeRef.current || Date.now()) + extraMs;
    const newRemaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
    setRemaining(newRemaining);
    setTotalDuration((prev) => prev + 15 * 60);
    const stored = sessionStorage.getItem(CHECKIN_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      data.endTime = new Date(endTimeRef.current).toISOString();
      data.duration = (data.duration || 0) + 15;
      sessionStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(data));
    }
  }, []);

  const handleStop = useCallback(() => {
    clearInterval(timerRef.current);
    sessionStorage.removeItem(CHECKIN_STORAGE_KEY);
    setPhase('setup');
    setRemaining(0);
  }, []);

  const handleSendAlert = useCallback(async () => {
    const loc = lastLocation || await captureLocation();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let locationText = t('safetyCheckIn.locationUnavailable');
    if (loc) {
      locationText = `${loc.address || ''}\nGPS: ${loc.lat}, ${loc.lng}\nhttps://maps.google.com/maps?q=${loc.lat},${loc.lng}`;
    }
    const message = t('safetyCheckIn.alertMessage', {
      userName,
      time,
      location: locationText,
      goodCallNumber: '1-855-274-0205',
    });
    const uri = buildLocationSmsUri(contacts, message);
    window.open(uri, '_self');
    setAlertSent(true);
  }, [lastLocation, captureLocation, contacts, userName, t]);

  const handleSendAllClear = useCallback(() => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = t('safetyCheckIn.allClearMessage', { userName, time });
    const uri = buildLocationSmsUri(contacts, message);
    window.open(uri, '_self');
    setAllClearSent(true);
  }, [contacts, userName, t]);

  const handleClose = useCallback(() => {
    if (phase === 'active') {
      // Don't close if timer is active — keep it running
      onClose();
      return;
    }
    if (phase === 'expired' && !alertSent) {
      // Warn before closing without sending alert
      if (!window.confirm(t('safetyCheckIn.closeWithoutAlert'))) return;
    }
    setPhase('setup');
    setRemaining(0);
    setAlertSent(false);
    setAllClearSent(false);
    sessionStorage.removeItem(CHECKIN_STORAGE_KEY);
    onClose();
  }, [phase, alertSent, onClose, t]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl w-full max-w-md max-h-[88vh] overflow-hidden border border-slate-700/50 flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50 shrink-0">
              <div className="flex items-center gap-2">
                <Timer size={20} weight="bold" className={phase === 'expired' ? 'text-red-400' : 'text-emerald-400'} />
                <h2 className="text-lg font-bold text-white">{t('safetyCheckIn.title')}</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

              {/* ── SETUP PHASE ── */}
              {phase === 'setup' && (
                <>
                  <p className="text-slate-400 text-sm text-center">
                    {t('safetyCheckIn.subtitle')}
                  </p>

                  {/* Duration picker */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">
                      {t('safetyCheckIn.duration')}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {DURATIONS.map((d) => (
                        <button
                          key={d.minutes}
                          onClick={() => setSelectedDuration(d.minutes)}
                          className={`py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                            selectedDuration === d.minutes
                              ? 'bg-emerald-600 text-white border border-emerald-500'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {t(`safetyCheckIn.${d.key}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contacts preview */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">
                      {t('safetyCheckIn.alertContacts')} ({contacts.length})
                    </label>
                    {contacts.length > 0 ? (
                      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 max-h-32 overflow-y-auto">
                        {contacts.map((c) => (
                          <div key={c.id} className="flex items-center gap-2 py-2 border-b border-slate-700/50 last:border-0">
                            <UserCircle size={16} weight="bold" className="text-slate-500 shrink-0" />
                            <span className="text-white text-sm truncate">{c.name}</span>
                            <span className="text-slate-500 text-xs ml-auto shrink-0">{c.phone}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center space-y-2">
                        <p className="text-red-400 text-sm">{t('safetyCheckIn.noContacts')}</p>
                        {onOpenTrustedContacts && (
                          <button
                            onClick={onOpenTrustedContacts}
                            className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors"
                          >
                            <UserCircle size={14} weight="bold" />
                            {t('safetyCheckIn.setupContacts')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info note */}
                  <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <WarningCircle size={16} weight="bold" className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {t('safetyCheckIn.keepAppOpen')}
                    </p>
                  </div>

                  {/* Start button */}
                  <button
                    onClick={handleStart}
                    disabled={contacts.length === 0}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-95"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Timer size={18} weight="bold" />
                      {t('safetyCheckIn.start')}
                    </div>
                  </button>
                </>
              )}

              {/* ── ACTIVE PHASE ── */}
              {phase === 'active' && (
                <>
                  <TimerCircle remaining={remaining} total={totalDuration} />

                  <p className="text-slate-500 text-xs text-center">
                    {t('safetyCheckIn.alertingAt', {
                      count: contacts.length,
                      time: endTimeRef.current
                        ? new Date(endTimeRef.current).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '',
                    })}
                  </p>

                  {/* Check In button */}
                  <button
                    onClick={handleCheckIn}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-95"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle size={20} weight="bold" />
                      {t('safetyCheckIn.checkIn')}
                    </div>
                  </button>

                  {/* Extend + Stop row */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExtend}
                      className="flex items-center justify-center gap-1.5 bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 text-amber-400 font-bold py-2.5 px-4 rounded-xl transition-colors active:scale-95 text-sm"
                    >
                      <Plus size={14} weight="bold" />
                      {t('safetyCheckIn.extend')}
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex items-center justify-center gap-1.5 bg-slate-700/60 border border-slate-600/50 hover:bg-slate-600 text-slate-300 font-bold py-2.5 px-4 rounded-xl transition-colors active:scale-95 text-sm"
                    >
                      <Stop size={14} weight="bold" />
                      {t('safetyCheckIn.stop')}
                    </button>
                  </div>
                </>
              )}

              {/* ── EXPIRED PHASE ── */}
              {phase === 'expired' && (
                <>
                  <div className="text-center py-4">
                    <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                      <WarningCircle size={40} weight="bold" className="text-red-400" />
                    </div>
                    <h3 className="text-red-400 font-bold text-lg">{t('safetyCheckIn.expired')}</h3>
                  </div>

                  {!alertSent ? (
                    <button
                      onClick={handleSendAlert}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-900/30 active:scale-95"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <PaperPlaneTilt size={18} weight="bold" />
                        {t('safetyCheckIn.sendAlert', { count: contacts.length })}
                      </div>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
                        <p className="text-red-400 text-sm font-bold">
                          {t('safetyCheckIn.alertSent', { count: contacts.length })}
                        </p>
                      </div>

                      {!allClearSent && (
                        <button
                          onClick={handleSendAllClear}
                          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle size={18} weight="bold" />
                            {t('safetyCheckIn.sendAllClear')}
                          </div>
                        </button>
                      )}

                      {allClearSent && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
                          <p className="text-emerald-400 text-sm font-bold">
                            {t('safetyCheckIn.allClearConfirm')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => { handleStop(); setPhase('setup'); }}
                    className="w-full text-slate-400 hover:text-white text-sm font-medium py-2 transition-colors"
                  >
                    {t('safetyCheckIn.resetTimer')}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SafetyCheckIn;
