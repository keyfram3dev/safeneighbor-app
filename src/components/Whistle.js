import React, { useRef, useState } from 'react';
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

// Per-signal severity color configs — blue, teal, amber, red (calm → urgent)
const SIGNAL_COLORS = [
  {
    card: 'from-blue-950/60 to-blue-900/40 border-blue-800/50 hover:border-blue-500/30 hover:shadow-blue-500/5',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.07),transparent_48%)]',
    responseBox: 'bg-blue-950/30 border-blue-900/50',
    responseLabel: 'text-blue-400',
    pattern: 'text-blue-300',
    playBtn: 'bg-blue-900/50 border border-blue-700/50 hover:bg-blue-800/50',
    playSpeaker: 'text-blue-400',
  },
  {
    card: 'from-teal-950/60 to-teal-900/40 border-teal-800/50 hover:border-teal-500/30 hover:shadow-teal-500/5',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.07),transparent_48%)]',
    responseBox: 'bg-teal-950/30 border-teal-900/50',
    responseLabel: 'text-teal-400',
    pattern: 'text-teal-300',
    playBtn: 'bg-teal-900/50 border border-teal-700/50 hover:bg-teal-800/50',
    playSpeaker: 'text-teal-400',
  },
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
    card: 'from-red-950/60 to-red-900/40 border-red-800/50 hover:border-red-500/30 hover:shadow-red-500/5',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.07),transparent_48%)]',
    responseBox: 'bg-red-950/30 border-red-900/50',
    responseLabel: 'text-red-400',
    pattern: 'text-red-300',
    playBtn: 'bg-red-900/50 border border-red-700/50 hover:bg-red-800/50',
    playSpeaker: 'text-red-400',
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
    <div className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 mb-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(2,6,23,0.2)] ${colors.card}`}>
      <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${colors.glow}`} />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/3 blur-2xl" />
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
        <h3 className="text-[1.05rem] font-black tracking-[-0.02em] text-white mb-2">{title}</h3>
        <p className="text-slate-300 text-sm mb-4 leading-[1.6]">{description}</p>
        {/* Neighbor Response */}
        <div className={`rounded-xl p-4 border ${colors.responseBox}`}>
          <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-1.5 ${colors.responseLabel}`}>{neighborResponseLabel}</p>
          <p className="text-white font-medium text-sm leading-[1.6]">{neighborResponse}</p>
        </div>
      </div>
    </div>
  );
};

function Whistle() {
  const { t } = useTranslation();
  const whistleQuote = useRotatingQuote('signals.communityQuote', 'signals.communityQuoteAuthor', 'whistle');
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [expandedHandSignal, setExpandedHandSignal] = useState(null);

  const whistleProtocolRef = useRef(null);
  const visualSignalsRef = useRef(null);
  const deescalationRef = useRef(null);

  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    const top = ref.current.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  };

  const communitySignals = [
    { pattern: t('signals.signal1Pattern'), title: t('signals.signal1Title'), description: t('signals.signal1Desc'), neighborResponse: t('signals.signal1Response'), soundFile: signalSoundFiles[0], colors: SIGNAL_COLORS[0] },
    { pattern: t('signals.signal2Pattern'), title: t('signals.signal2Title'), description: t('signals.signal2Desc'), neighborResponse: t('signals.signal2Response'), soundFile: signalSoundFiles[1], colors: SIGNAL_COLORS[1] },
    { pattern: t('signals.signal3Pattern'), title: t('signals.signal3Title'), description: t('signals.signal3Desc'), neighborResponse: t('signals.signal3Response'), soundFile: signalSoundFiles[2], colors: SIGNAL_COLORS[2] },
    { pattern: t('signals.signal4Pattern'), title: t('signals.signal4Title'), description: t('signals.signal4Desc'), neighborResponse: t('signals.signal4Response'), soundFile: signalSoundFiles[3], colors: SIGNAL_COLORS[3] },
  ];

  const handSignals = [
    { gesture: t('signals.hand1Gesture'), meaning: t('signals.hand1Meaning'), Icon: handSignalIcons[0], howTo: 'Cross both arms above your head in an X shape. Hold clearly at full arm extension so the shape is visible from distance.' },
    { gesture: t('signals.hand2Gesture'), meaning: t('signals.hand2Meaning'), Icon: handSignalIcons[1], howTo: 'Raise both hands to shoulder height and wiggle fingers rapidly. Keep hands open and palms facing outward.' },
    { gesture: t('signals.hand3Gesture'), meaning: t('signals.hand3Meaning'), Icon: handSignalIcons[2], howTo: 'Extend one arm straight up with index finger pointing skyward. Pump upward twice to amplify the signal.' },
    { gesture: t('signals.hand4Gesture'), meaning: t('signals.hand4Meaning'), Icon: handSignalIcons[3], howTo: 'Raise a closed fist to head height and hold still. Do not pump — a stationary fist means hold position.' },
  ];

  return (
    <div className="page-transition-in page-section-stagger max-w-5xl mx-auto px-4 pb-24 pt-3">

      {/* ── Hero Card ── */}
      <section className="page-section-item relative overflow-hidden rounded-[32px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/80 px-6 py-7 mb-8 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.92)]">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
        <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 h-48 w-48 rounded-full bg-blue-500/8 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)' }}
        />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300/80 mb-3 scenario-fade-in" style={aniDelay(0.08)}>
            Community Protocols
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-4 mb-4 scenario-rise-in" style={aniDelay(0.14)}>
            <div className="inline-flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_28px_rgba(6,182,212,0.15)]">
              <Megaphone size={30} weight="bold" />
            </div>
            <div>
              <h1 className="text-[2rem] sm:text-[2.75rem] font-black tracking-[-0.04em] text-white leading-[0.96]">
                {t('signals.title')}
              </h1>
              <p className="text-slate-300 text-sm leading-[1.6] mt-2 max-w-xl scenario-rise-in" style={aniDelay(0.22)}>
                {t('signals.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 scenario-rise-in" style={aniDelay(0.32)}>
            <button onClick={() => scrollToSection(whistleProtocolRef)} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-amber-200 transition-colors hover:bg-amber-500/20 active:scale-95">
              4 Alert Patterns
            </button>
            <button onClick={() => scrollToSection(visualSignalsRef)} className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-violet-200 transition-colors hover:bg-violet-500/20 active:scale-95">
              Hand Signals
            </button>
            <button onClick={() => scrollToSection(deescalationRef)} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-200 transition-colors hover:bg-emerald-500/20 active:scale-95">
              De-Escalation
            </button>
          </div>
        </div>
      </section>

      {/* ── Community Alert Signals ── */}
      <div ref={whistleProtocolRef} className="page-section-item mb-3">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-blue-950/20 backdrop-blur-sm px-5 py-4 shadow-[0_8px_24px_rgba(2,6,23,0.22)]">
          <div className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-to-b from-blue-400 via-teal-400 to-amber-400" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.025] via-transparent to-transparent" />
          <div className="relative pl-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400/80 mb-2">Whistle Protocol</p>
            <div className="flex items-center gap-3 mb-1">
              <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
                <House size={18} weight="bold" className="text-blue-400" />
              </div>
              <h2 className="text-[1.65rem] font-black tracking-[-0.03em] leading-[1.04] text-white sm:text-[1.92rem]">{t('signals.communityTitle')}</h2>
            </div>
            <p className="text-slate-400 text-sm leading-[1.6] mt-1 max-w-[44ch]">{t('signals.communityDesc')}</p>
          </div>
        </div>
      </div>
      <div className="page-section-item mb-3">
        <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl px-4 py-3">
          <p className="text-amber-400 text-[11px] font-black uppercase tracking-[0.2em] mb-1">{t('signals.signalOnlyRule')}</p>
          <p className="text-white text-sm leading-[1.6]">{t('signals.signalOnlyDesc')}</p>
        </div>
      </div>
      <div className="page-section-item mb-6">
        {communitySignals.map((signal, index) => (
          <SignalCard key={index} {...signal} neighborResponseLabel={t('signals.neighborResponse')} />
        ))}
      </div>

      {/* ── Hierarchy of Sound ── */}
      <div className="page-section-item mb-6">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-cyan-950/20 backdrop-blur-sm p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-cyan-500/6 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.07),transparent_48%)]" />
          <div className="relative">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400/80 mb-3">Sound System</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                <SpeakerHigh size={20} weight="bold" className="text-cyan-400" />
              </div>
              <h2 className="text-[1.65rem] font-black tracking-[-0.03em] leading-[1.04] text-white sm:text-[1.92rem]">{t('signals.hierarchyTitle')}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4 leading-[1.6]">{t('signals.hierarchyDesc')}</p>
            <div className="space-y-2">
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1.5">{t('signals.chantsTitle')}</p>
                <p className="text-slate-300 text-sm leading-[1.6]">{t('signals.chantsDesc')}</p>
              </div>
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1.5">{t('signals.drumsTitle')}</p>
                <p className="text-slate-300 text-sm leading-[1.6]">{t('signals.drumsDesc')}</p>
              </div>
              <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-xl p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300 mb-1.5">{t('signals.whistlesTitle')}</p>
                <p className="text-slate-300 text-sm leading-[1.6]">{t('signals.whistlesDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Visual Signaling ── */}
      <div ref={visualSignalsRef} className="page-section-item mb-6">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-violet-950/20 backdrop-blur-sm p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-violet-500/6 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.07),transparent_48%)]" />
          <div className="relative">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400/80 mb-3">Visual Signals</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                <Eye size={20} weight="bold" className="text-violet-300" />
              </div>
              <h2 className="text-[1.65rem] font-black tracking-[-0.03em] leading-[1.04] text-white sm:text-[1.92rem]">{t('signals.visualTitle')}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4 leading-[1.6]">{t('signals.visualDesc')}</p>
            <div className="space-y-2">
              {handSignals.map((signal, index) => {
                const IconComponent = signal.Icon;
                const isExpanded = expandedHandSignal === index;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setExpandedHandSignal(isExpanded ? null : index)}
                    className="w-full text-left flex items-start gap-3 bg-slate-950/50 border border-slate-800/50 rounded-xl p-4 transition-all duration-200 hover:border-violet-500/20 hover:bg-slate-950/70 active:scale-[0.99]"
                  >
                    <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 mt-0.5">
                      <IconComponent size={18} weight="bold" className="text-violet-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white font-black text-sm tracking-[-0.01em]">{signal.gesture}</p>
                        <span className={`text-violet-400/60 text-xs font-black uppercase tracking-[0.12em] flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-[1.6] mt-0.5">{signal.meaning}</p>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-violet-500/15">
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400/70 mb-1.5">How to perform</p>
                          <p className="text-slate-300 text-sm leading-[1.6]">{signal.howTo}</p>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── De-escalation ── */}
      <div ref={deescalationRef} className="page-section-item mb-6">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-red-950/20 backdrop-blur-sm p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-red-400/30 to-transparent" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-red-500/6 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.07),transparent_48%)]" />
          <div className="relative">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400/80 mb-3">De-escalation</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <Thermometer size={20} weight="bold" className="text-red-400" />
              </div>
              <h2 className="text-[1.65rem] font-black tracking-[-0.03em] leading-[1.04] text-white sm:text-[1.92rem]">{t('signals.deescTitle')}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4 leading-[1.6]">{t('signals.deescDesc')}</p>
            <div className="space-y-2">
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400 mb-1.5">{t('signals.dropVolumeTitle')}</p>
                <p className="text-slate-300 text-sm leading-[1.6]">{t('signals.dropVolumeDesc')}</p>
              </div>
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400 mb-1.5">{t('signals.sitDownTitle')}</p>
                <p className="text-slate-300 text-sm leading-[1.6]">{t('signals.sitDownDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Digital & External Comms ── */}
      <div className="page-section-item mb-6">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-cyan-950/20 backdrop-blur-sm p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-cyan-500/6 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.07),transparent_48%)]" />
          <div className="relative">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400/80 mb-3">Digital Comms</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                <DeviceMobile size={20} weight="bold" className="text-cyan-300" />
              </div>
              <h2 className="text-[1.65rem] font-black tracking-[-0.03em] leading-[1.04] text-white sm:text-[1.92rem]">{t('signals.digitalTitle')}</h2>
            </div>
            <div className="space-y-2">
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1.5">{t('signals.buddyTitle')}</p>
                <p className="text-slate-300 text-sm leading-[1.6]">{t('signals.buddyDesc')}</p>
              </div>
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1.5">{t('signals.telegramTitle')}</p>
                <p className="text-slate-300 text-sm leading-[1.6]">{t('signals.telegramDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Reminders ── */}
      <div className="page-section-item mb-8">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-amber-950/10 backdrop-blur-sm p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.06),transparent_48%)]" />
          <div className="relative">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400/80 mb-3">Field Notes</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                <Lightbulb size={20} weight="bold" className="text-amber-400" />
              </div>
              <h2 className="text-[1.65rem] font-black tracking-[-0.03em] leading-[1.04] text-white sm:text-[1.92rem]">{t('signals.remindersTitle')}</h2>
            </div>
            <div className="space-y-2">
              {[
                t('signals.reminder2'),
                t('signals.reminder3'),
                t('signals.reminder1'),
              ].map((reminder, i) => (
                <div key={i} className="flex items-start gap-3 bg-slate-950/40 border border-slate-800/40 rounded-xl px-4 py-3">
                  <span className="text-amber-400/60 font-black text-sm flex-shrink-0 mt-0.5 tabular-nums">
                    0{i + 1}
                  </span>
                  <p className="text-slate-300 text-sm leading-[1.6]">{reminder}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Rotating Quote ── */}
      <div className="page-section-item mb-8">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-800/70 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900/90 px-6 py-10 text-center shadow-[0_18px_54px_rgba(2,6,23,0.22)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.06),transparent_42%)] pointer-events-none" />
          <div className="absolute left-1/2 top-0 h-px w-36 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          <div className="relative">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Why community signals work</p>
            <p className="text-slate-500 text-sm leading-[1.6] max-w-[38ch] mx-auto mb-4">Coordinated action starts with shared language. These words have guided people through harder moments than most of us will face.</p>
            <p className="mx-auto max-w-[34ch] text-[1.12rem] italic leading-[1.65] text-slate-300 sm:text-[1.26rem]">
              {whistleQuote.quote}
            </p>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{whistleQuote.author}</p>
          </div>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="text-center mb-6 page-section-item">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Warning size={18} weight="bold" className="text-amber-500" />
          <h3 className="text-amber-400 font-black text-[11px] uppercase tracking-[0.2em]">{t('disclaimer.title')}</h3>
        </div>
        <p className="text-slate-500 text-xs mb-1">{t('disclaimer.line1')}</p>
        <p className="text-slate-500 text-xs mb-1">{t('disclaimer.line2')}</p>
        <p className="text-slate-500 text-xs mb-1">{t('disclaimer.line3')}</p>
        <p className="text-slate-500 text-xs">{t('disclaimer.line4')}</p>
      </div>

      {/* ── Install CTA ── */}
      <div className="text-center page-section-item">
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
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/50 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 px-6 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_32px_rgba(30,64,175,0.3)] transition-all active:scale-[0.98] mx-auto"
        >
          <DownloadSimple size={18} weight="bold" />
          {t('emergency.installButton')}
        </button>
        <p className="text-slate-500 text-[11px] mt-2 uppercase tracking-[0.2em]">Works offline in the field — no signal required</p>
      </div>

      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
}

export default Whistle;
