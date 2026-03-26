import React from 'react';
import { useTranslation } from 'react-i18next';
import { Question } from '@phosphor-icons/react';

export default function FaqCta({ onNavigate, className }) {
  const { t } = useTranslation();

  return (
    <div className={className || "mt-3"}>
      <button
        onClick={() => onNavigate('faq')}
        className="group w-full relative overflow-hidden bg-gradient-to-br from-cyan-900/40 to-blue-900/30 border border-cyan-500/30 rounded-2xl p-5 text-center transition-all duration-300 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5 active:scale-95 backdrop-blur-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        <div className="relative flex items-center justify-center gap-3">
          <Question size={22} weight="bold" className="text-cyan-400" />
          <div>
            <p className="text-slate-200 text-sm font-semibold">{t('faq.linkText')}</p>
            <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider mt-0.5">{t('faq.linkCta')} →</p>
          </div>
        </div>
      </button>
    </div>
  );
}
