// src/components/Welcome.js
// Welcome modal shown on first visit, with app purpose and Stoic quotes

import React, { useEffect, useRef, useState } from 'react';
import { X, Shield, Lock } from '@phosphor-icons/react';
import { Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WELCOME_CLOSE_DURATION_MS = 240;

const Welcome = ({ onClose, onOpenSettings, onInstall, isOpen = true }) => {
  const { t } = useTranslation();
  const hasPinConfigured = !!localStorage.getItem('safeneighbor_pin_hash');
  const isPWA = window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleClose = (event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, WELCOME_CLOSE_DURATION_MS);
  };

  const quotes = [
    {
      text: t('welcome.quote1'),
      author: t('welcome.quote1Author'),
      source: t('welcome.quote1Source')
    },
    {
      text: t('welcome.quote2'),
      author: t('welcome.quote2Author'),
      source: t('welcome.quote2Source')
    },
    {
      text: t('welcome.quote3'),
      author: t('welcome.quote3Author'),
      source: t('welcome.quote3Source')
    },
    {
      text: t('welcome.quote4'),
      author: t('welcome.quote4Author'),
      source: t('welcome.quote4Source')
    }
  ];

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 safe-modal-frame transition-opacity duration-[180ms] ${isClosing ? 'bg-black/0 opacity-0' : 'welcome-backdrop-in bg-black/80 backdrop-blur-sm opacity-100'}`}
      onClick={handleClose}
    >
      {/* Modal content */}
      <div
        className={`safe-modal-panel bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-md overflow-hidden border border-slate-700/50 flex flex-col relative overscroll-contain transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isClosing ? 'opacity-0 translate-y-2.5 scale-[0.982]' : 'welcome-panel-in opacity-100 translate-y-0 scale-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
            {/* Header */}
            <div className="safe-modal-header flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <Shield size={20} weight="bold" className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">{t('welcome.title')}</h2>
              </div>
              <button
                onClick={handleClose}
                className="safe-modal-close p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-white/80 transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.9] active:bg-slate-700/90 active:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                aria-label="Close welcome dialog"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto overscroll-contain flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Main Welcome Message */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Scale size={22} className="text-blue-400" />
                  {t('welcome.knowledgeTitle')}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  {t('welcome.mainMessage')}
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {t('welcome.communityMessage')}
                </p>
              </div>

              {/* PIN Reminder — only show if PIN not yet configured */}
              {!hasPinConfigured && (
                <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <Lock size={20} weight="bold" className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-200 text-sm font-bold mb-1">{t('welcome.setupPin')}</p>
                      <p className="text-slate-300 text-xs leading-relaxed mb-2">
                        {t('welcome.pinDescription', { defaultValue: 'Protect your recordings and data by setting a PIN in Security Settings. You can also set a <1>Decoy PIN</1> — if you\'re ever forced to unlock the app, the decoy PIN shows an empty vault with no recordings visible.' }).split('<1>').map((part, i) => {
                          if (i === 0) return part;
                          const [highlight, rest] = part.split('</1>');
                          return <React.Fragment key={i}><span className="text-amber-300 font-semibold">{highlight}</span>{rest}</React.Fragment>;
                        })}
                      </p>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenSettings();
                        }}
                        className="text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        {t('welcome.openSettings')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Install nudge — only when not already a PWA */}
              {!isPWA && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-slate-200 text-sm font-bold">{t('installBanner.label')}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{t('installBanner.description')}</p>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onInstall();
                      }}
                      className="shrink-0 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl transition-all active:scale-95"
                    >
                      {t('installBanner.action')}
                    </button>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-slate-700 my-6"></div>

              {/* Stoic Quotes Section */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                  {t('welcome.wisdomTitle')}
                </h4>
                <div className="space-y-4">
                  {quotes.map((quote, index) => (
                    <div
                      key={index}
                      className="bg-slate-900/50 border border-slate-700 rounded-xl p-4"
                    >
                      <p className="text-slate-300 text-sm italic leading-relaxed mb-3">
                        "{quote.text}"
                      </p>
                      <div className="text-end">
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          — {quote.author}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {quote.source}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-700 my-6"></div>

              {/* Footer */}
              <div className="text-center">
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">
                  {t('app.security')}
                </p>
                <button
                  onPointerDown={handleClose}
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3.5 px-6 rounded-xl transition-[transform,box-shadow,background] duration-150 shadow-lg shadow-red-900/30 hover:shadow-red-900/50 active:scale-[0.97] active:shadow-red-950/70"
                >
                  {t('welcome.getStarted')}
                </button>
              </div>
            </div>
      </div>
    </div>
  );
};

export default Welcome;
