import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Home as HomeIcon, List, MapPin, Video, Scale, Megaphone } from 'lucide-react';
import { GearSix, WarningCircle, Door, User, Car, Shield, Trash, LockLaminated, NavigationArrowIcon as NavigationArrow, CheckIcon as Check, NotePencilIcon as NotePencil, ClockIcon as Clock2, FirstAidKitIcon as FirstAidKit } from '@phosphor-icons/react';
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
import { clearCachedKey, isKeyWrapped, unwrapMasterKeyWithPin } from './utils/crypto';
import { alertHaptic, warningHaptic } from './utils/haptics';
import Welcome from './components/Welcome';
import Features from './components/Features';
import TrustedContacts from './components/TrustedContacts';
import FamilyKit from './components/FamilyKit';
import RightsCard from './components/RightsCard';
import EncounterLog from './components/EncounterLog';
import PostEncounterGuide from './components/PostEncounterGuide';
import InstallHelp from './components/InstallHelp';
import { getTrustedContacts } from './utils/backup/accessGrants';
import {
  acquireLocation,
  reverseGeocode,
  buildLocationMessage,
  buildLocationSmsUri,
  buildLocationMailtoUri,
  saveLastKnownLocation,
  generateShareId,
  createLiveLocationDoc,
  updateLiveLocation,
  stopLiveLocation,
} from './utils/locationShare';
import LiveLocationViewer from './components/LiveLocationViewer';
import { generateLocationKey } from './utils/locationEncryption';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './components/LanguageSelector';
import { getLanguageStorageKey } from './i18n';
import i18n from './i18n';
import useDirection from './hooks/useDirection';

// Auto-lock timeout: 7 minutes of inactivity
const AUTO_LOCK_TIMEOUT_MS = 7 * 60 * 1000;

// Page order for determining slide direction
const pageOrder = ['home', 'scenarios', 'reports', 'record', 'legal', 'whistle'];

// Animation variants for page transitions (RTL-aware)
const pageVariants = {
  initial: ({ direction, isRTL }) => {
    const rtlFlip = isRTL ? -1 : 1;
    return {
      x: direction === 0 ? 0 : (direction > 0 ? 100 : -100) * rtlFlip,
      scale: direction === 0 ? 0.97 : 1,
      opacity: 0,
    };
  },
  animate: {
    x: 0,
    scale: 1,
    opacity: 1,
    transition: { duration: 0.25, ease: 'easeOut' }
  },
  exit: ({ direction, isRTL }) => {
    const rtlFlip = isRTL ? -1 : 1;
    return {
      x: (direction > 0 ? -100 : 100) * rtlFlip,
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn' }
    };
  },
};

// Umami analytics helper — no-op if script hasn't loaded
const track = (event, data) => {
  if (window.umami) window.umami.track(event, data);
};

// ErrorBoundary — catches render crashes and shows a recovery screen
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error('ErrorBoundary caught:', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-red-400 text-5xl mb-4">⚠</div>
          <h1 className="text-white text-xl font-bold mb-2">{i18n.t('errorBoundary.title')}</h1>
          <p className="text-slate-400 text-sm mb-6 max-w-sm">
            {i18n.t('errorBoundary.description')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all active:scale-95"
          >
            {i18n.t('errorBoundary.reload')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [currentPage, setCurrentPage] = useState('home');
  const [direction, setDirection] = useState(0);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [isEmergencyNavigation, setIsEmergencyNavigation] = useState(false);
  const [breathingResetKey, setBreathingResetKey] = useState(0);
  const [isPurgingData, setIsPurgingData] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDuressMode, setIsDuressMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showLanguageSelector, setShowLanguageSelector] = useState(() => !localStorage.getItem(getLanguageStorageKey()));
  const [showWelcome, setShowWelcome] = useState(() => {
    // Only show Welcome immediately if language was already chosen but Welcome hasn't been shown
    const hasLanguage = !!localStorage.getItem(getLanguageStorageKey());
    const hasSeenWelcome = !!localStorage.getItem('safeneighbor_welcome_shown');
    return hasLanguage && !hasSeenWelcome;
  });
  const [showFeatures, setShowFeatures] = useState(false);

  // Location sharing state
  const [isAcquiringLocation, setIsAcquiringLocation] = useState(false);
  const [locationShared, setLocationShared] = useState(false);
  const [lastSharedLocation, setLastSharedLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Live location tracking state
  const [liveShareId, setLiveShareId] = useState(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [liveViewShareId, setLiveViewShareId] = useState(null);
  const [showStopPinPrompt, setShowStopPinPrompt] = useState(false);
  const [showShareWarning, setShowShareWarning] = useState(false);
  const [liveViewKey, setLiveViewKey] = useState(null);
  const watchIdRef = useRef(null);
  const lastFirestoreWriteRef = useRef(0);
  const liveShareIdRef = useRef(null);
  const liveEncKeyRef = useRef(null);

  // Auto-lock timer ref
  const lockTimerRef = useRef(null);
  const swRegistrationRef = useRef(null);
  const pullDistanceRef = useRef(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // Reset the auto-lock timer on any user activity
  const resetLockTimer = useCallback(() => {
    // Clear existing timer
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
    }
    // Set new timer
    lockTimerRef.current = setTimeout(() => {
      // Clear encryption key from memory on lock
      clearCachedKey();
      setIsLocked(true);
    }, AUTO_LOCK_TIMEOUT_MS);
  }, []);

  // Unlock the app (with optional duress mode flag)
  const handleUnlock = async (isDuress = false, pin = '') => {
    setIsLocked(false);
    setIsDuressMode(isDuress);
    resetLockTimer();

    // Restore encryption key after auto-lock if key is wrapped
    if (pin && isKeyWrapped() && !isDuress) {
      try {
        await unwrapMasterKeyWithPin(pin);
      } catch (err) {
        console.error('Failed to unwrap key after lock:', err);
      }
    }
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

  // Online/offline tracking
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Catch-up encounter log sync when coming back online
      import('./utils/backup/encounterLogSync').then(({ getEncounterLogSync, getLogsFromStorage }) => {
        const autoOn = localStorage.getItem('safeneighbor_encounter_log_autobackup') !== 'false';
        if (autoOn) {
          const sync = getEncounterLogSync();
          sync.initialize().then(() => sync.syncAllDirty(getLogsFromStorage()));
        }
      }).catch(() => {});
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service worker update detection
  useEffect(() => {
    const handleSwUpdate = (e) => {
      swRegistrationRef.current = e.detail.registration;
      setShowUpdateToast(true);
    };
    window.addEventListener('swUpdate', handleSwUpdate);
    return () => window.removeEventListener('swUpdate', handleSwUpdate);
  }, []);

  const handleAppUpdate = () => {
    const reg = swRegistrationRef.current;
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdateToast(false);
  };

  // Welcome modal is initialized synchronously via useState above

  // Dismiss splash screen once React has mounted
  useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('splash-hide');
      setTimeout(() => splash.remove(), 400);
    }
  }, []);

  // Expose current page for notification logic
  useEffect(() => {
    window.__safeneighbor_currentPage = currentPage;
  }, [currentPage]);

  // Keep liveShareIdRef in sync for watchPosition callback closure
  useEffect(() => {
    liveShareIdRef.current = liveShareId;
  }, [liveShareId]);

  // Share target / live location viewer: detect query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Live location viewer route
    const liveId = params.get('live');
    if (liveId && /^[A-Za-z0-9]{10,30}$/.test(liveId)) {
      setLiveViewShareId(liveId);
      // Extract E2E encryption key from URL fragment (#key=...) — never sent to server
      const hashMatch = window.location.hash.match(/^#key=(.+)$/);
      if (hashMatch) setLiveViewKey(hashMatch[1]);
      window.history.replaceState({}, '', '/');
      return;
    }

    // Share target from other apps
    if (params.get('share') === 'true') {
      const sharedText = params.get('shareText') || '';
      const sharedUrl = params.get('shareUrl') || '';
      const sharedTitle = params.get('shareTitle') || '';
      window.__safeneighbor_shared = { text: sharedText, url: sharedUrl, title: sharedTitle };
      setCurrentPage('reports');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Pull-to-refresh
  useEffect(() => {
    const PULL_THRESHOLD = 80;

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0 && window.scrollY === 0) {
        pullDistanceRef.current = Math.min(delta * 0.4, 120);
        setPullDistance(pullDistanceRef.current);
      } else {
        isPulling.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (pullDistanceRef.current > PULL_THRESHOLD) {
        setPullDistance(0);
        setTimeout(() => window.location.reload(), 300);
      } else {
        setPullDistance(0);
      }
      isPulling.current = false;
      pullDistanceRef.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Track exit page when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      const exitPage = selectedScenario
        ? `scenario/${selectedScenario.id}`
        : currentPage;
      track('page_exit', { page: exitPage });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const exitPage = selectedScenario
          ? `scenario/${selectedScenario.id}`
          : currentPage;
        track('page_exit', { page: exitPage });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentPage, selectedScenario]);

  // Handle navigation - reset scenario when changing pages
  const handleNavigate = (page) => {
    const currentIndex = pageOrder.indexOf(currentPage);
    const nextIndex = pageOrder.indexOf(page);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setCurrentPage(page);
    setSelectedScenario(null);
    window.scrollTo(0, 0);
    track('page_view', { page });

    // Clear app badge when user views reports
    if (page === 'reports' && 'clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  };

  // Handle scenario selection (from Scenarios list page)
  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
    track('scenario_open', { id: scenario.id, title: scenario.title || scenario.id });
  };

  // NEW: Navigate directly to a specific scenario (from Home page or Emergency menu)
  // This sets BOTH at once so they don't overwrite each other
  const handleNavigateToScenario = (scenario) => {
    setSelectedScenario(scenario);
    setCurrentPage('scenarios');
    window.scrollTo(0, 0);
    track('scenario_open', { id: scenario.id, source: 'home' });
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
            onOpenSettings={() => { setShowSettings(true); track('modal_open', { modal: 'settings', source: 'home' }); }}
            onShowWelcome={() => { setShowWelcome(true); track('modal_open', { modal: 'welcome' }); }}
            onShowFeatures={() => { setShowFeatures(true); track('modal_open', { modal: 'features' }); }}
          />
        );
      case 'scenarios':
        // Show detail if scenario selected, otherwise show list
        // LayoutGroup enables shared element transitions between list and detail
        return (
          <LayoutGroup>
            {selectedScenario ? (
              // Custom components for special scenarios
              selectedScenario.id === 'de-escalation' ? (
                <DeEscalation
                  onBack={handleBackFromScenario}
                />
              ) : selectedScenario.id === 'trusted-contacts' ? (
                <TrustedContacts
                  onBack={handleBackFromScenario}
                />
              ) : selectedScenario.id === 'family-kit' ? (
                <FamilyKit
                  onBack={handleBackFromScenario}
                  onNavigateToContacts={() => setSelectedScenario({ id: 'trusted-contacts' })}
                />
              ) : selectedScenario.id === 'rights-card' ? (
                <RightsCard
                  onBack={handleBackFromScenario}
                />
              ) : selectedScenario.id === 'encounter-log' ? (
                <EncounterLog
                  onBack={handleBackFromScenario}
                  autoStart={isEmergencyNavigation}
                  onOpenBackupSettings={() => {
                    handleBackFromScenario();
                    handleNavigate('record');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('openBackupSettings')), 300);
                  }}
                />
              ) : selectedScenario.id === 'encounter-log-after' ? (
                <EncounterLog
                  onBack={handleBackFromScenario}
                  afterMode
                  onOpenBackupSettings={() => {
                    handleBackFromScenario();
                    handleNavigate('record');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('openBackupSettings')), 300);
                  }}
                />
              ) : selectedScenario.id === 'post-encounter' ? (
                <PostEncounterGuide
                  onBack={handleBackFromScenario}
                  onNavigateToScenario={(scenario) => {
                    setSelectedScenario(scenario);
                    window.scrollTo(0, 0);
                  }}
                />
              ) : (
                <ScenarioDetail
                  scenarioId={selectedScenario.id}
                  onBack={handleBackFromScenario}
                  initialMode={isEmergencyNavigation ? 'emergency' : 'study'}
                  onNavigateToScenario={(scenario) => {
                    setSelectedScenario(scenario);
                    setIsEmergencyNavigation(false);
                    window.scrollTo(0, 0);
                  }}
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
            onOpenSettings={() => { setShowSettings(true); track('modal_open', { modal: 'settings', source: 'home' }); }}
            onShowWelcome={() => { setShowWelcome(true); track('modal_open', { modal: 'welcome' }); }}
            onShowFeatures={() => { setShowFeatures(true); track('modal_open', { modal: 'features' }); }}
          />
        );
    }
  };

  // Clean up watchPosition on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Dismiss emergency mode — live tracking keeps running
  const dismissEmergency = () => {
    setEmergencyMode(false);
    setLocationError(null);
    setIsAcquiringLocation(false);
    setShowShareWarning(false);
    // Keep locationShared, lastSharedLocation, and live tracking intact
    // so they persist when the panel is reopened
    if (!isLiveTracking) {
      setLocationShared(false);
      setLastSharedLocation(null);
    }
  };

  // Handle emergency scenario selection
  const handleEmergencyScenario = (scenarioId) => {
    dismissEmergency();
    setIsEmergencyNavigation(true);
    track('emergency_scenario', { id: scenarioId });
    handleNavigateToScenario({ id: scenarioId });
  };

  // Handle sharing GPS location with trusted contacts
  const handleShareLocation = async () => {
    const contacts = getTrustedContacts();

    if (contacts.length === 0) {
      setLocationError('no-contacts');
      return;
    }

    const phoneContacts = contacts.filter(c => c.phone);
    const emailContacts = contacts.filter(c => c.email);

    if (phoneContacts.length === 0 && emailContacts.length === 0) {
      setLocationError('no-contact-methods');
      return;
    }

    setIsAcquiringLocation(true);
    setLocationError(null);

    try {
      const location = await acquireLocation();

      let address = null;
      try {
        const geoData = await reverseGeocode(location.lat, location.lng);
        address = geoData.address;
      } catch {}

      const userName = localStorage.getItem('safeneighbor_user_name') || '';

      // Create Firestore live location doc with E2E encryption
      let shareId = null;
      let keyString = null;
      try {
        shareId = generateShareId();
        const { key, keyString: ks } = await generateLocationKey();
        keyString = ks;
        liveEncKeyRef.current = key;
        await createLiveLocationDoc(
          shareId, location.lat, location.lng,
          location.accuracy, address, userName, key
        );
        setLiveShareId(shareId);
        liveShareIdRef.current = shareId;
      } catch (err) {
        console.error('Failed to create live location doc:', err);
        shareId = null;
        keyString = null;
        liveEncKeyRef.current = null;
      }

      const message = buildLocationMessage(userName, location.lat, location.lng, address, shareId, keyString);

      if (phoneContacts.length > 0) {
        window.location.href = buildLocationSmsUri(phoneContacts, message);
      } else if (emailContacts.length > 0) {
        window.location.href = buildLocationMailtoUri(emailContacts, message);
      } else if (navigator.share) {
        await navigator.share({ title: 'SafeNeighbor Location Alert', text: message });
      } else {
        await navigator.clipboard.writeText(message);
      }

      saveLastKnownLocation(location);
      setLastSharedLocation({ ...location, address, sharedAt: Date.now() });
      setLocationShared(true);
      track('location_share', { method: phoneContacts.length > 0 ? 'sms' : 'email', live: !!shareId });
      alertHaptic();

      // Start continuous tracking if Firestore doc was created
      if (shareId) {
        startLiveTracking();
      }
    } catch (error) {
      if (error.code === 1) {
        setLocationError('permission-denied');
      } else if (error.code === 2) {
        setLocationError('position-unavailable');
      } else if (error.code === 3) {
        setLocationError('timeout');
      } else {
        setLocationError('unknown');
      }
    } finally {
      setIsAcquiringLocation(false);
    }
  };

  // Start continuous GPS tracking and push updates to Firestore
  const LIVE_TRACKING_THROTTLE_MS = 30000;

  const startLiveTracking = () => {
    if (watchIdRef.current !== null) return;

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastFirestoreWriteRef.current < LIVE_TRACKING_THROTTLE_MS) return;
        lastFirestoreWriteRef.current = now;

        const { latitude, longitude, accuracy } = position.coords;
        const currentShareId = liveShareIdRef.current;
        if (!currentShareId) return;

        let address = null;
        try {
          const geoData = await reverseGeocode(latitude, longitude);
          address = geoData.address;
        } catch {}

        try {
          await updateLiveLocation(currentShareId, latitude, longitude, accuracy, address, liveEncKeyRef.current);
        } catch (err) {
          console.error('Live location update failed:', err);
        }
      },
      (error) => {
        console.error('watchPosition error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    watchIdRef.current = id;
    setIsLiveTracking(true);
  };

  // Stop live GPS tracking and mark Firestore doc as inactive
  const handleStopLiveTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
    setShowStopPinPrompt(false);

    const shareId = liveShareIdRef.current;
    if (shareId) {
      try {
        await stopLiveLocation(shareId);
      } catch (err) {
        console.error('Failed to stop live location:', err);
      }
    }
    setLiveShareId(null);
    liveShareIdRef.current = null;
    liveEncKeyRef.current = null;
  };

  // PIN-gated stop: require PIN entry if PIN is set
  const handleRequestStopTracking = () => {
    if (isPinEnabled()) {
      setShowStopPinPrompt(true);
    } else {
      handleStopLiveTracking();
    }
  };

  // Handle emergency data purge
  const handleEmergencyPurge = async () => {
    if (window.confirm(t('purgeConfirm'))) {
      warningHaptic();
      track('emergency_purge');
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

  // If viewing a shared live location, render ONLY the viewer
  if (liveViewShareId) {
    return (
      <LiveLocationViewer
        shareId={liveViewShareId}
        encryptionKey={liveViewKey}
        onClose={() => { setLiveViewShareId(null); setLiveViewKey(null); }}
      />
    );
  }

  return (
    <div className="App min-h-screen bg-slate-950 text-white safe-footer-bottom">
      {/* Auto-Lock Screen Overlay */}
      {/* Auto-Lock Screen - Shows PIN entry if PIN is set, otherwise tap to continue */}
      {isLocked && (
        isPinEnabled() ? (
          <PinEntry onUnlock={handleUnlock} />
        ) : (
          <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 w-full max-w-sm text-center">
              <div className="mb-6 flex justify-center">
                <LockLaminated size={64} weight="bold" className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3 tracking-wide">
                {t('lock.sessionLocked')}
              </h2>
              <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">
                {t('lock.lockMessage')}
              </p>
              <button
                onClick={handleUnlock}
                className="w-full bg-red-700 hover:bg-red-600 text-white font-black py-4 px-10 rounded-2xl uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/50"
              >
                {t('lock.tapToContinue')}
              </button>
              <p className="text-slate-600 text-xs mt-6 uppercase tracking-wider">
                {t('app.security')}
              </p>
            </div>
          </div>
        )
      )}

      {/* Language Selector — shown on first visit before Welcome */}
      {showLanguageSelector && (
        <LanguageSelector onSelect={() => {
          setShowLanguageSelector(false);
          if (!localStorage.getItem('safeneighbor_welcome_shown')) {
            setShowWelcome(true);
          }
        }} />
      )}

      {/* Welcome Modal - shown on first visit (after language selection) */}
      {showWelcome && (
        <Welcome onClose={() => {
          localStorage.setItem('safeneighbor_welcome_shown', 'true');
          setShowWelcome(false);
        }} onOpenSettings={() => {
          localStorage.setItem('safeneighbor_welcome_shown', 'true');
          setShowWelcome(false);
          setShowSettings(true);
        }} />
      )}

      {/* Features Modal */}
      {showFeatures && (
        <Features onClose={() => setShowFeatures(false)} />
      )}

      {/* PIN prompt to stop live tracking */}
      {showStopPinPrompt && (
        <div className="fixed inset-0 z-[90] bg-slate-950/95 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <PinEntry
              inline
              title={t('lock.enterPinToStop')}
              subtitle={t('lock.pinRequiredToStop')}
              onUnlock={(isDuress) => {
                if (isDuress) {
                  setShowStopPinPrompt(false);
                } else {
                  handleStopLiveTracking();
                }
              }}
            />
            <button
              onClick={() => setShowStopPinPrompt(false)}
              className="mt-4 w-full text-slate-500 hover:text-slate-300 text-sm font-medium uppercase tracking-wider transition-colors text-center py-2"
            >
              {t('lock.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-900 to-red-800 border-b-4 border-red-600 shadow-2xl safe-top-nav">
        <div className="flex items-center justify-between px-4 h-[72px]">
          <button
            onClick={() => handleNavigate('home')}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="text-xl sm:text-2xl">⚖️</div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight">SafeNeighbor</h1>
          </button>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => { setShowSettings(true); track('modal_open', { modal: 'settings' }); }}
              className="p-2 rounded-full bg-red-950/50 text-white border border-red-400/50 hover:bg-red-950 transition-all"
              title={t('nav.securitySettingsTooltip')}
            >
              <GearSix size={18} weight="bold" />
            </button>
            {/* Live tracking indicator — visible when panel is closed */}
            {isLiveTracking && !emergencyMode && (
              <button
                onClick={() => { setEmergencyMode(true); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-green-900/60 border border-green-500/40 text-green-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all hover:bg-green-900/80"
                title={t('nav.liveTrackingTooltip')}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="hidden sm:inline">{t('location.live')}</span>
              </button>
            )}
            <button
              onClick={() => {
                if (!emergencyMode) {
                  alertHaptic();
                  setBreathingResetKey(prev => prev + 1);
                  track('emergency_mode', { action: 'open' });
                  setEmergencyMode(true);
                } else {
                  dismissEmergency();
                }
              }}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                emergencyMode
                  ? 'bg-white text-red-900 shadow-lg shadow-red-500/50'
                  : 'bg-red-950/50 text-white border border-red-400/50 hover:bg-red-950 emergency-flash'
              }`}
            >
              <WarningCircle size={21} weight="bold" />
              <span>{t('emergency.button')}</span>
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
          onClick={dismissEmergency}
        />

        {/* Emergency Panel */}
        <div
          className={`absolute left-0 right-0 bottom-0 overflow-y-auto transition-transform duration-300 ease-out ${
            emergencyMode ? 'translate-y-0' : '-translate-y-8'
          }`}
          style={{ top: 'calc(72px + env(safe-area-inset-top, 0px))' }}
        >
          <div className="max-w-lg mx-auto px-4 py-6 pb-32">
            {/* 1. Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <WarningCircle size={28} weight="bold" className="text-red-500" />
                <h2 className="text-2xl font-black text-red-500 uppercase tracking-wider">
                  {t('emergency.title')}
                </h2>
              </div>
              <p className="text-slate-300 text-sm">
                {t('emergency.subtitle')}
              </p>
            </div>

            {/* 2. SHARE MY LOCATION */}
            <div className="mb-6">
              {!locationShared ? (
                <>
                  {showShareWarning && !isAcquiringLocation ? (
                    <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-4 mb-2">
                      <h3 className="text-amber-400 font-bold text-sm mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Shield size={16} weight="bold" />
                        {t('shareWarning.title')}
                      </h3>
                      <ul className="text-slate-300 text-xs space-y-2 mb-4">
                        <li className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5 shrink-0">&bull;</span>
                          <span>{t('shareWarning.smsInterception')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5 shrink-0">&bull;</span>
                          <span>{t('shareWarning.e2eEncryption')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5 shrink-0">&bull;</span>
                          <span>{t('shareWarning.firebaseInfra')}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-slate-400 mt-0.5 shrink-0">&bull;</span>
                          <span>{t('shareWarning.liveUntilStop')}</span>
                        </li>
                      </ul>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setShowShareWarning(false); handleShareLocation(); }}
                          className="bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors"
                        >
                          {t('shareWarning.understand')}
                        </button>
                        <button
                          onClick={() => setShowShareWarning(false)}
                          className="text-slate-400 hover:text-slate-200 text-xs font-medium uppercase tracking-wider transition-colors"
                        >
                          {t('shareWarning.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowShareWarning(true)}
                      disabled={isAcquiringLocation}
                      className="w-full bg-gradient-to-b from-white/[0.18] to-white/[0.06] backdrop-blur-md border border-white/20 border-t-white/30 text-white font-black py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-white/[0.24] hover:to-white/[0.10] hover:border-t-white/40 hover:shadow-[0_6px_28px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-60"
                    >
                      {isAcquiringLocation ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span className="uppercase tracking-wider">{t('location.acquiringGps')}</span>
                        </>
                      ) : (
                        <>
                          <NavigationArrow size={24} weight="bold" />
                          <span className="text-lg uppercase tracking-wider">{t('location.shareButton')}</span>
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-slate-500 text-xs text-center mt-2">
                    {t('location.shareDescription')}
                  </p>
                  <button
                    onClick={() => { dismissEmergency(); handleNavigateToScenario({ id: 'trusted-contacts' }); }}
                    className="block mx-auto mt-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
                  >
                    {t('location.setupContacts')}
                  </button>
                </>
              ) : (
                <div className="bg-gradient-to-br from-green-950/40 to-slate-900/40 border border-green-700/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={20} weight="bold" className="text-green-400" />
                    <p className="text-green-400 font-bold text-sm uppercase tracking-wider">{t('location.locationSent')}</p>
                  </div>
                  {lastSharedLocation && (
                    <div className="text-slate-400 text-xs space-y-1 mb-3">
                      <p>{lastSharedLocation.address || `${lastSharedLocation.lat.toFixed(5)}, ${lastSharedLocation.lng.toFixed(5)}`}</p>
                      <p className="text-slate-500">
                        Shared {new Date(lastSharedLocation.sharedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  )}

                  {/* Live Tracking Indicator */}
                  {isLiveTracking && (
                    <div className="flex items-center gap-2 mb-3 bg-green-950/30 border border-green-700/30 rounded-lg px-3 py-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                      </span>
                      <span className="text-green-400 text-xs font-bold uppercase tracking-wider">
                        {t('location.liveTracking')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    {isLiveTracking && (
                      <button
                        onClick={handleRequestStopTracking}
                        className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider"
                      >
                        {t('location.stopLive')}
                      </button>
                    )}
                    {!isLiveTracking && (
                      <button
                        onClick={() => { setLocationShared(false); setLocationError(null); }}
                        className="text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider"
                      >
                        {t('location.shareUpdated')}
                      </button>
                    )}
                    <button
                      onClick={() => { setLocationShared(false); setLastSharedLocation(null); setLocationError(null); }}
                      className="text-slate-500 hover:text-slate-300 text-xs font-medium uppercase tracking-wider transition-colors"
                    >
                      {t('location.clear')}
                    </button>
                  </div>
                </div>
              )}

              {/* Error states */}
              {locationError === 'no-contacts' && (
                <div className="mt-3 bg-amber-950/30 border border-amber-700/40 rounded-xl p-3">
                  <p className="text-amber-400 text-sm font-semibold mb-1">{t('location.noContacts')}</p>
                  <p className="text-slate-400 text-xs mb-2">{t('location.noContactsDesc')}</p>
                  <button
                    onClick={() => {
                      dismissEmergency();
                      handleNavigateToScenario({ id: 'trusted-contacts' });
                    }}
                    className="text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider"
                  >
                    {t('location.setupContactsShort')}
                  </button>
                </div>
              )}
              {locationError === 'no-contact-methods' && (
                <div className="mt-3 bg-amber-950/30 border border-amber-700/40 rounded-xl p-3">
                  <p className="text-amber-400 text-sm font-semibold mb-1">{t('location.noContactMethods')}</p>
                  <p className="text-slate-400 text-xs mb-2">{t('location.noContactMethodsDesc')}</p>
                  <button
                    onClick={() => {
                      dismissEmergency();
                      handleNavigateToScenario({ id: 'trusted-contacts' });
                    }}
                    className="text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider"
                  >
                    {t('location.editContacts')}
                  </button>
                </div>
              )}
              {locationError === 'permission-denied' && (
                <div className="mt-3 bg-red-950/30 border border-red-700/40 rounded-xl p-3">
                  <p className="text-red-400 text-sm font-semibold">{t('location.permissionDenied')}</p>
                  <p className="text-slate-400 text-xs">{t('location.permissionDeniedDesc')}</p>
                </div>
              )}
              {(locationError === 'timeout' || locationError === 'position-unavailable' || locationError === 'unknown') && (
                <div className="mt-3 bg-amber-950/30 border border-amber-700/40 rounded-xl p-3">
                  <p className="text-amber-400 text-sm font-semibold">{t('location.couldNotGet')}</p>
                  <p className="text-slate-400 text-xs mb-1">{t('location.couldNotGetDesc')}</p>
                  <button
                    onClick={() => { setLocationError(null); handleShareLocation(); }}
                    className="text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider"
                  >
                    {t('location.retry')}
                  </button>
                </div>
              )}
            </div>

            {/* 3. Emergency Scenario Buttons (RED) */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleEmergencyScenario('door')}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 border border-red-600 text-white font-bold py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all flex items-center gap-2 sm:gap-3"
              >
                <Door size={28} weight="bold" />
                <span className="text-start">{t('emergency.doorButton')}</span>
              </button>
              <button
                onClick={() => handleEmergencyScenario('street')}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 border border-red-600 text-white font-bold py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all flex items-center gap-2 sm:gap-3"
              >
                <User size={28} weight="bold" />
                <span className="text-start">{t('emergency.streetButton')}</span>
              </button>
              <button
                onClick={() => handleEmergencyScenario('vehicle')}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 border border-red-600 text-white font-bold py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all flex items-center gap-2 sm:gap-3"
              >
                <Car size={28} weight="bold" />
                <span className="text-start">{t('emergency.vehicleButton')}</span>
              </button>
              <button
                onClick={() => handleEmergencyScenario('border')}
                className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 border border-red-600 text-white font-bold py-3 px-4 sm:py-4 sm:px-6 rounded-xl transition-all flex items-center gap-2 sm:gap-3"
              >
                <Shield size={28} weight="bold" />
                <span className="text-start">{t('emergency.borderButton')}</span>
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
                <span>{isPurgingData ? t('emergency.purging') : t('emergency.purgeButton')}</span>
              </button>
              <p className="text-slate-500 text-xs text-center mt-2">
                {t('emergency.purgeDescription')}
              </p>
            </div>

            {/* LOG AN ENCOUNTER */}
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                {t('emergency.logEncounter')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEmergencyScenario('encounter-log')}
                  className="flex-1 bg-gradient-to-b from-white/[0.18] to-white/[0.06] backdrop-blur-md border border-white/20 border-t-white/30 text-white font-black py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-white/[0.24] hover:to-white/[0.10] hover:border-t-white/40 hover:shadow-[0_6px_28px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]"
                >
                  <NotePencil size={20} weight="bold" />
                  <span className="uppercase tracking-wider text-sm">{t('emergency.logNow')}</span>
                </button>
                <button
                  onClick={() => handleEmergencyScenario('encounter-log-after')}
                  className="flex-1 bg-gradient-to-b from-white/[0.18] to-white/[0.06] backdrop-blur-md border border-white/20 border-t-white/30 text-white font-black py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-white/[0.24] hover:to-white/[0.10] hover:border-t-white/40 hover:shadow-[0_6px_28px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]"
                >
                  <Clock2 size={20} weight="bold" />
                  <span className="uppercase tracking-wider text-sm">{t('emergency.logAfter')}</span>
                </button>
              </div>
              <p className="text-slate-500 text-xs text-center mt-2">
                {t('emergency.logDescription')}
              </p>
            </div>

            {/* 3b. AFTER AN ENCOUNTER */}
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                {t('emergency.afterEncounter')}
              </p>
              <button
                onClick={() => handleEmergencyScenario('post-encounter')}
                className="w-full bg-gradient-to-b from-white/[0.18] to-white/[0.06] backdrop-blur-md border border-white/20 border-t-white/30 text-white font-black py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-white/[0.24] hover:to-white/[0.10] hover:border-t-white/40 hover:shadow-[0_6px_28px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                <FirstAidKit size={20} weight="bold" />
                <span className="uppercase tracking-wider text-sm">{t('emergency.whatNow')}</span>
              </button>
              <p className="text-slate-500 text-xs text-center mt-2">
                {t('emergency.afterDescription')}
              </p>
            </div>

            {/* Dismiss Button */}
            <div className="text-center mb-8">
              <button
                onClick={dismissEmergency}
                className="text-slate-400 hover:text-white text-sm font-medium uppercase tracking-wider transition-colors"
              >
                {t('emergency.dismiss')}
              </button>
            </div>

            {/* 4. Breathing Guide (compact) */}
            <div className="mb-8">
              <BreathingGuide compact={true} key={breathingResetKey} />
            </div>

            {/* 5. Stoic Quote */}
            <div className="text-center mb-8">
              <p className="text-slate-400 italic text-sm mb-2">
                {t('stoic.emergencyQuote')}
              </p>
              <p className="text-slate-500 text-xs">{t('stoic.emergencyAuthor')}</p>
            </div>

            {/* 6. Disclaimer */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-amber-500">⚠️</span>
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

            {/* 7. Install CTA */}
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <span>📲</span>
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
          </div>
        </div>
      </div>

      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />

      {/* Offline Indicator Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed left-0 right-0 z-[45] flex items-center justify-center bg-amber-900/90 backdrop-blur-sm border-b border-amber-600/50 text-amber-200 text-xs font-bold uppercase tracking-widest pt-4 pb-1.5 px-4 leading-none"
            style={{ top: 'calc(72px + env(safe-area-inset-top, 0px))' }}
          >
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {t('offline.message')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="fixed left-0 right-0 z-[55] flex justify-center pointer-events-none"
          style={{
            top: 'calc(72px + env(safe-area-inset-top, 0px))',
            transform: `translateY(${pullDistance}px)`,
            opacity: Math.min(pullDistance / 80, 1)
          }}
        >
          <div
            className={`w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent ${pullDistance > 80 ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="safe-content-top overflow-hidden">
        <AnimatePresence mode="wait" custom={{ direction, isRTL }}>
          <motion.div
            key={currentPage}
            custom={{ direction, isRTL }}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Contact Footer */}
      <footer className="text-center py-4 pb-24 px-4">
        <p className="text-slate-500 text-[10px] tracking-wide">
          {t('footer.contact')}{' '}
          <a
            href="mailto:SafeNeighbor.us@proton.me"
            className="text-slate-400 hover:text-red-400 underline transition-colors"
          >
            SafeNeighbor.us@proton.me
          </a>
        </p>
      </footer>

      {/* App Update Toast */}
      <AnimatePresence>
        {showUpdateToast && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed left-4 right-4 z-[60] bg-gradient-to-r from-blue-900/95 to-blue-800/95 backdrop-blur-sm border border-blue-500/50 rounded-2xl p-4 flex items-center justify-between shadow-2xl"
            style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
          >
            <div>
              <p className="text-white font-bold text-sm">{t('update.title')}</p>
              <p className="text-blue-300 text-xs">{t('update.description')}</p>
            </div>
            <button
              onClick={handleAppUpdate}
              className="bg-white text-blue-900 font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
            >
              {t('update.refresh')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/70 backdrop-blur-xl border-t border-white/10 shadow-2xl z-50 safe-bottom-nav">
        <div className="flex justify-around items-center py-3 px-2">
          <NavButton icon={HomeIcon} label={t('nav.home')} active={currentPage === 'home'} onClick={() => handleNavigate('home')} />
          <NavButton icon={List} label={t('nav.scenarios')} active={currentPage === 'scenarios'} onClick={() => handleNavigate('scenarios')} />
          <NavButton icon={MapPin} label={t('nav.reports')} active={currentPage === 'reports'} onClick={() => handleNavigate('reports')} />
          <NavButton icon={Video} label={t('nav.record')} active={currentPage === 'record'} onClick={() => handleNavigate('record')} />
          <NavButton icon={Scale} label={t('nav.legal')} active={currentPage === 'legal'} onClick={() => handleNavigate('legal')} />
          <NavButton icon={Megaphone} label={t('nav.signals')} active={currentPage === 'whistle'} onClick={() => handleNavigate('whistle')} />
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

const AppWithBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithBoundary;