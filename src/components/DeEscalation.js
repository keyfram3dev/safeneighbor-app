import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, SpeakerSimpleLow, HandPalm, Brain, PersonArmsSpread, Handshake, Warning, DownloadSimple } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import InstallHelp from './InstallHelp';
import FaqCta from './FaqCta';
import { useRotatingQuote } from '../utils/quoteRotation';

// Breathing Guide Component
const BreathingGuide = ({ compact = false }) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('ready'); // ready, inhale, hold, exhale, complete
  const [isActive, setIsActive] = useState(false);
  const [, setCycleCount] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // Use refs to track current values and timers
  const countdownRef = useRef(0);
  const countdownTimerRef = useRef(null);
  const phaseTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const isRunningRef = useRef(false);

  // Reset to initial state when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isRunningRef.current = false;
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      isRunningRef.current = false;
      return;
    }

    isRunningRef.current = true;

    // Phases: inhale 5s (4-0), hold 4s (3-0), exhale 5s (4-0), pause 1s
    const phases = [
      { name: 'inhale', duration: 5000, countFrom: 4, countTo: 0 },   // 4,3,2,1,0
      { name: 'hold', duration: 4000, countFrom: 3, countTo: 0 },     // 3,2,1,0
      { name: 'exhale', duration: 5000, countFrom: 4, countTo: 0 },   // 4,3,2,1,0
      { name: 'pause', duration: 1000, countFrom: null, countTo: null }, // Brief pause
    ];

    let currentPhaseIndex = 0;
    let currentCycle = 0;

    const clearTimers = () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
        phaseTimeoutRef.current = null;
      }
    };

    // Use recursive setTimeout for countdown - more reliable than setInterval
    const tickCountdown = (currentValue, targetValue) => {
      if (!isMountedRef.current || !isRunningRef.current) return;

      if (currentValue <= targetValue) {
        return; // Countdown complete
      }

      countdownTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current || !isRunningRef.current) return;

        const nextValue = currentValue - 1;
        countdownRef.current = nextValue;
        setCountdown(nextValue);

        // Schedule next tick
        tickCountdown(nextValue, targetValue);
      }, 1000);
    };

    const startCountdown = (startFrom, countTo) => {
      // Clear any existing countdown timer
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }

      if (startFrom === null) {
        countdownRef.current = 0;
        setCountdown(0);
        return;
      }

      // Set initial countdown value immediately
      countdownRef.current = startFrom;
      setCountdown(startFrom);

      // Start the countdown ticks
      tickCountdown(startFrom, countTo);
    };

    const runPhase = () => {
      if (!isMountedRef.current || !isRunningRef.current) return;

      const currentPhase = phases[currentPhaseIndex];
      setPhase(currentPhase.name);
      startCountdown(currentPhase.countFrom, currentPhase.countTo);

      phaseTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current || !isRunningRef.current) return;

        // Clear countdown timer before moving to next phase
        if (countdownTimerRef.current) {
          clearTimeout(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }

        currentPhaseIndex++;

        if (currentPhaseIndex >= phases.length) {
          currentPhaseIndex = 0;
          currentCycle++;

          if (currentCycle >= 2) {
            // Complete after 2 cycles
            isRunningRef.current = false;
            setIsActive(false);
            setPhase('complete');
            setCountdown(0);
            setCycleCount(0);
            return;
          }
          setCycleCount(currentCycle);
        }

        // Continue to next phase
        runPhase();
      }, currentPhase.duration);
    };

    runPhase();

    return () => {
      isRunningRef.current = false;
      clearTimers();
    };
  }, [isActive]);

  const startBreathing = () => {
    setIsActive(true);
    setCycleCount(0);
    setPhase('inhale');
  };

  const resetGuide = () => {
    setIsActive(false);
    setPhase('ready');
    setCycleCount(0);
    setCountdown(0);
  };

  const getPhaseText = (t) => {
    switch (phase) {
      case 'ready': return t('breathing.pressToStart');
      case 'inhale': return `${t('breathing.breatheIn')}\n${countdown}`;
      case 'hold': return `${t('breathing.hold')}\n${countdown}`;
      case 'exhale': return `${t('breathing.breatheOut')}\n${countdown}`;
      case 'pause': return `...\n`;
      case 'complete': return t('breathing.wellDone');
      default: return t('breathing.pressToStart');
    }
  };

  const getCircleStyle = () => {
    switch (phase) {
      case 'inhale': return { transform: 'scale(1.15)', transition: 'transform 5s ease-in-out' };
      case 'hold':
        // Keep at full size with opacity flash on each count
        return {
          transform: 'scale(1.15)',
          transition: 'transform 0.3s ease-out',
          animation: 'holdFlash 1s ease-in-out infinite'
        };
      case 'exhale': return { transform: 'scale(0.9)', transition: 'transform 5s ease-in-out' };
      case 'pause': return { transform: 'scale(0.9)', transition: 'transform 0.3s ease' };
      default: return { transform: 'scale(1)', transition: 'transform 0.3s ease' };
    }
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center">
        {/* Breathing Circle */}
        <div
          className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-cyan-500 flex items-center justify-center cursor-pointer ${isActive ? 'bg-cyan-950/30' : 'bg-slate-900'}`}
          style={getCircleStyle()}
          onClick={!isActive && phase !== 'complete' ? startBreathing : phase === 'complete' ? resetGuide : undefined}
        >
          <p className="text-white text-xl font-medium text-center whitespace-pre-line">
            {getPhaseText(t)}
          </p>
        </div>

        {/* Control Button */}
        <div className="mt-4">
          {phase === 'ready' && (
            <button
              onClick={startBreathing}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-900/30"
            >
              {t('breathing.beginBreathing')}
            </button>
          )}
          {isActive && (
            <button
              onClick={resetGuide}
              className="text-slate-400 hover:text-white text-sm underline"
            >
              {t('breathing.reset')}
            </button>
          )}
          {phase === 'complete' && (
            <button
              onClick={resetGuide}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-900/30"
            >
              {t('breathing.startAgain')}
            </button>
          )}
        </div>

        {/* Explanation */}
        <p className="text-slate-400 text-xs text-center mt-4 px-4">
          {t('breathing.explanation')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6">
      {/* Breathing Circle */}
      <div className="flex flex-col items-center mb-4">
        <div
          className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-cyan-500 flex items-center justify-center cursor-pointer ${isActive ? 'bg-cyan-950/30' : 'bg-slate-900'}`}
          style={getCircleStyle()}
          onClick={!isActive && phase !== 'complete' ? startBreathing : phase === 'complete' ? resetGuide : undefined}
        >
          <p className="text-white text-xl font-medium text-center whitespace-pre-line">
            {getPhaseText(t)}
          </p>
        </div>

        {/* Control Button */}
        <div className="mt-4">
          {phase === 'ready' && (
            <button
              onClick={startBreathing}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-900/30"
            >
              {t('breathing.beginBreathing')}
            </button>
          )}
          {isActive && (
            <button
              onClick={resetGuide}
              className="text-slate-400 hover:text-white text-sm underline"
            >
              {t('breathing.reset')}
            </button>
          )}
          {phase === 'complete' && (
            <button
              onClick={resetGuide}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-900/30"
            >
              {t('breathing.startAgain')}
            </button>
          )}
        </div>
      </div>

      {/* Explanation */}
      <p className="text-slate-400 text-xs text-center">
        {t('breathing.explanation')}
      </p>
    </div>
  );
};

// Export BreathingGuide for use in other components
export { BreathingGuide };

// Study Card Component
const StudyCard = ({ icon: Icon, title, description, stoicAction, wiseActionsLabel }) => (
  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-4">
    <div className="flex items-center gap-3 mb-3">
      <Icon size={28} weight="bold" className="text-blue-400" />
      <h3 className="text-xl font-bold text-white">{title}</h3>
    </div>
    <p className="text-slate-300 text-sm mb-4 leading-relaxed">{description}</p>
    <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
      <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">{wiseActionsLabel}</p>
      <p className="text-white font-medium">{stoicAction}</p>
    </div>
  </div>
);

function DeEscalation({ onBack, onNavigate }) {
  const { t } = useTranslation();
  const deescAurelius = useRotatingQuote('deescalation.aureliusQuote', 'deescalation.aureliusAuthor', 'deesc-aurelius');
  const deescEpictetus = useRotatingQuote('deescalation.epictetusQuote', 'deescalation.epictetusAuthor', 'deesc-epictetus');
  const deescFrankl = useRotatingQuote('deescalation.franklQuote', 'deescalation.franklAuthor', 'deesc-frankl');
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const studyCards = [
    {
      icon: SpeakerSimpleLow,
      title: t('deescalation.card1Title'),
      description: t('deescalation.card1Desc'),
      stoicAction: t('deescalation.card1Action')
    },
    {
      icon: HandPalm,
      title: t('deescalation.card2Title'),
      description: t('deescalation.card2Desc'),
      stoicAction: t('deescalation.card2Action')
    },
    {
      icon: Brain,
      title: t('deescalation.card3Title'),
      description: t('deescalation.card3Desc'),
      stoicAction: t('deescalation.card3Action')
    },
    {
      icon: PersonArmsSpread,
      title: t('deescalation.card4Title'),
      description: t('deescalation.card4Desc'),
      stoicAction: t('deescalation.card4Action')
    },
    {
      icon: Handshake,
      title: t('deescalation.card5Title'),
      description: t('deescalation.card5Desc'),
      stoicAction: t('deescalation.card5Action')
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-white font-medium text-sm flex items-center gap-2 transition-colors mb-6"
      >
        <ArrowLeft size={18} weight="bold" className="rtl:scale-x-[-1]" />
        {t('deescalation.backToHome')}
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-white tracking-wide mb-4">{t('deescalation.title')}</h1>

        {/* Rotating Quote */}
        <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-5 mb-4">
          <p className="text-blue-300 italic text-sm">
            {deescAurelius.quote}
          </p>
          <p className="text-blue-400 text-xs mt-2 font-medium">{deescAurelius.author}</p>
        </div>

        {/* Intro Text */}
        <p className="text-slate-400 text-sm">
          {t('deescalation.intro')}
        </p>
      </div>

      {/* Breathing Exercise */}
      <BreathingGuide />

      {/* Study Cards */}
      <div className="mb-6">
        {studyCards.map((card, index) => (
          <StudyCard
            key={index}
            icon={card.icon}
            title={card.title}
            description={card.description}
            stoicAction={card.stoicAction}
            wiseActionsLabel={t('deescalation.wiseActions')}
          />
        ))}
      </div>

      {/* Final Stoic Principle */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 mb-6 text-center">
        <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">{t('deescalation.finalPrinciple')}</p>
        <p className="text-slate-300 italic text-sm mb-4">
          {deescEpictetus.quote}
        </p>
        <p className="text-slate-500 text-xs">{deescEpictetus.author}</p>
      </div>

      {/* Rotating Quote */}
      <div className="text-center mb-8">
        <p className="text-slate-400 italic text-sm mb-2">
          {deescFrankl.quote}
        </p>
        <p className="text-slate-500 text-xs">{deescFrankl.author}</p>
      </div>

      {/* FAQ Link */}
      <FaqCta onNavigate={onNavigate} />

      {/* Disclaimer */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Warning size={16} weight="bold" className="text-amber-500" />
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
              setShowInstallHelp(true);
            }
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 flex items-center justify-center gap-2 mx-auto"
        >
          <DownloadSimple size={18} weight="bold" />
          {t('emergency.installButton')}
        </button>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
          {t('emergency.installRecommended')}
        </p>
      </div>
      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
}

export default DeEscalation;
