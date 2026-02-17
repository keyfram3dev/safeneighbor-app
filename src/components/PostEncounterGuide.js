// src/components/PostEncounterGuide.js
// "What Now?" — Post-encounter branched walkthrough with checklists

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CaretRight, Check, Phone, ArrowRight,
  ShareNetwork, EnvelopeSimple, CopySimple, Printer,
  NotePencil, Scales, ShieldCheck, UsersThree, UserCircle,
  Eye, FileText, MapPin, Shield, Calendar, FirstAidKit,
  Gavel, DownloadSimple,
} from '@phosphor-icons/react';
import { POST_ENCOUNTER_SCENARIOS, SHARED_SECTIONS } from '../data/postEncounterData';
import { generatePostEncounterReport } from '../utils/postEncounterDocument';
import Disclaimer from './Disclaimer';
import InstallHelp from './InstallHelp';

// ── Icon map for data-driven rendering ──────────────────
const ICON_MAP = {
  NotePencil, Scales, ShieldCheck, UsersThree, UserCircle,
  Eye, FileText, MapPin, Shield, Calendar, FirstAidKit,
  Gavel, Phone,
};

const STORAGE_KEY = 'safeneighbor_post_encounter_checklist';

const URGENCY_COLORS = {
  high: {
    border: 'border-red-700/30',
    bg: 'bg-red-950/20',
    text: 'text-red-400',
    badge: 'bg-red-900/40 text-red-300',
    dot: 'bg-red-500',
  },
  medium: {
    border: 'border-amber-700/30',
    bg: 'bg-amber-950/20',
    text: 'text-amber-400',
    badge: 'bg-amber-900/40 text-amber-300',
    dot: 'bg-amber-500',
  },
  info: {
    border: 'border-blue-700/30',
    bg: 'bg-blue-950/20',
    text: 'text-blue-400',
    badge: 'bg-blue-900/40 text-blue-300',
    dot: 'bg-blue-500',
  },
};

const BRANCH_COLORS = {
  red: { border: 'border-red-700/30', hoverBorder: 'hover:border-red-500/30', shadow: 'hover:shadow-red-500/5', text: 'text-red-400', bg: 'from-red-500/0 to-rose-500/0 group-hover:from-red-500/5 group-hover:to-rose-500/5' },
  amber: { border: 'border-amber-700/30', hoverBorder: 'hover:border-amber-500/30', shadow: 'hover:shadow-amber-500/5', text: 'text-amber-400', bg: 'from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/5 group-hover:to-orange-500/5' },
  emerald: { border: 'border-emerald-700/30', hoverBorder: 'hover:border-emerald-500/30', shadow: 'hover:shadow-emerald-500/5', text: 'text-emerald-400', bg: 'from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5' },
};

// ── Component ───────────────────────────────────────────

const PostEncounterGuide = ({ onBack, onNavigateToScenario }) => {
  const { t } = useTranslation();
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [checkedItems, setCheckedItems] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      // Migrate: if any section has string values (old format), reset it to use indices
      for (const branchId in stored) {
        for (const sectionId in stored[branchId]) {
          const arr = stored[branchId][sectionId];
          if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') {
            stored[branchId][sectionId] = [];
          }
        }
      }
      return stored;
    } catch { return {}; }
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const saveTimerRef = useRef(null);

  // ── Persistence ──────────────────────────────────────
  const save = useCallback((data) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    }, 500);
  }, []);

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  useEffect(() => { save(checkedItems); }, [checkedItems, save]);

  // ── Helpers ──────────────────────────────────────────
  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const toggleCheckItem = (branchId, sectionId, itemIndex) => {
    setCheckedItems((prev) => {
      const next = { ...prev };
      if (!next[branchId]) next[branchId] = {};
      if (!next[branchId][sectionId]) next[branchId][sectionId] = [];
      const arr = [...next[branchId][sectionId]];
      const pos = arr.indexOf(itemIndex);
      if (pos >= 0) arr.splice(pos, 1);
      else arr.push(itemIndex);
      next[branchId] = { ...next[branchId], [sectionId]: arr };
      return next;
    });
  };

  const isChecked = (branchId, sectionId, itemIndex) => {
    return (checkedItems[branchId]?.[sectionId] || []).includes(itemIndex);
  };

  const getProgress = (branchId, sections) => {
    const branchChecked = checkedItems[branchId] || {};
    let total = 0;
    let checked = 0;
    for (const s of sections) {
      if (s.checklist) {
        total += s.checklist.length;
        checked += (branchChecked[s.id] || []).length;
      }
    }
    return { total, checked };
  };

  // ── Share handlers ───────────────────────────────────
  const getReport = () => generatePostEncounterReport(selectedBranch, checkedItems);

  const handleEmail = () => {
    const report = getReport();
    const subject = encodeURIComponent(t('postEncounter.emailSubject'));
    const body = encodeURIComponent(report);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleWebShare = async () => {
    try {
      await navigator.share({ title: t('postEncounter.webShareTitle'), text: getReport() });
    } catch {}
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<pre style="font-family:monospace;white-space:pre-wrap;max-width:800px;margin:0 auto;padding:20px;">${getReport()}</pre>`);
      w.document.close();
      w.print();
    }
  };

  // ── Cross-link navigation ────────────────────────────
  const handleFeatureLink = (featureId) => {
    if (onNavigateToScenario) {
      onNavigateToScenario({ id: featureId });
    }
  };

  // ── Get icon component from string ───────────────────
  const getIcon = (iconName) => ICON_MAP[iconName] || FirstAidKit;

  // ── Data ─────────────────────────────────────────────
  const branch = POST_ENCOUNTER_SCENARIOS.find((b) => b.id === selectedBranch);
  const allSections = branch ? [...branch.sections, ...SHARED_SECTIONS] : [];
  const progress = branch ? getProgress(selectedBranch, allSections) : { total: 0, checked: 0 };

  // ── Render ───────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Back button */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button
          onClick={selectedBranch ? () => setSelectedBranch(null) : onBack}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={20} weight="bold" className="rtl:scale-x-[-1]" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FirstAidKit size={24} weight="bold" className="text-emerald-400" />
            {t('postEncounter.title')}
          </h1>
          <p className="text-slate-400 text-sm">
            {selectedBranch
              ? t(branch?.title || '')
              : t('postEncounter.subtitle')}
          </p>
        </div>
      </div>

      {/* ── Scenario Selector ─────────────────────────── */}
      {!selectedBranch && (
        <div className="space-y-3">
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            {t('postEncounter.introText')}
          </p>

          {POST_ENCOUNTER_SCENARIOS.map((scenario) => {
            const colors = BRANCH_COLORS[scenario.color];
            const Icon = getIcon(scenario.icon);
            return (
              <div
                key={scenario.id}
                onClick={() => { setSelectedBranch(scenario.id); window.scrollTo(0, 0); }}
                className={`group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border ${colors.border} rounded-2xl p-5 cursor-pointer transition-all duration-300 ${colors.hoverBorder} hover:shadow-lg ${colors.shadow} hover:-translate-y-0.5`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} rounded-2xl transition-all duration-300 pointer-events-none`} />
                <div className="relative flex items-start gap-4">
                  <div className={`p-3 bg-slate-800 rounded-xl border ${colors.border} transition-all`}>
                    <Icon size={24} weight="bold" className={colors.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white mb-1 group-hover:text-slate-100 transition-colors">
                      {t(scenario.title)}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">
                      {t(scenario.description)}
                    </p>
                    <span className={`${colors.text} text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all`}>
                      {t('postEncounter.getStarted')} <CaretRight size={16} weight="bold" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Branch Content ────────────────────────────── */}
      {selectedBranch && branch && (
        <>
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('postEncounter.progress')}</span>
              <span className="text-xs font-bold text-slate-400">{t('postEncounter.progressCount', { checked: progress.checked, total: progress.total })}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: progress.total > 0 ? `${(progress.checked / progress.total) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Accordion sections */}
          <div className="space-y-3">
            {allSections.map((section) => {
              const isOpen = expandedSections.has(section.id);
              const urgency = URGENCY_COLORS[section.urgency] || URGENCY_COLORS.info;
              const Icon = getIcon(section.icon);
              const sectionChecked = (checkedItems[selectedBranch]?.[section.id] || []).length;
              const sectionTotal = section.checklist?.length || 0;

              return (
                <div
                  key={section.id}
                  className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 border ${urgency.border} rounded-2xl overflow-hidden`}
                >
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full p-4 flex items-center justify-between text-start"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon size={20} weight="bold" className={urgency.text} />
                      <span className="text-white font-bold text-sm truncate">{t(section.title)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ms-2">
                      {sectionTotal > 0 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sectionChecked === sectionTotal ? 'bg-emerald-900/40 text-emerald-300' : 'text-slate-500'}`}>
                          {sectionChecked}/{sectionTotal}
                        </span>
                      )}
                      <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                        <CaretRight size={16} weight="bold" className="text-slate-500" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="px-4 pb-5 border-t border-slate-700/30">
                          {/* Content paragraph */}
                          {section.content && (
                            <p className="text-slate-300 text-sm leading-relaxed mt-4 mb-4">
                              {t(section.content)}
                            </p>
                          )}

                          {/* Checklist */}
                          {section.checklist && (
                            <div className="space-y-2 mb-4">
                              {section.checklist.map((item, idx) => {
                                const checked = isChecked(selectedBranch, section.id, idx);
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => toggleCheckItem(selectedBranch, section.id, idx)}
                                    className={`w-full flex items-start gap-3 text-start p-2.5 rounded-xl transition-all ${checked ? 'bg-emerald-950/30 border border-emerald-700/30' : 'bg-slate-900/50 border border-slate-700/30 hover:border-slate-600/50'}`}
                                  >
                                    <div className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 transition-all ${checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-600'}`}>
                                      {checked && <Check size={14} weight="bold" className="text-white" />}
                                    </div>
                                    <span className={`text-sm leading-relaxed ${checked ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                      {t(item)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Info points (court-rights) */}
                          {section.infoPoints && (
                            <div className="space-y-2 mb-4">
                              {section.infoPoints.map((point, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-2.5 bg-slate-900/50 border border-slate-700/30 rounded-xl">
                                  <div className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${urgency.dot}`} />
                                  <span className="text-slate-300 text-sm leading-relaxed">{t(point)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Hotlines */}
                          {section.hotlines && section.hotlines.length > 0 && (
                            <div className="space-y-2 mb-4">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('postEncounter.callNow')}</p>
                              {section.hotlines.map((h) => (
                                <a
                                  key={h.number}
                                  href={`tel:${h.number.replace(/[^0-9]/g, '')}`}
                                  className="flex items-center gap-3 bg-red-950/30 border border-red-700/30 rounded-xl px-4 py-3 text-sm active:scale-95 transition-all"
                                >
                                  <Phone size={18} weight="bold" className="text-red-400 shrink-0" />
                                  <span className="text-white font-semibold flex-1 min-w-0">{h.name}</span>
                                  <span className="text-red-400 font-bold shrink-0">{h.number}</span>
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Cross-link to existing feature */}
                          {section.linkToFeature && (
                            <button
                              onClick={() => handleFeatureLink(section.linkToFeature)}
                              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-bold uppercase tracking-wider transition-colors mb-3"
                            >
                              <ArrowRight size={16} weight="bold" />
                              {section.linkLabel ? t(section.linkLabel) : t('postEncounter.openFeature')}
                            </button>
                          )}

                          {/* External links */}
                          {section.links && section.links.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('postEncounter.resources')}</p>
                              {section.links.map((link) => (
                                <a
                                  key={link.url}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                                >
                                  <ArrowRight size={14} weight="bold" className="shrink-0" />
                                  <span className="underline underline-offset-2">{link.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Share Report Button */}
          <div className="mt-8">
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-wider"
            >
              <ShareNetwork size={24} weight="bold" />
              {t('postEncounter.shareChecklist')}
            </button>
            <p className="text-slate-500 text-xs text-center mt-2">
              {t('postEncounter.shareChecklistDesc')}
            </p>
          </div>
        </>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-8 sm:pb-6 safe-bottom-padding">
            <h3 className="text-white font-black text-lg mb-1">{t('postEncounter.shareModalTitle')}</h3>
            <p className="text-slate-400 text-xs mb-5">{t('postEncounter.shareModalDesc')}</p>

            <div className="space-y-3">
              <button onClick={handleEmail} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <EnvelopeSimple size={20} weight="bold" />
                <span>{t('postEncounter.sendViaEmail')}</span>
              </button>

              <button onClick={handleCopy} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <CopySimple size={20} weight="bold" />
                <span>{copied ? t('postEncounter.copied') : t('postEncounter.copyToClipboard')}</span>
              </button>

              {typeof navigator.share === 'function' && (
                <button onClick={handleWebShare} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                  <ShareNetwork size={20} weight="bold" />
                  <span>{t('postEncounter.share')}</span>
                </button>
              )}

              <button onClick={handlePrint} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <Printer size={20} weight="bold" />
                <span>{t('postEncounter.print')}</span>
              </button>
            </div>

            <button onClick={() => setShowShareModal(false)} className="w-full mt-4 text-slate-400 hover:text-white text-sm font-medium uppercase tracking-wider transition-colors py-2">
              {t('postEncounter.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8">
        <Disclaimer>
          {t('postEncounter.disclaimerLine1')}
          <br />{t('postEncounter.disclaimerLine2')}
          <br />{t('postEncounter.disclaimerLine3')}
        </Disclaimer>
      </div>

      {/* Install PWA Button */}
      <div className="mt-8 text-center">
        <button
          onClick={() => {
            if (window.deferredPrompt) {
              window.deferredPrompt.prompt();
            } else {
              alert(t('postEncounter.installAlert'));
            }
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 inline-flex items-center gap-2"
        >
          <DownloadSimple size={18} weight="bold" />
          {t('postEncounter.installButton')}
        </button>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
          {t('postEncounter.installRecommended')}
        </p>
        <button
          onClick={() => setShowInstallHelp(true)}
          className="text-blue-400 hover:text-blue-300 text-xs font-semibold mt-2 transition-colors"
        >
          {t('postEncounter.installHelp')}
        </button>
      </div>
      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
};

export default PostEncounterGuide;
