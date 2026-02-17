// src/components/Welcome.js
// Welcome modal shown on first visit, with app purpose and Stoic quotes

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Lock } from '@phosphor-icons/react';
import { Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Welcome = ({ onClose, onOpenSettings, isOpen = true }) => {
  const { t } = useTranslation();
  const hasPinConfigured = !!localStorage.getItem('safeneighbor_pin_hash');

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-slate-700/50 flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <Shield size={20} weight="bold" className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">{t('welcome.title')}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1">
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
                        onClick={onOpenSettings}
                        className="text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        {t('welcome.openSettings')}
                      </button>
                    </div>
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
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50 active:scale-95"
                >
                  {t('welcome.getStarted')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Welcome;
