// src/components/OfflineLibrary.js
// Offline reference card — rights guide, encounter scripts, warrant ID, de-escalation,
// ICE vs police, local attorneys, post-encounter checklists, document checklist, family plan

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XIcon as X, WifiSlashIcon as WifiSlash,
  CheckCircleIcon as CheckCircle, WarningIcon as Warning,
  CaretDownIcon as CaretDown, CaretUpIcon as CaretUp,
  PhoneIcon as Phone, BuildingOfficeIcon as BuildingOffice,
  UserIcon as User, ShieldCheckIcon as ShieldCheck,
  ChatTextIcon as ChatText, GavelIcon as Gavel,
  HandPalmIcon as HandPalm, IdentificationCardIcon as IdentificationCard,
  FileTextIcon as FileText, FirstAidKitIcon as FirstAidKit,
  MapTrifoldIcon as MapTrifold
} from '@phosphor-icons/react';
import { STATE_RESOURCES, NATIONAL_RESOURCES } from '../data/legalResourceData';
import { scenarios } from '../data/scenarioData';
import { POST_ENCOUNTER_SCENARIOS } from '../data/postEncounterData';
import { NEVER_SIGN_WARNING } from '../data/immigrationRightsData';
import {
  computeTileList, DEFAULT_TILE_LEVELS, estimateStorageMB,
  requestTileDownload, listenForTileProgress, requestCancelTileDownload,
  requestTileCacheSize, requestClearTileCache
} from '../utils/tileDownloader';

const QUICK_SCENARIOS = ['door', 'street', 'vehicle', 'workplace'];

const OfflineLibrary = ({ isOpen = true, onClose, onInstall }) => {
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(null); // null=checking, true=cached, false=not
  const [selectedState, setSelectedState] = useState(
    () => localStorage.getItem('safeneighbor_home_state') || ''
  );
  const [showRights, setShowRights] = useState(true);
  const [showScripts, setShowScripts] = useState(false);
  const [showWarrant, setShowWarrant] = useState(false);
  const [showDeesc, setShowDeesc] = useState(false);
  const [showIcePolice, setShowIcePolice] = useState(false);
  const [showPostEncounter, setShowPostEncounter] = useState(false);
  const [showDocChecklist, setShowDocChecklist] = useState(false);
  const [showMapDownload, setShowMapDownload] = useState(false);
  const [downloadState, setDownloadState] = useState('idle');
  const [downloadProgress, setDownloadProgress] = useState({ completed: 0, total: 0, failed: 0 });
  const [cachedTileCount, setCachedTileCount] = useState(null);

  // Family plan from localStorage
  const familyPlan = (() => {
    try { return JSON.parse(localStorage.getItem('safeneighbor_family_kit') || 'null'); }
    catch { return null; }
  })();

  // Check SW cache readiness
  useEffect(() => {
    if (!isOpen) return;
    if ('caches' in window) {
      caches.has('safeneighbor-v21')
        .then(setIsReady)
        .catch(() => setIsReady(false));
    } else {
      setIsReady(false);
    }
  }, [isOpen]);

  // Query tile cache size on open and listen for SW responses
  useEffect(() => {
    if (!isOpen || !('serviceWorker' in navigator)) return;
    requestTileCacheSize();
    const handler = (event) => {
      if (event.data?.type === 'TILE_CACHE_SIZE') setCachedTileCount(event.data.count);
      if (event.data?.type === 'TILE_CACHE_CLEARED') setCachedTileCount(0);
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [isOpen]);

  // Auto-download tiles on first visit if: no tiles cached, online, location already granted
  const autoDownloadAttempted = React.useRef(false);
  useEffect(() => {
    if (!isOpen || autoDownloadAttempted.current) return;
    if (cachedTileCount === null || cachedTileCount > 0) return; // still loading or already have tiles
    if (!navigator.onLine || downloadState !== 'idle') return;
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'granted') {
        autoDownloadAttempted.current = true;
        setShowMapDownload(true);
        handleDownloadMapTiles();
      }
    }).catch(() => {});
  }, [isOpen, cachedTileCount, downloadState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadMapTiles = async () => {
    if (!navigator.onLine) {
      setDownloadState('error');
      return;
    }
    setDownloadState('locating');
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, timeout: 10000,
        });
      });
      const { latitude: lat, longitude: lng } = position.coords;
      const urls = computeTileList(lat, lng, DEFAULT_TILE_LEVELS);

      setDownloadState('downloading');
      setDownloadProgress({ completed: 0, total: urls.length, failed: 0 });

      const unlisten = listenForTileProgress((data) => {
        setDownloadProgress({ completed: data.completed, total: data.total, failed: data.failed });
        if (data.done) {
          setDownloadState(data.cancelled ? 'idle' : 'complete');
          setCachedTileCount(prev => Math.max(prev || 0, data.completed));
          requestTileCacheSize(); // get exact count
          unlisten();
        }
      });

      await requestTileDownload(urls);
    } catch {
      setDownloadState('error');
    }
  };

  const handleCancelTileDownload = () => {
    requestCancelTileDownload();
    setDownloadState('idle');
  };

  const handleClearTileCache = () => {
    requestClearTileCache();
    setDownloadState('idle');
  };

  const handleStateChange = (stateKey) => {
    setSelectedState(stateKey);
    localStorage.setItem('safeneighbor_home_state', stateKey);
  };

  const stateData = selectedState ? STATE_RESOURCES[selectedState] : null;
  const hotlines = NATIONAL_RESOURCES.hotlines.slice(0, 3);

  const rights = [
    t('offlineLibrary.right1'),
    t('offlineLibrary.right2'),
    t('offlineLibrary.right3'),
    t('offlineLibrary.right4'),
    t('offlineLibrary.right5'),
  ];

  // Check if family plan has any useful data to display
  const hasPrimaryContact = familyPlan?.contacts?.[0]?.name;
  const hasAttorney = familyPlan?.keyNumbers?.attorneyName;
  const hasCodeWord = familyPlan?.communication?.codeWord;
  const hasMeetingPlace = familyPlan?.communication?.meetingPlace;
  const hasPlanData = hasPrimaryContact || hasAttorney || hasCodeWord || hasMeetingPlace;

  // Reusable collapsible section header
  const SectionToggle = ({ isOpen: open, onToggle, icon: Icon, iconColor, label }) => (
    <button onClick={onToggle} className="w-full flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={16} weight="bold" className={iconColor} />
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">{label}</h4>
      </div>
      {open
        ? <CaretUp size={14} weight="bold" className="text-slate-500" />
        : <CaretDown size={14} weight="bold" className="text-slate-500" />
      }
    </button>
  );

  const CollapsibleBody = ({ isOpen: open, children }) => (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm safe-modal-frame"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="safe-modal-panel bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-md overflow-hidden border border-slate-700/50 flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="safe-modal-header flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <WifiSlash size={20} weight="bold" className="text-emerald-400" />
                <h2 className="text-lg font-bold text-white">{t('offlineLibrary.title')}</h2>
              </div>
              <button
                onClick={onClose}
                className="safe-modal-close p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">

              {/* Offline Readiness Badge */}
              <div className="space-y-2">
                <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold
                  ${isReady === null
                    ? 'bg-slate-800 text-slate-400'
                    : isReady
                      ? 'bg-emerald-900/40 border border-emerald-700/40 text-emerald-400'
                      : 'bg-amber-900/30 border border-amber-700/40 text-amber-400'
                  }`}
                >
                  {isReady === null ? (
                    <span className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-slate-300 animate-spin inline-block" />
                  ) : isReady ? (
                    <CheckCircle size={18} weight="bold" />
                  ) : (
                    <Warning size={18} weight="bold" />
                  )}
                  <span>
                    {isReady === null
                      ? t('offlineLibrary.checking')
                      : isReady
                        ? t('offlineLibrary.readyBadge')
                        : t('offlineLibrary.notReadyBadge')}
                  </span>
                </div>
                {isReady === false && (
                  <button
                    onClick={onInstall}
                    className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider transition-colors pl-1"
                  >
                    {t('offlineLibrary.installPrompt')}
                  </button>
                )}
              </div>

              <div className="border-t border-slate-700/50" />

              {/* ══ Offline Map Tiles ══ */}
              <div>
                <SectionToggle
                  isOpen={showMapDownload} onToggle={() => setShowMapDownload(!showMapDownload)}
                  icon={MapTrifold} iconColor="text-cyan-400"
                  label={t('offlineLibrary.mapTiles')}
                />
                <CollapsibleBody isOpen={showMapDownload}>
                  <div className="space-y-3">
                    {/* Cache status */}
                    <div className="bg-slate-900/50 border border-slate-700/40 rounded-xl px-3.5 py-2.5">
                      <p className="text-slate-400 text-xs">
                        {cachedTileCount !== null
                          ? t('offlineLibrary.mapTilesCached', { count: cachedTileCount, size: estimateStorageMB(cachedTileCount) })
                          : t('offlineLibrary.mapTilesChecking')
                        }
                      </p>
                    </div>

                    <p className="text-slate-500 text-xs leading-relaxed">
                      {t('offlineLibrary.mapTilesDesc', { tiles: 404, size: estimateStorageMB(404) })}
                    </p>

                    {/* Progress bar */}
                    {downloadState === 'downloading' && (
                      <div className="space-y-2">
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${downloadProgress.total > 0 ? (downloadProgress.completed / downloadProgress.total) * 100 : 0}%` }}
                          />
                        </div>
                        <p className="text-cyan-400 text-xs font-bold text-center">
                          {t('offlineLibrary.mapTilesProgress', {
                            completed: downloadProgress.completed,
                            total: downloadProgress.total,
                          })}
                        </p>
                        {downloadProgress.failed > 0 && (
                          <p className="text-amber-400 text-xs text-center">
                            {t('offlineLibrary.mapTilesFailed', { count: downloadProgress.failed })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Status messages */}
                    {downloadState === 'locating' && (
                      <p className="text-cyan-400 text-xs font-bold animate-pulse">
                        {t('offlineLibrary.mapTilesLocating')}
                      </p>
                    )}
                    {downloadState === 'complete' && (
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                        <CheckCircle size={16} weight="bold" />
                        {t('offlineLibrary.mapTilesComplete')}
                      </div>
                    )}
                    {downloadState === 'error' && (
                      <p className="text-red-400 text-xs font-bold">
                        {t('offlineLibrary.mapTilesError')}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {downloadState !== 'downloading' ? (
                        <button
                          onClick={handleDownloadMapTiles}
                          disabled={downloadState === 'locating'}
                          className="flex-1 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
                        >
                          {downloadState === 'complete'
                            ? t('offlineLibrary.mapTilesRedownload')
                            : t('offlineLibrary.mapTilesDownload')
                          }
                        </button>
                      ) : (
                        <button
                          onClick={handleCancelTileDownload}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
                        >
                          {t('offlineLibrary.mapTilesCancel')}
                        </button>
                      )}
                      {cachedTileCount > 0 && downloadState !== 'downloading' && (
                        <button
                          onClick={handleClearTileCache}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all active:scale-95"
                        >
                          {t('offlineLibrary.mapTilesClear')}
                        </button>
                      )}
                    </div>

                    <p className="text-slate-600 text-[10px] leading-relaxed">
                      {t('offlineLibrary.mapTilesAttribution')}
                    </p>
                  </div>
                </CollapsibleBody>
              </div>

              <div className="border-t border-slate-700/50" />

              {/* ══ Rights Quick Reference ══ */}
              <div>
                <SectionToggle
                  isOpen={showRights} onToggle={() => setShowRights(!showRights)}
                  icon={ShieldCheck} iconColor="text-blue-400"
                  label={t('offlineLibrary.rightsGuide')}
                />
                <CollapsibleBody isOpen={showRights}>
                  <div className="space-y-2">
                    {rights.map((right, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 bg-slate-900/50 border border-slate-700/40 rounded-xl px-3.5 py-2.5"
                      >
                        <span className="text-blue-400 text-xs font-black shrink-0 mt-0.5 w-4 text-center">
                          {i + 1}
                        </span>
                        <p className="text-slate-300 text-xs leading-relaxed">{right}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleBody>
              </div>

              <div className="border-t border-slate-700/50" />

              {/* ══ Encounter Quick Scripts ══ */}
              <div>
                <SectionToggle
                  isOpen={showScripts} onToggle={() => setShowScripts(!showScripts)}
                  icon={ChatText} iconColor="text-blue-400"
                  label={t('offlineLibrary.encounterScripts')}
                />
                <CollapsibleBody isOpen={showScripts}>
                  <div className="space-y-3">
                    {QUICK_SCENARIOS.map(id => {
                      const s = scenarios[id];
                      if (!s) return null;
                      return (
                        <div key={id} className="bg-slate-900/50 border border-slate-700/40 rounded-xl px-3.5 py-2.5 space-y-2">
                          <p className="text-white text-sm font-semibold">{t(s.title)}</p>
                          {s.emergencyScript.slice(0, 2).map(step => (
                            <div key={step.step} className="flex items-start gap-2">
                              <span className="text-blue-400 text-xs font-black shrink-0 mt-0.5 w-4 text-center">{step.step}</span>
                              <div>
                                <p className="text-amber-400 text-xs font-bold uppercase">{t(step.action)}</p>
                                <p className="text-slate-300 text-xs italic leading-relaxed">"{t(step.script)}"</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleBody>
              </div>

              <div className="border-t border-slate-700/50" />

              {/* ══ Warrant Identification ══ */}
              <div>
                <SectionToggle
                  isOpen={showWarrant} onToggle={() => setShowWarrant(!showWarrant)}
                  icon={Gavel} iconColor="text-red-400"
                  label={t('offlineLibrary.warrantGuide')}
                />
                <CollapsibleBody isOpen={showWarrant}>
                  <div className="space-y-3">
                    {/* Judicial vs Administrative cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-900/50 border border-emerald-500/30 rounded-xl px-3 py-2.5">
                        <p className="text-emerald-400 text-xs font-bold uppercase mb-1">{t('scenarioData.doorWarrantJudicialTitle')}</p>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{t('scenarioData.doorWarrantJudicialDesc')}</p>
                      </div>
                      <div className="bg-slate-900/50 border border-red-500/30 rounded-xl px-3 py-2.5">
                        <p className="text-red-400 text-xs font-bold uppercase mb-1">{t('scenarioData.doorWarrantAdminTitle')}</p>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{t('scenarioData.doorWarrantAdminDesc')}</p>
                      </div>
                    </div>
                    {/* Tips */}
                    <div className="space-y-1.5">
                      {[1, 2, 3].map(n => (
                        <p key={n} className="text-slate-300 text-xs flex items-start gap-2">
                          <span className="text-amber-400 shrink-0 font-black">!</span>
                          {t(`offlineLibrary.warrantTip${n}`)}
                        </p>
                      ))}
                    </div>
                  </div>
                </CollapsibleBody>
              </div>

              <div className="border-t border-slate-700/50" />

              {/* ══ De-escalation Tips ══ */}
              <div>
                <SectionToggle
                  isOpen={showDeesc} onToggle={() => setShowDeesc(!showDeesc)}
                  icon={HandPalm} iconColor="text-emerald-400"
                  label={t('offlineLibrary.deescTips')}
                />
                <CollapsibleBody isOpen={showDeesc}>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className="bg-slate-900/50 border border-slate-700/40 rounded-xl px-3.5 py-2.5">
                        <p className="text-white text-sm font-semibold">{t(`deescalation.card${n}Title`)}</p>
                        <p className="text-emerald-400 text-xs font-medium mt-1">{t(`deescalation.card${n}Action`)}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleBody>
              </div>

              <div className="border-t border-slate-700/50" />

              {/* ══ ICE vs Local Police ══ */}
              <div>
                <SectionToggle
                  isOpen={showIcePolice} onToggle={() => setShowIcePolice(!showIcePolice)}
                  icon={IdentificationCard} iconColor="text-amber-400"
                  label={t('offlineLibrary.iceVsPolice')}
                />
                <CollapsibleBody isOpen={showIcePolice}>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className="flex items-start gap-2.5 bg-slate-900/50 border border-slate-700/40 rounded-xl px-3.5 py-2.5">
                        <span className="text-amber-400 text-xs font-black shrink-0 mt-0.5 w-4 text-center">{n}</span>
                        <p className="text-slate-300 text-xs leading-relaxed">{t(`offlineLibrary.iceVsPolice${n}`)}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleBody>
              </div>

              <div className="border-t border-slate-700/50" />

              {/* ══ State Picker + Local Attorneys ══ */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  {t('offlineLibrary.selectState')}
                </h4>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm mb-4 focus:outline-none focus:border-emerald-600"
                >
                  <option value="">{t('offlineLibrary.selectStatePlaceholder')}</option>
                  {Object.entries(STATE_RESOURCES).map(([key, val]) => (
                    <option key={key} value={key}>{val.name}</option>
                  ))}
                </select>

                {/* Local org list */}
                {stateData ? (
                  <div className="space-y-2 mb-4">
                    {stateData.organizations.slice(0, 5).map((org) => (
                      <div
                        key={org.id}
                        className="bg-slate-900/50 border border-slate-700/40 rounded-xl px-3.5 py-2.5"
                      >
                        <div className="flex items-start gap-2">
                          <BuildingOffice size={14} weight="bold" className="text-emerald-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-white text-sm font-semibold leading-tight">{org.name}</p>
                            {org.city && (
                              <p className="text-slate-500 text-xs">{org.city}</p>
                            )}
                            {org.phone && (
                              <p className="text-blue-400 text-xs font-medium mt-0.5">{org.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm mb-4">{t('offlineLibrary.noStateSelected')}</p>
                )}

                {/* National Hotlines — always visible */}
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  {t('offlineLibrary.nationalHotlines')}
                </h4>
                <div className="space-y-2">
                  {hotlines.map((h) => (
                    <div
                      key={h.id}
                      className="bg-slate-900/50 border border-slate-700/40 rounded-xl px-3.5 py-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <Phone size={14} weight="bold" className="text-red-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-white text-sm font-semibold leading-tight">{h.name}</p>
                          {h.phone && (
                            <p className="text-blue-400 text-xs font-medium mt-0.5">{h.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700/50" />

              {/* ══ Post-Encounter Checklist ══ */}
              <div>
                <SectionToggle
                  isOpen={showPostEncounter} onToggle={() => setShowPostEncounter(!showPostEncounter)}
                  icon={FirstAidKit} iconColor="text-red-400"
                  label={t('offlineLibrary.postEncounter')}
                />
                <CollapsibleBody isOpen={showPostEncounter}>
                  <div className="space-y-3">
                    {POST_ENCOUNTER_SCENARIOS.map(branch => {
                      const firstSection = branch.sections.find(s => s.urgency === 'high') || branch.sections[0];
                      const colorMap = {
                        red: { border: 'border-red-500/30', text: 'text-red-400' },
                        amber: { border: 'border-amber-500/30', text: 'text-amber-400' },
                        emerald: { border: 'border-emerald-500/30', text: 'text-emerald-400' },
                      };
                      const colors = colorMap[branch.color] || colorMap.amber;
                      return (
                        <div key={branch.id} className={`bg-slate-900/50 border ${colors.border} rounded-xl px-3.5 py-2.5`}>
                          <p className={`text-sm font-semibold ${colors.text}`}>{t(branch.title)}</p>
                          <p className="text-slate-400 text-xs mb-2">{t(branch.description)}</p>
                          <div className="space-y-1">
                            {firstSection.checklist?.slice(0, 3).map((item, i) => (
                              <p key={i} className="text-slate-300 text-xs flex items-start gap-2">
                                <span className="text-slate-500 shrink-0">•</span>
                                {t(item)}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleBody>
              </div>

              <div className="border-t border-slate-700/50" />

              {/* ══ Document Checklist ══ */}
              <div>
                <SectionToggle
                  isOpen={showDocChecklist} onToggle={() => setShowDocChecklist(!showDocChecklist)}
                  icon={FileText} iconColor="text-violet-400"
                  label={t('offlineLibrary.docChecklist')}
                />
                <CollapsibleBody isOpen={showDocChecklist}>
                  <div className="space-y-4">
                    {/* Always Have Ready */}
                    <div>
                      <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                        {t('offlineLibrary.docCarryLabel')}
                      </p>
                      <div className="space-y-1.5">
                        {[1, 2, 3, 4].map(n => (
                          <p key={n} className="text-slate-300 text-xs flex items-start gap-2">
                            <span className="text-emerald-500 shrink-0">+</span>
                            {t(`offlineLibrary.docCarry${n}`)}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Never Carry During Encounters */}
                    <div>
                      <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                        {t('offlineLibrary.docNeverCarryLabel')}
                      </p>
                      <div className="space-y-1.5">
                        {[1, 2, 3, 4].map(n => (
                          <p key={n} className="text-slate-300 text-xs flex items-start gap-2">
                            <span className="text-red-500 shrink-0">-</span>
                            {t(`offlineLibrary.docNeverCarry${n}`)}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Never Sign warning */}
                    <div className="bg-red-900/20 border border-red-700/30 rounded-xl px-3.5 py-2.5">
                      <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">
                        {t('offlineLibrary.neverSignTitle')}
                      </p>
                      {NEVER_SIGN_WARNING.forms.map((form, i) => (
                        <div key={i} className="mb-2 last:mb-0">
                          <p className="text-white text-xs font-semibold">{form.name}</p>
                          <p className="text-slate-400 text-[11px] leading-relaxed">{form.danger}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleBody>
              </div>

              <div className="border-t border-slate-700/50" />

              {/* ══ My Safety Plan ══ */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} weight="bold" className="text-amber-400" />
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    {t('offlineLibrary.mySafetyPlan')}
                  </h4>
                </div>
                {hasPlanData ? (
                  <div className="bg-slate-900/50 border border-slate-700/40 rounded-xl px-3.5 py-3 space-y-3">
                    {hasPrimaryContact && (
                      <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                          {t('offlineLibrary.primaryContact')}
                        </p>
                        <p className="text-white text-sm font-semibold">{familyPlan.contacts[0].name}</p>
                        {familyPlan.contacts[0].phone && (
                          <p className="text-blue-400 text-xs">{familyPlan.contacts[0].phone}</p>
                        )}
                      </div>
                    )}
                    {hasAttorney && (
                      <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                          {t('offlineLibrary.attorney')}
                        </p>
                        <p className="text-white text-sm font-semibold">{familyPlan.keyNumbers.attorneyName}</p>
                        {familyPlan.keyNumbers.attorneyPhone && (
                          <p className="text-blue-400 text-xs">{familyPlan.keyNumbers.attorneyPhone}</p>
                        )}
                      </div>
                    )}
                    {hasCodeWord && (
                      <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                          {t('offlineLibrary.codeWord')}
                        </p>
                        <p className="text-amber-300 text-sm font-bold">{familyPlan.communication.codeWord}</p>
                      </div>
                    )}
                    {hasMeetingPlace && (
                      <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                          {t('offlineLibrary.meetingPlace')}
                        </p>
                        <p className="text-white text-sm">{familyPlan.communication.meetingPlace}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">{t('offlineLibrary.planEmpty')}</p>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-2">
                <button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50 active:scale-95"
                >
                  {t('offlineLibrary.close')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineLibrary;
