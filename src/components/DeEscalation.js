import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from '@phosphor-icons/react';

// Breathing Guide Component
const BreathingGuide = ({ compact = false }) => {
  const [phase, setPhase] = useState('ready'); // ready, inhale, hold, exhale, complete
  const [isActive, setIsActive] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
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

  const getPhaseText = () => {
    switch (phase) {
      case 'ready': return 'Press to Start';
      case 'inhale': return `Breathe In\n${countdown}`;
      case 'hold': return `Hold\n${countdown}`;
      case 'exhale': return `Breathe Out\n${countdown}`;
      case 'pause': return `...\n`;
      case 'complete': return 'Well Done';
      default: return 'Press to Start';
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
            {getPhaseText()}
          </p>
        </div>

        {/* Control Button */}
        <div className="mt-4">
          {phase === 'ready' && (
            <button
              onClick={startBreathing}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-900/30"
            >
              Begin Breathing
            </button>
          )}
          {isActive && (
            <button
              onClick={resetGuide}
              className="text-slate-400 hover:text-white text-sm underline"
            >
              Reset
            </button>
          )}
          {phase === 'complete' && (
            <button
              onClick={resetGuide}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-900/30"
            >
              Start Again
            </button>
          )}
        </div>

        {/* Explanation */}
        <p className="text-slate-400 text-xs text-center mt-4 px-4">
          Breathing reduces cortisol and allows your prefrontal cortex to regain control during high-stress encounters.
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
            {getPhaseText()}
          </p>
        </div>

        {/* Control Button */}
        <div className="mt-4">
          {phase === 'ready' && (
            <button
              onClick={startBreathing}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-900/30"
            >
              Begin Breathing
            </button>
          )}
          {isActive && (
            <button
              onClick={resetGuide}
              className="text-slate-400 hover:text-white text-sm underline"
            >
              Reset
            </button>
          )}
          {phase === 'complete' && (
            <button
              onClick={resetGuide}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-900/30"
            >
              Start Again
            </button>
          )}
        </div>
      </div>

      {/* Explanation */}
      <p className="text-slate-400 text-xs text-center">
        Breathing reduces cortisol and allows your prefrontal cortex to regain control during high-stress encounters.
      </p>
    </div>
  );
};

// Export BreathingGuide for use in other components
export { BreathingGuide };

// Study Card Component
const StudyCard = ({ icon, title, description, stoicAction }) => (
  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-4">
    <div className="flex items-center gap-3 mb-3">
      <span className="text-3xl">{icon}</span>
      <h3 className="text-xl font-bold text-white">{title}</h3>
    </div>
    <p className="text-slate-300 text-sm mb-4 leading-relaxed">{description}</p>
    <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
      <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">WISE ACTIONS</p>
      <p className="text-white font-medium">{stoicAction}</p>
    </div>
  </div>
);

function DeEscalation({ onBack }) {
  const studyCards = [
    {
      icon: '🫧',
      title: 'External Calm',
      description: "Keep your voice low, steady, and monotone. High-pitched or loud voices can trigger an agent's 'threat' response.",
      stoicAction: 'Speak as if you are in a library.'
    },
    {
      icon: '👐',
      title: 'Visual Transparency',
      description: 'Always keep your hands where they can be seen. Avoid putting them in pockets or making sudden movements toward bags or waistbands.',
      stoicAction: 'Hands open and visible at chest height or at your sides.'
    },
    {
      icon: '🧠',
      title: 'Mental Reframing',
      description: 'The agent is part of a system, not your personal enemy. Your goal is legal protection, not winning a debate.',
      stoicAction: 'Do not argue law on the street. Assert your rights and save the argument for court.'
    },
    {
      icon: '🚩',
      title: 'Non-Threatening Posture',
      description: 'Stand at a slight angle rather than chest-to-chest. This is perceived as less confrontational by law enforcement.',
      stoicAction: 'Maintain a respectful 5-10 foot distance if possible.'
    },
    {
      icon: '🤝',
      title: "The 'Yes, And' Technique",
      description: 'Acknowledge their presence without yielding your rights.',
      stoicAction: "Say: 'I understand you are doing your job, and I am choosing to exercise my right to remain silent.'"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-white font-medium text-sm flex items-center gap-2 transition-colors mb-6"
      >
        <ArrowLeft size={18} weight="bold" />
        Back to Home
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-white tracking-wide mb-4">DE-ESCALATION</h1>

        {/* Marcus Aurelius Quote */}
        <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-5 mb-4">
          <p className="text-blue-300 italic text-sm">
            "You have power over your mind - not outside events. Realize this, and you will find strength."
          </p>
          <p className="text-blue-400 text-xs mt-2 font-medium">— MARCUS AURELIUS</p>
        </div>

        {/* Intro Text */}
        <p className="text-slate-400 text-sm">
          When faced with authority, the goal is not to win an argument, but to safely survive the encounter and preserve your legal rights.
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
          />
        ))}
      </div>

      {/* Final Stoic Principle */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 mb-6 text-center">
        <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">A FINAL STOIC PRINCIPLE</p>
        <p className="text-slate-300 italic text-sm mb-4">
          "It's not what happens to you, but how you react to it that matters."
        </p>
        <p className="text-slate-500 text-xs">— EPICTETUS</p>
      </div>

      {/* Viktor Frankl Quote */}
      <div className="text-center mb-8">
        <p className="text-slate-400 italic text-sm mb-2">
          "Between stimulus and response there is a space. In that space is our power to choose our response."
        </p>
        <p className="text-slate-500 text-xs">— VIKTOR FRANKL</p>
      </div>

      {/* Disclaimer */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-amber-500">⚠️</span>
          <h3 className="text-amber-400 font-medium text-xs tracking-wider">DISCLAIMER</h3>
        </div>
        <p className="text-slate-500 text-xs mb-1">
          This app shares general info on your rights — not legal advice.
        </p>
        <p className="text-slate-500 text-xs mb-1">
          I'm not a lawyer, and accuracy isn't guaranteed.
        </p>
        <p className="text-slate-500 text-xs mb-1">
          For legal help, talk to a licensed attorney.
        </p>
        <p className="text-slate-500 text-xs">
          Use this info at your own discretion.
        </p>
      </div>

      {/* Install CTA */}
      <div className="text-center">
        <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 flex items-center justify-center gap-2 mx-auto">
          <span>📲</span>
          INSTALL BROWSERLESS APP
        </button>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
          Recommended for offline & secure use
        </p>
      </div>
    </div>
  );
}

export default DeEscalation;
