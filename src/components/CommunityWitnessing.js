// src/components/CommunityWitnessing.js
// Community Witnessing Guide — how to safely document ICE/DHS activity as a bystander witness

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Eye, CaretRight, CheckCircle, Warning,
  MapPin, Camera, ArrowRight, Shield, FlowerLotus,
  ScalesIcon as Scales, NotePencilIcon as NotePencil, WifiSlashIcon as WifiSlash,
  ListChecksIcon as ListChecks,
  UsersThreeIcon as UsersThree,
  Lightning,
} from '@phosphor-icons/react';
import Disclaimer from './Disclaimer';

// ── Checklist item with tap-to-check ──────────────────────────────────────────
const CheckItem = ({ label, checked, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-start gap-3 py-2 text-left group"
  >
    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
      checked
        ? 'bg-teal-500 border-teal-500'
        : 'border-slate-600 group-hover:border-teal-500/60'
    }`}>
      {checked && <CheckCircle size={12} weight="bold" className="text-white" />}
    </div>
    <span className={`text-sm transition-colors ${checked ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
      {label}
    </span>
  </button>
);

// ── Script callout box ─────────────────────────────────────────────────────────
const ScriptBox = ({ children }) => (
  <div className="bg-teal-950/40 border border-teal-700/40 rounded-xl px-4 py-3 mt-3">
    <p className="text-teal-100 text-sm font-medium italic leading-relaxed">
      "{children}"
    </p>
  </div>
);

// ── Warning callout ────────────────────────────────────────────────────────────
const WarnBox = ({ children }) => (
  <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl px-4 py-3 mt-3 flex items-start gap-2">
    <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" />
    <p className="text-amber-200 text-sm leading-relaxed">{children}</p>
  </div>
);

// ── Numbered pipeline step ─────────────────────────────────────────────────────
const PipelineStep = ({ num, children }) => (
  <div className="flex items-start gap-3 py-1.5">
    <div className="w-6 h-6 rounded-full bg-teal-800/60 border border-teal-600/50 flex-shrink-0 flex items-center justify-center text-teal-300 text-xs font-bold">
      {num}
    </div>
    <p className="text-sm text-slate-200 leading-relaxed">{children}</p>
  </div>
);

// ── Expandable Section ─────────────────────────────────────────────────────────
const Section = ({ id, icon: Icon, title, expanded, onToggle, children, accent = 'teal' }) => {
  const accentMap = {
    teal: { header: 'text-teal-400', border: 'border-teal-700/30', hover: 'hover:border-teal-500/30', shadow: 'hover:shadow-teal-500/5', caret: 'text-slate-400', caretHover: 'group-hover:text-teal-400' },
    amber: { header: 'text-amber-400', border: 'border-amber-700/30', hover: 'hover:border-amber-500/30', shadow: 'hover:shadow-amber-500/5', caret: 'text-slate-400', caretHover: 'group-hover:text-amber-400' },
    red: { header: 'text-red-400', border: 'border-red-700/30', hover: 'hover:border-red-500/30', shadow: 'hover:shadow-red-500/5', caret: 'text-slate-400', caretHover: 'group-hover:text-red-400' },
  };
  const a = accentMap[accent] || accentMap.teal;

  return (
    <div className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border ${a.border} ${a.hover} ${a.shadow} rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
      <button
        onClick={() => onToggle(id)}
        className="group w-full flex items-center gap-3 p-5 text-left hover:bg-slate-800/70 transition-colors"
      >
        <Icon size={22} weight="bold" className={a.header} />
        <span className="flex-1 font-semibold text-white">{title}</span>
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <CaretRight size={16} weight="bold" className={`${a.caret} ${a.caretHover} transition-colors`} />
        </motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 border-t border-slate-700/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const CommunityWitnessing = ({ onBack, onOpenLegalResponse, onOpenEncounterLog, onOpenPracticeWitness }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(new Set(['role']));
  const [checkedDocs, setCheckedDocs] = useState(new Set());

  const toggleSection = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDoc = (i) => {
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const docItems = [
    t('communityWitnessing.doc1'),
    t('communityWitnessing.doc2'),
    t('communityWitnessing.doc3'),
    t('communityWitnessing.doc4'),
    t('communityWitnessing.doc5'),
    t('communityWitnessing.doc6'),
    t('communityWitnessing.doc7'),
    t('communityWitnessing.doc8'),
  ];

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4">

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-4"
      >
        <ArrowLeft size={18} weight="bold" />
        <span className="text-sm">{t('scenarioDetail.back')}</span>
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-teal-900/40 border border-teal-700/40 flex items-center justify-center mx-auto mb-4">
          <Eye size={32} weight="bold" className="text-teal-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">{t('communityWitnessing.title')}</h1>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">{t('communityWitnessing.subtitle')}</p>

        {/* Legal basis badge */}
        <div className="mt-4 inline-flex items-center gap-2 bg-teal-900/30 border border-teal-700/30 rounded-full px-3 py-1.5">
          <Scales size={14} weight="bold" className="text-teal-400" />
          <span className="text-teal-300 text-xs font-medium">{t('communityWitnessing.legalBadge')}</span>
        </div>

        {onOpenPracticeWitness && (
          <div className="mt-4">
            <button
              onClick={onOpenPracticeWitness}
              className="inline-flex items-center gap-2 rounded-2xl border border-teal-500/25 bg-teal-500/10 px-4 py-3 text-sm font-bold text-teal-100 transition-colors hover:border-teal-400/40 hover:bg-teal-500/15"
            >
              <Lightning size={16} weight="bold" />
              Practice witness response
            </button>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-3">

        {/* 1 — Your Role */}
        <Section
          id="role"
          icon={UsersThree}
          title={t('communityWitnessing.roleTitle')}
          expanded={expanded.has('role')}
          onToggle={toggleSection}
          accent="teal"
        >
          <p className="text-slate-300 text-sm leading-relaxed mt-3">
            {t('communityWitnessing.roleBody')}
          </p>
          <div className="mt-3 bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-700/40">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">{t('communityWitnessing.legalCitation')}</p>
            <p className="text-slate-300 text-sm italic">{t('communityWitnessing.legalCitationText')}</p>
          </div>
        </Section>

        {/* 2 — Positioning */}
        <Section
          id="positioning"
          icon={MapPin}
          title={t('communityWitnessing.positioningTitle')}
          expanded={expanded.has('positioning')}
          onToggle={toggleSection}
          accent="teal"
        >
          <p className="text-slate-300 text-sm leading-relaxed mt-3">{t('communityWitnessing.positioningBody')}</p>
          <div className="mt-3 space-y-2">
            {[
              t('communityWitnessing.posRule1'),
              t('communityWitnessing.posRule2'),
              t('communityWitnessing.posRule3'),
              t('communityWitnessing.posRule4'),
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />
                <p className="text-slate-200 text-sm">{rule}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 3 — What to Document */}
        <Section
          id="document"
          icon={Camera}
          title={t('communityWitnessing.documentTitle')}
          expanded={expanded.has('document')}
          onToggle={toggleSection}
          accent="teal"
        >
          <p className="text-slate-400 text-xs mt-3 mb-2 uppercase tracking-wider">{t('communityWitnessing.documentSubtitle')}</p>
          <div className="divide-y divide-slate-800/60">
            {docItems.map((item, i) => (
              <CheckItem
                key={i}
                label={item}
                checked={checkedDocs.has(i)}
                onToggle={() => toggleDoc(i)}
              />
            ))}
          </div>
          {checkedDocs.size > 0 && (
            <button
              onClick={() => setCheckedDocs(new Set())}
              className="mt-3 text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              {t('communityWitnessing.clearChecklist')}
            </button>
          )}
        </Section>

        {/* 4 — Name-to-Detention Pipeline */}
        <Section
          id="pipeline"
          icon={ArrowRight}
          title={t('communityWitnessing.pipelineTitle')}
          expanded={expanded.has('pipeline')}
          onToggle={toggleSection}
          accent="teal"
        >
          <p className="text-slate-300 text-sm leading-relaxed mt-3">{t('communityWitnessing.pipelineBody')}</p>
          <div className="mt-3 space-y-1">
            <PipelineStep num={1}>{t('communityWitnessing.pipelineStep1')}</PipelineStep>
            <PipelineStep num={2}>{t('communityWitnessing.pipelineStep2')}</PipelineStep>
            <PipelineStep num={3}>{t('communityWitnessing.pipelineStep3')}</PipelineStep>
            <PipelineStep num={4}>{t('communityWitnessing.pipelineStep4')}</PipelineStep>
            <PipelineStep num={5}>{t('communityWitnessing.pipelineStep5')}</PipelineStep>
          </div>
          <WarnBox>{t('communityWitnessing.pipelineNote')}</WarnBox>
          {onOpenLegalResponse && (
            <button
              onClick={onOpenLegalResponse}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 text-sm"
            >
              <Scales size={16} weight="bold" />
              {t('legalResponse.buttonLabel')}
            </button>
          )}
        </Section>

        {/* 5 — If Agents Approach */}
        <Section
          id="agents"
          icon={Shield}
          title={t('communityWitnessing.agentsTitle')}
          expanded={expanded.has('agents')}
          onToggle={toggleSection}
          accent="amber"
        >
          <p className="text-slate-300 text-sm leading-relaxed mt-3">{t('communityWitnessing.agentsBody')}</p>
          <ScriptBox>{t('communityWitnessing.agentsScript')}</ScriptBox>
          <p className="text-slate-400 text-sm mt-3">{t('communityWitnessing.agentsNote')}</p>
        </Section>

        {/* 6 — Witness vs. Party */}
        <Section
          id="witnessParty"
          icon={ListChecks}
          title={t('communityWitnessing.witnessPartyTitle')}
          expanded={expanded.has('witnessParty')}
          onToggle={toggleSection}
          accent="red"
        >
          <p className="text-slate-300 text-sm leading-relaxed mt-3">{t('communityWitnessing.witnessPartyBody')}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-xl p-3">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">{t('communityWitnessing.doLabel')}</p>
              {[
                t('communityWitnessing.do1'),
                t('communityWitnessing.do2'),
                t('communityWitnessing.do3'),
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-1.5 mb-1">
                  <CheckCircle size={12} weight="bold" className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-200 text-xs">{item}</p>
                </div>
              ))}
            </div>
            <div className="bg-red-950/30 border border-red-700/30 rounded-xl p-3">
              <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">{t('communityWitnessing.dontLabel')}</p>
              {[
                t('communityWitnessing.dont1'),
                t('communityWitnessing.dont2'),
                t('communityWitnessing.dont3'),
                t('communityWitnessing.dont4'),
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-1.5 mb-1">
                  <Warning size={12} weight="bold" className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-xs">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 7 — Stoic Presence */}
        <Section
          id="stoic"
          icon={FlowerLotus}
          title={t('communityWitnessing.stoicTitle')}
          expanded={expanded.has('stoic')}
          onToggle={toggleSection}
          accent="teal"
        >
          <p className="text-slate-300 text-sm leading-relaxed mt-3">{t('communityWitnessing.stoicBody')}</p>
          <div className="mt-4 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 text-center">
            <p className="text-slate-200 text-sm italic mb-1">"{t('communityWitnessing.stoicQuote')}"</p>
            <p className="text-slate-500 text-xs">{t('communityWitnessing.stoicAuthor')}</p>
          </div>
        </Section>

      </div>

      {/* Offline note */}
      <div className="mt-6 flex items-center gap-2 justify-center">
        <WifiSlash size={14} weight="bold" className="text-slate-500" />
        <p className="text-slate-500 text-xs">{t('communityWitnessing.offlineNote')}</p>
      </div>

      {/* Action buttons */}
      <div className="mt-6 space-y-3">
        {onOpenEncounterLog && (
          <button
            onClick={onOpenEncounterLog}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg active:scale-95"
          >
            <NotePencil size={20} weight="bold" />
            {t('communityWitnessing.logButton')}
          </button>
        )}
        {onOpenLegalResponse && (
          <button
            onClick={onOpenLegalResponse}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg active:scale-95"
          >
            <Scales size={20} weight="bold" />
            {t('communityWitnessing.legalButton')}
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-8">
        <Disclaimer>{t('disclaimer.line1')}</Disclaimer>
      </div>
    </div>
  );
};

export default CommunityWitnessing;
