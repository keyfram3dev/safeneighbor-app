// src/components/LanguageSelector.js
// First-visit language picker modal — shown before Welcome
// Redesigned for 20+ languages with search and tiered grouping

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeIcon as Globe, MagnifyingGlass } from '@phosphor-icons/react';
import { SUPPORTED_LANGUAGES, changeLanguage } from '../i18n';

const LanguageSelector = ({ onSelect, isOpen = true }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const handleSelect = (code) => {
    changeLanguage(code);
    onSelect(code);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return SUPPORTED_LANGUAGES;
    const q = search.toLowerCase();
    return SUPPORTED_LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q)
    );
  }, [search]);

  const common = filtered.filter((l) => l.tier <= 2);
  const more = filtered.filter((l) => l.tier > 2);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl w-full max-w-sm overflow-hidden border border-slate-700/50 relative flex flex-col max-h-[85vh]"
          >
            {/* Header — multilingual prompt */}
            <div className="p-5 pb-3 text-center shrink-0">
              <div className="flex justify-center mb-3">
                <Globe size={28} weight="bold" className="text-violet-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-white text-lg font-bold">{t('language.chooseLanguage')}</p>
                <p className="text-slate-400 text-xs">{t('language.chooseLanguagePrompt')}</p>
              </div>
            </div>

            {/* Search */}
            <div className="px-5 pb-3 shrink-0">
              <label htmlFor="language-search" className="sr-only">
                {t('language.searchLabel')}
              </label>
              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  weight="bold"
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="language-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('language.searchPlaceholder')}
                  aria-describedby="language-search-help"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl ps-9 pe-3 py-2.5 text-white text-sm placeholder-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-violet-400 focus:border-violet-500"
                />
              </div>
              <p id="language-search-help" className="sr-only">
                {t('language.searchHelp')}
              </p>
            </div>

            {/* Language List — scrollable */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
              {common.length > 0 && (
                <div className="mb-2">
                  {!search.trim() && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-1.5">
                      {t('language.commonLanguages')}
                    </p>
                  )}
                  {common.map((lang) => (
                    <LanguageRow key={lang.code} lang={lang} onSelect={handleSelect} />
                  ))}
                </div>
              )}

              {more.length > 0 && (
                <div>
                  {!search.trim() && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-1.5 mt-1">
                      {t('language.moreLanguages')}
                    </p>
                  )}
                  {more.map((lang) => (
                    <LanguageRow key={lang.code} lang={lang} onSelect={handleSelect} />
                  ))}
                </div>
              )}

              {filtered.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">
                  {t('language.noMatches', { search })}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 text-center border-t border-slate-700/50 shrink-0">
              <p className="text-slate-500 text-xs">
                {t('language.changeInSettings')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const LanguageRow = ({ lang, onSelect }) => (
  <button
    onClick={() => onSelect(lang.code)}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.08] active:scale-[0.98]"
  >
    <div
      style={{ backgroundColor: lang.color }}
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
    >
      <span className="text-white font-bold text-sm leading-none">{lang.symbol}</span>
    </div>
    <div className="flex-1 text-start min-w-0">
      <p className="text-white font-bold text-sm">{lang.nativeName}</p>
      <p className="text-slate-500 text-xs">{lang.name}</p>
    </div>
    {lang.quality === 'limited' && (
      <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded">
        Beta
      </span>
    )}
  </button>
);

export default LanguageSelector;
