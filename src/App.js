import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Home as HomeIcon, List, MapPin, Video, Scale, Megaphone } from 'lucide-react';
import { GearSix, WarningCircle, Door, User, Car, Shield, Trash } from '@phosphor-icons/react';
import './App.css';
import { clearAllRecordings } from './utils/localStorageDB';
import Home from './components/Home';
import Scenarios from './components/Scenarios';
import ScenarioDetail from './components/ScenarioDetail';
import CommunityReports from './CommunityReports';
import Record from './components/Record';
import Legal from './components/Legal';
import Whistle from './components/Whistle';
import DeEscalation, { BreathingGuide } from './components/DeEscalation';
import PinEntry from './components/PinEntry';
import SecuritySettings from './components/SecuritySettings';
import { isPinEnabled } from './utils/pinAuth';

// Auto-lock timeout: 7 minutes of inactivity
const AUTO_LOCK_TIMEOUT_MS = 7 * 60 * 1000;

// Page order for determining slide direction
const pageOrder = ['home', 'scenarios', 'reports', 'record', 'legal', 'whistle'];

// Animation variants for page transitions
const pageVariants = {
  initial: (direction) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: 'easeOut' }
  },
  exit: (direction) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' }
  }),
};

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [direction, setDirection] = useState(0);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [isEmergencyNavigation, setIsEmergencyNavigation] = useState(false);
  const [breathingResetKey, setBreathingResetKey] = useState(0);
  const [isPurgingData, setIsPurgingData] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDuressMode, setIsDuressMode] = useState(false);

  // Auto-lock timer ref
  const lockTimerRef = useRef(null);

  // Reset the auto-lock timer on any user activity
  const resetLockTimer = useCallback(() => {
    // Clear existing timer
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
    }
    // Set new timer
    lockTimerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, AUTO_LOCK_TIMEOUT_MS);
  }, []);

  // Unlock the app (with optional duress mode flag)
  const handleUnlock = (isDuress = false) => {
    setIsLocked(false);
    setIsDuressMode(isDuress);
    resetLockTimer();
  };

  // Set up activity listeners for auto-lock
  useEffect(() => {
    // Activity events to track
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
      'click',
      'wheel'
    ];

    // Handler that resets the timer
    const handleActivity = () => {
      if (!isLocked) {
        resetLockTimer();
      }
    };

    // Add listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    resetLockTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
      }
    };
  }, [isLocked, resetLockTimer]);

  // Handle navigation - reset scenario when changing pages
  const handleNavigate = (page) => {
    const currentIndex = pageOrder.indexOf(currentPage);
    const nextIndex = pageOrder.indexOf(page);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setCurrentPage(page);
    setSelectedScenario(null);
    window.scrollTo(0, 0);
  };

  // Handle scenario selection (from Scenarios list page)
  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
  };

  // NEW: Navigate directly to a specific scenario (from Home page)
  // This sets BOTH at once so they don't overwrite each other
  const handleNavigateToScenario = (scenario) => {
    setSelectedScenario(scenario);
    setCurrentPage('scenarios');
  };

  // Handle back from scenario detail
  const handleBackFromScenario = () => {
    setSelectedScenario(null);
    setIsEmergencyNavigation(false);
  };

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        // Pass onNavigate for regular navigation AND onNavigateToScenario for direct scenario links
        return (
          <Home
            onNavigate={handleNavigate}
            onNavigateToScenario={handleNavigateToScenario}
            onOpenSettings={() => setShowSettings(true)}
          />
        );
      case 'scenarios':
        // Show detail if scenario selected, otherwise show list
        // LayoutGroup enables shared element transitions between list and detail
        return (
          <LayoutGroup>
            {selectedScenario ? (
              // Custom component for de-escalation
              selectedScenario.id === 'de-escalation' ? (
                <DeEscalation
                  onBack={handleBackFromScenario}
                />
              ) : (
                <ScenarioDetail
                  scenarioId={selectedScenario.id}
                  onBack={handleBackFromScenario}
                  initialMode={isEmergencyNavigation ? 'emergency' : 'study'}
                />
              )
            ) : (
              <Scenarios
                onNavigate={handleNavigate}
                onSelectScenario={handleSelectScenario}
              />
            )}
          </LayoutGroup>
        );
      case 'reports':
        return <CommunityReports isDuressMode={isDuressMode} />;
      case 'record':
        return <Record isDuressMode={isDuressMode} />;
      case 'legal': 
        return <Legal />;
      case 'whistle': 
        return <Whistle />;
      default:
        return (
          <Home
            onNavigate={handleNavigate}
            onNavigateToScenario={handleNavigateToScenario}
            onOpenSettings={() => setShowSettings(true)}
          />
        );
    }
  };

  // Handle emergency scenario selection
  const handleEmergencyScenario = (scenarioId) => {
    setEmergencyMode(false);
    setIsEmergencyNavigation(true);
    handleNavigateToScenario({ id: scenarioId });
  };

  // Handle emergency data purge
  const handleEmergencyPurge = async () => {
    if (window.confirm('DELETE ALL RECORDED DATA?\n\nThis will permanently delete all audio and video recordings. This cannot be undone.')) {
      setIsPurgingData(true);
      try {
        await clearAllRecordings();
      } catch (err) {
        console.error('Emergency purge failed:', err);
      } finally {
        setIsPurgingData(false);
      }
    }
  };

  return (
    <div className="App min-h-screen bg-slate-950 text-white pb-20">
      {/* Auto-Lock Screen Overlay */}
      {/* Auto-Lock Screen - Shows PIN entry if PIN is set, otherwise tap to continue */}
      {isLocked && (
        isPinEnabled() ? (
          <PinEntry onUnlock={handleUnlock} />
        ) : (
          <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center">
            <div className="text-center px-8">
              <div className="text-6xl mb-6">🔒</div>
              <h2 className="text-2xl font-black text-white mb-3 tracking-wide">
                Session Locked
              </h2>
              <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">
                For your security, the app locked after 7 minutes of inactivity.
              </p>
              <button
                onClick={handleUnlock}
                className="bg-red-700 hover:bg-red-600 text-white font-black py-4 px-10 rounded-2xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/50"
              >
                Tap to Continue
              </button>
              <p className="text-slate-600 text-xs mt-6 uppercase tracking-wider">
                SafeNeighbor Security
              </p>
            </div>
          </div>
        )
      )}

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-900 to-red-800 border-b-4 border-red-600 shadow-2xl h-[72px]">
        <div className="flex items-center justify-between px-4 h-full">
          <button
            onClick={() => handleNavigate('home')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="text-2xl">⚖️</div>
            <h1 className="text-2xl font-black tracking-tight">SafeNeighbor</h1>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full bg-red-950/50 text-white border border-red-400/50 hover:bg-red-950 transition-all"
              title="Security Settings"
            >
              <GearSix size={18} weight="bold" />
            </button>
            <button
              onClick={() => {
                if (!emergencyMode) {
                  // Opening emergency mode - reset breathing guide
                  setBreathingResetKey(prev => prev + 1);
                }
                setEmergencyMode(!emergencyMode);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                emergencyMode
                  ? 'bg-white text-red-900 shadow-lg shadow-red-500/50'
                  : 'bg-red-950/50 text-white border border-red-400/50 hover:bg-red-950'
              }`}
            >
              <WarningCircle size={21} weight="bold" />
              <span>EMERGENCY</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Emergency Mode Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ease-out ${
          emergencyMode
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Background overlay */}
        <div
          className="absolute inset-0 bg-slate-950/95"
          onClick={() => setEmergencyMode(false)}
        />

        {/* Emergency Panel */}
        <div
          className={`absolute top-[72px] left-0 right-0 bottom-0 overflow-y-auto transition-transform duration-300 ease-out ${
            emergencyMode ? 'translate-y-0' : '-translate-y-8'
          }`}
        >
          <div className="max-w-lg mx-auto px-4 py-6 pb-32">
            {/* 1. Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <WarningCircle size={28} weight="bold" className="text-red-500" />
                <h2 className="text-2xl font-black text-red-500 uppercase tracking-wider">
                  Emergency Mode Active
                </h2>
              </div>
              <p className="text-slate-300 text-sm">
                Remain calm. Take a breath. Choose your situation below for immediate guidance:
              </p>
            </div>

            {/* 2. Emergency Scenario Buttons (RED) */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleEmergencyScenario('door')}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 border border-red-600 text-white font-bold py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all flex items-center gap-2 sm:gap-3"
              >
                <Door size={28} weight="bold" />
                <span className="text-left">ICE is at my door</span>
              </button>
              <button
                onClick={() => handleEmergencyScenario('street')}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 border border-red-600 text-white font-bold py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all flex items-center gap-2 sm:gap-3"
              >
                <User size={28} weight="bold" />
                <span className="text-left">I am stopped in public</span>
              </button>
              <button
                onClick={() => handleEmergencyScenario('vehicle')}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 border border-red-600 text-white font-bold py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all flex items-center gap-2 sm:gap-3"
              >
                <Car size={28} weight="bold" />
                <span className="text-left">Pulled over in a vehicle</span>
              </button>
              <button
                onClick={() => handleEmergencyScenario('border')}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 border border-red-600 text-white font-bold py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all flex items-center gap-2 sm:gap-3"
              >
                <Shield size={28} weight="bold" />
                <span className="text-left">At a Border / Checkpoint</span>
              </button>
            </div>

            {/* PURGE DATA Button */}
            <div className="mb-6">
              <button
                onClick={handleEmergencyPurge}
                disabled={isPurgingData}
                className="w-full bg-slate-800/80 hover:bg-slate-700/80 border-2 border-red-600 text-red-400 font-bold py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50"
              >
                <Trash size={28} weight="bold" />
                <span>{isPurgingData ? 'PURGING...' : 'PURGE ALL RECORDED DATA'}</span>
              </button>
              <p className="text-slate-500 text-xs text-center mt-2">
                Permanently delete all audio and video recordings
              </p>
            </div>

            {/* 3. Dismiss Button */}
            <div className="text-center mb-8">
              <button
                onClick={() => setEmergencyMode(false)}
                className="text-slate-400 hover:text-white text-sm font-medium uppercase tracking-wider transition-colors"
              >
                Dismiss Emergency
              </button>
            </div>

            {/* 4. Breathing Guide (compact) */}
            <div className="mb-8">
              <BreathingGuide compact={true} key={breathingResetKey} />
            </div>

            {/* 5. Stoic Quote */}
            <div className="text-center mb-8">
              <p className="text-slate-400 italic text-sm mb-2">
                "It's not what happens to you, but how you react to it that matters."
              </p>
              <p className="text-slate-500 text-xs">— EPICTETUS</p>
            </div>

            {/* 6. Disclaimer */}
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

            {/* 7. Install CTA */}
            <div className="text-center">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto">
                <span>📲</span>
                INSTALL BROWSERLESS APP
              </button>
              <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
                Recommended for offline & secure use
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/70 backdrop-blur-xl border-t border-white/10 shadow-2xl z-50">
        <div className="flex justify-around items-center py-3 px-2">
          <NavButton icon={HomeIcon} label="HOME" active={currentPage === 'home'} onClick={() => handleNavigate('home')} />
          <NavButton icon={List} label="SCENARIOS" active={currentPage === 'scenarios'} onClick={() => handleNavigate('scenarios')} />
          <NavButton icon={MapPin} label="REPORTS" active={currentPage === 'reports'} onClick={() => handleNavigate('reports')} />
          <NavButton icon={Video} label="RECORD" active={currentPage === 'record'} onClick={() => handleNavigate('record')} />
          <NavButton icon={Scale} label="LEGAL" active={currentPage === 'legal'} onClick={() => handleNavigate('legal')} />
          <NavButton icon={Megaphone} label="SIGNALS" active={currentPage === 'whistle'} onClick={() => handleNavigate('whistle')} />
        </div>
      </nav>

      {/* Security Settings Modal */}
      {showSettings && (
        <SecuritySettings
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-2 rounded-lg transition-all ${
        active
          ? 'text-red-500 bg-red-950/30'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <Icon size={22} className="sm:w-[22px] sm:h-[22px] w-5 h-5" />
      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider">{label}</span>
    </button>
  );
}

export default App;