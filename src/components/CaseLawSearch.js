// src/components/CaseLawSearch.js
// Collapsible case law search powered by CourtListener API.
// Includes preset immigration-related queries and free-text search.

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import {
  Scales,
  MagnifyingGlass,
  CaretDown,
  ArrowSquareOut,
  Spinner,
  WifiSlash,
  House,
  ShieldWarning,
  VideoCamera,
  Gavel,
} from '@phosphor-icons/react';

const PRESET_QUERIES = [
  { key: 'homeEntry', query: 'ICE home entry fourth amendment warrant', icon: House },
  { key: 'silence', query: 'right to remain silent immigration fifth amendment', icon: ShieldWarning },
  { key: 'recording', query: 'recording police officers first amendment right', icon: VideoCamera },
  { key: 'dueProcess', query: 'due process deportation removal proceedings', icon: Gavel },
];

const CACHE_PREFIX = 'sn_caselaw_';

function CaseLawSearch() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) return;

    // Check cache
    const cacheKey = CACHE_PREFIX + searchQuery.trim().toLowerCase();
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 30 * 60 * 1000) { // 30 min cache
          setResults(data);
          setHasSearched(true);
          return;
        }
      }
    } catch { /* ignore */ }

    if (!navigator.onLine) {
      setError('offline');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        'https://us-central1-safeneighbor-33bb0.cloudfunctions.net/courtListenerSearch',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery.trim() }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 501) {
          setError('notConfigured');
          return;
        }
        throw new Error(data.error || 'API error');
      }

      const data = await response.json();
      const cases = data.cases || [];
      setResults(cases);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ data: cases, timestamp: Date.now() }));
      } catch { /* ignore */ }
    } catch {
      setError('fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePreset = (presetQuery) => {
    setQuery(presetQuery);
    doSearch(presetQuery);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(query);
  };

  return (
    <div className="bg-gradient-to-br from-teal-950/30 to-teal-900/20 backdrop-blur-sm border border-teal-800/30 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 active:scale-[0.98] transition-transform"
      >
        <Scales size={22} weight="bold" className="text-teal-400 shrink-0" />
        <div className="flex-1 text-start">
          <span className="text-white font-bold text-sm block">{t('caseLaw.title')}</span>
          <span className="text-slate-400 text-xs">{t('caseLaw.subtitle')}</span>
        </div>
        <CaretDown
          size={14}
          weight="bold"
          className={`text-teal-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Preset query buttons */}
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
                  {t('caseLaw.commonSearches')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_QUERIES.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.key}
                        onClick={() => handlePreset(preset.query)}
                        disabled={loading}
                        className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5 text-start active:scale-95 transition-all hover:border-teal-500/30 hover:bg-teal-950/30 disabled:opacity-50"
                      >
                        <Icon size={14} weight="bold" className="text-teal-400 shrink-0" />
                        <span className="text-slate-300 text-[11px] font-semibold leading-tight">
                          {t(`caseLaw.preset_${preset.key}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Free-text search */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlass
                    size={14}
                    weight="bold"
                    className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('caseLaw.searchPlaceholder')}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl ps-8 pe-3 py-2.5 text-white text-xs placeholder-slate-600 focus:border-teal-500 outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                >
                  {loading ? <Spinner size={14} weight="bold" className="animate-spin" /> : t('caseLaw.search')}
                </button>
              </form>

              {/* Results */}
              {error === 'offline' && (
                <div className="flex items-center gap-2 py-4 text-slate-500 text-sm justify-center">
                  <WifiSlash size={16} weight="bold" />
                  {t('caseLaw.offline')}
                </div>
              )}

              {error === 'notConfigured' && (
                <p className="text-slate-500 text-xs text-center py-4">{t('caseLaw.notConfigured')}</p>
              )}

              {error === 'fetch' && !loading && (
                <p className="text-slate-500 text-xs text-center py-4">{t('caseLaw.error')}</p>
              )}

              {!loading && !error && hasSearched && results.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-4">{t('caseLaw.noResults')}</p>
              )}

              {results.length > 0 && (
                <div className="space-y-2">
                  {results.map((c, i) => (
                    <a
                      key={i}
                      href={c.absoluteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-slate-900/60 border border-slate-700/30 rounded-xl px-4 py-3 hover:-translate-y-0.5 hover:border-teal-500/20 transition-all active:scale-[0.98]"
                    >
                      <h4 className="text-white text-xs font-semibold leading-snug mb-1">{c.caseName}</h4>
                      <div className="flex items-center gap-3 text-slate-500 text-[10px] mb-1.5">
                        {c.court && <span>{c.court}</span>}
                        {c.dateFiled && <span>{c.dateFiled}</span>}
                      </div>
                      {c.snippet && (
                        <p
                          className="text-slate-400 text-[11px] leading-relaxed line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.snippet) }}
                        />
                      )}
                      <div className="flex items-center gap-1 mt-2 text-teal-400 text-[10px] font-semibold">
                        {t('caseLaw.viewOpinion')}
                        <ArrowSquareOut size={10} weight="bold" />
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* CourtListener attribution */}
              <p className="text-slate-600 text-[10px] text-center">
                {t('caseLaw.poweredBy')}{' '}
                <a
                  href="https://www.courtlistener.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:text-teal-400"
                >
                  CourtListener
                </a>
                {' '}/ Free Law Project
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CaseLawSearch;
