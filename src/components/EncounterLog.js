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
  FileText,
} from '@phosphor-icons/react';
import { acquireLocation, reverseGeocode, buildLocationSmsUri } from '../utils/locationShare';
import { getTrustedContacts } from '../utils/backup/accessGrants';
import { generateEncounterReport } from '../utils/encounterLogDocument';
import { openEncounterEvidencePackage } from '../utils/encounterEvidencePackage';
import { useEncounterSync } from '../hooks/useEncounterSync';
import { readEncrypted, writeEncrypted } from '../utils/encryptedStorage';
import { deleteEncounterAttachment, getRecentRecordings, saveEncounterAttachment } from '../utils/localStorageDB';
import {
  consumePendingEncounterAttachmentIntent,
  writeEncounterAttachmentLaunchIntent,
} from '../utils/encounterAttachmentLaunch';
import Disclaimer from './Disclaimer';

const STORAGE_KEY = 'safeneighbor_encounter_logs';
const MAX_LOGS = 20;
const DRAFT_STORAGE_PREFIX = 'safeneighbor_encounter_log_draft';
const AUTO_RESTORE_DRAFT_MAX_AGE_MS = 5 * 60 * 1000;

const createDefaultEvidenceDetails = () => ({
  agency: '',
  agentIdentifiers: '',
  vehicleDetails: '',
  witnessDetails: '',
  injuries: '',
  propertyDamage: '',
  attachmentNotes: '',
  chainOfCustody: '',
});

const normalizeLogEvidenceDetails = (log) => ({
  ...log,
  evidenceDetails: {
    ...createDefaultEvidenceDetails(),
    ...(log?.evidenceDetails || {}),
  },
  attachments: Array.isArray(log?.attachments) ? log.attachments : [],
});

const getEventSortValue = (event) => new Date(event.timestamp).getTime();

const getDraftStorageKey = ({ afterMode = false, witnessMode = false } = {}) =>
  `${DRAFT_STORAGE_PREFIX}:${witnessMode ? 'witness' : afterMode ? 'after' : 'live'}`;

const readEncounterDraft = ({ afterMode = false, witnessMode = false } = {}) => {
  try {
    const raw = window.sessionStorage.getItem(getDraftStorageKey({ afterMode, witnessMode }));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.log?.id || parsed.log.endedAt) return null;
    return {
      ...parsed,
      log: normalizeLogEvidenceDetails(parsed.log),
    };
  } catch {
    return null;
  }
};

const writeEncounterDraft = (log, { afterMode = false, witnessMode = false, source = 'autosave' } = {}) => {
  try {
    if (!log || log.endedAt) {
      window.sessionStorage.removeItem(getDraftStorageKey({ afterMode, witnessMode }));
      return;
    }
    window.sessionStorage.setItem(getDraftStorageKey({ afterMode, witnessMode }), JSON.stringify({
      source,
      savedAt: Date.now(),
      log: normalizeLogEvidenceDetails(log),
    }));
  } catch {}
};

const clearEncounterDraft = ({ afterMode = false, witnessMode = false } = {}) => {
  try {
    window.sessionStorage.removeItem(getDraftStorageKey({ afterMode, witnessMode }));
  } catch {}
};

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
  teal: {
    bg: 'bg-teal-950/40',
    border: 'border-teal-700/40',
    text: 'text-teal-400',
    btn: 'bg-teal-900/60 border-teal-700/50 text-teal-300 hover:bg-teal-800/70 active:scale-95',
    badge: 'bg-teal-900/50 text-teal-400',
  },
};

// Umami analytics helper
const track = (event, data) => {
  if (window.umami) window.umami.track(event, data);
};

// ── Persistence helpers ─────────────────────────────────
const loadLogs = async () => {
  try {
    const stored = await readEncrypted(STORAGE_KEY, []);
    return stored.map(normalizeLogEvidenceDetails);
  } catch {
    return [];
  }
};

const saveLogs = async (logs) => {
  try {
    const pruned = logs.slice(0, MAX_LOGS);
    await writeEncrypted(STORAGE_KEY, pruned);
  } catch {}
};

// ── Component ───────────────────────────────────────────

const EncounterLog = ({ onBack, autoStart, afterMode = false, witnessMode = false, onOpenBackupSettings, onOpenRecord }) => {
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

  // Witness-specific event categories (bystander documentation)
  const WITNESS_EVENT_CATEGORIES = useMemo(() => [
    {
      id: 'observation',
      label: t('encounterLog.categoryObservation'),
      color: 'teal',
      events: [
        t('encounterLog.witnessAgencyIdentified'),
        t('encounterLog.witnessBadgeNumbers'),
        t('encounterLog.witnessVehiclePlates'),
        t('encounterLog.witnessWarrantShown'),
        t('encounterLog.witnessWarrantType'),
      ],
    },
    {
      id: 'detained',
      label: t('encounterLog.categoryDetained'),
      color: 'red',
      events: [
        t('encounterLog.witnessPersonDetained'),
        t('encounterLog.witnessPersonSearched'),
        t('encounterLog.witnessPlacedInVehicle'),
        t('encounterLog.witnessPersonName'),
        t('encounterLog.witnessCountryOfOrigin'),
      ],
    },
    {
      id: 'scene',
      label: t('encounterLog.categoryScene'),
      color: 'amber',
      events: [
        t('encounterLog.witnessNumberOfAgents'),
        t('encounterLog.witnessNumberOfVehicles'),
        t('encounterLog.witnessAskedToMove'),
        t('encounterLog.witnessCompliedWithRequest'),
        t('encounterLog.witnessForceObserved'),
      ],
    },
    {
      id: 'documentation',
      label: t('encounterLog.categoryDocumentation'),
      color: 'slate',
      events: [
        t('encounterLog.witnessStartedRecording'),
        t('encounterLog.witnessPhotosTaken'),
        t('encounterLog.witnessLocationNoted'),
        t('encounterLog.witnessCustomNote'),
      ],
    },
  ], [t]);

  const activeCategories = witnessMode ? WITNESS_EVENT_CATEGORIES : EVENT_CATEGORIES;

  const [logs, setLogs] = useState([]);
  const [activeLog, setActiveLog] = useState(null);
  const [resumeCandidate, setResumeCandidate] = useState(null);
  const draftContext = useMemo(() => ({ afterMode, witnessMode }), [afterMode, witnessMode]);

  // Async load from encrypted storage on mount
  useEffect(() => {
    let cancelled = false;
    loadLogs().then((stored) => {
      if (cancelled) return;
      setLogs(stored);
      const candidate = stored.find((l) => !l.endedAt && (witnessMode ? l.witnessLog : (afterMode ? l.afterTheFact : !l.afterTheFact && !l.witnessLog))) || null;
      const draft = readEncounterDraft({ afterMode, witnessMode });

      if (
        draft?.log &&
        draft.source === 'attachment-picker' &&
        Date.now() - Number(draft.savedAt || 0) < AUTO_RESTORE_DRAFT_MAX_AGE_MS
      ) {
        setActiveLog(draft.log);
        setResumeCandidate(null);
        return;
      }

      const chosenCandidate = (() => {
        if (!draft?.log) return candidate;
        if (!candidate) return draft.log;
        return new Date(draft.log.updatedAt || draft.log.startedAt || 0).getTime()
          > new Date(candidate.updatedAt || candidate.startedAt || 0).getTime()
          ? draft.log
          : candidate;
      })();

      setResumeCandidate(chosenCandidate);
    });
    return () => { cancelled = true; };
  }, [afterMode, witnessMode]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLog, setShareLog] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [detailNoteFor, setDetailNoteFor] = useState(null);
  const [detailNoteText, setDetailNoteText] = useState('');
  const [exportingPackage, setExportingPackage] = useState(false);
  const [recentRecordings, setRecentRecordings] = useState([]);
  const [loadingRecentRecordings, setLoadingRecentRecordings] = useState(false);
  const [importingAttachment, setImportingAttachment] = useState(false);
  const [manualAttachment, setManualAttachment] = useState({
    attachmentType: 'document',
    label: '',
    storage: '',
    notes: '',
  });
  const [pendingImportedFiles, setPendingImportedFiles] = useState([]);
  const [lastImportedFilesLabel, setLastImportedFilesLabel] = useState('');
  const attachmentImportRef = useRef(null);

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

  // Debounced auto-save — 50ms to batch rapid state changes while still being
  // nearly-immediate so the log is in storage before any potential page disruption.
  const save = useCallback((allLogs) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveLogs(allLogs);
    }, 50);
  }, []);

  const persistLogImmediately = useCallback(async (nextActiveLog = activeLog) => {
    if (!nextActiveLog) return;
    const existingLogs = await loadLogs();
    const normalizedNextLog = normalizeLogEvidenceDetails(nextActiveLog);
    const idx = existingLogs.findIndex((log) => log.id === normalizedNextLog.id);
    const nextLogs = idx >= 0
      ? existingLogs.map((log, index) => (index === idx ? normalizedNextLog : normalizeLogEvidenceDetails(log)))
      : [normalizedNextLog, ...existingLogs.map(normalizeLogEvidenceDetails)];
    await saveLogs(nextLogs);
  }, [activeLog]);

  useEffect(() => {
    if (!activeLog) {
      return;
    }
    if (activeLog.endedAt) {
      clearEncounterDraft(draftContext);
      return;
    }
    writeEncounterDraft(activeLog, { ...draftContext, source: 'autosave' });
  }, [activeLog, draftContext]);

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

  // Always-current ref so the unmount cleanup (empty-dep effect) sees the latest activeLog.
  const activeLogRef = useRef(activeLog);
  useEffect(() => { activeLogRef.current = activeLog; }, [activeLog]);

  // On unmount, cancel the debounced save and immediately flush the latest log to storage
  // so an in-progress encounter survives SPA navigation away from this screen.
  // Uses activeLogRef (not activeLog in closure) so it always gets the freshest value.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const log = activeLogRef.current;
      if (log && !log.endedAt) {
        // Fire-and-forget: page is still alive (SPA nav), async write will complete.
        writeEncounterDraft(log, { ...draftContext, source: 'autosave' });
        persistLogImmediately(log).catch(() => {});
      }
    };
  }, [draftContext, persistLogImmediately]);

  // Best-effort save on full page unload (e.g. browser refresh, iOS pull-to-refresh
  // if it somehow fires). Async writes may not complete before the page terminates,
  // but this gives the browser a chance to flush if it lingers long enough.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const log = activeLogRef.current;
      if (log && !log.endedAt) {
        writeEncounterDraft(log, { ...draftContext, source: 'autosave' });
        persistLogImmediately(log).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [draftContext, persistLogImmediately]);

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

  const activeLogId = activeLog?.id;
  const encounterScenarioId = witnessMode ? 'encounter-log-witness' : afterMode ? 'encounter-log-after' : 'encounter-log';

  useEffect(() => {
    let cancelled = false;
    if (!activeLogId) return undefined;

    setLoadingRecentRecordings(true);
    getRecentRecordings(8)
      .then((items) => {
        if (!cancelled) setRecentRecordings(items || []);
      })
      .catch((error) => {
        console.error('Failed to load recent recordings for encounter attachments:', error);
        if (!cancelled) setRecentRecordings([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecentRecordings(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeLogId]);

  useEffect(() => {
    if (!activeLogId) return;
    const pendingIntent = consumePendingEncounterAttachmentIntent();
    if (!pendingIntent || pendingIntent.logId !== activeLogId || !pendingIntent.attachment) return;

    setActiveLog((prev) => {
      if (!prev) return prev;
      if ((prev.attachments || []).some((attachment) => attachment.id === pendingIntent.attachment.id || attachment.recordingId === pendingIntent.attachment.recordingId)) {
        return prev;
      }
      return {
        ...prev,
        attachments: [...(prev.attachments || []), pendingIntent.attachment],
        updatedAt: new Date().toISOString(),
      };
    });
  }, [activeLogId]);

  // ── Resume / New handlers ──────────────────────────────

  const handleResumeLog = () => {
    if (resumeCandidate) {
      setActiveLog(normalizeLogEvidenceDetails(resumeCandidate));
      setResumeCandidate(null);
    }
  };

  const handleNewLog = () => {
    clearEncounterDraft(draftContext);
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
      evidenceDetails: createDefaultEvidenceDetails(),
      attachments: [],
      ...(useAfterMode && { afterTheFact: true }),
      ...(witnessMode && { witnessLog: true }),
    };

    setActiveLog(newLog);
    setIsStarting(false);
    track('encounter_log', { action: 'start', mode: witnessMode ? 'witness' : useAfterMode ? 'after' : 'now' });
  };

  const handleEndEncounter = () => {
    if (!activeLog) return;
    setActiveLog((prev) => ({
      ...prev,
      endedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    clearEncounterDraft(draftContext);
    track('encounter_log', { action: 'end', events: activeLog.events.length });
  };

  // Witness events that need free-text input
  const witnessNoteEvents = useMemo(() => new Set([
    t('encounterLog.witnessBadgeNumbers'),
    t('encounterLog.witnessVehiclePlates'),
    t('encounterLog.witnessWarrantType'),
    t('encounterLog.witnessPersonName'),
    t('encounterLog.witnessCountryOfOrigin'),
    t('encounterLog.witnessNumberOfAgents'),
    t('encounterLog.witnessNumberOfVehicles'),
    t('encounterLog.witnessCustomNote'),
  ]), [t]);

  const handleAddEvent = (category, label) => {
    if (!activeLog) return;
    const isDetailCategory = category === 'details' || category === 'documentation';
    const needsNote = witnessNoteEvents.has(label);

    // For detail events or witness events needing text, open a note input
    if (isDetailCategory || needsNote) {
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

  const getFirstEventForOption = useCallback((category, label) => {
    const matches = (activeLog?.events || [])
      .filter((event) => event.category === category && event.label === label)
      .sort((a, b) => getEventSortValue(a) - getEventSortValue(b));
    return matches[0] || null;
  }, [activeLog?.events]);

  const getEventOrder = useCallback((eventId) => {
    if (!eventId) return null;
    const sorted = [...(activeLog?.events || [])].sort((a, b) => getEventSortValue(a) - getEventSortValue(b));
    const index = sorted.findIndex((event) => event.id === eventId);
    return index >= 0 ? index + 1 : null;
  }, [activeLog?.events]);

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

  const handleRemoveEvent = (eventId) => {
    if (!activeLog) return;
    setActiveLog((prev) => ({
      ...prev,
      events: (prev.events || []).filter((event) => event.id !== eventId),
      updatedAt: new Date().toISOString(),
    }));
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

  const handleUpdateEvidenceDetail = (field, value) => {
    if (!activeLog) return;
    setActiveLog((prev) => ({
      ...prev,
      evidenceDetails: {
        ...createDefaultEvidenceDetails(),
        ...(prev.evidenceDetails || {}),
        [field]: value,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddVaultAttachment = (recording) => {
    if (!recording || !activeLog) return;
    setActiveLog((prev) => {
      if ((prev.attachments || []).some((attachment) => attachment.recordingId === recording.id)) {
        return prev;
      }

      const providers = [recording.backups?.r2?.backedUp && 'R2', recording.backups?.google_drive?.backedUp && 'Google Drive']
        .filter(Boolean)
        .join(', ');

      const attachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sourceType: 'vault-recording',
        attachmentType: recording.type || 'recording',
        recordingId: recording.id,
        label: recording.title || `${recording.type || 'recording'} attachment`,
        createdAt: recording.createdAt || new Date().toISOString(),
        storage: 'Encrypted local vault',
        notes: recording.source === 'imported' ? 'Imported into the encrypted vault.' : 'Captured in the encrypted vault.',
        backupStatus: recording.backedUp ? `Backed up${providers ? ` (${providers})` : ''}` : recording.markedForBackup ? 'Marked for backup' : 'Local only',
      };

      return {
        ...prev,
        attachments: [...(prev.attachments || []), attachment],
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleRemoveAttachment = (attachmentId) => {
    if (!activeLog) return;
    const target = (activeLog.attachments || []).find((attachment) => attachment.id === attachmentId);
    if (target?.importedFileId) {
      deleteEncounterAttachment(target.importedFileId).catch((error) => {
        console.error('Failed to delete imported encounter attachment:', error);
      });
    }
    setActiveLog((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((attachment) => attachment.id !== attachmentId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateAttachment = (attachmentId, field, value) => {
    if (!activeLog) return;
    setActiveLog((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).map((attachment) => (
        attachment.id === attachmentId ? { ...attachment, [field]: value } : attachment
      )),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleOpenRecordForAttachment = () => {
    if (!activeLogId || !onOpenRecord) return;
    writeEncounterAttachmentLaunchIntent({
      logId: activeLogId,
      scenarioId: encounterScenarioId,
    });
    onOpenRecord();
  };

  const handlePrepareAttachmentPicker = () => {
    // Suppress pull-to-refresh while the native file picker is open. On iOS the
    // sheet-close animation fires a downward swipe on the document (scrollY still 0)
    // that exceeds the pull threshold and triggers window.location.reload().
    // We cannot use window.focus to clear the flag because focus fires *before*
    // the sheet-close touch events arrive, clearing the guard too early.
    // Instead: set the flag now, clear it in handleImportedFiles' finally block (file
    // selected) or after a 30-second timeout (picker cancelled without selection).
    window.__filePickerActive = true;
    window.__filePickerActiveUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    clearTimeout(window.__filePickerActiveTimer);
    window.__filePickerActiveTimer = setTimeout(() => { window.__filePickerActive = false; window.__filePickerActiveUrl = null; }, 30000);
    if (activeLog) {
      writeEncounterDraft(activeLog, { ...draftContext, source: 'attachment-picker' });
    }
    persistLogImmediately().catch((error) => {
      console.error('Failed to persist encounter log before opening attachment picker:', error);
    });
  };

  const formatImportedFilesLabel = useCallback((files) => {
    if (!files?.length) return '';
    if (files.length === 1) return files[0].name;
    if (files.length === 2) return `${files[0].name} and ${files[1].name}`;
    return `${files[0].name} and ${files.length - 1} more`;
  }, []);

  const handleImportedFiles = async (files) => {
    if (!activeLog || !files?.length) return;
    setImportingAttachment(true);
    try {
      await persistLogImmediately();
      const importedAttachments = [];
      for (const file of files) {
        const mimeType = file.type || 'application/octet-stream';
        const saved = await saveEncounterAttachment({
          blob: file,
          originalName: file.name,
          size: file.size,
          mimeType,
          lastModified: file.lastModified || null,
        });

        importedAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sourceType: 'imported-file',
          attachmentType: mimeType.startsWith('image/') ? 'photo' : mimeType.startsWith('video/') ? 'video' : mimeType.startsWith('audio/') ? 'audio' : 'document',
          label: file.name,
          createdAt: saved.createdAt,
          storage: 'Encrypted encounter attachment store',
          notes: '',
          backupStatus: 'Imported on device',
          importedFileId: saved.id,
          mimeType: saved._mimeType || mimeType,
          size: file.size,
        });
      }

      setActiveLog((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...importedAttachments],
        updatedAt: new Date().toISOString(),
      }));
      setLastImportedFilesLabel(formatImportedFilesLabel(files));
      setPendingImportedFiles([]);
    } catch (error) {
      console.error('Failed to import encounter attachment files:', error);
      alert(t('encounterLog.attachmentsImportFailed', { defaultValue: 'Could not import one or more files into the encounter attachment store.' }));
    } finally {
      // Clear the pull-to-refresh guard now that the picker is fully done.
      window.__filePickerActive = false;
      window.__filePickerActiveUrl = null;
      clearTimeout(window.__filePickerActiveTimer);
      setImportingAttachment(false);
      // Clear the native control so selecting the same file again still fires onChange.
      if (attachmentImportRef.current) attachmentImportRef.current.value = '';
    }
  };

  const handleDeleteLog = (logId) => {
    setLogs((prev) => {
      const updated = prev.filter((l) => l.id !== logId);
      saveLogs(updated);
      return updated;
    });
    if (activeLog?.id === logId) {
      clearEncounterDraft(draftContext);
      setActiveLog(null);
    }
    setDeleteConfirm(null);
    // Clean up cloud copy
    deleteRemoteLog(logId);
  };

  const handleClearAllLogs = () => {
    setLogs([]);
    setActiveLog(null);
    setResumeCandidate(null);
    clearEncounterDraft(draftContext);
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
    track('encounter_log_share', { method: 'print_evidence_package' });
    handleExportEvidencePackage();
  };

  const handleExportEvidencePackage = async () => {
    if (!shareLog || exportingPackage) return;
    setExportingPackage(true);
    track('encounter_log_share', { method: 'evidence_package' });
    try {
      const opened = await openEncounterEvidencePackage(shareLog);
      if (!opened) {
        alert(t('encounterLog.evidencePackagePopupBlocked', {
          defaultValue: 'Could not open the evidence package window. Please allow pop-ups and try again.',
        }));
      }
    } catch (error) {
      console.error('Failed to export evidence package:', error);
      alert(t('encounterLog.evidencePackageFailed', {
        defaultValue: 'Could not export the evidence package right now.',
      }));
    } finally {
      setExportingPackage(false);
    }
  };

  const handleSendToContacts = async () => {
    if (!shareLog) return;
    const contacts = await getTrustedContacts();
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
    const found = activeCategories.find((c) => c.id === cat);
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
          <NotePencil size={36} weight="bold" className={witnessMode ? 'text-teal-400' : 'text-amber-400'} />
          <h1 className="text-3xl font-black text-white tracking-wide">{t('encounterLog.title')}</h1>
        </div>
        <p className="text-slate-400 text-sm">
          {witnessMode
            ? t('encounterLog.subtitleWitness')
            : afterMode
              ? t('encounterLog.subtitleAfter')
              : t('encounterLog.subtitleNow')}
        </p>
        <p className="text-slate-500 text-xs mt-2 max-w-2xl leading-relaxed">
          {t('encounterLog.recordingExplainer', { defaultValue: 'This encounter log records a timestamped written event trail with notes and location. It does not capture audio or video by itself. Use the Record section if you need media evidence.' })}
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
                className={`w-full bg-gradient-to-r ${witnessMode ? 'from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 shadow-teal-900/40' : 'from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 shadow-red-900/40'} text-white font-black py-5 px-6 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-wider disabled:opacity-60`}
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
          <div className={`mb-4 bg-gradient-to-r ${activeLog.witnessLog ? 'from-teal-950/50' : activeLog.afterTheFact ? 'from-amber-950/50' : 'from-red-950/50'} to-slate-900/50 border ${activeLog.witnessLog ? 'border-teal-700/40' : activeLog.afterTheFact ? 'border-amber-700/40' : 'border-red-700/40'} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {!activeLog.endedAt && !activeLog.afterTheFact && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeLog.witnessLog ? 'bg-teal-400' : 'bg-red-400'} opacity-75`} />
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${activeLog.endedAt ? 'bg-slate-500' : activeLog.witnessLog ? 'bg-teal-500' : activeLog.afterTheFact ? 'bg-amber-500' : 'bg-red-500'}`} />
                </span>
                <span className={`font-bold text-sm uppercase tracking-wider ${activeLog.endedAt ? 'text-slate-400' : activeLog.witnessLog ? 'text-teal-400' : activeLog.afterTheFact ? 'text-amber-400' : 'text-red-400'}`}>
                  {activeLog.endedAt
                    ? (activeLog.afterTheFact ? t('encounterLog.logComplete') : t('encounterLog.encounterEnded'))
                    : activeLog.afterTheFact ? t('encounterLog.loggingAfterTheFact') : t('encounterLog.recording')}
                </span>
              </div>
              {!activeLog.afterTheFact && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={14} weight="bold" />
                    <span className="text-sm font-mono font-bold">{elapsedTime}</span>
                  </div>
                  {!activeLog.endedAt && (
                    <button
                      type="button"
                      onClick={handleEndEncounter}
                      className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-slate-800/80"
                    >
                      {t('encounterLog.stop', { defaultValue: 'Stop' })}
                    </button>
                  )}
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
              {activeCategories.map((cat) => {
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
                          {cat.events.map((eventLabel) => {
                            const selectedEvent = getFirstEventForOption(cat.id, eventLabel);
                            const selectedOrder = selectedEvent ? getEventOrder(selectedEvent.id) : null;
                            const selectedTime = selectedEvent ? formatTime(selectedEvent.timestamp) : null;
                            return (
                              <div key={eventLabel}>
                                <button
                                  onClick={() => handleAddEvent(cat.id, eventLabel)}
                                  className={`${colors.btn} border font-semibold text-xs py-2.5 px-3 rounded-lg transition-all text-start w-full ${selectedEvent ? 'ring-1 ring-white/20' : ''}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span>{eventLabel}</span>
                                    {selectedEvent && (
                                      <span className="flex items-center gap-1.5 shrink-0">
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px] font-black text-white">
                                          {selectedOrder}
                                        </span>
                                        <span className="text-[11px] font-black text-white">✓</span>
                                      </span>
                                    )}
                                  </div>
                                  {selectedEvent && (
                                    <div className="mt-1 text-[10px] uppercase tracking-wider text-white/70">
                                      {selectedTime}
                                    </div>
                                  )}
                                </button>
                                {selectedEvent && (
                                  <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/55 p-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        {t('encounterLog.optionOrder', { defaultValue: 'Order' })} #{selectedOrder}
                                      </span>
                                      <input
                                        type="date"
                                        value={new Date(selectedEvent.timestamp).getFullYear() + '-' + String(new Date(selectedEvent.timestamp).getMonth() + 1).padStart(2, '0') + '-' + String(new Date(selectedEvent.timestamp).getDate()).padStart(2, '0')}
                                        onChange={(e) => handleUpdateEventTime(selectedEvent.id, 'date', e.target.value)}
                                        onWheel={(e) => handleWheelTime(e, selectedEvent.id, 'date')}
                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-[11px] focus:outline-none focus:border-amber-500 transition-colors w-[118px]"
                                      />
                                      <input
                                        type="time"
                                        value={String(new Date(selectedEvent.timestamp).getHours()).padStart(2, '0') + ':' + String(new Date(selectedEvent.timestamp).getMinutes()).padStart(2, '0')}
                                        onChange={(e) => handleUpdateEventTime(selectedEvent.id, 'time', e.target.value)}
                                        onWheel={(e) => handleWheelTime(e, selectedEvent.id, 'time')}
                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-[11px] focus:outline-none focus:border-amber-500 transition-colors w-[84px]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveEvent(selectedEvent.id)}
                                        className="ms-auto text-[11px] font-bold uppercase tracking-wider text-red-300 hover:text-red-200"
                                      >
                                        {t('encounterLog.removeEvent', { defaultValue: 'Remove' })}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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

          {/* Evidence detail fields */}
          <div className="mb-6 bg-slate-900/50 border border-slate-700/40 rounded-2xl p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {t('encounterLog.evidenceDetailsTitle', { defaultValue: 'Evidence details' })}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                {t('encounterLog.evidenceDetailsSubtitle', { defaultValue: 'Capture the identifiers and supporting facts an attorney will want to review with the timeline.' })}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {t('encounterLog.evidenceAgency', { defaultValue: 'Agency or unit' })}
                </label>
                <input
                  type="text"
                  value={activeLog.evidenceDetails?.agency || ''}
                  onChange={(e) => handleUpdateEvidenceDetail('agency', e.target.value)}
                  placeholder={t('encounterLog.evidenceAgencyPlaceholder', { defaultValue: 'ICE, HSI, local police, task force...' })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {t('encounterLog.evidenceAgentIdentifiers', { defaultValue: 'Agent identifiers' })}
                </label>
                <input
                  type="text"
                  value={activeLog.evidenceDetails?.agentIdentifiers || ''}
                  onChange={(e) => handleUpdateEvidenceDetail('agentIdentifiers', e.target.value)}
                  placeholder={t('encounterLog.evidenceAgentIdentifiersPlaceholder', { defaultValue: 'Badge numbers, names, uniforms, patches...' })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {t('encounterLog.evidenceVehicleDetails', { defaultValue: 'Vehicle details' })}
                </label>
                <textarea
                  value={activeLog.evidenceDetails?.vehicleDetails || ''}
                  onChange={(e) => handleUpdateEvidenceDetail('vehicleDetails', e.target.value)}
                  placeholder={t('encounterLog.evidenceVehicleDetailsPlaceholder', { defaultValue: 'Vehicle types, colors, plates, markings...' })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {t('encounterLog.evidenceWitnessDetails', { defaultValue: 'Witness details' })}
                </label>
                <textarea
                  value={activeLog.evidenceDetails?.witnessDetails || ''}
                  onChange={(e) => handleUpdateEvidenceDetail('witnessDetails', e.target.value)}
                  placeholder={t('encounterLog.evidenceWitnessDetailsPlaceholder', { defaultValue: 'Names, contact methods, where they stood, what they observed...' })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {t('encounterLog.evidenceInjuries', { defaultValue: 'Injuries or medical concerns' })}
                </label>
                <textarea
                  value={activeLog.evidenceDetails?.injuries || ''}
                  onChange={(e) => handleUpdateEvidenceDetail('injuries', e.target.value)}
                  placeholder={t('encounterLog.evidenceInjuriesPlaceholder', { defaultValue: 'Pain, bruising, restraints, denied medication, emergency care...' })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {t('encounterLog.evidencePropertyDamage', { defaultValue: 'Property damage or seized items' })}
                </label>
                <textarea
                  value={activeLog.evidenceDetails?.propertyDamage || ''}
                  onChange={(e) => handleUpdateEvidenceDetail('propertyDamage', e.target.value)}
                  placeholder={t('encounterLog.evidencePropertyDamagePlaceholder', { defaultValue: 'Broken locks, doors, phones, documents taken, bags searched...' })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {t('encounterLog.evidenceAttachmentNotes', { defaultValue: 'Attachment notes' })}
                </label>
                <textarea
                  value={activeLog.evidenceDetails?.attachmentNotes || ''}
                  onChange={(e) => handleUpdateEvidenceDetail('attachmentNotes', e.target.value)}
                  placeholder={t('encounterLog.evidenceAttachmentNotesPlaceholder', { defaultValue: 'Photos, screenshots, video clips, warrant images, where they are stored...' })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  {t('encounterLog.evidenceChainOfCustody', { defaultValue: 'Preservation / chain of custody' })}
                </label>
                <textarea
                  value={activeLog.evidenceDetails?.chainOfCustody || ''}
                  onChange={(e) => handleUpdateEvidenceDetail('chainOfCustody', e.target.value)}
                  placeholder={t('encounterLog.evidenceChainOfCustodyPlaceholder', { defaultValue: 'Who preserved the files, cloud backup status, device used, transfer notes...' })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Attachment manifest */}
          <div className="mb-6 bg-slate-900/50 border border-slate-700/40 rounded-2xl p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {t('encounterLog.attachmentsTitle', { defaultValue: 'Attachment manifest' })}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                {t('encounterLog.attachmentsSubtitle', { defaultValue: 'Link recent encrypted vault recordings and add manual references for photos, screenshots, warrants, or other supporting files.' })}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    {t('encounterLog.attachmentsVaultTitle', { defaultValue: 'Recent vault recordings' })}
                  </p>
                  {loadingRecentRecordings && (
                    <span className="text-[11px] text-slate-500">
                      {t('encounterLog.attachmentsLoading', { defaultValue: 'Loading…' })}
                    </span>
                  )}
                </div>
                {onOpenRecord && (
                  <button
                    type="button"
                    onClick={handleOpenRecordForAttachment}
                    className="mb-3 w-full rounded-xl border border-blue-600/40 bg-blue-600/10 px-3 py-2.5 text-sm font-bold text-blue-300 hover:bg-blue-600/15 transition-colors"
                  >
                    {t('encounterLog.attachmentsOpenRecord', { defaultValue: 'Open Record Vault to attach a recording' })}
                  </button>
                )}
                <div className="space-y-2">
                  {recentRecordings.length === 0 && !loadingRecentRecordings && (
                    <p className="text-xs text-slate-500">
                      {t('encounterLog.attachmentsNoVaultRecordings', { defaultValue: 'No recent vault recordings found.' })}
                    </p>
                  )}
                  {recentRecordings.map((recording) => {
                    const attached = (activeLog.attachments || []).some((attachment) => attachment.recordingId === recording.id);
                    return (
                      <div key={recording.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm text-white font-semibold truncate">{recording.title || `${recording.type} recording`}</p>
                          <p className="text-[11px] text-slate-500">
                            {(recording.type || 'recording').toUpperCase()} • {new Date(recording.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddVaultAttachment(recording)}
                          disabled={attached}
                          className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${attached ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40' : 'bg-blue-700 hover:bg-blue-600 text-white'}`}
                        >
                          {attached
                            ? t('encounterLog.attachmentsAttached', { defaultValue: 'Attached' })
                            : t('encounterLog.attachmentsAttach', { defaultValue: 'Attach' })}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  {t('encounterLog.attachmentsManualTitle', { defaultValue: 'Manual reference details' })}
                </p>
                <div className="mb-3 rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-3 py-3">
                  <label className="mb-2 block text-sm font-bold text-emerald-300">
                    {importingAttachment
                      ? t('encounterLog.attachmentsImporting', { defaultValue: 'Importing files…' })
                      : t('encounterLog.attachmentsImportFiles', { defaultValue: 'Import files into encounter attachments' })}
                  </label>
                  <input
                    ref={attachmentImportRef}
                    type="file"
                    multiple
                    disabled={importingAttachment}
                    onClick={handlePrepareAttachmentPicker}
                    onChange={(e) => setPendingImportedFiles(Array.from(e.target.files || []))}
                    className="block w-full cursor-pointer rounded-lg border border-emerald-500/30 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 file:me-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.rtf,.heic,.heif"
                  />
                  {pendingImportedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleImportedFiles(pendingImportedFiles)}
                      disabled={importingAttachment}
                      className="mt-3 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-2.5 px-4 transition-colors"
                    >
                      {importingAttachment
                        ? t('encounterLog.attachmentsImporting', { defaultValue: 'Importing files…' })
                        : t('encounterLog.attachmentsAddImported', { defaultValue: 'Add imported file' })}
                    </button>
                  )}
                  {lastImportedFilesLabel && pendingImportedFiles.length === 0 && !importingAttachment && (
                    <p className="mt-2 text-[11px] text-emerald-300">
                      {t('encounterLog.attachmentsLastImported', {
                        defaultValue: 'Last imported: {{files}}',
                        files: lastImportedFilesLabel,
                      })}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">
                    {t('encounterLog.attachmentsImportHint', { defaultValue: 'Choose screenshots, photos, PDFs, audio, or video directly from your device.' })}
                  </p>
                </div>
                <div className="space-y-3">
                  <select
                    value={manualAttachment.attachmentType}
                    onChange={(e) => setManualAttachment((prev) => ({ ...prev, attachmentType: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    <option value="document">Document</option>
                    <option value="photo">Photo</option>
                    <option value="screenshot">Screenshot</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="warrant">Warrant image</option>
                  </select>
                  <input
                    type="text"
                    value={manualAttachment.label}
                    onChange={(e) => setManualAttachment((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder={t('encounterLog.attachmentsManualLabelPlaceholder', { defaultValue: 'Attachment label or filename' })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <input
                    type="text"
                    value={manualAttachment.storage}
                    onChange={(e) => setManualAttachment((prev) => ({ ...prev, storage: e.target.value }))}
                    placeholder={t('encounterLog.attachmentsManualStoragePlaceholder', { defaultValue: 'Where it is stored: Photos, Drive, email, attorney, etc.' })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <textarea
                    value={manualAttachment.notes}
                    onChange={(e) => setManualAttachment((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('encounterLog.attachmentsManualNotesPlaceholder', { defaultValue: 'What it shows or why it matters' })}
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    {t('encounterLog.attachmentsManualHint', {
                      defaultValue: 'Manual reference fields are optional notes for attorney context. Imported files should be added with the button above.',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {(activeLog.attachments || []).length > 0 && (
              <div className="mt-4 space-y-3">
                {(activeLog.attachments || []).map((attachment) => (
                  <div key={attachment.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{attachment.label}</p>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">
                          {(attachment.attachmentType || 'attachment').replace('-', ' ')} • {attachment.sourceType === 'vault-recording'
                            ? 'Vault link'
                            : attachment.importedFileId
                              ? 'Imported file'
                              : 'Manual reference'}
                        </p>
                        {attachment.importedFileId && (
                          <p className="text-[11px] text-emerald-400 mt-1">
                            {t('encounterLog.attachmentsImportedStored', { defaultValue: 'Stored in encrypted attachment vault on this device.' })}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="text-[11px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300"
                      >
                        {t('encounterLog.attachmentsRemove', { defaultValue: 'Remove' })}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <input
                        type="text"
                        value={attachment.storage || ''}
                        onChange={(e) => handleUpdateAttachment(attachment.id, 'storage', e.target.value)}
                        placeholder={t('encounterLog.attachmentsStoragePlaceholder', { defaultValue: 'Storage or location reference' })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                      <input
                        type="text"
                        value={attachment.backupStatus || ''}
                        onChange={(e) => handleUpdateAttachment(attachment.id, 'backupStatus', e.target.value)}
                        placeholder={t('encounterLog.attachmentsBackupStatusPlaceholder', { defaultValue: 'Backup / preservation status' })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <textarea
                      value={attachment.notes || ''}
                      onChange={(e) => handleUpdateAttachment(attachment.id, 'notes', e.target.value)}
                      placeholder={t('encounterLog.attachmentsNotesPlaceholder', { defaultValue: 'Describe what this attachment shows' })}
                      rows={2}
                      className="mt-3 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event timeline */}
          {activeLog.events.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                {t('encounterLog.timelineCount', { count: activeLog.events.length })}
              </h3>
              <div className="space-y-2">
                {[...activeLog.events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((event) => {
                  const cat = activeCategories.find((c) => c.id === event.category);
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
              <button onClick={handleExportEvidencePackage} disabled={exportingPackage} className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <FileText size={20} weight="bold" />
                <span>
                  {exportingPackage
                    ? t('encounterLog.preparingEvidencePackage', { defaultValue: 'Preparing evidence package…' })
                    : t('encounterLog.exportEvidencePackage', { defaultValue: 'Export legal evidence package' })}
                </span>
              </button>

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
