import React, { useMemo, useRef, useState } from 'react';
import { SpeakerHigh, Megaphone, Thermometer, DeviceMobile, Warning, DownloadSimple, Eye, Hand, HandWaving, HandPointing, HandGrabbing, Lightning } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { tapHaptic } from '../utils/haptics';
import { useRotatingQuote } from '../utils/quoteRotation';
import InstallHelp from './InstallHelp';

const aniDelay = (s) => ({ animationDelay: `${s}s` });

const SECTION_TONES = {
  protocol: {
    label: 'Alert now',
    accent: 'text-blue-300',
    chip: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
    section: 'border-blue-900/30 bg-gradient-to-br from-slate-900/96 via-slate-900/94 to-blue-950/16',
  },
  visual: {
    label: 'Coordinate visually',
    accent: 'text-violet-300',
    chip: 'border-violet-500/20 bg-violet-500/10 text-violet-200',
    section: 'border-violet-900/30 bg-gradient-to-br from-slate-900/96 via-slate-900/94 to-violet-950/18',
  },
  deescalation: {
    label: 'Stabilize the crowd',
    accent: 'text-red-300',
    chip: 'border-red-500/20 bg-red-500/10 text-red-200',
    section: 'border-red-900/30 bg-gradient-to-br from-slate-900/96 via-slate-900/94 to-red-950/18',
  },
  comms: {
    label: 'Back up the signal',
    accent: 'text-cyan-300',
    chip: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200',
    section: 'border-cyan-900/30 bg-gradient-to-br from-slate-900/96 via-slate-900/94 to-cyan-950/16',
  },
};

const SIGNAL_JUMP_STYLES = {
  protocol: {
    active: 'bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/28 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(203,213,225,0.1),0_10px_24px_rgba(8,47,73,0.22)]',
    idle: 'bg-gradient-to-br from-slate-900 via-slate-900/96 to-cyan-950/10 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(2,6,23,0.16)]',
    hover: 'hover:text-cyan-100 hover:border-cyan-400/16',
    dot: 'bg-cyan-300',
  },
  visual: {
    active: 'bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/30 text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(203,213,225,0.1),0_10px_24px_rgba(59,7,100,0.18)]',
    idle: 'bg-gradient-to-br from-slate-900 via-slate-900/96 to-violet-950/12 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(2,6,23,0.16)]',
    hover: 'hover:text-violet-100 hover:border-violet-400/16',
    dot: 'bg-violet-300',
  },
  deescalation: {
    active: 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/28 text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(203,213,225,0.1),0_10px_24px_rgba(76,5,25,0.22)]',
    idle: 'bg-gradient-to-br from-slate-900 via-slate-900/96 to-rose-950/10 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(2,6,23,0.16)]',
    hover: 'hover:text-rose-100 hover:border-rose-400/16',
    dot: 'bg-rose-300',
  },
  comms: {
    active: 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/28 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(203,213,225,0.1),0_10px_24px_rgba(6,78,59,0.18)]',
    idle: 'bg-gradient-to-br from-slate-900 via-slate-900/96 to-emerald-950/10 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(2,6,23,0.16)]',
    hover: 'hover:text-emerald-100 hover:border-emerald-400/16',
    dot: 'bg-emerald-300',
  },
};

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
    <div className={`group relative h-full overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(2,6,23,0.2)] ${colors.card}`}>
      <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${colors.glow}`} />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/3 blur-2xl" />
      <div className="relative flex h-full flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-slate-950/65 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/75">
            Signal pattern
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${colors.responseBox} ${colors.responseLabel}`}>
            Neighbor action
          </span>
        </div>

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
        <h3 className="text-[1.12rem] font-black tracking-[-0.02em] text-white mb-2">{title}</h3>
        <p className="text-slate-300 text-sm mb-4 leading-[1.65]">{description}</p>
        {/* Neighbor Response */}
        <div className={`mt-auto rounded-xl p-4 border ${colors.responseBox}`}>
          <p className={`text-[11px] font-black uppercase tracking-[0.18em] mb-1.5 ${colors.responseLabel}`}>{neighborResponseLabel}</p>
          <p className="text-white font-medium text-sm leading-[1.6]">{neighborResponse}</p>
        </div>
      </div>
    </div>
  );
};

const sectionDelayStyle = (delay) => ({
  '--section-delay': `${delay}s`,
});

const SignalsSectionHeader = ({
  eyebrow,
  title,
  description,
  support,
  tone = 'protocol',
  delay = 0,
}) => (
  <div className="mb-5 flex flex-col gap-4 scenario-fade-in md:flex-row md:items-end md:justify-between" style={aniDelay(delay)}>
    <div>
      <p className={`mb-2 text-xs font-semibold tracking-[0.08em] ${SECTION_TONES[tone].accent}`}>{eyebrow}</p>
      <h2 className="text-[1.85rem] font-black tracking-tight text-white sm:text-[2rem]">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{description}</p>}
      {support && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{support}</p>}
    </div>
    <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] ${SECTION_TONES[tone].chip}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      {SECTION_TONES[tone].label}
    </div>
  </div>
);

function Whistle({ onOpenPracticeSignals }) {
  const { t } = useTranslation();
  const whistleQuote = useRotatingQuote('signals.communityQuote', 'signals.communityQuoteAuthor', 'whistle');
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [expandedHandSignal, setExpandedHandSignal] = useState(null);
  const [selectedJump, setSelectedJump] = useState('protocol');

  const whistleProtocolRef = useRef(null);
  const visualSignalsRef = useRef(null);
  const deescalationRef = useRef(null);
  const digitalSignalsRef = useRef(null);
  const installSignalsRef = useRef(null);

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

  const sectionJumpItems = useMemo(() => [
    { id: 'protocol', label: 'Alert Patterns', ref: whistleProtocolRef, tone: 'protocol' },
    { id: 'visual', label: 'Hand Signals', ref: visualSignalsRef, tone: 'visual' },
    { id: 'deescalation', label: 'De-escalation', ref: deescalationRef, tone: 'deescalation' },
    { id: 'comms', label: 'Digital Backup', ref: digitalSignalsRef, tone: 'comms' },
    { id: 'install', label: 'Offline Access', ref: installSignalsRef, tone: 'protocol' },
  ], []);

  const signalLadder = [
    {
      label: 'Notice',
      detail: 'Use the lightest recognizable pattern first so people orient quickly.',
      accent: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
    },
    {
      label: 'Regroup',
      detail: 'Escalate only when you need nearby people to move or respond together.',
      accent: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    },
    {
      label: 'Urgent',
      detail: 'Reserve the strongest signal for immediate danger or rapid support.',
      accent: 'border-red-500/20 bg-red-500/10 text-red-200',
    },
  ];

  const heroSequence = [
    {
      label: '1. Alert',
      title: 'Use the whistle patterns first',
      detail: 'Start with the agreed sound pattern when you need nearby people to understand the situation quickly.',
    },
    {
      label: '2. Coordinate',
      title: 'Switch to visible cues when needed',
      detail: 'Use hand signals when noise is risky, the crowd is spread out, or spoken instructions will get lost.',
    },
    {
      label: '3. Stabilize',
      title: 'Reduce confusion once attention lands',
      detail: 'Lower volume, simplify movement, and move the group from reaction into orientation.',
    },
  ];

  const digitalSupportCards = [
    {
      eyebrow: 'Buddy system',
      title: t('signals.buddyTitle'),
      description: t('signals.buddyDesc'),
      tone: 'border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-200',
    },
    {
      eyebrow: 'Broadcast path',
      title: t('signals.telegramTitle'),
      description: t('signals.telegramDesc'),
      tone: 'border-blue-500/20 bg-blue-500/[0.08] text-blue-200',
    },
  ];

  const deescalationCards = [
    {
      title: t('signals.dropVolumeTitle'),
      description: t('signals.dropVolumeDesc'),
      meta: 'Reduce confusion',
    },
    {
      title: t('signals.sitDownTitle'),
      description: t('signals.sitDownDesc'),
      meta: 'Lower movement',
    },
  ];

  const fieldNotes = [
    t('signals.reminder2'),
    t('signals.reminder3'),
    t('signals.reminder1'),
  ];

  return (
    <div className="page-transition-in page-section-stagger max-w-5xl mx-auto px-4 pb-24 pt-3">

      {/* ── Hero Card ── */}
      <section className="page-section-item relative mb-8 overflow-hidden rounded-[32px] border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 px-6 py-7 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.92)]">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-10 -top-14 h-40 bg-gradient-to-b from-blue-500/14 via-cyan-500/5 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -top-20 right-[-4.5rem] h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-3.5rem] h-56 w-56 rounded-full bg-blue-500/8 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.11),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_32%)]" />
        <div className="relative">
          <div className="scenario-fade-in" style={aniDelay(0.1)}>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300/80 scenario-fade-in" style={aniDelay(0.08)}>
              Community Protocols
            </p>
            <div className="mb-4 flex flex-col items-center gap-3 text-center xl:flex-row xl:items-start xl:text-left">
              <div className="inline-flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_28px_rgba(6,182,212,0.15)]">
                <Megaphone size={30} weight="bold" />
              </div>
              <h1 className="max-w-3xl bg-gradient-to-r from-white via-white to-cyan-100 bg-clip-text text-[2.05rem] font-black leading-[0.96] tracking-[-0.04em] text-transparent sm:text-[2.9rem]">
                {t('signals.title')}
              </h1>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {t('signals.subtitle')}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-[1.68] text-slate-400">
              Start with the smallest signal neighbors can recognize immediately, switch to visible coordination if sound could escalate the moment, and simplify once attention arrives.
            </p>
            <p className="mt-3 inline-flex max-w-2xl items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/65 px-4 py-2 text-sm font-medium text-slate-300">
              <SpeakerHigh size={14} weight="fill" className="text-cyan-300" />
              Keep each pattern tied to one meaning so people can respond without guessing.
            </p>
            {onOpenPracticeSignals && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onOpenPracticeSignals}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/15"
                >
                  <Lightning size={16} weight="bold" />
                  Practice these signals
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="page-section-item mt-6 xl:grid xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)] xl:items-start xl:gap-5">
        <div className="scenario-rise-in" style={aniDelay(0.22)}>
          <div className="rounded-[26px] border border-slate-800/70 bg-[linear-gradient(135deg,rgba(8,47,73,0.08),rgba(2,6,23,0.84))] p-5 shadow-[0_14px_28px_rgba(2,6,23,0.1)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">
                      Protocol readiness
                    </p>
                    <h2 className="mt-1 text-[1.35rem] font-black tracking-tight text-slate-50 sm:text-[1.55rem]">
                      Build one shared alert system people can act on fast
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-[1.62] text-slate-300/92">
                      The best signal plan is small, teachable, and obvious from a distance. Decide what each sound means before you need the crowd to recognize it in real time.
                    </p>
                  </div>
                  <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.06] text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.05)] sm:flex">
                    <SpeakerHigh size={22} weight="bold" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]">
                  <span className="rounded-full border border-emerald-500/16 bg-emerald-500/[0.08] px-3 py-1 text-emerald-200">
                    Ready offline
                  </span>
                  <span className="rounded-full border border-blue-500/16 bg-blue-500/[0.08] px-3 py-1 text-blue-100">
                    Sound first
                  </span>
                  <span className="rounded-full border border-violet-500/16 bg-violet-500/[0.08] px-3 py-1 text-violet-100">
                    Visible backup
                  </span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-950/55 px-3 py-1 text-slate-300">
                    One meaning only
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJump('protocol');
                      scrollToSection(whistleProtocolRef);
                    }}
                    className="group rounded-2xl border border-blue-400/18 bg-blue-500/[0.07] px-4 py-4 text-left transition-all duration-200 hover:border-blue-300/28 hover:bg-blue-500/[0.1] active:scale-[0.99]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/18 bg-blue-500/[0.08] text-blue-200">
                        <SpeakerHigh size={18} weight="fill" />
                      </span>
                      <span>
                        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-blue-200/80">Start here</span>
                        <span className="mt-1 block text-base font-black tracking-tight text-slate-50">Alert Patterns</span>
                        <span className="mt-1 block text-sm leading-[1.5] text-slate-300/90">Review the whistle ladder first so nearby people can identify the situation quickly.</span>
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJump('visual');
                      scrollToSection(visualSignalsRef);
                    }}
                    className="group rounded-2xl border border-violet-400/16 bg-violet-500/[0.06] px-4 py-4 text-left transition-all duration-200 hover:border-violet-300/26 hover:bg-violet-500/[0.09] active:scale-[0.99]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/16 bg-violet-500/[0.08] text-violet-200">
                        <Eye size={18} weight="fill" />
                      </span>
                      <span>
                        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-violet-200/80">If sound is risky</span>
                        <span className="mt-1 block text-base font-black tracking-tight text-slate-50">Open Silent Signals</span>
                        <span className="mt-1 block text-sm leading-[1.5] text-slate-300/90">Use visible cues when noise could escalate the scene or get lost in the crowd.</span>
                      </span>
                    </span>
                  </button>
                </div>
          </div>
        </div>

        <div className="mt-5 xl:mt-0 scenario-rise-in" style={aniDelay(0.3)}>
          <div className="rounded-[26px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(8,47,73,0.1),rgba(2,6,23,0.78))] p-4 shadow-[0_14px_30px_rgba(2,6,23,0.12)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300/75">Field sequence</p>
                    <h2 className="mt-1 text-[1.2rem] font-black tracking-tight text-slate-50">Move from attention to orientation</h2>
                  </div>
                  <span className="rounded-full border border-slate-700/70 bg-slate-950/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    3-step flow
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {heroSequence.map((step, index) => (
                    <div key={step.label} className="rounded-2xl border border-slate-800/80 bg-slate-950/34 p-3.5">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
                          0{index + 1}
                        </span>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/75">{step.label}</p>
                          <p className="mt-1 text-[1.02rem] font-bold leading-[1.25] text-slate-50">{step.title}</p>
                          <p className="mt-1.5 text-sm leading-[1.58] text-slate-300/90">{step.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[12px] leading-[1.55] text-slate-400">
                  Shared protocols work best when everyone can teach them back in a sentence and repeat them under stress.
                </p>
          </div>
        </div>
      </section>

      <div className="page-section-item sticky top-[84px] z-20 mt-5 overflow-x-auto rounded-[26px] border border-slate-800/80 bg-slate-950/98 p-1.5 shadow-[0_18px_44px_rgba(2,6,23,0.18)] backdrop-blur-xl sm:top-[92px] scenario-fade-in" style={aniDelay(0.16)}>
        <div className="flex min-w-max gap-1.5 md:min-w-0 md:w-full md:justify-center">
          {sectionJumpItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedJump(item.id);
                scrollToSection(item.ref);
              }}
              className={`group flex-1 rounded-[20px] border px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-[background-color,color,transform,box-shadow,border-color] duration-200 active:scale-[0.98] md:min-w-0 md:text-center ${
                selectedJump === item.id
                  ? `${SIGNAL_JUMP_STYLES[item.tone].active} border-slate-300/8`
                  : `border-slate-300/10 ${SIGNAL_JUMP_STYLES[item.tone].idle} ${SIGNAL_JUMP_STYLES[item.tone].hover}`
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                {item.label}
                {selectedJump === item.id && <span className={`h-1.5 w-1.5 rounded-full ${SIGNAL_JUMP_STYLES[item.tone].dot}`} />}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Community Alert Signals ── */}
      <section ref={whistleProtocolRef} className="page-section-item mt-6 scroll-mt-28 sm:scroll-mt-32">
        <SignalsSectionHeader
          eyebrow="Whistle protocol"
          title={t('signals.communityTitle')}
          description={t('signals.communityDesc')}
          support="The best signal system moves from noticeable to urgent without forcing people to guess what you mean."
          tone="protocol"
          delay={0.2}
        />

        <div className="mb-4 rounded-[26px] border border-amber-900/35 bg-gradient-to-r from-amber-950/35 via-slate-950/70 to-slate-950/80 p-4 scenario-fade-in" style={aniDelay(0.26)}>
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <Warning size={18} weight="bold" className="text-amber-300" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">{t('signals.signalOnlyRule')}</p>
              <p className="mt-1 text-sm leading-[1.62] text-slate-300">{t('signals.signalOnlyDesc')}</p>
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-2 scenario-fade-in md:grid-cols-3" style={aniDelay(0.3)}>
          {signalLadder.map((step) => (
            <div key={step.label} className="rounded-2xl border border-slate-800/70 bg-slate-950/55 p-3.5 shadow-[0_14px_30px_rgba(2,6,23,0.12)]">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${step.accent}`}>
                {step.label}
              </span>
              <p className="mt-2 text-sm leading-[1.58] text-slate-300">{step.detail}</p>
            </div>
          ))}
        </div>

        <div className="mb-3 grid gap-x-5 gap-y-8 scenario-section-rise md:grid-cols-2" style={sectionDelayStyle(0.28)}>
          {communitySignals.map((signal, index) => (
            <div key={signal.title} className="scenario-section-item">
              <div className="mb-3 flex items-center justify-between gap-3 px-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Step 0{index + 1}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Escalation ladder</span>
              </div>
              <SignalCard {...signal} neighborResponseLabel={t('signals.neighborResponse')} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Visual Signaling ── */}
      <section ref={visualSignalsRef} className="page-section-item mt-10 scroll-mt-28 sm:mt-12 sm:scroll-mt-32">
        <SignalsSectionHeader
          eyebrow="Silent coordination"
          title={t('signals.visualTitle')}
          description={t('signals.visualDesc')}
          support="These work best when people can see one another clearly and already know what each gesture stands for."
          tone="visual"
          delay={0.34}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(260px,0.92fr)]">
          <div className={`rounded-[28px] border p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)] ${SECTION_TONES.visual.section}`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                <Eye size={20} weight="bold" className="text-violet-300" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300/80">Compare gestures</p>
            </div>
            <div className="space-y-2">
              {handSignals.map((signal, index) => {
                const IconComponent = signal.Icon;
                const isExpanded = expandedHandSignal === index;
                return (
                  <button
                    key={signal.gesture}
                    type="button"
                    onClick={() => setExpandedHandSignal(isExpanded ? null : index)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.99] ${
                      isExpanded
                        ? 'border-violet-500/30 bg-violet-500/10 shadow-[0_12px_28px_rgba(76,29,149,0.12)]'
                        : 'border-slate-800/60 bg-slate-950/50 hover:border-violet-500/20 hover:bg-slate-950/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                        <IconComponent size={18} weight="bold" className="text-violet-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-black tracking-[-0.01em] text-white">{signal.gesture}</p>
                          <span className={`text-violet-300/70 text-[11px] font-black uppercase tracking-[0.16em] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                        </div>
                        <p className="mt-1 text-sm leading-[1.62] text-slate-300">{signal.meaning}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/65">
                            Visible cue
                          </span>
                          <span className="rounded-full border border-violet-500/16 bg-violet-500/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200/80">
                            Teach before use
                          </span>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 grid gap-3 border-t border-violet-500/15 pt-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <div>
                              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-300/75">How to perform</p>
                              <p className="text-sm leading-[1.62] text-slate-300">{signal.howTo}</p>
                            </div>
                            <span className="inline-flex items-start rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
                              Use when visible
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 scenario-rise-in" style={aniDelay(0.42)}>
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-slate-950/90 to-slate-900/90 p-4 shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">Best use cases</p>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/85">Across a crowd</p>
                  <p className="mt-1 text-sm leading-[1.6] text-slate-300">Hand signals travel better than spoken instructions when people are spread out or moving.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/85">When quiet matters</p>
                  <p className="mt-1 text-sm leading-[1.6] text-slate-300">Use gestures when you need coordination without adding more volume or confusion.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-[0_14px_30px_rgba(2,6,23,0.12)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Quick rule</p>
              <p className="mt-2 text-sm leading-[1.62] text-slate-300">Pick one gesture per instruction and teach the group before the moment arrives. A signal loses power when people have to negotiate its meaning in real time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── De-escalation ── */}
      <section ref={deescalationRef} className="page-section-item mt-6 scroll-mt-28 sm:scroll-mt-32">
        <SignalsSectionHeader
          eyebrow="De-escalation"
          title={t('signals.deescTitle')}
          description={t('signals.deescDesc')}
          support="Once attention arrives, the next move is reducing panic and making the group easier to orient."
          tone="deescalation"
          delay={0.48}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="rounded-[28px] border border-red-900/30 bg-gradient-to-br from-slate-900/96 via-slate-900/94 to-red-950/18 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)] scenario-rise-in" style={aniDelay(0.5)}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-300/80">Stabilize first</p>
            <h3 className="mt-2 text-[1.45rem] font-black leading-[1.05] tracking-tight text-white">Make the next minute simpler than the last one.</h3>
            <p className="mt-3 text-sm leading-[1.65] text-slate-300">
              Once the signal has done its job, the goal changes. People need fewer inputs, clearer posture from those nearby, and less ambient panic.
            </p>
            <div className="mt-4 space-y-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-200/75">Shift the mode</p>
                <p className="mt-1 text-sm leading-[1.58] text-slate-300">Move from attracting attention to controlling the pace of the group.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-200/75">Short instructions win</p>
                <p className="mt-1 text-sm leading-[1.58] text-slate-300">Use fewer words, fewer gestures, and obvious body language so people can mirror calmly.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 scenario-section-rise md:grid-cols-2" style={sectionDelayStyle(0.54)}>
          {deescalationCards.map((item) => (
            <div key={item.title} className="scenario-section-item">
              <div className="h-full rounded-[28px] border border-red-900/30 bg-gradient-to-br from-slate-900/96 via-slate-900/94 to-red-950/18 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-300/75">{item.meta}</p>
                    <h3 className="mt-1 text-[1.25rem] font-black tracking-tight text-white">{item.title}</h3>
                  </div>
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                    <Thermometer size={18} weight="bold" className="text-red-300" />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-[1.65] text-slate-300">{item.description}</p>
              </div>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* ── Digital & External Comms ── */}
      <section ref={digitalSignalsRef} className="page-section-item mt-6 scroll-mt-28 sm:scroll-mt-32">
        <SignalsSectionHeader
          eyebrow="Digital backup"
          title={t('signals.digitalTitle')}
          description="Use messaging and buddy systems to reinforce the in-person protocol, not replace it."
          support="The strongest setup is layered: one shared signal, one known contact path, and one offline backup."
          tone="comms"
          delay={0.62}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
          <div className="grid gap-4 scenario-section-rise md:grid-cols-2" style={sectionDelayStyle(0.64)}>
            {digitalSupportCards.map((item) => (
              <div key={item.title} className="scenario-section-item rounded-[26px] border border-slate-800/70 bg-slate-950/55 p-4 shadow-[0_14px_30px_rgba(2,6,23,0.12)]">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${item.tone}`}>
                  {item.eyebrow}
                </span>
                <h3 className="mt-3 text-[1.1rem] font-black tracking-tight text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-[1.65] text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[28px] border border-cyan-900/30 bg-gradient-to-br from-slate-900/96 via-slate-900/94 to-cyan-950/16 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)] scenario-rise-in" style={aniDelay(0.7)}>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                <DeviceMobile size={20} weight="bold" className="text-cyan-300" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300/80">Field notes</p>
            </div>
            <div className="mt-4 space-y-2">
              {fieldNotes.map((reminder, i) => (
                <div key={reminder} className="flex items-start gap-3 rounded-xl border border-slate-800/60 bg-slate-950/50 px-4 py-3">
                  <span className="mt-0.5 text-sm font-black tabular-nums text-cyan-300/70">0{i + 1}</span>
                  <p className="text-sm leading-[1.62] text-slate-300">{reminder}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="page-section-item mt-6 mb-2">
        <div className="rounded-[28px] border border-slate-800/80 bg-gradient-to-br from-slate-900/96 via-slate-900/94 to-cyan-950/16 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300/75">Reference</p>
              <h2 className="mt-1 text-[1.45rem] font-black tracking-tight text-white">{t('signals.hierarchyTitle')}</h2>
              <p className="mt-2 text-sm leading-[1.65] text-slate-300">{t('signals.hierarchyDesc')}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/65">
              Supporting context
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300/80">{t('signals.chantsTitle')}</p>
              <p className="mt-2 text-sm leading-[1.62] text-slate-300">{t('signals.chantsDesc')}</p>
            </div>
            <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300/80">{t('signals.drumsTitle')}</p>
              <p className="mt-2 text-sm leading-[1.62] text-slate-300">{t('signals.drumsDesc')}</p>
            </div>
            <div className="rounded-2xl border border-cyan-900/40 bg-cyan-950/22 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">{t('signals.whistlesTitle')}</p>
              <p className="mt-2 text-sm leading-[1.62] text-slate-300">{t('signals.whistlesDesc')}</p>
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
      <section ref={installSignalsRef} className="page-section-item scroll-mt-28 sm:scroll-mt-32">
        <div className="rounded-[28px] border border-blue-700/25 bg-gradient-to-br from-slate-900 via-slate-900/96 to-blue-950/20 p-6 scenario-fade-in" style={aniDelay(0.84)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10">
                <DownloadSimple size={26} weight="bold" className="text-blue-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-300/80">Offline access</p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-white">Keep the signal guide on the device</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                  Install SafeNeighbor so the signal system is still reachable when service drops, batteries are precious, or you need to hand the phone to someone quickly.
                </p>
              </div>
            </div>
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
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-500/25 bg-blue-600/15 px-4 py-3 text-sm font-bold text-blue-200 transition-[transform,background-color,color,border-color] duration-200 hover:border-blue-400/35 hover:bg-blue-600/25 hover:text-white active:scale-[0.98]"
            >
              <DownloadSimple size={18} weight="bold" />
              {t('emergency.installButton')}
            </button>
          </div>
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Works offline in the field — no signal required</p>
        </div>
      </section>

      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
}

export default Whistle;
