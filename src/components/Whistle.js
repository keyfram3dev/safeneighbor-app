import React, { useState } from 'react';
import { SpeakerHigh, Megaphone, House, Thermometer, DeviceMobile, Lightbulb, Warning, DownloadSimple, Eye, Hand, HandWaving, HandPointing, HandGrabbing } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { tapHaptic } from '../utils/haptics';
import InstallHelp from './InstallHelp';

// Sound files for community signals (not translatable)
const signalSoundFiles = [
  '/sounds/1shortwhistle.mov',
  '/sounds/2shortwhistles.mov',
  '/sounds/3shortwhistles.m4a',
  '/sounds/longwhistle.mov'
];

// Hand signal icon mapping
const handSignalIcons = [Hand, HandWaving, HandPointing, HandGrabbing];

// Signal Card Component
const SignalCard = ({ pattern, title, description, neighborResponse, neighborResponseLabel, soundFile }) => {
  const playSound = () => {
    tapHaptic();
    if (soundFile) {
      const audio = new Audio(soundFile);
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  return (
  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-4">
    {/* Pattern Display */}
    <div className="flex items-center justify-between mb-4">
      <div className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 flex-1 me-3">
        <p className="text-white text-center font-mono font-bold">{pattern}</p>
      </div>
      <button
        onClick={playSound}
        className={`p-3 rounded-full transition-colors ${soundFile ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'}`}
      >
        <SpeakerHigh size={20} weight="bold" className={soundFile ? 'text-white' : 'text-slate-300'} />
      </button>
    </div>

    {/* Title and Description */}
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-slate-300 text-sm mb-4 leading-relaxed">{description}</p>

    {/* Neighbor Response Box */}
    <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4">
      <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">{neighborResponseLabel}</p>
      <p className="text-white font-medium text-sm">{neighborResponse}</p>
    </div>
  </div>
  );
};

function Whistle() {
  const { t } = useTranslation();
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const communitySignals = [
    { pattern: t('signals.signal1Pattern'), title: t('signals.signal1Title'), description: t('signals.signal1Desc'), neighborResponse: t('signals.signal1Response'), soundFile: signalSoundFiles[0] },
    { pattern: t('signals.signal2Pattern'), title: t('signals.signal2Title'), description: t('signals.signal2Desc'), neighborResponse: t('signals.signal2Response'), soundFile: signalSoundFiles[1] },
    { pattern: t('signals.signal3Pattern'), title: t('signals.signal3Title'), description: t('signals.signal3Desc'), neighborResponse: t('signals.signal3Response'), soundFile: signalSoundFiles[2] },
    { pattern: t('signals.signal4Pattern'), title: t('signals.signal4Title'), description: t('signals.signal4Desc'), neighborResponse: t('signals.signal4Response'), soundFile: signalSoundFiles[3] },
  ];

  const whistleProtocol = [
    { pattern: t('signals.protocol1Pattern'), meaning: t('signals.protocol1Meaning'), action: t('signals.protocol1Action') },
    { pattern: t('signals.protocol2Pattern'), meaning: t('signals.protocol2Meaning'), action: t('signals.protocol2Action') },
    { pattern: t('signals.protocol3Pattern'), meaning: t('signals.protocol3Meaning'), action: t('signals.protocol3Action') },
  ];

  const handSignals = [
    { gesture: t('signals.hand1Gesture'), meaning: t('signals.hand1Meaning'), Icon: handSignalIcons[0] },
    { gesture: t('signals.hand2Gesture'), meaning: t('signals.hand2Meaning'), Icon: handSignalIcons[1] },
    { gesture: t('signals.hand3Gesture'), meaning: t('signals.hand3Meaning'), Icon: handSignalIcons[2] },
    { gesture: t('signals.hand4Gesture'), meaning: t('signals.hand4Meaning'), Icon: handSignalIcons[3] },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24">
      {/* Header */}
      <div className="text-center mb-8 pt-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Megaphone size={36} weight="bold" className="text-blue-400" />
          <h1 className="text-3xl font-black text-white tracking-wide">{t('signals.title')}</h1>
        </div>
        <p className="text-slate-400 text-sm">
          {t('signals.subtitle')}
        </p>
      </div>

      {/* Section 1: Community Alert Signals */}
      <div className="mb-10">
        {/* The Hierarchy of Sound */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <SpeakerHigh size={28} weight="bold" className="text-cyan-400" />
            <h2 className="text-xl font-bold text-white">{t('signals.hierarchyTitle')}</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            {t('signals.hierarchyDesc')}
          </p>
          <div className="space-y-3">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-cyan-400 font-bold text-sm mb-1">{t('signals.chantsTitle')}</p>
              <p className="text-slate-300 text-sm">{t('signals.chantsDesc')}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-cyan-400 font-bold text-sm mb-1">{t('signals.drumsTitle')}</p>
              <p className="text-slate-300 text-sm">{t('signals.drumsDesc')}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-cyan-400 font-bold text-sm mb-1">{t('signals.whistlesTitle')}</p>
              <p className="text-slate-300 text-sm">{t('signals.whistlesDesc')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <House size={24} weight="bold" className="text-blue-400" />
          <h2 className="text-xl font-bold text-white">{t('signals.communityTitle')}</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          {t('signals.communityDesc')}
        </p>

        {communitySignals.map((signal, index) => (
          <SignalCard
            key={index}
            pattern={signal.pattern}
            title={signal.title}
            description={signal.description}
            neighborResponse={signal.neighborResponse}
            neighborResponseLabel={t('signals.neighborResponse')}
            soundFile={signal.soundFile}
          />
        ))}
      </div>

      {/* Section 2: Whistle Protocol */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone size={28} weight="bold" className="text-amber-400" />
          <h2 className="text-xl font-bold text-white">{t('signals.whistleProtocolTitle')}</h2>
        </div>
        <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4 mb-4">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">{t('signals.signalOnlyRule')}</p>
          <p className="text-white text-sm">{t('signals.signalOnlyDesc')}</p>
        </div>

        {/* Protocol Table */}
        <div className="space-y-3">
          {whistleProtocol.map((item, index) => (
            <div key={index} className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <span className="bg-slate-700 text-white text-xs font-mono font-bold px-3 py-1 rounded inline-block w-fit">
                  {item.pattern}
                </span>
                <span className="text-cyan-400 font-bold text-sm">{item.meaning}</span>
              </div>
              <p className="text-slate-300 text-sm">{item.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Visual Signaling */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={28} weight="bold" className="text-cyan-400" />
          <h2 className="text-xl font-bold text-white">{t('signals.visualTitle')}</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          {t('signals.visualDesc')}
        </p>
        <div className="space-y-3">
          {handSignals.map((signal, index) => {
            const IconComponent = signal.Icon;
            return (
              <div key={index} className="flex items-start gap-3 bg-slate-900/50 rounded-lg p-4">
                <IconComponent size={24} weight="bold" className="text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-bold text-sm mb-1">{signal.gesture}</p>
                  <p className="text-slate-300 text-sm">{signal.meaning}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 5: De-escalation */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer size={28} weight="bold" className="text-red-400" />
          <h2 className="text-xl font-bold text-white">{t('signals.deescTitle')}</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          {t('signals.deescDesc')}
        </p>
        <div className="space-y-3">
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
            <p className="text-red-400 font-bold text-sm mb-2">{t('signals.dropVolumeTitle')}</p>
            <p className="text-slate-300 text-sm">{t('signals.dropVolumeDesc')}</p>
          </div>
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
            <p className="text-red-400 font-bold text-sm mb-2">{t('signals.sitDownTitle')}</p>
            <p className="text-slate-300 text-sm">{t('signals.sitDownDesc')}</p>
          </div>
        </div>
      </div>

      {/* Section 6: Digital & External Comms */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <DeviceMobile size={28} weight="bold" className="text-blue-400" />
          <h2 className="text-xl font-bold text-white">{t('signals.digitalTitle')}</h2>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-cyan-400 font-bold text-sm mb-2">{t('signals.buddyTitle')}</p>
            <p className="text-slate-300 text-sm">{t('signals.buddyDesc')}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-cyan-400 font-bold text-sm mb-2">{t('signals.telegramTitle')}</p>
            <p className="text-slate-300 text-sm">{t('signals.telegramDesc')}</p>
          </div>
        </div>
      </div>

      {/* Best Practices Summary */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={24} weight="bold" className="text-amber-400" />
          <h3 className="text-white font-bold">{t('signals.remindersTitle')}</h3>
        </div>
        <ul className="space-y-3">
          <li className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>{t('signals.reminder1')}</span>
          </li>
          <li className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>{t('signals.reminder2')}</span>
          </li>
          <li className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>{t('signals.reminder3')}</span>
          </li>
          <li className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>{t('signals.reminder4')}</span>
          </li>
        </ul>
      </div>

      {/* Nietzsche Quote */}
      <div className="text-center mb-8">
        <p className="text-slate-400 italic text-sm mb-2">
          {t('signals.nietzscheQuote')}
        </p>
        <p className="text-slate-500 text-xs">{t('signals.nietzscheAuthor')}</p>
      </div>

      {/* Disclaimer */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Warning size={18} weight="bold" className="text-amber-500" />
          <h3 className="text-amber-400 font-medium text-xs tracking-wider">{t('disclaimer.title')}</h3>
        </div>
        <p className="text-slate-500 text-xs mb-1">
          {t('disclaimer.line1')}
        </p>
        <p className="text-slate-500 text-xs mb-1">
          {t('disclaimer.line2')}
        </p>
        <p className="text-slate-500 text-xs mb-1">
          {t('disclaimer.line3')}
        </p>
        <p className="text-slate-500 text-xs">
          {t('disclaimer.line4')}
        </p>
      </div>

      {/* Install CTA */}
      <div className="text-center">
        <button
          onClick={() => {
            if (window.deferredPrompt) {
              window.deferredPrompt.prompt();
              window.deferredPrompt.userChoice.then((choice) => {
                if (choice.outcome === 'accepted') {
                  console.log('User accepted install');
                }
                window.deferredPrompt = null;
              });
            } else {
              alert(t('home.installAlert'));
            }
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 flex items-center justify-center gap-2 mx-auto"
        >
          <DownloadSimple size={20} weight="bold" />
          {t('emergency.installButton')}
        </button>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
          {t('emergency.installRecommended')}
        </p>
        <button
          onClick={() => setShowInstallHelp(true)}
          className="text-blue-400 hover:text-blue-300 text-xs font-semibold mt-2 transition-colors"
        >
          {t('emergency.installHelp')}
        </button>
      </div>
      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
}

export default Whistle;
