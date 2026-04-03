// src/components/PolicyAlerts.js
// Collapsible feed of recent immigration-related policy documents
// from the Federal Register API (executive orders, rules, notices).

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper,
  CaretDown,
  ArrowSquareOut,
  Spinner,
  WifiSlash,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const CACHE_KEY = 'sn_policy_alerts';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const FEDERAL_REGISTER_PROXY_URL = 'https://us-central1-safeneighbor-33bb0.cloudfunctions.net/federalRegisterAlerts';

const TYPE_COLORS = {
  Rule: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30',
  'Proposed Rule': 'text-amber-400 bg-amber-950/40 border-amber-800/30',
  Notice: 'text-blue-400 bg-blue-950/40 border-blue-800/30',
  'Presidential Document': 'text-red-400 bg-red-950/40 border-red-800/30',
};

const normalizeDocuments = (results = []) => results.map((doc) => ({
  title: doc.title,
  type: doc.type,
  abstractText: doc.abstractText ?? doc.abstract ?? '',
  publicationDate: doc.publicationDate ?? doc.publication_date,
  htmlUrl: doc.htmlUrl ?? doc.html_url,
  pdfUrl: doc.pdfUrl ?? doc.pdf_url,
  agencies: Array.isArray(doc.agencies)
    ? doc.agencies.map((agency) => (typeof agency === 'string' ? agency : agency?.name)).filter(Boolean)
    : [],
}));

function PolicyAlerts() {
  const { t } = useTranslation();
  const { isOnline } = useOnlineStatus();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const fetchAlerts = useCallback(async () => {
    // Check cache first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setAlerts(data);
          return;
        }
      }
    } catch { /* ignore cache errors */ }

    if (!navigator.onLine) {
      setError('offline');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(FEDERAL_REGISTER_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 1 }),
      });

      if (!response.ok) throw new Error(`proxy_api_${response.status}`);

      const data = await response.json();
      const docs = normalizeDocuments(data.documents || []);

      setAlerts(docs);

      // Cache result
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: docs, timestamp: Date.now() }));
      } catch { /* ignore storage errors */ }
    } catch {
      setError('fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (isOnline && error === 'offline') {
      fetchAlerts();
    }
  }, [error, fetchAlerts, isOnline]);

  const hasAlerts = alerts.length > 0;

  let summary = t('policyAlerts.noUpdates', { defaultValue: 'No recent immigration policy updates found.' });
  if (loading) {
    summary = t('policyAlerts.loading', { defaultValue: 'Loading policy updates...' });
  } else if (error === 'offline') {
    summary = t('policyAlerts.offline', { defaultValue: 'Policy updates require an internet connection.' });
  } else if (error === 'fetch') {
    summary = t('policyAlerts.error', { defaultValue: 'Unable to load policy updates. Try again later.' });
  } else if (hasAlerts) {
    summary = t('policyAlerts.summary', {
      count: alerts.length,
      defaultValue: '{{count}} recent policy updates available.',
    });
  }

  return (
    <div className="bg-gradient-to-br from-amber-950/30 to-amber-900/20 backdrop-blur-sm border border-amber-800/30 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 active:scale-[0.98] transition-transform"
      >
        <Newspaper size={20} weight="bold" className="text-amber-400 shrink-0" />
        <div className="flex-1 text-start">
          <span className="text-white font-bold text-sm">{t('policyAlerts.title')}</span>
          <p className="mt-1 pe-3 text-[11px] leading-relaxed text-amber-100/70">
            {summary}
          </p>
        </div>
        {hasAlerts && (
          <span className="text-amber-500 text-xs font-bold">{alerts.length}</span>
        )}
        <CaretDown
          size={14}
          weight="bold"
          className={`text-amber-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
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
            <div className="px-4 pb-4 space-y-2">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-6 text-slate-500 text-sm">
                  <Spinner size={16} weight="bold" className="animate-spin" />
                  {t('policyAlerts.loading')}
                </div>
              )}

              {error === 'offline' && (
                <div className="flex items-center gap-2 py-4 text-slate-500 text-sm justify-center">
                  <WifiSlash size={16} weight="bold" />
                  {t('policyAlerts.offline')}
                </div>
              )}

              {error === 'fetch' && !loading && (
                <div className="py-4 text-center">
                  <p className="text-slate-500 text-sm">{t('policyAlerts.error')}</p>
                  <button
                    type="button"
                    onClick={fetchAlerts}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition-colors hover:border-amber-400/35 hover:text-amber-100"
                  >
                    <ArrowClockwise size={12} weight="bold" />
                    {t('policyAlerts.retry', { defaultValue: 'Retry' })}
                  </button>
                </div>
              )}

              {!loading && !error && alerts.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">{t('policyAlerts.noUpdates')}</p>
              )}

              {alerts.map((alert, i) => (
                <a
                  key={i}
                  href={alert.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-slate-900/60 border border-slate-700/30 rounded-xl px-4 py-3 hover:-translate-y-0.5 hover:border-amber-500/20 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${TYPE_COLORS[alert.type] || 'text-slate-400 bg-slate-800/40 border-slate-700/30'}`}>
                      {alert.type}
                    </span>
                    <span className="text-slate-600 text-[10px] ml-auto shrink-0">{alert.publicationDate}</span>
                  </div>
                  <h4 className="text-white text-xs font-semibold leading-snug mb-1">{alert.title}</h4>
                  {alert.abstractText && (
                    <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{alert.abstractText}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-amber-400 text-[10px] font-semibold">
                    {t('policyAlerts.viewFull')}
                    <ArrowSquareOut size={10} weight="bold" />
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PolicyAlerts;
