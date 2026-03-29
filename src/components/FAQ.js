import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CaretRight,
  QuestionIcon as Question,
  ShieldCheckIcon as ShieldCheck,
  ScalesIcon as Scales,
  BookOpenIcon as BookOpen,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Disclaimer from './Disclaimer';

const FAQ = ({ onBack, onNavigate }) => {
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState(new Set([
    'general-1', 'general-2', 'general-3',
    'privacy-1', 'privacy-2', 'privacy-3', 'privacy-4',
    'legal-1', 'legal-2', 'legal-3',
    'philosophy-1',
  ]));

  useEffect(() => {
    const target = sessionStorage.getItem('faqScrollTarget');
    if (target) {
      sessionStorage.removeItem('faqScrollTarget');
      setTimeout(() => {
        const el = document.getElementById(`faq-section-${target}`);
        if (!el) return;
        const nav = document.querySelector('[data-shell-top-nav="true"]');
        const offset = nav ? nav.getBoundingClientRect().height : 0;
        const top = el.getBoundingClientRect().top + window.scrollY - offset - 8;
        window.scrollTo({ top, behavior: 'smooth' });
      }, 150);
    }
  }, []);

  const toggleItem = (id) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const accentMap = {
    blue: {
      sectionTitle: 'text-blue-400',
      border: 'border-blue-700/30',
      hoverBorder: 'hover:border-blue-500/30',
      caret: 'text-slate-400 group-hover:text-blue-400',
      titleHover: 'group-hover:text-blue-100',
      expandBg: 'from-blue-950 to-blue-900',
      expandBorder: 'border-blue-800',
      answerBg: 'bg-blue-950/50',
      answerBorder: 'border-blue-800/50',
    },
    emerald: {
      sectionTitle: 'text-emerald-400',
      border: 'border-emerald-700/30',
      hoverBorder: 'hover:border-emerald-500/30',
      caret: 'text-slate-400 group-hover:text-emerald-400',
      titleHover: 'group-hover:text-emerald-100',
      expandBg: 'from-emerald-950 to-emerald-900',
      expandBorder: 'border-emerald-800',
      answerBg: 'bg-emerald-950/50',
      answerBorder: 'border-emerald-800/50',
    },
    amber: {
      sectionTitle: 'text-amber-400',
      border: 'border-amber-700/30',
      hoverBorder: 'hover:border-amber-500/30',
      caret: 'text-slate-400 group-hover:text-amber-400',
      titleHover: 'group-hover:text-amber-100',
      expandBg: 'from-amber-950 to-amber-900',
      expandBorder: 'border-amber-800',
      answerBg: 'bg-amber-950/50',
      answerBorder: 'border-amber-800/50',
    },
    purple: {
      sectionTitle: 'text-purple-400',
      border: 'border-purple-700/30',
      hoverBorder: 'hover:border-purple-500/30',
      caret: 'text-slate-400 group-hover:text-purple-400',
      titleHover: 'group-hover:text-purple-100',
      expandBg: 'from-purple-950 to-purple-900',
      expandBorder: 'border-purple-800',
      answerBg: 'bg-purple-950/50',
      answerBorder: 'border-purple-800/50',
    },
  };

  const sections = [
    {
      id: 'general',
      Icon: Question,
      titleKey: 'faq.generalTitle',
      accent: 'blue',
      items: [
        { id: 'general-1', qKey: 'faq.generalQ1', aKey: 'faq.generalA1' },
        { id: 'general-2', qKey: 'faq.generalQ2', aKey: 'faq.generalA2' },
        { id: 'general-3', qKey: 'faq.generalQ3', aKey: 'faq.generalA3' },
      ],
    },
    {
      id: 'privacy',
      Icon: ShieldCheck,
      titleKey: 'faq.privacyTitle',
      accent: 'emerald',
      items: [
        { id: 'privacy-1', qKey: 'faq.privacyQ1', aKey: 'faq.privacyA1' },
        { id: 'privacy-2', qKey: 'faq.privacyQ2', aKey: 'faq.privacyA2' },
        { id: 'privacy-3', qKey: 'faq.privacyQ3', aKey: 'faq.privacyA3' },
        { id: 'privacy-4', qKey: 'faq.privacyQ4', aKey: 'faq.privacyA4' },
      ],
    },
    {
      id: 'legal',
      Icon: Scales,
      titleKey: 'faq.legalTitle',
      accent: 'amber',
      items: [
        { id: 'legal-1', qKey: 'faq.legalQ1', aKey: 'faq.legalA1' },
        { id: 'legal-2', qKey: 'faq.legalQ2', aKey: 'faq.legalA2' },
        { id: 'legal-3', qKey: 'faq.legalQ3', aKey: 'faq.legalA3' },
      ],
    },
    {
      id: 'philosophy',
      Icon: BookOpen,
      titleKey: 'faq.philosophyTitle',
      accent: 'purple',
      items: [
        { id: 'philosophy-1', qKey: 'faq.philosophyQ1', aKey: 'faq.philosophyA1' },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Back button */}
      <div className="pt-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors active:scale-95"
        >
          <ArrowLeft size={20} weight="bold" />
          <span className="text-sm font-medium">{t('faq.back')}</span>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Question size={36} weight="bold" className="text-blue-400" />
          <h1 className="text-3xl font-black text-white tracking-wide">{t('faq.title')}</h1>
        </div>
        <p className="text-slate-400 text-sm">{t('faq.subtitle')}</p>
      </div>

      {/* Sections */}
      {sections.map((section, sectionIndex) => {
        const a = accentMap[section.accent];
        const allIds = sections.flatMap((s) => s.items.map((i) => i.id));
        const allExpanded = allIds.every((id) => expandedItems.has(id));
        return (
          <div key={section.id} id={`faq-section-${section.id}`} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${a.sectionTitle}`}>
                <section.Icon size={16} weight="bold" />
                {t(section.titleKey)}
              </h2>
              {sectionIndex === 0 && (
                <button
                  onClick={() => {
                    if (allExpanded) {
                      setExpandedItems(new Set());
                    } else {
                      setExpandedItems(new Set(allIds));
                    }
                  }}
                  className="text-slate-400 hover:text-white text-xs font-medium uppercase tracking-wider transition-colors active:scale-95"
                >
                  {allExpanded ? t('faq.collapseAll') : t('faq.expandAll')}
                </button>
              )}
            </div>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className={`group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border ${a.border} rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${a.hoverBorder}`}
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors text-left"
                  >
                    <h3 className={`text-sm font-semibold text-white ${a.titleHover} transition-colors pr-4`}>
                      {t(item.qKey)}
                    </h3>
                    <motion.div
                      animate={{ rotate: expandedItems.has(item.id) ? 90 : 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="flex-shrink-0"
                    >
                      <CaretRight size={20} weight="bold" className={`${a.caret} transition-colors`} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {expandedItems.has(item.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className={`bg-gradient-to-br ${a.expandBg} p-5 border-t ${a.expandBorder}`}>
                          <div className={`${a.answerBg} p-4 rounded-xl border ${a.answerBorder}`}>
                            <p className="text-slate-200 text-sm leading-relaxed">
                              {t(item.aKey)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Technical Security Documentation Link */}
      <div className="mt-8 mb-4">
        <button
          onClick={() => onNavigate('tech-security')}
          className="group w-full relative overflow-hidden bg-gradient-to-br from-emerald-900/40 to-cyan-900/30 border border-emerald-500/30 rounded-2xl p-5 text-center transition-all duration-300 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 active:scale-95 backdrop-blur-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <div className="relative flex items-center justify-center gap-3">
            <ShieldCheck size={22} weight="bold" className="text-emerald-400" />
            <div>
              <p className="text-slate-200 text-sm font-semibold">{t('faq.techSecurityLink')}</p>
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mt-0.5">{t('faq.techSecurityCta')}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Disclaimer */}
      <Disclaimer>
        {t('faq.disclaimer')}
      </Disclaimer>
    </div>
  );
};

export default FAQ;
