// src/components/ProximityAlert.js
// 3-tier proximity alert: CRITICAL full-screen modal / HIGH toast / MODERATE banner.

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Warning, MapPin, X, VideoCamera, ShieldCheck } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

function ProximityAlert({ alert, onDismiss, onViewMap, onRecord, onSafetyPlan }) {
  const { t } = useTranslation();

  // Lock body scroll while CRITICAL modal is open
  useEffect(() => {
    if (alert?.tier === 'critical') {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [alert?.tier]);

  // Auto-dismiss HIGH tier after 8 seconds
  const autoTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(autoTimerRef.current);
    if (alert?.tier === 'high') {
      autoTimerRef.current = setTimeout(onDismiss, 8000);
    }
    return () => clearTimeout(autoTimerRef.current);
  }, [alert, onDismiss]);

  const countKey = alert?.count === 1 ? 'proximity.criticalBody' : 'proximity.criticalBody_plural';
  const bodyKey  = alert?.count === 1 ? 'proximity.alertBody'    : 'proximity.alertBody_plural';

  return (
    <AnimatePresence mode="wait">
      {alert?.tier === 'critical' && (
        // ── CRITICAL — Full-screen modal ──────────────────────────────────────
        <motion.div
          key="critical"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-5"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="w-full max-w-sm bg-gradient-to-br from-red-950 to-slate-950 border border-red-600/60 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-red-900/60 px-5 pt-5 pb-4">
              <button
                onClick={onDismiss}
                className="absolute top-4 right-4 p-1.5 text-red-400 hover:text-white transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-red-500/20">
                  <Warning size={24} weight="bold" className="text-red-400" />
                </div>
                <p className="text-red-100 text-base font-black pr-8">
                  {t('proximity.criticalTitle')}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-slate-300 text-sm">
                {t(countKey, {
                  count: alert.count,
                  distance: alert.distance.toFixed(1),
                })}
              </p>

              <div className="space-y-2 pt-1">
                <button
                  onClick={onRecord}
                  className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 text-white font-bold text-sm py-3 rounded-xl transition-all active:scale-95"
                >
                  <VideoCamera size={16} weight="bold" />
                  {t('proximity.recordNow')}
                </button>
                <button
                  onClick={onSafetyPlan}
                  className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm py-3 rounded-xl transition-all active:scale-95"
                >
                  <ShieldCheck size={16} weight="bold" />
                  {t('proximity.viewSafetyPlan')}
                </button>
                <button
                  onClick={onViewMap}
                  className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm font-semibold py-2 transition-colors"
                >
                  <MapPin size={14} weight="bold" />
                  {t('proximity.viewOnMap')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {alert?.tier === 'high' && (
        // ── HIGH — Bottom toast ───────────────────────────────────────────────
        <motion.div
          key="high"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 right-0 z-[55] px-3"
          style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
          <div className="max-w-lg mx-auto bg-gradient-to-r from-orange-950/95 to-amber-950/95 backdrop-blur-md border border-orange-500/40 rounded-2xl p-3 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/20 shrink-0">
                <Warning size={20} weight="bold" className="text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-orange-200 text-sm font-bold">{t('proximity.highTitle')}</p>
                <p className="text-orange-100/70 text-xs">
                  {t(bodyKey, { count: alert.count, distance: alert.distance.toFixed(1) })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={onViewMap}
                  className="flex items-center gap-1 bg-orange-700/60 hover:bg-orange-600/60 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <MapPin size={11} weight="bold" />
                  {t('proximity.viewOnMap')}
                </button>
                <button onClick={onDismiss} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                  <X size={14} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {alert?.tier === 'moderate' && (
        // ── MODERATE — Top banner ─────────────────────────────────────────────
        <motion.div
          key="moderate"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 right-0 z-[55] px-3"
          style={{ top: 'calc(72px + env(safe-area-inset-top, 0px) + 4px)' }}
        >
          <div className="max-w-lg mx-auto bg-gradient-to-r from-amber-950/95 to-red-950/95 backdrop-blur-md border border-amber-600/40 rounded-2xl p-3 shadow-2xl shadow-red-900/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20 shrink-0">
                <Warning size={20} weight="bold" className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-amber-200 text-sm font-bold">{t('proximity.alertTitle')}</p>
                <p className="text-amber-100/70 text-xs">
                  {t(bodyKey, { count: alert.count, distance: alert.distance.toFixed(1) })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={onViewMap}
                  className="flex items-center gap-1 bg-amber-700/60 hover:bg-amber-600/60 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <MapPin size={11} weight="bold" />
                  {t('proximity.viewOnMap')}
                </button>
                <button onClick={onDismiss} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                  <X size={14} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProximityAlert;
