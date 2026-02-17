// src/components/InstallHelp.js
// Modal walkthrough showing how to install the PWA on iOS Safari

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DeviceMobile } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

const InstallHelp = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const steps = [
    { image: '/install-help/Step1.jpeg', caption: t('installHelp.step1') },
    { image: '/install-help/Step2.jpeg', caption: t('installHelp.step2') },
    { image: '/install-help/Step3.jpeg', caption: t('installHelp.step3') },
    { image: '/install-help/Step4.jpeg', caption: t('installHelp.step4') },
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-slate-700/50 flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <DeviceMobile size={20} weight="bold" className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">{t('installHelp.title')}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto flex-1">
              <p className="text-slate-400 text-sm mb-5">
                {t('installHelp.description')}
              </p>

              <div className="space-y-6">
                {steps.map((step, idx) => (
                  <div key={idx}>
                    {/* Step number + caption */}
                    <div className="flex items-start gap-3 mb-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <p className="text-slate-300 text-sm leading-relaxed pt-0.5">
                        {step.caption}
                      </p>
                    </div>
                    {/* Screenshot */}
                    <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50">
                      <img
                        src={step.image}
                        alt={`Step ${idx + 1}: ${step.caption}`}
                        className="w-full h-auto"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="text-center mt-6">
                <button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 active:scale-95"
                >
                  {t('installHelp.gotIt')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallHelp;
