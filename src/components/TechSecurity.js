import React from 'react';
import { ArrowLeft, LockKey, ShieldCheck, MapPin, EyeSlash, Scales, Code, BookOpenText, DownloadSimple } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import Disclaimer from './Disclaimer';
import FaqCta from './FaqCta';
import { openGuardiansManualPDF } from '../utils/guardiansManualPDF';

const BulletItem = ({ label, description, accent }) => (
  <div className="flex items-start gap-3 py-3">
    <div className={`mt-1.5 w-2 h-2 rounded-full bg-${accent}-400 shrink-0`} />
    <div>
      <p className="text-white text-sm font-semibold">{label}</p>
      <p className="text-slate-300 text-sm leading-relaxed mt-1">{description}</p>
    </div>
  </div>
);

const SpecRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-slate-700/30 last:border-0">
    <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest shrink-0 sm:w-36">{label}</span>
    <span className="text-slate-300 text-sm leading-relaxed">{value}</span>
  </div>
);

const TechSecurity = ({ onBack, onNavigate }) => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: LockKey,
      title: t('techSecurity.zkaTitle'),
      accent: 'emerald',
      description: t('techSecurity.zkaDesc'),
      bullets: [
        { label: t('techSecurity.zkaNoAccounts'), desc: t('techSecurity.zkaNoAccountsDesc') },
        { label: t('techSecurity.zkaClientSide'), desc: t('techSecurity.zkaClientSideDesc') },
      ],
    },
    {
      icon: ShieldCheck,
      title: t('techSecurity.cryptoTitle'),
      accent: 'blue',
      description: t('techSecurity.cryptoDesc'),
      bullets: [
        { label: t('techSecurity.cryptoMetadata'), desc: t('techSecurity.cryptoMetadataDesc') },
        { label: t('techSecurity.cryptoTransit'), desc: t('techSecurity.cryptoTransitDesc') },
        { label: t('techSecurity.cryptoAtRest'), desc: t('techSecurity.cryptoAtRestDesc') },
      ],
    },
    {
      icon: MapPin,
      title: t('techSecurity.locationTitle'),
      accent: 'amber',
      description: t('techSecurity.locationDesc'),
      bullets: [
        { label: t('techSecurity.locationGeofence'), desc: t('techSecurity.locationGeofenceDesc') },
        { label: t('techSecurity.locationJitter'), desc: t('techSecurity.locationJitterDesc') },
      ],
    },
    {
      icon: EyeSlash,
      title: t('techSecurity.trackingTitle'),
      accent: 'purple',
      bullets: [
        { label: t('techSecurity.trackingNoAds'), desc: t('techSecurity.trackingNoAdsDesc') },
        { label: t('techSecurity.trackingAnalytics'), desc: t('techSecurity.trackingAnalyticsDesc') },
      ],
    },
    {
      icon: Scales,
      title: t('techSecurity.subpoenaTitle'),
      accent: 'red',
      description: t('techSecurity.subpoenaDesc'),
    },
  ];

  const borderColors = {
    emerald: 'border-emerald-700/30',
    blue: 'border-blue-700/30',
    amber: 'border-amber-700/30',
    purple: 'border-purple-700/30',
    red: 'border-red-700/30',
    cyan: 'border-cyan-700/30',
  };

  const iconColors = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Back button */}
      <div className="pt-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors active:scale-95"
        >
          <ArrowLeft size={20} weight="bold" />
          <span className="text-sm font-medium">{t('techSecurity.back')}</span>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={36} weight="bold" className="text-emerald-400" />
          <h1 className="text-3xl font-black text-white tracking-wide">{t('techSecurity.title')}</h1>
        </div>
        <p className="text-slate-400 text-sm">{t('techSecurity.subtitle')}</p>
      </div>

      {/* Intro card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-6 mb-6">
        <p className="text-slate-200 text-sm leading-relaxed font-medium">
          {t('techSecurity.introText')}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border ${borderColors[section.accent]} rounded-2xl p-6`}
            >
              <div className="flex items-center gap-3 mb-4">
                <Icon size={24} weight="bold" className={iconColors[section.accent]} />
                <h2 className="text-lg font-bold text-white">{section.title}</h2>
              </div>
              {section.description && (
                <p className="text-slate-300 text-sm leading-relaxed mb-2">
                  {section.description}
                </p>
              )}
              {section.bullets && (
                <div className="divide-y divide-slate-700/30">
                  {section.bullets.map((bullet) => (
                    <BulletItem
                      key={bullet.label}
                      label={bullet.label}
                      description={bullet.desc}
                      accent={section.accent}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Technical Specifications */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-cyan-700/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Code size={24} weight="bold" className="text-cyan-400" />
            <h2 className="text-lg font-bold text-white">{t('techSecurity.specsTitle')}</h2>
          </div>
          <div className="divide-y divide-slate-700/30">
            <SpecRow label={t('techSecurity.specsStack')} value={t('techSecurity.specsStackValue')} />
            <SpecRow label={t('techSecurity.specsEncryption')} value={t('techSecurity.specsEncryptionValue')} />
            <SpecRow label={t('techSecurity.specsArchitecture')} value={t('techSecurity.specsArchitectureValue')} />
            <SpecRow label={t('techSecurity.specsAudit')} value={t('techSecurity.specsAuditValue')} />
          </div>
        </div>
      </div>

      {/* Guardian's Manual download */}
      <div className="mt-8 mb-4">
        <button
          onClick={() => openGuardiansManualPDF(t)}
          className="group w-full relative overflow-hidden bg-gradient-to-br from-blue-900/40 to-indigo-900/30 border border-blue-500/30 rounded-2xl p-5 text-center transition-all duration-300 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 active:scale-95 backdrop-blur-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <div className="relative flex items-center justify-center gap-3">
            <BookOpenText size={22} weight="bold" className="text-blue-400" />
            <div>
              <p className="text-slate-200 text-sm font-semibold">{t('guardiansManual.homeCardTitle')}</p>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mt-0.5">{t('guardiansManual.downloadPdf')} <DownloadSimple size={12} weight="bold" className="inline" /></p>
            </div>
          </div>
        </button>
      </div>

      {/* FAQ CTA */}
      <FaqCta onNavigate={onNavigate} />

      {/* Disclaimer */}
      <Disclaimer>
        {t('techSecurity.disclaimer')}
      </Disclaimer>
    </div>
  );
};

export default TechSecurity;
