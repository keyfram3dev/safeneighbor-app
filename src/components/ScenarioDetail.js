import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Copy, Check, CaretRight, CaretLeft, Shield, BookOpen, Warning, House, User, Megaphone, VideoCamera, Car, Buildings, Scales, FileText, Prohibit, Wrench, DoorOpen, X, FlowerLotus } from '@phosphor-icons/react';
import { scenarios } from '../data/scenarioData';

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
};

// Helper to render scenario icon with Phosphor weight
const ScenarioIcon = ({ iconName, size = 48, className = '', weight = 'bold' }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} weight={weight} className={className} />;
};

// Stoic quotes for calm during emergency
const stoicQuotes = [
  { quote: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { quote: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { quote: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius" },
  { quote: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { quote: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
];

// Breathing Guide Component with Countdown Timer
const BreathingGuide = ({ onComplete, onSkip }) => {
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
      case 'ready': return 'Tap to Start';
      case 'inhale': return `Breathe In\n${countdown}`;
      case 'hold': return `Hold\n${countdown}`;
      case 'exhale': return `Breathe Out\n${countdown}`;
      case 'pause': return '...';
      case 'complete': return 'Well Done';
      default: return 'Tap to Start';
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <FlowerLotus size={24} weight="bold" className="text-cyan-400" />
        <h2 className="text-xl font-bold text-white">BREATHE FIRST</h2>
      </div>

      <p className="text-slate-300 text-sm mb-6">
        Take 2-3 slow, deep breaths right now. Panic is the enemy of wisdom.
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
                <span>Well Done</span>
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
              Begin Breathing
            </button>
          )}
          {isActive && (
            <button
              onClick={resetGuide}
              className="text-slate-400 hover:text-white text-sm underline"
            >
              Reset Guide
            </button>
          )}
          {phase === 'complete' && (
            <button
              onClick={onComplete}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-900/30"
            >
              I'm Ready →
            </button>
          )}
        </div>
      </div>

      {/* Explanation */}
      <p className="text-slate-400 text-xs text-center mb-6">
        Breathing reduces cortisol and allows your prefrontal cortex to regain control during high-stress encounters.
      </p>

      {/* Skip Button */}
      <button
        onClick={onSkip}
        className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        Continue →
      </button>

      {/* Disclaimer */}
      <p className="text-slate-500 text-xs text-center mt-4">
        Information is for educational purposes only. Calmly asserting rights can prevent escalation.
      </p>
    </div>
  );
};

function ScenarioDetail({ scenarioId, onBack, initialMode = 'study' }) {
  const [mode, setMode] = useState(initialMode);
  const [currentStep, setCurrentStep] = useState(0);
  const [copiedStep, setCopiedStep] = useState(null);
  const [showBreathingGuide, setShowBreathingGuide] = useState(true);
  
  const scenario = scenarios[scenarioId];
  const randomQuote = stoicQuotes[Math.floor(Math.random() * stoicQuotes.length)];

  if (!scenario) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={onBack} className="text-red-400 mb-4 flex items-center gap-2">
          <ArrowLeft size={20} weight="bold" /> Back
        </button>
        <p className="text-slate-400">Scenario not found</p>
      </div>
    );
  }

  const copyToClipboard = (text, stepIndex) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const currentStepData = scenario.emergencyScript[currentStep];
  const totalSteps = scenario.emergencyScript.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const enterEmergencyMode = () => {
    setMode('emergency');
    setShowBreathingGuide(true);
    setCurrentStep(0);
  };

  const handleBreathingComplete = () => {
    setShowBreathingGuide(false);
  };

  const handleSkipBreathing = () => {
    setShowBreathingGuide(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24">
      {/* Back Button & Active Encounter Badge */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="text-slate-400 hover:text-white font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={18} weight="bold" />
          Back
        </button>
        {mode === 'emergency' && (
          <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Active Encounter Track
          </span>
        )}
      </div>

      {/* Header - Only show when not in breathing guide */}
      {!(mode === 'emergency' && showBreathingGuide) && (
        <motion.div
          layoutId={`scenario-card-${scenarioId}`}
          className="text-center mb-6 bg-transparent"
          transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
        >
          <motion.div
            layoutId={`scenario-icon-${scenarioId}`}
            className="text-blue-400 mb-3 flex justify-center"
            transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
          >
            <ScenarioIcon iconName={scenario.icon} size={48} />
          </motion.div>
          <motion.h1
            layoutId={`scenario-title-${scenarioId}`}
            className="text-2xl font-bold text-white mb-2"
            transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
          >
            {scenario.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-slate-400 text-sm"
          >
            {scenario.description}
          </motion.p>
        </motion.div>
      )}

      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="flex gap-2 mb-6 bg-slate-900 p-1.5 rounded-xl"
      >
        <button
          onClick={() => setMode('study')}
          className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            mode === 'study'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen size={18} weight="bold" />
          Study Mode
        </button>
        <button
          onClick={enterEmergencyMode}
          className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            mode === 'emergency'
              ? 'bg-red-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Warning size={18} weight="bold" />
          Emergency Mode
        </button>
      </motion.div>

      {/* Mode Content with Horizontal Slide + Fade Animation */}
      <AnimatePresence mode="wait">
        {/* STUDY MODE */}
        {mode === 'study' && (
          <motion.div
            key="study-mode"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-6"
          >
          {/* Overview */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
            <h3 className="text-lg font-bold mb-3 text-blue-400 flex items-center gap-2">
              <Shield size={20} weight="bold" />
              Overview
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">{scenario.studyContent.overview}</p>
          </div>

          {/* Key Points */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
            <h3 className="text-lg font-bold mb-3 text-green-400">Key Points</h3>
            <div className="space-y-2">
              {scenario.studyContent.keyPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  <p className="text-slate-300 text-sm">{point}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Warrant Types / Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-5">
              <div className="mb-2">
                <ScenarioIcon iconName={scenario.studyContent.warrantTypes.judicial.icon} size={32} className="text-red-400" />
              </div>
              <h4 className="font-bold text-red-400 mb-2">{scenario.studyContent.warrantTypes.judicial.title}</h4>
              <p className="text-slate-300 text-sm">{scenario.studyContent.warrantTypes.judicial.description}</p>
            </div>
            <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-5">
              <div className="mb-2">
                <ScenarioIcon iconName={scenario.studyContent.warrantTypes.administrative.icon} size={32} className="text-amber-400" />
              </div>
              <h4 className="font-bold text-amber-400 mb-2">{scenario.studyContent.warrantTypes.administrative.title}</h4>
              <p className="text-slate-300 text-sm">{scenario.studyContent.warrantTypes.administrative.description}</p>
            </div>
          </div>

          {/* Step by Step Preview */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
            <h3 className="text-lg font-bold mb-4 text-purple-400">Step-by-Step Guide</h3>
            <div className="space-y-3">
              {scenario.emergencyScript.map((step, idx) => (
                <div key={idx} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-sm mb-1">{step.action}</h4>
                      {step.copyable && (
                        <p className="text-blue-400 italic text-sm mb-1">"{step.script}"</p>
                      )}
                      <p className="text-slate-400 text-xs">{step.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
        )}

        {/* EMERGENCY MODE */}
        {mode === 'emergency' && (
          <motion.div
            key="emergency-mode"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Breathing Guide Popup */}
            {showBreathingGuide && (
              <BreathingGuide
                onComplete={handleBreathingComplete}
                onSkip={handleSkipBreathing}
              />
            )}

            {/* Emergency Script Steps - Show after breathing guide */}
            {!showBreathingGuide && (
              <div className="space-y-4">
              {/* Stoic Quote */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 text-center">
                <p className="text-slate-300 italic text-sm">"{randomQuote.quote}"</p>
                <p className="text-slate-500 text-xs mt-2">— {randomQuote.author}</p>
              </div>

              {/* Progress Bar */}
              <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-red-600 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-slate-500 text-xs">Step {currentStep + 1} of {totalSteps}</p>

              {/* Current Step Card */}
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-sm border-2 border-red-600/50 rounded-2xl overflow-hidden">
                {/* Step Header */}
                <div className="bg-red-950/50 px-5 py-4 border-b border-red-900/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg">
                      {currentStepData.step}
                    </div>
                    <h3 className="font-black text-white uppercase tracking-wide">
                      {currentStepData.action}
                    </h3>
                  </div>
                </div>

                {/* Step Content */}
                <div className="p-5">
                  {/* Script */}
                  <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl p-5 mb-4 border border-slate-700/50">
                    <p className="text-xl text-white font-medium leading-relaxed">
                      "{currentStepData.script}"
                    </p>
                  </div>

                  {/* Copy Button */}
                  {currentStepData.copyable && (
                    <button
                      onClick={() => copyToClipboard(currentStepData.script, currentStep)}
                      className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all mb-4 ${
                        copiedStep === currentStep
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {copiedStep === currentStep ? (
                        <>
                          <Check size={18} weight="bold" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={18} weight="bold" />
                          Copy Script
                        </>
                      )}
                    </button>
                  )}

                  {/* Explanation */}
                  <div className="bg-gradient-to-br from-blue-950/40 to-blue-900/30 backdrop-blur-sm border border-blue-900/40 rounded-xl p-4">
                    <p className="text-blue-300 text-sm">
                      <span className="font-bold">Why:</span> {currentStepData.explanation}
                    </p>
                  </div>
                </div>

                {/* Navigation */}
                <div className="px-5 pb-5 flex gap-3">
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      currentStep === 0
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    <CaretLeft size={18} weight="bold" />
                    Previous
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={currentStep === totalSteps - 1}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      currentStep === totalSteps - 1
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    Next
                    <CaretRight size={18} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Quick Jump */}
              <div className="flex justify-center gap-2 mt-4">
                {scenario.emergencyScript.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`w-8 h-8 rounded-full font-bold text-xs transition-all ${
                      idx === currentStep
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* Back to Breathing Button */}
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowBreathingGuide(true)}
                  className="text-slate-400 hover:text-white text-sm underline"
                >
                  🧘 Need to breathe again?
                </button>
              </div>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-amber-500">⚠️</span>
          <h3 className="text-amber-400 font-medium text-xs tracking-wider">DISCLAIMER</h3>
        </div>
        <p className="text-slate-500 text-xs">
          This is general information, not legal advice. Consult an attorney for your specific situation.
        </p>
      </div>
    </div>
  );
}

export default ScenarioDetail;