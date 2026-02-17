// src/components/EncounterLog.js
// Quick-tap encounter journal with timestamped events, GPS, and shareable reports

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  NotePencil,
  Play,
  Stop,
  ShareNetwork,
  EnvelopeSimple,
  CopySimple,
  Printer,
  Trash,
  Clock,
  MapPin,
  CaretDown,
  CaretUp,
  PaperPlaneTilt,
  CloudCheck,
  CloudArrowUp,
  CloudSlash,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { acquireLocation, reverseGeocode, buildLocationSmsUri } from '../utils/locationShare';
import { getTrustedContacts } from '../utils/backup/accessGrants';
import { generateEncounterReport } from '../utils/encounterLogDocument';
import { useEncounterSync } from '../hooks/useEncounterSync';
import Disclaimer from './Disclaimer';

const STORAGE_KEY = 'safeneighbor_encounter_logs';
const MAX_LOGS = 20;

// EVENT_CATEGORIES is defined inside the component to access t()

const CATEGORY_COLORS = {
  red: {
    bg: 'bg-red-950/40',
    border: 'border-red-700/40',
    text: 'text-red-400',
    btn: 'bg-red-900/60 border-red-700/50 text-red-300 hover:bg-red-800/70 active:scale-95',
    badge: 'bg-red-900/50 text-red-400',
  },
  blue: {
    bg: 'bg-blue-950/40',
    border: 'border-blue-700/40',
    text: 'text-blue-400',
    btn: 'bg-blue-900/60 border-blue-700/50 text-blue-300 hover:bg-blue-800/70 active:scale-95',
    badge: 'bg-blue-900/50 text-blue-400',
  },
  amber: {
    bg: 'bg-amber-950/40',
    border: 'border-amber-700/40',
    text: 'text-amber-400',
    btn: 'bg-amber-900/60 border-amber-700/50 text-amber-300 hover:bg-amber-800/70 active:scale-95',
    badge: 'bg-amber-900/50 text-amber-400',
  },
  slate: {
    bg: 'bg-slate-800/40',
    border: 'border-slate-600/40',
    text: 'text-slate-400',
    btn: 'bg-slate-700/60 border-slate-600/50 text-slate-300 hover:bg-slate-600/70 active:scale-95',
    badge: 'bg-slate-700/50 text-slate-400',
  },
};

// Umami analytics helper
const track = (event, data) => {
  if (window.umami) window.umami.track(event, data);
};

// ── Persistence helpers ─────────────────────────────────
const loadLogs = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLogs = (logs) => {
  try {
    // Prune to max
    const pruned = logs.slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
};

// ── Component ───────────────────────────────────────────

const EncounterLog = ({ onBack, autoStart, afterMode = false, onOpenBackupSettings }) => {
  const { t } = useTranslation();

  // Quick-tap event categories (inside component for t() access)
  const EVENT_CATEGORIES = useMemo(() => [
    {
      id: 'door',
      label: t('encounterLog.categoryDoor'),
      color: 'red',
      events: [
        t('encounterLog.eventAgentsAtDoor'),
        t('encounterLog.eventKnockedAnnounced'),
        t('encounterLog.eventAskedForWarrant'),
        t('encounterLog.eventShowedWarrant'),
        t('encounterLog.eventForcedEntry'),
      ],
    },
    {
      id: 'response',
      label: t('encounterLog.categoryResponse'),
      color: 'blue',
      events: [
        t('encounterLog.eventDeclinedToOpenDoor'),
        t('encounterLog.eventAskedForWarrantResponse'),
        t('encounterLog.eventStatedRightToSilence'),
        t('encounterLog.eventRequestedAttorney'),
        t('encounterLog.eventShowedId'),
      ],
    },
    {
      id: 'escalation',
      label: t('encounterLog.categoryEscalation'),
      color: 'amber',
      events: [
        t('encounterLog.eventDetainedHandcuffed'),
        t('encounterLog.eventPersonSearched'),
        t('encounterLog.eventPropertySearched'),
        t('encounterLog.eventThreatsMade'),
        t('encounterLog.eventPhysicalForce'),
      ],
    },
    {
      id: 'details',
      label: t('encounterLog.categoryDetails'),
      color: 'slate',
      events: [
        t('encounterLog.eventVehicleDescription'),
        t('encounterLog.eventBadgeNumberName'),
        t('encounterLog.eventWitnessPresent'),
        t('encounterLog.eventRecordingStarted'),
        t('encounterLog.eventCustomNote'),
      ],
    },
  ], [t]);

  const [logs, setLogs] = useState(loadLogs);
  const [activeLog, setActiveLog] = useState(null);
  const [resumeCandidate, setResumeCandidate] = useState(() => {
    // Check for an unfinished log matching the current mode
    const stored = loadLogs();
    return stored.find((l) => !l.endedAt && (afterMode ? l.afterTheFact : !l.afterTheFact)) || null;
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLog, setShareLog] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [detailNoteFor, setDetailNoteFor] = useState(null);
  const [detailNoteText, setDetailNoteText] = useState('');

  // After-mode date/time state (defaults to now)
  const [afterDate, setAfterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [afterTime, setAfterTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [isStarting, setIsStarting] = useState(false);
  const [showPastLogs, setShowPastLogs] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);

  const saveTimerRef = useRef(null);
  const detailInputRef = useRef(null);
  const autoStarted = useRef(false);

  // Cloud backup sync hook
  const {
    syncStatus,
    isBackupConfigured,
    autoBackup,
    setAutoBackup,
    backUpLog,
    deleteRemoteLog,
  } = useEncounterSync(activeLog, logs);

  // Debounced auto-save
  const save = useCallback((allLogs) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveLogs(allLogs);
    }, 500);
  }, []);

  // Sync active log back into logs array and save
  useEffect(() => {
    if (!activeLog) return;
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.id === activeLog.id);
      const updated = idx >= 0
        ? prev.map((l, i) => (i === idx ? activeLog : l))
        : [activeLog, ...prev];
      save(updated);
      return updated;
    });
  }, [activeLog, save]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // Running timer (only in "now" mode)
  useEffect(() => {
    if (!activeLog || activeLog.endedAt || activeLog.afterTheFact) return;
    const update = () => {
      const ms = Date.now() - new Date(activeLog.startedAt).getTime();
      const totalSec = Math.floor(ms / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      setElapsedTime(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeLog?.startedAt, activeLog?.endedAt, activeLog?.afterTheFact]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start encounter when launched from emergency panel (Now mode only)
  useEffect(() => {
    if (autoStart && !afterMode && !activeLog && !resumeCandidate && !autoStarted.current) {
      autoStarted.current = true;
      handleStartEncounter(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, afterMode, resumeCandidate]);

  // Focus detail input when opened
  useEffect(() => {
    if (detailNoteFor && detailInputRef.current) {
      detailInputRef.current.focus();
    }
  }, [detailNoteFor]);

  // ── Resume / New handlers ──────────────────────────────

  const handleResumeLog = () => {
    if (resumeCandidate) {
      setActiveLog(resumeCandidate);
      setResumeCandidate(null);
    }
  };

  const handleNewLog = () => {
    if (resumeCandidate) {
      // End the old log so it moves to past logs
      const ended = { ...resumeCandidate, endedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setLogs((prev) => {
        const idx = prev.findIndex((l) => l.id === ended.id);
        const updated = idx >= 0 ? prev.map((l, i) => (i === idx ? ended : l)) : [ended, ...prev];
        saveLogs(updated);
        return updated;
      });
    }
    setResumeCandidate(null);
  };

  // ── Actions ─────────────────────────────────────────────

  const handleStartEncounter = async (useAfterMode = false) => {
    setIsStarting(true);
    let location = null;

    try {
      const pos = await acquireLocation();
      const geo = await reverseGeocode(pos.lat, pos.lng);
      location = {
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        address: geo.address,
      };
    } catch {
      // GPS failed — proceed without location
    }

    // In after mode, use the user-entered date/time; otherwise use now
    let startedAt;
    if (useAfterMode && afterDate && afterTime) {
      startedAt = new Date(`${afterDate}T${afterTime}`).toISOString();
    } else {
      startedAt = new Date().toISOString();
    }

    const now = new Date().toISOString();
    const newLog = {
      id: `enc_${Date.now()}`,
      startedAt,
      endedAt: null,
      location,
      events: [],
      notes: '',
      updatedAt: now,
      ...(useAfterMode && { afterTheFact: true }),
    };

    setActiveLog(newLog);
    setIsStarting(false);
    track('encounter_log', { action: 'start', mode: useAfterMode ? 'after' : 'now' });
  };

  const handleEndEncounter = () => {
    if (!activeLog) return;
    setActiveLog((prev) => ({
      ...prev,
      endedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    track('encounter_log', { action: 'end', events: activeLog.events.length });
  };

  const handleAddEvent = (category, label) => {
    if (!activeLog) return;
    const isDetailCategory = category === 'details';

    // For detail events, open a note input instead of immediately logging
    if (isDetailCategory) {
      setDetailNoteFor({ category, label });
      setDetailNoteText('');
      return;
    }

    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      category,
      label,
      note: '',
      location: null,
    };

    setActiveLog((prev) => ({
      ...prev,
      events: [...prev.events, event],
      updatedAt: new Date().toISOString(),
    }));

    track('encounter_log_event', { category, label });
  };

  const handleSubmitDetailNote = () => {
    if (!activeLog || !detailNoteFor) return;

    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      category: detailNoteFor.category,
      label: detailNoteFor.label,
      note: detailNoteText.trim(),
      location: null,
    };

    setActiveLog((prev) => ({
      ...prev,
      events: [...prev.events, event],
      updatedAt: new Date().toISOString(),
    }));

    track('encounter_log_event', { category: detailNoteFor.category, label: detailNoteFor.label });
    setDetailNoteFor(null);
    setDetailNoteText('');
  };

  const handleUpdateEventTime = (eventId, field, value) => {
    if (!activeLog) return;
    setActiveLog((prev) => {
      const updatedEvents = prev.events.map((evt) => {
        if (evt.id !== eventId) return evt;
        const current = new Date(evt.timestamp);
        if (field === 'date') {
          const [y, m, d] = value.split('-').map(Number);
          current.setFullYear(y, m - 1, d);
        } else if (field === 'time') {
          const [h, min] = value.split(':').map(Number);
          current.setHours(h, min, 0, 0);
        }
        return { ...evt, timestamp: current.toISOString() };
      });
      return { ...prev, events: updatedEvents, updatedAt: new Date().toISOString() };
    });
  };

  // Scroll wheel handler for date/time inputs — increment/decrement on wheel
  const handleWheelTime = (e, eventId, field) => {
    e.preventDefault();
    if (!activeLog) return;
    const delta = e.deltaY < 0 ? 1 : -1; // scroll up = increase
    setActiveLog((prev) => {
      const updatedEvents = prev.events.map((evt) => {
        if (evt.id !== eventId) return evt;
        const current = new Date(evt.timestamp);
        if (field === 'date') {
          current.setDate(current.getDate() + delta);
        } else if (field === 'time') {
          current.setMinutes(current.getMinutes() + delta);
        }
        return { ...evt, timestamp: current.toISOString() };
      });
      return { ...prev, events: updatedEvents, updatedAt: new Date().toISOString() };
    });
  };

  const handleUpdateNotes = (text) => {
    if (!activeLog) return;
    setActiveLog((prev) => ({
      ...prev,
      notes: text,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteLog = (logId) => {
    setLogs((prev) => {
      const updated = prev.filter((l) => l.id !== logId);
      saveLogs(updated);
      return updated;
    });
    if (activeLog?.id === logId) setActiveLog(null);
    setDeleteConfirm(null);
    // Clean up cloud copy
    deleteRemoteLog(logId);
  };

  const handleClearAllLogs = () => {
    setLogs([]);
    setActiveLog(null);
    setResumeCandidate(null);
    saveLogs([]);
    setClearAllConfirm(false);
  };

  // ── Share handlers ──────────────────────────────────────

  const openShare = (log) => {
    setShareLog(log);
    setShowShareModal(true);
  };

  const getReport = () => (shareLog ? generateEncounterReport(shareLog) : '');

  const handleEmail = () => {
    const report = getReport();
    const date = new Date(shareLog.startedAt).toLocaleDateString();
    const mailto = `mailto:?subject=${encodeURIComponent(`${t('encounterLog.title')} \u2014 ${date}`)}&body=${encodeURIComponent(report)}`;
    track('encounter_log_share', { method: 'email' });
    window.location.href = mailto;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getReport()).then(() => {
      setCopied(true);
      track('encounter_log_share', { method: 'clipboard' });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      alert(t('encounterLog.unableToCopy'));
    });
  };

  const handleWebShare = () => {
    if (navigator.share) {
      track('encounter_log_share', { method: 'web_share' });
      navigator.share({ title: t('encounterLog.title'), text: getReport() }).catch(() => {});
    }
  };

  const handlePrint = () => {
    const report = getReport();
    track('encounter_log_share', { method: 'print' });
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<pre style="font-family:monospace;white-space:pre-wrap;max-width:700px;margin:auto;padding:24px;font-size:13px;">${report.replace(/</g, '&lt;')}</pre>`);
      w.document.close();
      w.print();
    }
  };

  const handleSendToContacts = () => {
    if (!shareLog) return;
    const contacts = getTrustedContacts();
    if (!contacts.length) {
      alert(t('encounterLog.noTrustedContacts'));
      return;
    }
    const report = generateEncounterReport(shareLog);
    track('encounter_log_share', { method: 'sms' });
    window.location.href = buildLocationSmsUri(contacts, report);
  };

  // ── Timeline formatting ─────────────────────────────────

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

  const formatRelative = (iso) => {
    if (!activeLog) return '';
    const diff = new Date(iso).getTime() - new Date(activeLog.startedAt).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `+${sec}s`;
    const min = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `+${min}m${remSec > 0 ? ` ${remSec}s` : ''}`;
  };

  const categoryLabel = (cat) => {
    const found = EVENT_CATEGORIES.find((c) => c.id === cat);
    return found ? found.label.toUpperCase() : cat.toUpperCase();
  };

  // ── Render ──────────────────────────────────────────────

  const completedLogs = logs.filter((l) => l.endedAt && l.id !== activeLog?.id);

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Header */}
      <div className="pt-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={20} weight="bold" className="rtl:scale-x-[-1]" />
          <span className="text-sm font-medium">{t('encounterLog.back')}</span>
        </button>
        <div className="flex items-center gap-3 mb-2">
          <NotePencil size={36} weight="bold" className="text-amber-400" />
          <h1 className="text-3xl font-black text-white tracking-wide">{t('encounterLog.title')}</h1>
        </div>
        <p className="text-slate-400 text-sm">
          {afterMode
            ? t('encounterLog.subtitleAfter')
            : t('encounterLog.subtitleNow')}
        </p>

        {/* Cloud backup toggle / setup link */}
        {isBackupConfigured ? (
          <>
            <div className="flex items-center justify-between mt-3 bg-slate-900/50 border border-slate-700/30 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <CloudArrowUp size={16} weight="bold" className="text-blue-400" />
                <span className="text-slate-400 text-xs font-medium">{t('encounterLog.autoBackupLogs')}</span>
              </div>
              <button
                onClick={() => setAutoBackup(!autoBackup)}
                className={`relative w-9 h-5 rounded-full transition-colors ${autoBackup ? 'bg-blue-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoBackup ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            {/* Active log sync status */}
            {activeLog && (() => {
              const s = syncStatus[activeLog.id];
              if (!s) return null;
              if (s.status === 'synced') return (
                <div className="flex items-center gap-1.5 mt-2 ms-1">
                  <CloudCheck size={14} weight="bold" className="text-green-500" />
                  <span className="text-green-500 text-xs font-medium">{t('encounterLog.backedUpToCloud')}</span>
                </div>
              );
              if (s.status === 'syncing') return (
                <div className="flex items-center gap-1.5 mt-2 ms-1">
                  <CloudArrowUp size={14} weight="bold" className="text-blue-400 animate-pulse" />
                  <span className="text-blue-400 text-xs font-medium animate-pulse">{t('encounterLog.syncing')}</span>
                </div>
              );
              if (s.status === 'error') return (
                <div className="flex items-center gap-1.5 mt-2 ms-1">
                  <CloudSlash size={14} weight="bold" className="text-amber-500" />
                  <span className="text-amber-500 text-xs font-medium">{t('encounterLog.syncFailed')}</span>
                </div>
              );
              if (s.status === 'pending') return (
                <div className="flex items-center gap-1.5 mt-2 ms-1">
                  <CloudArrowUp size={14} weight="bold" className="text-slate-500" />
                  <span className="text-slate-500 text-xs font-medium">{t('encounterLog.pendingUnlockPin')}</span>
                </div>
              );
              return null;
            })()}
          </>
        ) : (
          <button
            onClick={onOpenBackupSettings}
            className="flex items-center gap-1.5 mt-3 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
          >
            <ArrowSquareOut size={14} weight="bold" />
            {t('encounterLog.setupCloudBackup')}
          </button>
        )}
      </div>

      {/* Resume or New prompt */}
      {resumeCandidate && !activeLog && (
        <div className="mb-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-amber-700/30 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">
            {t('encounterLog.unfinishedLogFound')}
          </h3>
          <p className="text-slate-400 text-sm mb-1">
            {new Date(resumeCandidate.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {formatTime(resumeCandidate.startedAt)}
          </p>
          <p className="text-slate-500 text-xs mb-4">
            {t('encounterLog.eventsLogged', { count: resumeCandidate.events.length })}
            {resumeCandidate.location?.address ? ` — ${resumeCandidate.location.address}` : ''}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleResumeLog}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95 uppercase tracking-wider text-sm"
            >
              {t('encounterLog.resume')}
            </button>
            <button
              onClick={handleNewLog}
              className="flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95 uppercase tracking-wider text-sm"
            >
              {t('encounterLog.newLog')}
            </button>
          </div>
        </div>
      )}

      {/* No Active Encounter — Start Button */}
      {!activeLog && !resumeCandidate && (
        <div className="mb-8">
          {afterMode ? (
            /* After mode — date/time picker */
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                {t('encounterLog.whenDidThisHappen')}
              </h3>
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">{t('encounterLog.dateLabel')}</label>
                  <input
                    type="date"
                    value={afterDate}
                    onChange={(e) => setAfterDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm text-center focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">{t('encounterLog.timeLabel')}</label>
                  <input
                    type="time"
                    value={afterTime}
                    onChange={(e) => setAfterTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm text-center focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
              <button
                onClick={() => handleStartEncounter(true)}
                disabled={isStarting}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black py-4 px-6 rounded-xl transition-all shadow-lg shadow-amber-900/30 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-wider disabled:opacity-60"
              >
                {isStarting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('encounterLog.starting')}</span>
                  </>
                ) : (
                  <>
                    <Clock size={24} weight="bold" />
                    <span>{t('encounterLog.startLogging')}</span>
                  </>
                )}
              </button>
              <p className="text-slate-500 text-xs text-center mt-2">
                {t('encounterLog.logFromMemory')}
              </p>
            </div>
          ) : (
            /* Now mode — immediate start */
            <>
              <button
                onClick={() => handleStartEncounter(false)}
                disabled={isStarting}
                className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black py-5 px-6 rounded-2xl transition-all shadow-lg shadow-red-900/40 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-wider disabled:opacity-60"
              >
                {isStarting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('encounterLog.acquiringGps')}</span>
                  </>
                ) : (
                  <>
                    <Play size={24} weight="bold" />
                    <span>{t('encounterLog.startNewEncounter')}</span>
                  </>
                )}
              </button>
              <p className="text-slate-500 text-xs text-center mt-2">
                {t('encounterLog.capturesGps')}
              </p>
            </>
          )}
        </div>
      )}

      {/* Active Encounter */}
      {activeLog && (
        <>
          {/* Active indicator + timer */}
          <div className={`mb-4 bg-gradient-to-r ${activeLog.afterTheFact ? 'from-amber-950/50' : 'from-red-950/50'} to-slate-900/50 border ${activeLog.afterTheFact ? 'border-amber-700/40' : 'border-red-700/40'} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {!activeLog.endedAt && !activeLog.afterTheFact && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${activeLog.endedAt ? 'bg-slate-500' : activeLog.afterTheFact ? 'bg-amber-500' : 'bg-red-500'}`} />
                </span>
                <span className={`font-bold text-sm uppercase tracking-wider ${activeLog.endedAt ? 'text-slate-400' : activeLog.afterTheFact ? 'text-amber-400' : 'text-red-400'}`}>
                  {activeLog.endedAt
                    ? (activeLog.afterTheFact ? t('encounterLog.logComplete') : t('encounterLog.encounterEnded'))
                    : activeLog.afterTheFact ? t('encounterLog.loggingAfterTheFact') : t('encounterLog.recording')}
                </span>
              </div>
              {!activeLog.afterTheFact && (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock size={14} weight="bold" />
                  <span className="text-sm font-mono font-bold">{elapsedTime}</span>
                </div>
              )}
            </div>
            {activeLog.location && (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <MapPin size={12} weight="bold" />
                <span>{activeLog.location.address || `${activeLog.location.lat.toFixed(5)}, ${activeLog.location.lng.toFixed(5)}`}</span>
              </div>
            )}
            <div className="text-slate-600 text-xs mt-1">
              {activeLog.afterTheFact ? t('encounterLog.encounterDate') : t('encounterLog.started')}: {new Date(activeLog.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {formatTime(activeLog.startedAt)}
            </div>
          </div>

          {/* Quick-tap event grid */}
          {!activeLog.endedAt && (
            <div className="space-y-3 mb-6">
              {EVENT_CATEGORIES.map((cat) => {
                const colors = CATEGORY_COLORS[cat.color];
                const isExpanded = expandedCategory === cat.id;
                return (
                  <div key={cat.id} className={`${colors.bg} border ${colors.border} rounded-xl overflow-hidden`}>
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                      className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                    >
                      <span className={`font-bold text-sm uppercase tracking-wider ${colors.text}`}>
                        {cat.label}
                      </span>
                      {isExpanded
                        ? <CaretUp size={16} weight="bold" className={colors.text} />
                        : <CaretDown size={16} weight="bold" className={colors.text} />
                      }
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-2 gap-2">
                          {cat.events.map((eventLabel) => (
                            <button
                              key={eventLabel}
                              onClick={() => handleAddEvent(cat.id, eventLabel)}
                              className={`${colors.btn} border font-semibold text-xs py-2.5 px-3 rounded-lg transition-all text-start`}
                            >
                              {eventLabel}
                            </button>
                          ))}
                        </div>
                        {/* Detail note input */}
                        {detailNoteFor && detailNoteFor.category === cat.id && (
                          <div className="mt-2 flex gap-2">
                            <input
                              ref={detailInputRef}
                              type="text"
                              value={detailNoteText}
                              onChange={(e) => setDetailNoteText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitDetailNote(); }}
                              placeholder={t('encounterLog.enterDetail', { label: detailNoteFor.label.toLowerCase() })}
                              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                            />
                            <button
                              onClick={handleSubmitDetailNote}
                              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm active:scale-95"
                            >
                              {t('encounterLog.add')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* General notes */}
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
              {t('encounterLog.generalNotes')}
            </label>
            <textarea
              value={activeLog.notes}
              onChange={(e) => handleUpdateNotes(e.target.value)}
              placeholder={t('encounterLog.notesPlaceholder')}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          {/* Event timeline */}
          {activeLog.events.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                {t('encounterLog.timelineCount', { count: activeLog.events.length })}
              </h3>
              <div className="space-y-2">
                {[...activeLog.events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((event) => {
                  const cat = EVENT_CATEGORIES.find((c) => c.id === event.category);
                  const colors = cat ? CATEGORY_COLORS[cat.color] : CATEGORY_COLORS.slate;
                  const evtDate = new Date(event.timestamp);
                  return (
                    <div
                      key={event.id}
                      className="bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2.5 flex items-start gap-3"
                    >
                      {activeLog.afterTheFact ? (
                        <div className="shrink-0">
                          <div className="flex gap-1.5">
                            <input
                              type="date"
                              value={evtDate.getFullYear() + '-' + String(evtDate.getMonth() + 1).padStart(2, '0') + '-' + String(evtDate.getDate()).padStart(2, '0')}
                              onChange={(e) => handleUpdateEventTime(event.id, 'date', e.target.value)}
                              onWheel={(e) => handleWheelTime(e, event.id, 'date')}
                              className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-300 text-[11px] focus:outline-none focus:border-amber-500 transition-colors w-[110px]"
                            />
                            <input
                              type="time"
                              value={String(evtDate.getHours()).padStart(2, '0') + ':' + String(evtDate.getMinutes()).padStart(2, '0')}
                              onChange={(e) => handleUpdateEventTime(event.id, 'time', e.target.value)}
                              onWheel={(e) => handleWheelTime(e, event.id, 'time')}
                              className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-300 text-[11px] focus:outline-none focus:border-amber-500 transition-colors w-[80px]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-end shrink-0 w-16">
                          <div className="text-slate-400 text-xs font-mono">{formatTime(event.timestamp)}</div>
                          <div className="text-slate-600 text-[10px] font-mono">{formatRelative(event.timestamp)}</div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`${colors.badge} text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded`}>
                            {categoryLabel(event.category)}
                          </span>
                          <span className="text-white text-sm font-semibold">{event.label}</span>
                        </div>
                        {event.note && (
                          <p className="text-slate-400 text-xs mt-1">{event.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* End Encounter / Share buttons */}
          <div className="flex gap-3 mb-6">
            {!activeLog.endedAt ? (
              <button
                onClick={handleEndEncounter}
                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Stop size={20} weight="bold" />
                <span className="uppercase tracking-wider text-sm">{activeLog.afterTheFact ? t('encounterLog.finishLog') : t('encounterLog.endEncounter')}</span>
              </button>
            ) : null}
            <button
              onClick={() => openShare(activeLog)}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-amber-900/30"
            >
              <ShareNetwork size={20} weight="bold" />
              <span className="uppercase tracking-wider text-sm">{t('encounterLog.shareReport')}</span>
            </button>
          </div>
        </>
      )}

      {/* Past Logs */}
      {completedLogs.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setShowPastLogs(!showPastLogs)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-3"
          >
            <span className="text-xs font-bold uppercase tracking-widest">
              {t('encounterLog.pastEncounters', { count: completedLogs.length })}
            </span>
            {showPastLogs
              ? <CaretUp size={14} weight="bold" />
              : <CaretDown size={14} weight="bold" />
            }
          </button>
          {showPastLogs && (
            <div className="space-y-2">
              {completedLogs.map((log) => {
                const logSync = syncStatus[log.id];
                return (
                <div
                  key={log.id}
                  className="bg-slate-900/50 border border-slate-700/40 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-bold">
                      {new Date(log.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {logSync?.status === 'synced' && <CloudCheck size={14} weight="bold" className="text-green-500" />}
                      {logSync?.status === 'syncing' && <CloudArrowUp size={14} weight="bold" className="text-blue-400 animate-pulse" />}
                      {logSync?.status === 'error' && <CloudSlash size={14} weight="bold" className="text-amber-500" />}
                      <span className="text-slate-500 text-xs">
                        {t('encounterLog.events', { count: log.events.length })}
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-500 text-xs mb-2">
                    {formatTime(log.startedAt)} — {formatTime(log.endedAt)}
                    {log.location?.address && ` | ${log.location.address}`}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openShare(log)}
                      className="text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      {t('encounterLog.share')}
                    </button>
                    {/* Manual backup button */}
                    {isBackupConfigured && (
                      logSync?.status === 'synced'
                        ? <span className="text-green-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <CloudCheck size={12} weight="bold" /> {t('encounterLog.backedUp')}
                          </span>
                        : logSync?.status === 'syncing'
                        ? <span className="text-blue-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                            {t('encounterLog.backingUp')}
                          </span>
                        : <button
                            onClick={() => backUpLog(log)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider transition-colors"
                          >
                            {t('encounterLog.backUp')}
                          </button>
                    )}
                    {deleteConfirm === log.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 text-xs">{t('encounterLog.deleteConfirm')}</span>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider"
                        >
                          {t('encounterLog.yes')}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-slate-500 hover:text-slate-300 text-xs font-medium uppercase tracking-wider"
                        >
                          {t('encounterLog.no')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(log.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    )}
                  </div>
                </div>
                );
              })}

              {/* Clear All */}
              <div className="pt-3">
                {clearAllConfirm ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-red-400 text-xs font-bold">{t('encounterLog.clearAllConfirm')}</span>
                    <button
                      onClick={handleClearAllLogs}
                      className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider"
                    >
                      {t('encounterLog.yesClearAll')}
                    </button>
                    <button
                      onClick={() => setClearAllConfirm(false)}
                      className="text-slate-500 hover:text-slate-300 text-xs font-medium uppercase tracking-wider"
                    >
                      {t('encounterLog.cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setClearAllConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-red-400 text-xs font-bold uppercase tracking-wider transition-colors py-2"
                  >
                    <Trash size={14} weight="bold" />
                    <span>{t('encounterLog.clearAllEncounters')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareLog && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-8 sm:pb-6 safe-bottom-padding">
            <h3 className="text-white font-black text-lg mb-1">{t('encounterLog.shareEncounterReport')}</h3>
            <p className="text-slate-400 text-xs mb-5">{t('encounterLog.shareSubtitle')}</p>

            <div className="space-y-3">
              <button onClick={handleSendToContacts} className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <PaperPlaneTilt size={20} weight="bold" />
                <span>{t('encounterLog.sendToTrustedContacts')}</span>
              </button>

              <button onClick={handleEmail} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <EnvelopeSimple size={20} weight="bold" />
                <span>{t('encounterLog.sendViaEmail')}</span>
              </button>

              <button onClick={handleCopy} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <CopySimple size={20} weight="bold" />
                <span>{copied ? t('encounterLog.copied') : t('encounterLog.copyToClipboard')}</span>
              </button>

              {typeof navigator.share === 'function' && (
                <button onClick={handleWebShare} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                  <ShareNetwork size={20} weight="bold" />
                  <span>{t('encounterLog.shareEllipsis')}</span>
                </button>
              )}

              <button onClick={handlePrint} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <Printer size={20} weight="bold" />
                <span>{t('encounterLog.print')}</span>
              </button>
            </div>

            <button onClick={() => setShowShareModal(false)} className="w-full mt-4 text-slate-400 hover:text-white text-sm font-medium uppercase tracking-wider transition-colors py-2">
              {t('encounterLog.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8">
        <Disclaimer>
          {t('encounterLog.disclaimerLine1')}
          <br />{t('encounterLog.disclaimerLine2')}
          <br />{t('encounterLog.disclaimerLine3')}
        </Disclaimer>
      </div>
    </div>
  );
};

export default EncounterLog;
