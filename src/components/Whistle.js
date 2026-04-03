import React, { useState } from 'react';
import { SpeakerHigh, Megaphone, House, Thermometer, DeviceMobile, Lightbulb, Warning, DownloadSimple, Eye, Hand, HandWaving, HandPointing, HandGrabbing } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { tapHaptic } from '../utils/haptics';
import { useRotatingQuote } from '../utils/quoteRotation';
import InstallHelp from './InstallHelp';

const aniDelay = (s) => ({ animationDelay: `${s}s` });

// Sound files for community signals (not translatable)
const signalSoundFiles = [
  '/sounds/1shortwhistle.mov',
  '/sounds/2shortwhistles.mov',
  '/sounds/3shortwhistles.m4a',
  '/sounds/longwhistle.mov'
];

// Hand signal icon mapping
const handSignalIcons = [Hand, HandWaving, HandPointing, HandGrabbing];

// Per-signal severity color configs — amber, cyan, red, orange
const SIGNAL_COLORS = [
  {
    card: 'from-amber-950/60 to-amber-900/40 border-amber-800/50 hover:border-amber-500/30 hover:shadow-amber-500/5',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.07),transparent_48%)]',
    responseBox: 'bg-amber-950/30 border-amber-900/50',
    responseLabel: 'text-amber-400',
    pattern: 'text-amber-300',
    playBtn: 'bg-amber-900/50 border border-amber-700/50 hover:bg-amber-800/50',
    playSpeaker: 'text-amber-400',
  },
  {
    card: 'from-cyan-950/60 to-cyan-900/40 border-cyan-800/50 hover:border-cyan-500/30 hover:shadow-cyan-500/5',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.07),transparent_48%)]',
    responseBox: 'bg-cyan-950/30 border-cyan-900/50',
    responseLabel: 'text-cyan-400',
    pattern: 'text-cyan-300',
    playBtn: 'bg-cyan-900/50 border border-cyan-700/50 hover:bg-cyan-800/50',
    playSpeaker: 'text-cyan-400',
  },
  {
    card: 'from-red-950/60 to-red-900/40 border-red-800/50 hover:border-red-500/30 hover:shadow-red-500/5',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.07),transparent_48%)]',
    responseBox: 'bg-red-950/30 border-red-900/50',
    responseLabel: 'text-red-400',
    pattern: 'text-red-300',
    playBtn: 'bg-red-900/50 border border-red-700/50 hover:bg-red-800/50',
    playSpeaker: 'text-red-400',
  },
  {
    card: 'from-orange-950/60 to-orange-900/40 border-orange-800/50 hover:border-orange-500/30 hover:shadow-orange-500/5',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.07),transparent_48%)]',
    responseBox: 'bg-orange-950/30 border-orange-900/50',
    responseLabel: 'text-orange-400',
    pattern: 'text-orange-300',
    playBtn: 'bg-orange-900/50 border border-orange-700/50 hover:bg-orange-800/50',
    playSpeaker: 'text-orange-400',
  },
];

// Signal Card Component
const SignalCard = ({ pattern, title, description, neighborResponse, neighborResponseLabel, soundFile, colors }) => {
  const playSound = () => {
    tapHaptic();
    if (soundFile) {
      const audio = new Audio(soundFile);
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  return (
    <div className={`group relative overflow-hidden rounded-[28px] border bg-gradient-to-br p-5 mb-4 transition-all duration-300 hover:shadow-lg ${colors.card}`}>
      <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${colors.glow}`} />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative">
        {/* Pattern + Play */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-slate-950/60 border border-slate-700/50 rounded-xl px-4 py-2">
            <p className={`text-center font-mono font-black text-base ${colors.pattern}`}>{pattern}</p>
          </div>
          <button
            onClick={playSound}
            className={`flex-shrink-0 p-3 rounded-xl transition-all ${soundFile ? colors.playBtn : 'bg-slate-800/60 border border-slate-700/50 cursor-default'}`}
          >
            <SpeakerHigh size={20} weight="bold" className={soundFile ? colors.playSpeaker : 'text-slate-600'} />
          </button>
        </div>
        {/* Title & Description */}
        <h3 className="text-[1.05rem] font-black tracking-tight text-white mb-2">{title}</h3>
        <p className="text-slate-300 text-sm mb-4 leading-relaxed">{description}</p>
        {/* Neighbor Response */}
        <div className={`rounded-xl p-4 border ${colors.responseBox}`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ${colors.responseLabel}`}>{neighborResponseLabel}</p>
          <p className="text-white font-medium text-sm">{neighborResponse}</p>
        </div>
      </div>
    </div>
  );
};

function Whistle() {
  const { t } = useTranslation();
  const whistleQuote = useRotatingQuote('signals.communityQuote', 'signals.communityQuoteAuthor', 'whistle');
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const communitySignals = [
    { pattern: t('signals.signal1Pattern'), title: t('signals.signal1Title'), description: t('signals.signal1Desc'), neighborResponse: t('signals.signal1Response'), soundFile: signalSoundFiles[0], colors: SIGNAL_COLORS[0] },
    { pattern: t('signals.signal2Pattern'), title: t('signals.signal2Title'), description: t('signals.signal2Desc'), neighborResponse: t('signals.signal2Response'), soundFile: signalSoundFiles[1], colors: SIGNAL_COLORS[1] },
    { pattern: t('signals.signal3Pattern'), title: t('signals.signal3Title'), description: t('signals.signal3Desc'), neighborResponse: t('signals.signal3Response'), soundFile: signalSoundFiles[2], colors: SIGNAL_COLORS[2] },
    { pattern: t('signals.signal4Pattern'), title: t('signals.signal4Title'), description: t('signals.signal4Desc'), neighborResponse: t('signals.signal4Response'), soundFile: signalSoundFiles[3], colors: SIGNAL_COLORS[3] },
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
    <div className="page-transition-in scenario-section-rise max-w-5xl mx-auto px-4 pb-24 pt-3">

      {/* ── Hero Card ── */}
      <section className="scenario-section-item relative overflow-hidden rounded-[32px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/80 px-6 py-7 mb-8 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.92)]">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
        <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 h-48 w-48 rounded-full bg-blue-500/8 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)' }}
        />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300/80 mb-3 scenario-fade-in">
            Community Protocols
          </p>
          <div className="scenario-rise-in" style={aniDelay(0.05)}>
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-5">
              <div className="inline-flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_28px_rgba(6,182,212,0.15)]">
                <Megaphone size={30} weight="bold" />
              </div>
              <div>
                <h1 className="text-[2rem] sm:text-[2.6rem] font-black tracking-tight text-white leading-tight">
                  {t('signals.title')}
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed mt-2 max-w-xl">
                  {t('signals.subtitle')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 scenario-fade-in" style={aniDelay(0.12)}>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
              4 Alert Patterns
            </span>
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">
              Hand Signals
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
              De-Escalation
            </span>
          </div>
        </div>
      </section>

      {/* ── Hierarchy of Sound ── */}
      <div className="scenario-section-item mb-6">
        <div className="group relative overflow-hidden rounded-[28px] border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900/96 to-cyan-950/20 p-5">
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.05),transparent_48%)]" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/70 mb-3">Sound System</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                <SpeakerHigh size={20} weight="bold" className="text-cyan-400" />
              </div>
              <h2 className="text-[1.2rem] font-black tracking-tight text-white">{t('signals.hierarchyTitle')}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">{t('signals.hierarchyDesc')}</p>
            <div className="space-y-2">
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-cyan-400 font-black text-sm mb-1">{t('signals.chantsTitle')}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{t('signals.chantsDesc')}</p>
              </div>
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-cyan-400 font-black text-sm mb-1">{t('signals.drumsTitle')}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{t('signals.drumsDesc')}</p>
              </div>
              <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-xl p-4">
                <p className="text-cyan-300 font-black text-sm mb-1">{t('signals.whistlesTitle')}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{t('signals.whistlesDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Community Alert Signals ── */}
      <div className="scenario-section-item mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/70 mb-2">Alert Patterns</p>
        <div className="flex items-center gap-3 mb-2">
          <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
            <House size={20} weight="bold" className="text-blue-400" />
          </div>
          <h2 className="text-[1.2rem] font-black tracking-tight text-white">{t('signals.communityTitle')}</h2>
        </div>
        <p className="text-slate-400 text-sm mb-5 ml-[52px] leading-relaxed">{t('signals.communityDesc')}</p>
        {communitySignals.map((signal, index) => (
          <div key={index} className="scenario-section-item" style={aniDelay(index * 0.06)}>
            <SignalCard {...signal} neighborResponseLabel={t('signals.neighborResponse')} />
          </div>
        ))}
      </div>

      {/* ── Whistle Protocol ── */}
      <div className="scenario-section-item mb-6">
        <div className="group relative overflow-hidden rounded-[28px] border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900/96 to-amber-950/20 p-5">
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.05),transparent_48%)]" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/70 mb-3">Protocol</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                <Megaphone size={20} weight="bold" className="text-amber-400" />
              </div>
              <h2 className="text-[1.2rem] font-black tracking-tight text-white">{t('signals.whistleProtocolTitle')}</h2>
            </div>
            <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-4 mb-4">
              <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.18em] mb-1.5">{t('signals.signalOnlyRule')}</p>
              <p className="text-white text-sm leading-relaxed">{t('signals.signalOnlyDesc')}</p>
            </div>
            <div className="space-y-2">
              {whistleProtocol.map((item, index) => (
                <div key={index} className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <span className="bg-slate-800/80 border border-slate-700/60 text-white text-xs font-mono font-black px-3 py-1 rounded-lg inline-block w-fit">
                      {item.pattern}
                    </span>
                    <span className="text-amber-400 font-black text-sm">{item.meaning}</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{item.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Visual Signaling ── */}
      <div className="scenario-section-item mb-6">
        <div className="group relative overflow-hidden rounded-[28px] border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900/96 to-violet-950/20 p-5">
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.05),transparent_48%)]" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/70 mb-3">Visual</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                <Eye size={20} weight="bold" className="text-violet-400" />
              </div>
              <h2 className="text-[1.2rem] font-black tracking-tight text-white">{t('signals.visualTitle')}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">{t('signals.visualDesc')}</p>
            <div className="space-y-2">
              {handSignals.map((signal, index) => {
                const IconComponent = signal.Icon;
                return (
                  <div key={index} className="flex items-start gap-3 bg-slate-950/50 border border-slate-800/50 rounded-xl p-4">
                    <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 mt-0.5">
                      <IconComponent size={18} weight="bold" className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-white font-black text-sm mb-1">{signal.gesture}</p>
                      <p className="text-slate-300 text-sm leading-relaxed">{signal.meaning}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── De-escalation ── */}
      <div className="scenario-section-item mb-6">
        <div className="group relative overflow-hidden rounded-[28px] border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900/96 to-red-950/20 p-5">
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.05),transparent_48%)]" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/70 mb-3">Temperature Control</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <Thermometer size={20} weight="bold" className="text-red-400" />
              </div>
              <h2 className="text-[1.2rem] font-black tracking-tight text-white">{t('signals.deescTitle')}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">{t('signals.deescDesc')}</p>
            <div className="space-y-2">
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4">
                <p className="text-red-400 font-black text-sm mb-2">{t('signals.dropVolumeTitle')}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{t('signals.dropVolumeDesc')}</p>
              </div>
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4">
                <p className="text-red-400 font-black text-sm mb-2">{t('signals.sitDownTitle')}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{t('signals.sitDownDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Digital & External Comms ── */}
      <div className="scenario-section-item mb-6">
        <div className="group relative overflow-hidden rounded-[28px] border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900/96 to-emerald-950/20 p-5">
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_48%)]" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/70 mb-3">Encrypted</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                <DeviceMobile size={20} weight="bold" className="text-emerald-400" />
              </div>
              <h2 className="text-[1.2rem] font-black tracking-tight text-white">{t('signals.digitalTitle')}</h2>
            </div>
            <div className="space-y-2">
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-emerald-400 font-black text-sm mb-2">{t('signals.buddyTitle')}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{t('signals.buddyDesc')}</p>
              </div>
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-emerald-400 font-black text-sm mb-2">{t('signals.telegramTitle')}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{t('signals.telegramDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Reminders ── */}
      <div className="scenario-section-item mb-8">
        <div className="group relative overflow-hidden rounded-[28px] border border-slate-700/50 bg-gradient-to-br from-slate-900/60 via-slate-900/50 to-amber-950/10 p-5">
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.04),transparent_48%)]" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                <Lightbulb size={20} weight="bold" className="text-amber-400" />
              </div>
              <h3 className="text-[1.1rem] font-black tracking-tight text-white">{t('signals.remindersTitle')}</h3>
            </div>
            <div className="space-y-2">
              {[
                t('signals.reminder1'),
                t('signals.reminder2'),
                t('signals.reminder3'),
                t('signals.reminder4'),
              ].map((reminder, i) => (
                <div key={i} className="flex items-start gap-3 bg-slate-950/40 border border-slate-800/40 rounded-xl px-4 py-3">
                  <span className="text-amber-400/60 font-black text-sm flex-shrink-0 mt-0.5 tabular-nums">
                    0{i + 1}
                  </span>
                  <p className="text-slate-300 text-sm leading-relaxed">{reminder}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Rotating Quote ── */}
      <div className="scenario-section-item mb-8">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-800/70 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.05),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.8),rgba(2,6,23,0.92))] px-6 py-8 text-center">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" />
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200/50 mb-4">Perspective</p>
          <p
            className="text-slate-400/80 italic text-[1rem] font-medium leading-[1.6] mb-3 max-w-2xl mx-auto"
            style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", "Iowan Old Style", ui-serif, Georgia, serif' }}
          >
            {whistleQuote.quote}
          </p>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.12em]">{whistleQuote.author}</p>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="text-center mb-6 scenario-section-item">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Warning size={18} weight="bold" className="text-amber-500" />
          <h3 className="text-amber-400 font-medium text-xs tracking-wider">{t('disclaimer.title')}</h3>
        </div>
        <p className="text-slate-500 text-xs mb-1">{t('disclaimer.line1')}</p>
        <p className="text-slate-500 text-xs mb-1">{t('disclaimer.line2')}</p>
        <p className="text-slate-500 text-xs mb-1">{t('disclaimer.line3')}</p>
        <p className="text-slate-500 text-xs">{t('disclaimer.line4')}</p>
      </div>

      {/* ── Install CTA ── */}
      <div className="text-center scenario-section-item">
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
              setShowInstallHelp(true);
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/50 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 px-6 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-[0_12px_32px_rgba(30,64,175,0.3)] transition-all active:scale-[0.98] mx-auto"
        >
          <DownloadSimple size={18} weight="bold" />
          {t('emergency.installButton')}
        </button>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">{t('emergency.installRecommended')}</p>
      </div>

      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
}

export default Whistle;
