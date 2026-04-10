import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Copy, Check, CaretRight, CaretLeft, Shield, BookOpen, Warning, House, User, Megaphone, VideoCamera, Car, Buildings, Scales, FileText, Prohibit, Wrench, DoorOpen, X, FlowerLotus, MapPin, Lightning, PersonSimpleTaiChiIcon as PersonSimpleTaiChi, NotePencilIcon as NotePencil, FirstAidKitIcon as FirstAidKit } from '@phosphor-icons/react';
import { scenarios } from '../data/scenarioData';
import { readLegalQuizReturnIntent } from '../utils/trainingLaunch';

// Map icon string identifiers to Phosphor components
const iconMap = {
  home: House,
  user: User,
  megaphone: Megaphone,
  video: VideoCamera,
  car: Car,
  shield: Shield,
  building2: Buildings,
  // Warrant type icons
  scale: Scales,
  fileText: FileText,
  check: Check,
  x: X,
  ban: Prohibit,
  construction: Wrench,
  doorOpen: DoorOpen,
  alertTriangle: Warning,
  mapPin: MapPin,
};

// Helper to render scenario icon with Phosphor weight
const ScenarioIcon = ({ iconName, size = 48, className = '', weight = 'bold' }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} weight={weight} className={className} />;
};


// Breathing Guide Component with Countdown Timer
const BreathingGuide = ({ onComplete, onSkip, containerRef = null }) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('ready'); // ready, inhale, hold, exhale, pause, complete
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Refs for timer management
  const countdownRef = useRef(0);
  const countdownTimerRef = useRef(null);
  const phaseTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const isRunningRef = useRef(false);

  // Phase durations matching DeEscalation.js
  const INHALE_TIME = 5000;
  const HOLD_TIME = 4000;
  const EXHALE_TIME = 5000;
  const PAUSE_TIME = 1000;

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isRunningRef.current = false;
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
    };
  }, []);

  // Countdown timer function
  const startCountdown = (from, duration, onCountdownComplete) => {
    countdownRef.current = from;
    setCountdown(from);

    const intervalMs = duration / (from + 1);

    const tick = () => {
      if (!isMountedRef.current || !isRunningRef.current) return;

      countdownRef.current -= 1;
      if (countdownRef.current >= 0) {
        setCountdown(countdownRef.current);
        countdownTimerRef.current = setTimeout(tick, intervalMs);
      } else if (onCountdownComplete) {
        onCountdownComplete();
      }
    };

    countdownTimerRef.current = setTimeout(tick, intervalMs);
  };

  // Run a single breathing cycle
  const runCycle = (cycleNum) => {
    if (!isMountedRef.current || !isRunningRef.current) return;

    // Inhale phase with countdown
    setPhase('inhale');
    startCountdown(4, INHALE_TIME, () => {
      if (!isMountedRef.current || !isRunningRef.current) return;

      // Hold phase with countdown
      setPhase('hold');
      startCountdown(3, HOLD_TIME, () => {
        if (!isMountedRef.current || !isRunningRef.current) return;

        // Exhale phase with countdown
        setPhase('exhale');
        startCountdown(4, EXHALE_TIME, () => {
          if (!isMountedRef.current || !isRunningRef.current) return;

          // Pause between cycles
          setPhase('pause');
          phaseTimeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current || !isRunningRef.current) return;

            if (cycleNum < 2) {
              // Start next cycle
              runCycle(cycleNum + 1);
            } else {
              // Complete after 2 cycles
              setPhase('complete');
              setIsActive(false);
              isRunningRef.current = false;
            }
          }, PAUSE_TIME);
        });
      });
    });
  };

  const startBreathing = () => {
    setIsActive(true);
    isRunningRef.current = true;
    runCycle(1);
  };

  const resetGuide = () => {
    isRunningRef.current = false;
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
    setIsActive(false);
    setPhase('ready');
    setCountdown(0);
  };

  // Get circle style with animations matching DeEscalation.js
  const getCircleStyle = () => {
    switch (phase) {
      case 'inhale':
        return { transform: 'scale(1.15)', transition: 'transform 5s ease-in-out' };
      case 'hold':
        return {
          transform: 'scale(1.15)',
          transition: 'transform 0.3s ease-out',
          animation: 'holdFlash 1s ease-in-out infinite'
        };
      case 'exhale':
        return { transform: 'scale(0.9)', transition: 'transform 5s ease-in-out' };
      case 'pause':
        return { transform: 'scale(0.9)', transition: 'transform 0.3s ease' };
      default:
        return { transform: 'scale(1)', transition: 'transform 0.3s ease' };
    }
  };

  // Get display text with countdown
  const getPhaseText = () => {
    switch (phase) {
      case 'ready': return t('scenarioDetail.tapToStart');
      case 'inhale': return `${t('scenarioDetail.breatheIn')}\n${countdown}`;
      case 'hold': return `${t('scenarioDetail.hold')}\n${countdown}`;
      case 'exhale': return `${t('scenarioDetail.breatheOut')}\n${countdown}`;
      case 'pause': return '...';
      case 'complete': return t('scenarioDetail.wellDone');
      default: return t('scenarioDetail.tapToStart');
    }
  };

  return (
    <div ref={containerRef} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <FlowerLotus size={24} weight="bold" className="text-cyan-400" />
        <h2 className="text-xl font-bold text-white">{t('scenarioDetail.breatheFirst')}</h2>
      </div>

      <p className="text-slate-300 text-sm mb-6">
        {t('scenarioDetail.breatheDescription')}
      </p>

      {/* Breathing Circle */}
      <div className="flex flex-col items-center mb-6">
        <div
          className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-cyan-500 flex items-center justify-center cursor-pointer ${isActive ? 'bg-cyan-950/30' : 'bg-slate-900'}`}
          style={getCircleStyle()}
          onClick={!isActive && phase !== 'complete' ? startBreathing : undefined}
        >
          <div className="text-white text-xl font-medium text-center">
            {phase === 'complete' ? (
              <div className="flex flex-col items-center gap-2">
                <span>{t('scenarioDetail.wellDone')}</span>
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <Check size={24} weight="bold" className="text-white" />
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-line">{getPhaseText()}</p>
            )}
          </div>
        </div>

        {/* Control Button */}
        <div className="mt-4">
          {phase === 'ready' && (
            <button
              onClick={startBreathing}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-900/30"
            >
              {t('scenarioDetail.beginBreathing')}
            </button>
          )}
          {isActive && (
            <button
              onClick={resetGuide}
              className="text-slate-400 hover:text-white text-sm underline"
            >
              {t('scenarioDetail.resetGuide')}
            </button>
          )}
          {phase === 'complete' && (
            <button
              onClick={onComplete}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-900/30"
            >
              {t('scenarioDetail.imReady')}
            </button>
          )}
        </div>
      </div>

      {/* Explanation */}
      <p className="text-slate-400 text-xs text-center mb-6">
        {t('scenarioDetail.breatheExplanation')}
      </p>

      {/* Skip Button */}
      <button
        onClick={onSkip}
        className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {t('scenarioDetail.continue')}
      </button>

      {/* Disclaimer */}
      <p className="text-slate-500 text-xs text-center mt-4">
        {t('scenarioDetail.breatheDisclaimer')}
      </p>
    </div>
  );
};

function ScenarioDetail({ scenarioId, onBack, initialMode = 'study', onNavigateToScenario, handoffContext = null, onReturnToEmergency, onOpenPractice, onResumeQuiz }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(initialMode);
  const [currentStep, setCurrentStep] = useState(0);
  const [copiedStep, setCopiedStep] = useState(null);
  const [showBreathingGuide, setShowBreathingGuide] = useState(true);
  const [selectedBranchIdx, setSelectedBranchIdx] = useState(null);
  const [copiedBranch, setCopiedBranch] = useState(false);
  const [quizReturnIntent, setQuizReturnIntent] = useState(() => readLegalQuizReturnIntent());
  const modeToggleRef = useRef(null);
  const scriptCardRef = useRef(null);
  const breathingGuideRef = useRef(null);
  const pendingEmergencyEntryScrollRef = useRef(false);

  const scenario = scenarios[scenarioId];

  useEffect(() => {
    setQuizReturnIntent(readLegalQuizReturnIntent());
  }, [scenarioId]);

  useEffect(() => {
    if (!pendingEmergencyEntryScrollRef.current || mode !== 'emergency' || !showBreathingGuide) {
      return;
    }

    pendingEmergencyEntryScrollRef.current = false;
    scrollToEmergencyEntry();
  }, [mode, showBreathingGuide]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!scenario) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={onBack} className="text-red-400 mb-4 flex items-center gap-2">
          <ArrowLeft size={20} weight="bold" className="rtl:scale-x-[-1]" /> {t('scenarioDetail.back')}
        </button>
        <p className="text-slate-400">{t('scenarioDetail.scenarioNotFound')}</p>
      </div>
    );
  }

  const copyToClipboard = (text, stepIndex) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const getTopChromeBottom = () => {
    const topNav = document.querySelector('[data-shell-top-nav="true"]');
    const topBanners = Array.from(document.querySelectorAll('[data-shell-top-banner="true"]'));

    const navBottom = topNav ? topNav.getBoundingClientRect().bottom : 0;
    const bannerBottom = topBanners.reduce((maxBottom, banner) => {
      const rect = banner.getBoundingClientRect();
      if (rect.height <= 0 || rect.bottom <= 0) return maxBottom;
      return Math.max(maxBottom, rect.bottom);
    }, 0);

    return Math.max(navBottom, bannerBottom);
  };

  const getScrollTargetForElement = (element, gap = 10) => {
    if (!element) return 0;

    const chromeBottom = getTopChromeBottom();
    const elementTop = window.scrollY + element.getBoundingClientRect().top;
    return Math.max(0, elementTop - chromeBottom - gap);
  };

  const scrollToScriptCard = () => {
    const alignScriptCard = (behavior = 'smooth') => {
      const scriptCard = scriptCardRef.current;
      if (!scriptCard) return;

      window.scrollTo({
        top: getScrollTargetForElement(scriptCard, 32),
        behavior,
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        alignScriptCard('smooth');

        window.setTimeout(() => {
          alignScriptCard('auto');
        }, 220);

        window.setTimeout(() => {
          alignScriptCard('auto');
        }, 520);
      });
    });
  };

  const scrollToBreathingGuide = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const breathingGuide = breathingGuideRef.current;
        if (!breathingGuide) return;

        const headerOffset = 92;
        const nextTop = window.scrollY + breathingGuide.getBoundingClientRect().top - headerOffset;
        window.scrollTo({
          top: Math.max(0, nextTop),
          behavior: 'smooth',
        });
      });
    });
  };

  const currentStepData = scenario.emergencyScript[currentStep];
  const totalSteps = scenario.emergencyScript.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setSelectedBranchIdx(null);
      setCopiedBranch(false);
      scrollToScriptCard();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setSelectedBranchIdx(null);
      setCopiedBranch(false);
      scrollToScriptCard();
    }
  };

  const scrollToEmergencyEntry = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const modeToggle = modeToggleRef.current;
        if (!modeToggle) return;

        window.scrollTo({
          top: getScrollTargetForElement(modeToggle, 14),
          behavior: 'smooth',
        });
      });
    });
  };

  const enterEmergencyMode = () => {
    pendingEmergencyEntryScrollRef.current = true;
    setMode('emergency');
    setShowBreathingGuide(true);
    setCurrentStep(0);
    setSelectedBranchIdx(null);
    setCopiedBranch(false);
  };

  const handleBreathingComplete = () => {
    setShowBreathingGuide(false);
    scrollToEmergencyEntry();
  };

  const handleSkipBreathing = () => {
    setShowBreathingGuide(false);
    scrollToEmergencyEntry();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 pt-3 sm:pt-4">
      {!(mode === 'emergency' && showBreathingGuide) && (
        <section className="relative overflow-hidden rounded-[32px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/80 px-5 py-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.92)] sm:px-6">
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300 shadow-[0_0_0_1px_rgba(96,165,250,0.08)]">
              <ScenarioIcon iconName={scenario.icon} size={32} />
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-[2.45rem]">
              {t(scenario.title)}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {t(scenario.description)}
            </p>
            {onOpenPractice && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onOpenPractice}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/15"
                >
                  <Lightning size={16} weight="bold" />
                  Practice this scenario
                </button>
                {quizReturnIntent?.destination?.type === 'scenario' && onResumeQuiz && (
                  <button
                    type="button"
                    onClick={onResumeQuiz}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/15"
                  >
                    <Check size={16} weight="bold" />
                    Return to quiz
                  </button>
                )}
              </div>
            )}
            {quizReturnIntent?.destination?.type === 'scenario' && (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
                This guide can stay open as long as you need. The quiz is still waiting where you left it.
              </p>
            )}
          </div>
        </section>
      )}

      {mode === 'emergency' && handoffContext && !(mode === 'emergency' && showBreathingGuide) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="mt-5 overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.08] via-slate-950/95 to-slate-900/90 p-4"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-cyan-100">
              {t('scenarioDetail.handoffEyebrow')}
            </span>
            {handoffContext.locationState === 'live' && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-emerald-100">
                {t('scenarioDetail.handoffLive')}
              </span>
            )}
            {handoffContext.locationState === 'shared' && (
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-amber-100">
                {t('scenarioDetail.handoffShared')}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-slate-200">
            {t('scenarioDetail.handoffDesc')}
          </p>
          {handoffContext.recommendationTitle && (
            <p className="mt-2 text-xs tracking-[0.06em] text-slate-400">
              {t('scenarioDetail.handoffRecommendation', { title: handoffContext.recommendationTitle })}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {onReturnToEmergency && (
              <button
                onClick={onReturnToEmergency}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold tracking-[0.06em] text-white transition-colors hover:bg-white/10"
              >
                <Warning size={16} weight="bold" />
                {t('scenarioDetail.handoffReturn')}
              </button>
            )}
            <button
              onClick={() => setCurrentStep(0)}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs font-bold tracking-[0.06em] text-cyan-100 transition-colors hover:bg-cyan-500/15"
            >
              <CaretRight size={16} weight="bold" />
              {t('scenarioDetail.handoffStart')}
            </button>
          </div>
        </motion.div>
      )}

      {mode === 'emergency' && showBreathingGuide && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.24 }}
          className="mt-5 mb-3"
        >
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/80 px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft size={18} weight="bold" className="rtl:scale-x-[-1]" />
            {t('scenarioDetail.back')}
          </button>
        </motion.div>
      )}

      <motion.div
        ref={modeToggleRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="mt-5 mb-6 grid grid-cols-2 gap-2 rounded-[24px] border border-slate-800/80 bg-slate-950/72 p-2"
      >
        <button
          onClick={() => setMode('study')}
          className={`rounded-xl px-4 py-3 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            mode === 'study'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen size={18} weight="bold" />
          {t('scenarioDetail.studyMode')}
        </button>
        <button
          onClick={enterEmergencyMode}
          className={`rounded-xl px-4 py-3 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            mode === 'emergency'
              ? 'bg-red-600 text-white shadow-lg shadow-red-950/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Warning size={18} weight="bold" />
          {t('scenarioDetail.emergencyMode')}
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === 'study' && (
          <motion.div
            key="study-mode"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-5"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              <div className="rounded-[28px] border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.18)]">
                <h3 className="flex items-center gap-2 text-lg font-black text-white">
                  <Shield size={20} weight="bold" className="text-blue-400" />
                  {t('scenarioDetail.overview')}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{t(scenario.studyContent.overview)}</p>
              </div>

              <div className="rounded-[28px] border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.18)]">
                <h3 className="text-lg font-black text-white">{t('scenarioDetail.keyPoints')}</h3>
                <div className="mt-4 space-y-3">
                  {scenario.studyContent.keyPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/55 px-4 py-3">
                      <span className="mt-0.5 text-emerald-400">•</span>
                      <p className="text-sm leading-relaxed text-slate-300">{t(point)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {scenario.studyContent.warrantTypes && (
              <div className="rounded-[28px] border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.18)]">
                <h3 className="text-lg font-black text-white">
                  {t('scenarioDetail.warrantComparisonTitle', { defaultValue: 'Know which document changes the rules' })}
                </h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-red-900/50 bg-gradient-to-br from-red-950/30 to-slate-950/90 p-5">
                    <div className="mb-3">
                      <ScenarioIcon iconName={scenario.studyContent.warrantTypes.judicial.icon} size={32} className="text-red-400" />
                    </div>
                    <h4 className="text-base font-black text-red-300">{t(scenario.studyContent.warrantTypes.judicial.title)}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{t(scenario.studyContent.warrantTypes.judicial.description)}</p>
                  </div>
                  <div className="rounded-[24px] border border-amber-900/50 bg-gradient-to-br from-amber-950/30 to-slate-950/90 p-5">
                    <div className="mb-3">
                      <ScenarioIcon iconName={scenario.studyContent.warrantTypes.administrative.icon} size={32} className="text-amber-400" />
                    </div>
                    <h4 className="text-base font-black text-amber-300">{t(scenario.studyContent.warrantTypes.administrative.title)}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{t(scenario.studyContent.warrantTypes.administrative.description)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.18)]">
              <h3 className="text-lg font-black text-white">{t('scenarioDetail.stepByStepGuide')}</h3>
              <div className="mt-4 space-y-3">
                {scenario.emergencyScript.map((step, idx) => (
                  <div key={idx} className="rounded-[24px] border border-slate-800/80 bg-slate-950/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-black text-white">
                        {step.step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-white">{t(step.action)}</h4>
                        {step.copyable && (
                          <p className="mt-2 rounded-2xl border border-blue-900/40 bg-blue-950/20 px-3 py-2 text-sm italic leading-relaxed text-blue-200">
                            "{t(step.script)}"
                          </p>
                        )}
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t(step.explanation)}</p>
                        {step.decision && (
                          <div className="mt-3 rounded-2xl border border-amber-800/30 bg-amber-950/15 px-3 py-3">
                            <p className="text-xs font-semibold tracking-[0.06em] text-amber-300">
                              {t(step.decision.questionKey)}
                            </p>
                            <div className="mt-2 space-y-2">
                              {step.decision.options.map((opt, oi) => (
                                <div key={oi} className="text-sm leading-relaxed text-slate-300">
                                  <span className="font-semibold text-amber-200">{t(opt.labelKey)}:</span>{' '}
                                  <span className="italic text-slate-400">"{t(opt.responseScript)}"</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'emergency' && (
          <motion.div
            key="emergency-mode"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {showBreathingGuide && (
              <BreathingGuide
                containerRef={breathingGuideRef}
                onComplete={handleBreathingComplete}
                onSkip={handleSkipBreathing}
              />
            )}

            {!showBreathingGuide && (
              <div className="space-y-4">
                <div
                  ref={scriptCardRef}
                  className="overflow-hidden rounded-[28px] border-2 border-red-600/50 bg-gradient-to-br from-slate-900/95 to-slate-950/95 shadow-[0_22px_54px_rgba(127,29,29,0.16)]"
                >
                  <div className="border-b border-red-900/50 bg-red-950/45 px-5 py-4">
                    <p className="text-xs font-semibold tracking-[0.08em] text-red-200/80">
                      {t('scenarioDetail.nextStepLabel', { defaultValue: 'Next step' })}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-lg font-black text-white">
                        {currentStepData.step}
                      </div>
                      <h3 className="text-lg font-black leading-tight text-white">
                        {t(currentStepData.action)}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-950 to-slate-900 p-5">
                      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">
                        {t('scenarioDetail.sayThisLabel', { defaultValue: 'Say this' })}
                      </p>
                      <p className="mt-2 text-xl font-medium leading-relaxed text-white">
                        {currentStepData.copyable ? `"${t(currentStepData.script)}"` : t(currentStepData.script)}
                      </p>
                    </div>

                    {currentStepData.copyable && (
                      <button
                        onClick={() => copyToClipboard(t(currentStepData.script), currentStep)}
                        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                          copiedStep === currentStep
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {copiedStep === currentStep ? (
                          <>
                            <Check size={18} weight="bold" />
                            {t('scenarioDetail.copied')}
                          </>
                        ) : (
                          <>
                            <Copy size={18} weight="bold" />
                            {t('scenarioDetail.copyScript')}
                          </>
                        )}
                      </button>
                    )}

                    <div className="mt-4 rounded-2xl border border-blue-900/40 bg-gradient-to-br from-blue-950/40 to-blue-900/30 p-4">
                      <p className="text-sm leading-relaxed text-blue-200">
                        <span className="font-bold text-blue-100">{t('scenarioDetail.why')}:</span> {t(currentStepData.explanation)}
                      </p>
                    </div>

                    {currentStepData.decision && (
                      <div className="mt-4 rounded-[24px] border border-amber-800/30 bg-amber-950/12 p-4">
                        <p className="text-sm font-semibold leading-relaxed text-amber-200">
                          {t(currentStepData.decision.questionKey)}
                        </p>
                        <div className="mt-3 space-y-2">
                          {currentStepData.decision.options.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedBranchIdx(idx);
                                setCopiedBranch(false);
                              }}
                              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                                selectedBranchIdx === idx
                                  ? 'border-amber-500/50 bg-amber-600/20 text-amber-100'
                                  : 'border-slate-700/50 bg-slate-800/60 text-slate-300 hover:border-amber-500/30 hover:text-white'
                              }`}
                            >
                              {t(opt.labelKey)}
                            </button>
                          ))}
                        </div>

                        {selectedBranchIdx !== null && (() => {
                          const opt = currentStepData.decision.options[selectedBranchIdx];
                          return (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-amber-700/40 bg-gradient-to-br from-amber-950/40 to-slate-900/60">
                              <div className="border-b border-amber-800/30 bg-amber-950/30 px-4 py-2">
                                <p className="text-xs font-semibold tracking-[0.08em] text-amber-300">
                                  {t('scenarioDetail.responseLabel', { defaultValue: 'Response' })}
                                </p>
                              </div>
                              <div className="p-4">
                                <div className="rounded-xl bg-slate-950/60 p-4">
                                  <p className="text-lg font-medium leading-relaxed text-white">
                                    {opt.responseCopyable ? `"${t(opt.responseScript)}"` : t(opt.responseScript)}
                                  </p>
                                </div>
                                {opt.responseCopyable && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(t(opt.responseScript));
                                      setCopiedBranch(true);
                                      setTimeout(() => setCopiedBranch(false), 2000);
                                    }}
                                    className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
                                      copiedBranch
                                        ? 'bg-green-600 text-white'
                                        : 'bg-amber-600 text-white hover:bg-amber-700'
                                    }`}
                                  >
                                    {copiedBranch ? (
                                      <><Check size={16} weight="bold" /> {t('scenarioDetail.copied')}</>
                                    ) : (
                                      <><Copy size={16} weight="bold" /> {t('scenarioDetail.copyScript')}</>
                                    )}
                                  </button>
                                )}
                                <p className="mt-3 text-xs leading-relaxed text-amber-100/80">
                                  <span className="font-bold text-amber-200">{t('scenarioDetail.why')}:</span> {t(opt.responseExplanation)}
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 border-t border-slate-800/80 px-5 py-5">
                    <button
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        currentStep === 0
                          ? 'cursor-not-allowed bg-slate-800 text-slate-600'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      <CaretLeft size={18} weight="bold" className="rtl:scale-x-[-1]" />
                      {t('scenarioDetail.previous')}
                    </button>
                    <button
                      onClick={nextStep}
                      disabled={currentStep === totalSteps - 1}
                      className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        currentStep === totalSteps - 1
                          ? 'cursor-not-allowed bg-slate-800 text-slate-600'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {t('scenarioDetail.next')}
                      <CaretRight size={18} weight="bold" className="rtl:scale-x-[-1]" />
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{t('scenarioDetail.stepProgress', { current: currentStep + 1, total: totalSteps })}</p>
                    </div>
                    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-100">
                      {Math.round(progress)}%
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-red-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {scenario.emergencyScript.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentStep(idx);
                          setSelectedBranchIdx(null);
                          setCopiedBranch(false);
                          scrollToScriptCard();
                        }}
                        className={`h-9 w-9 rounded-full text-xs font-bold transition-all ${
                          idx === currentStep
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/72 p-4">
                  <button
                    onClick={() => {
                      setShowBreathingGuide(true);
                      scrollToBreathingGuide();
                    }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
                  >
                    <PersonSimpleTaiChi size={18} weight="bold" />
                    {t('scenarioDetail.needToBreatheAgain')}
                  </button>

                  {onNavigateToScenario && (
                    <div className="mt-5 border-t border-slate-800/80 pt-5">
                      <div className="space-y-2.5">
                        <button
                          onClick={() => onNavigateToScenario({ id: 'encounter-log-after' })}
                          className="group flex w-full items-center gap-3 rounded-xl border border-amber-700/25 bg-gradient-to-br from-slate-800/60 to-slate-900/60 px-4 py-3.5 transition-all hover:border-amber-500/40"
                        >
                          <div className="rounded-lg border border-amber-700/20 bg-amber-950/40 p-2 transition-colors group-hover:border-amber-500/30">
                            <NotePencil size={18} weight="bold" className="text-amber-400" />
                          </div>
                          <div className="flex-1 text-start">
                            <p className="text-sm font-semibold text-white">{t('scenarioDetail.documentWhatHappened')}</p>
                            <p className="text-xs text-slate-500">{t('scenarioDetail.logDetailsFresh')}</p>
                          </div>
                          <CaretRight size={16} weight="bold" className="text-slate-600 transition-colors group-hover:text-amber-400" />
                        </button>
                        <button
                          onClick={() => onNavigateToScenario({ id: 'post-encounter' })}
                          className="group flex w-full items-center gap-3 rounded-xl border border-emerald-700/25 bg-gradient-to-br from-slate-800/60 to-slate-900/60 px-4 py-3.5 transition-all hover:border-emerald-500/40"
                        >
                          <div className="rounded-lg border border-emerald-700/20 bg-emerald-950/40 p-2 transition-colors group-hover:border-emerald-500/30">
                            <FirstAidKit size={18} weight="bold" className="text-emerald-400" />
                          </div>
                          <div className="flex-1 text-start">
                            <p className="text-sm font-semibold text-white">{t('scenarioDetail.whatNowNextSteps')}</p>
                            <p className="text-xs text-slate-500">{t('scenarioDetail.legalHelpComplaintsEvidence')}</p>
                          </div>
                          <CaretRight size={16} weight="bold" className="text-slate-600 transition-colors group-hover:text-emerald-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 rounded-[24px] border border-amber-900/40 bg-amber-950/10 px-5 py-4 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Warning size={16} weight="fill" className="text-amber-400" />
          <h3 className="text-xs font-medium tracking-[0.08em] text-amber-300">{t('scenarioDetail.disclaimerTitle')}</h3>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          {t('scenarioDetail.disclaimerText')}
        </p>
      </div>
    </div>
  );
}

export default ScenarioDetail;
