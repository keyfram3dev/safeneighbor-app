import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { flushSync } from 'react-dom';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { motion, AnimatePresence } from 'framer-motion';
import { Home as HomeIcon, List, MapPin, Video, Scale, Megaphone } from 'lucide-react';
import { GearSix, WarningCircle, Door, User, Car, Shield, Trash, LockLaminated, NavigationArrowIcon as NavigationArrow, CheckIcon as Check, NotePencilIcon as NotePencil, ClockIcon as Clock2, FirstAidKitIcon as FirstAidKit, XIcon as CloseX, DeviceMobileIcon as DeviceMobile, ScalesIcon as Scales, TimerIcon as TimerEm } from '@phosphor-icons/react';
import './App.css';
import { clearAllRecordings, getAllRecordings } from './utils/localStorageDB';
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
import {
  clearCachedLocationsKey,
  isLocationsKeyWrapped,
  unwrapLocationsKeyWithPin,
  initLocationsKey,
} from './utils/locationsKey';
import { alertHaptic, warningHaptic } from './utils/haptics';
import Welcome from './components/Welcome';
import Features from './components/Features';
import OfflineLibrary from './components/OfflineLibrary';
import TrustedContacts from './components/TrustedContacts';
import FamilyKit from './components/FamilyKit';
import RightsCard from './components/RightsCard';
import EncounterLog from './components/EncounterLog';
import PostEncounterGuide from './components/PostEncounterGuide';
import InstallHelp from './components/InstallHelp';
import CheckMyRoute from './components/CheckMyRoute';
import LegalResponse from './components/LegalResponse';
import SafetyCheckIn from './components/SafetyCheckIn';
import CommunityWitnessing from './components/CommunityWitnessing';
import FAQ from './components/FAQ';
import TechSecurity from './components/TechSecurity';
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
import { ReportsProvider } from './contexts/ReportsContext';
import useProximityAlerts from './hooks/useProximityAlerts';
import ProximityAlert from './components/ProximityAlert';

// Auto-lock timeout: 7 minutes of inactivity
const AUTO_LOCK_TIMEOUT_MS = 7 * 60 * 1000;
const BUILD_VERSION = process.env.REACT_APP_BUILD_VERSION || 'dev';
const BUILD_TIME = process.env.REACT_APP_BUILD_TIME || 'local build';
const RECENT_SCENARIOS_KEY = 'safeneighbor_recent_scenarios';

const pageOrder = ['home', 'scenarios', 'reports', 'record', 'legal', 'whistle'];
const validPages = new Set([...pageOrder, 'faq', 'tech-security']);
const modalKeys = [
  'settings',
  'features',
  'check-route',
  'check-in',
  'legal-response',
  'install-help',
  'offline-library',
];
const EMERGENCY_ANALYTICS_KEY = 'safeneighbor_emergency_usage';

const normalizePage = (page) => (validPages.has(page) ? page : 'home');

const buildAppUrl = ({ page = 'home', selectedScenario = null, activeModal = null }) => {
  const params = new URLSearchParams();
  const normalizedPage = selectedScenario ? 'scenarios' : normalizePage(page);

  if (normalizedPage !== 'home' || selectedScenario) {
    params.set('page', normalizedPage);
  }

  if (selectedScenario?.id) {
    params.set('scenario', selectedScenario.id);
  }

  if (activeModal && modalKeys.includes(activeModal)) {
    params.set('modal', activeModal);
  }

  const query = params.toString();
  return query ? `/?${query}` : '/';
};

const formatRelativeTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const readEmergencyAnalytics = () => {
  try {
    const stored = localStorage.getItem(EMERGENCY_ANALYTICS_KEY);
    if (!stored) {
      return { counts: {}, lastAction: null };
    }

    const parsed = JSON.parse(stored);
    return {
      counts: parsed?.counts || {},
      lastAction: parsed?.lastAction || null,
    };
  } catch {
    return { counts: {}, lastAction: null };
  }
};

const writeEmergencyAnalytics = (analytics) => {
  try {
    localStorage.setItem(EMERGENCY_ANALYTICS_KEY, JSON.stringify(analytics));
  } catch {}
};

const parseAppLocation = (location) => {
  const params = new URLSearchParams(location.search);
  const tabMap = { record: 'record', rights: 'legal', report: 'reports' };

  const liveId = params.get('live');
  if (liveId && /^[A-Za-z0-9]{10,30}$/.test(liveId)) {
    const hashMatch = location.hash.match(/^#key=(.+)$/);
    return {
      page: 'home',
      selectedScenario: null,
      activeModal: null,
      liveViewShareId: liveId,
      liveViewKey: hashMatch ? hashMatch[1] : null,
      sharedPayload: null,
      replaceUrl: '/',
    };
  }

  const sharedPayload = params.get('share') === 'true'
    ? {
        text: params.get('shareText') || '',
        url: params.get('shareUrl') || '',
        title: params.get('shareTitle') || '',
      }
    : null;

  let page = 'home';
  if (sharedPayload) {
    page = 'reports';
  }

  const shortcutTab = params.get('tab');
  if (shortcutTab && tabMap[shortcutTab]) {
    page = tabMap[shortcutTab];
  }

  const pageParam = params.get('page');
  if (pageParam) {
    page = normalizePage(pageParam);
  }

  const scenarioId = params.get('scenario');
  const selectedScenario = scenarioId ? { id: scenarioId } : null;
  if (selectedScenario) {
    page = 'scenarios';
  }

  const modalParam = params.get('modal');
  const activeModal = modalKeys.includes(modalParam) ? modalParam : null;

  const hasLegacyParams = !!(sharedPayload || shortcutTab || liveId);
  return {
    page,
    selectedScenario,
    activeModal,
    liveViewShareId: null,
    liveViewKey: null,
    sharedPayload,
    replaceUrl: hasLegacyParams ? buildAppUrl({ page, selectedScenario, activeModal }) : null,
  };
};

// Umami analytics helper — no-op if script hasn't loaded
const track = (event, data) => {
  if (window.umami) window.umami.track(event, data);
};

const persistRecentScenarioId = (scenarioId) => {
  if (!scenarioId) return;
  try {
    const existing = JSON.parse(localStorage.getItem(RECENT_SCENARIOS_KEY) || '[]');
    const next = [scenarioId, ...existing.filter((id) => id !== scenarioId)].slice(0, 5);
    localStorage.setItem(RECENT_SCENARIOS_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Failed to store recent scenario', error);
  }
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
  const initialUrlStateRef = useRef(null);
  if (!initialUrlStateRef.current) {
    initialUrlStateRef.current = parseAppLocation(window.location);
  }
  const initialUrlState = initialUrlStateRef.current;

  const [currentPage, setCurrentPage] = useState(initialUrlState.page);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(initialUrlState.selectedScenario);
  const [isEmergencyNavigation, setIsEmergencyNavigation] = useState(false);
  const [emergencyHandoff, setEmergencyHandoff] = useState(null);
  const [breathingResetKey, setBreathingResetKey] = useState(0);
  const [tcRefreshKey, setTcRefreshKey] = useState(0);
  const [isPurgingData, setIsPurgingData] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(initialUrlState.activeModal === 'install-help');
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    const isPWA = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('safeneighbor_install_dismissed') === 'true';
    return !isPWA && !dismissed;
  });
  const [isLocked, setIsLocked] = useState(false);
  const [showSettings, setShowSettings] = useState(initialUrlState.activeModal === 'settings');
  const [isDuressMode, setIsDuressMode] = useState(false);
  const { isOnline } = useOnlineStatus({
    onReconnect: useCallback(() => {
      import('./utils/backup/encounterLogSync').then(({ getEncounterLogSync, getLogsFromStorage }) => {
        const autoOn = localStorage.getItem('safeneighbor_encounter_log_autobackup') !== 'false';
        if (autoOn) {
          const sync = getEncounterLogSync();
          sync.initialize().then(async () => sync.syncAllDirty(await getLogsFromStorage()));
        }
      }).catch(() => {});
    }, [])
  });
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [showInteractionShield, setShowInteractionShield] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showLanguageSelector, setShowLanguageSelector] = useState(() => !localStorage.getItem(getLanguageStorageKey()));
  const [showWelcome, setShowWelcome] = useState(() => {
    // Only show Welcome immediately if language was already chosen but Welcome hasn't been shown
    const hasLanguage = !!localStorage.getItem(getLanguageStorageKey());
    const hasSeenWelcome = !!localStorage.getItem('safeneighbor_welcome_shown');
    return hasLanguage && !hasSeenWelcome;
  });
  const [showFeatures, setShowFeatures] = useState(initialUrlState.activeModal === 'features');
  const [showCheckRoute, setShowCheckRoute] = useState(initialUrlState.activeModal === 'check-route');
  const [showCheckIn, setShowCheckIn] = useState(initialUrlState.activeModal === 'check-in');
  const [showOfflineLibrary, setShowOfflineLibrary] = useState(initialUrlState.activeModal === 'offline-library');
  const [showLegalResponse, setShowLegalResponse] = useState(initialUrlState.activeModal === 'legal-response');

  // Proximity alerts
  const { activeAlert, dismissAlert } = useProximityAlerts();

  // Location sharing state
  const [isAcquiringLocation, setIsAcquiringLocation] = useState(false);
  const [locationShared, setLocationShared] = useState(false);
  const [lastSharedLocation, setLastSharedLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Live location tracking state
  const [liveShareId, setLiveShareId] = useState(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [liveViewShareId, setLiveViewShareId] = useState(initialUrlState.liveViewShareId);
  const [showStopPinPrompt, setShowStopPinPrompt] = useState(false);
  const [showShareWarning, setShowShareWarning] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeAcknowledged, setPurgeAcknowledged] = useState(false);
  const [recordingCount, setRecordingCount] = useState(null);
  const [lastShareMethod, setLastShareMethod] = useState(null);
  const [emergencyAnalytics, setEmergencyAnalytics] = useState(() => readEmergencyAnalytics());
  const [liveViewKey, setLiveViewKey] = useState(initialUrlState.liveViewKey);
  const watchIdRef = useRef(null);
  const lastFirestoreWriteRef = useRef(0);
  const liveShareIdRef = useRef(null);
  const liveEncKeyRef = useRef(null);
  const isApplyingHistoryRef = useRef(false);
  const hasSyncedHistoryRef = useRef(false);
  const lastSyncedUrlRef = useRef('');
  const emergencyPanelRef = useRef(null);
  const previousFocusedElementRef = useRef(null);
  const shareSectionRef = useRef(null);
  const scenarioSectionRef = useRef(null);
  const showPurgeConfirmRef = useRef(false);
  const showShareWarningRef = useRef(false);

  const topNavOffsetPx = 72;
  const installBannerOffsetPx = showInstallBanner ? 56 : 0;
  const offlineBannerOffsetPx = !showInstallBanner && !isOnline ? 60 : 0;
  const topContentOffset = `calc(${topNavOffsetPx + installBannerOffsetPx + offlineBannerOffsetPx + 8}px + env(safe-area-inset-top, 0px))`;
  const emergencyPanelTopOffset = `calc(${topNavOffsetPx + installBannerOffsetPx + offlineBannerOffsetPx}px + env(safe-area-inset-top, 0px))`;

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
      // Clear encryption keys from memory on lock
      clearCachedKey();
      clearCachedLocationsKey();
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

    // Restore locations key after auto-lock
    if (!isDuress) {
      if (pin && isLocationsKeyWrapped()) {
        try {
          await unwrapLocationsKeyWithPin(pin);
        } catch (err) {
          console.error('Failed to unwrap locations key after lock:', err);
        }
      } else if (!isLocationsKeyWrapped()) {
        initLocationsKey().catch(() => {});
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

  // Online/offline tracking is handled by useOnlineStatus hook above

  // Service worker update detection
  useEffect(() => {
    const handleSwUpdate = (e) => {
      swRegistrationRef.current = e.detail.registration;
      setShowUpdateToast(true);
    };
    window.addEventListener('swUpdate', handleSwUpdate);
    return () => window.removeEventListener('swUpdate', handleSwUpdate);
  }, []);

  // Hide install banner once the app is installed
  useEffect(() => {
    const handler = () => setShowInstallBanner(false);
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  // Auto-download map tiles on first load if location already granted and no tiles cached
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !navigator.permissions) return;
    if (!navigator.onLine) return;
    const alreadyRun = sessionStorage.getItem('safeneighbor_tile_autodownload');
    if (alreadyRun) return;

    navigator.permissions.query({ name: 'geolocation' }).then(async (result) => {
      if (result.state !== 'granted') return;
      // Check if tiles already cached
      const tilesExist = await caches.has('safeneighbor-tiles-v1').catch(() => false);
      if (tilesExist) {
        const cache = await caches.open('safeneighbor-tiles-v1');
        const keys = await cache.keys();
        if (keys.length >= 100) return; // already have a decent amount
      }
      sessionStorage.setItem('safeneighbor_tile_autodownload', 'true');
      // Silently trigger background tile download via SW
      const { computeTileList, DEFAULT_TILE_LEVELS, requestTileDownload } = await import('./utils/tileDownloader');
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, timeout: 10000,
        });
      });
      const urls = computeTileList(pos.coords.latitude, pos.coords.longitude, DEFAULT_TILE_LEVELS);
      requestTileDownload(urls);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstallBannerClick = () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => {
        window.deferredPrompt = null;
        setShowInstallBanner(false);
      });
    } else {
      setShowInstallHelp(true);
    }
  };

  const handleInstallBannerDismiss = () => {
    localStorage.setItem('safeneighbor_install_dismissed', 'true');
    setShowInstallBanner(false);
  };

  const dismissWelcome = useCallback(() => {
    flushSync(() => {
      setShowInteractionShield(true);
      setShowWelcome(false);
    });
    setTimeout(() => setShowInteractionShield(false), 320);
    requestAnimationFrame(() => {
      localStorage.setItem('safeneighbor_welcome_shown', 'true');
    });
  }, []);

  const handleWelcomeOpenSettings = useCallback(() => {
    flushSync(() => {
      setShowWelcome(false);
      setShowSettings(true);
    });
    requestAnimationFrame(() => {
      localStorage.setItem('safeneighbor_welcome_shown', 'true');
    });
  }, []);

  const handleAppUpdate = () => {
    const reg = swRegistrationRef.current;
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdateToast(false);
  };

  // Welcome modal is initialized synchronously via useState above

  // Scroll to top whenever the Welcome modal opens
  useEffect(() => {
    if (showWelcome) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [showWelcome]);

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

  const getActiveModal = useCallback(() => {
    if (showSettings) return 'settings';
    if (showFeatures) return 'features';
    if (showCheckRoute) return 'check-route';
    if (showCheckIn) return 'check-in';
    if (showLegalResponse) return 'legal-response';
    if (showInstallHelp) return 'install-help';
    if (showOfflineLibrary) return 'offline-library';
    return null;
  }, [
    showSettings,
    showFeatures,
    showCheckRoute,
    showCheckIn,
    showLegalResponse,
    showInstallHelp,
    showOfflineLibrary,
  ]);

  const applyUrlState = useCallback((urlState) => {
    setCurrentPage(urlState.page);
    setSelectedScenario(urlState.selectedScenario);
    setShowSettings(urlState.activeModal === 'settings');
    setShowFeatures(urlState.activeModal === 'features');
    setShowCheckRoute(urlState.activeModal === 'check-route');
    setShowCheckIn(urlState.activeModal === 'check-in');
    setShowLegalResponse(urlState.activeModal === 'legal-response');
    setShowInstallHelp(urlState.activeModal === 'install-help');
    setShowOfflineLibrary(urlState.activeModal === 'offline-library');

    if (urlState.liveViewShareId) {
      setLiveViewShareId(urlState.liveViewShareId);
      setLiveViewKey(urlState.liveViewKey);
    } else {
      setLiveViewShareId(null);
      setLiveViewKey(null);
    }
  }, []);

  // Normalize legacy links and restore share payload on first load
  useEffect(() => {
    if (initialUrlState.sharedPayload) {
      window.__safeneighbor_shared = initialUrlState.sharedPayload;
    }

    const normalizedUrl = buildAppUrl({
      page: initialUrlState.page,
      selectedScenario: initialUrlState.selectedScenario,
      activeModal: initialUrlState.activeModal,
    });

    lastSyncedUrlRef.current = normalizedUrl;
    hasSyncedHistoryRef.current = true;

    if (
      initialUrlState.replaceUrl ||
      `${window.location.pathname}${window.location.search}` !== normalizedUrl
    ) {
      window.history.replaceState({}, '', initialUrlState.replaceUrl || normalizedUrl);
    }
  }, [initialUrlState]);

  // Browser back/forward restores app state from the URL
  useEffect(() => {
    const handlePopState = () => {
      const nextUrlState = parseAppLocation(window.location);

      if (nextUrlState.sharedPayload) {
        window.__safeneighbor_shared = nextUrlState.sharedPayload;
      }

      isApplyingHistoryRef.current = true;
      applyUrlState(nextUrlState);

      const normalizedUrl = buildAppUrl({
        page: nextUrlState.page,
        selectedScenario: nextUrlState.selectedScenario,
        activeModal: nextUrlState.activeModal,
      });
      lastSyncedUrlRef.current = normalizedUrl;

      if (nextUrlState.replaceUrl) {
        window.history.replaceState({}, '', nextUrlState.replaceUrl);
        lastSyncedUrlRef.current = nextUrlState.replaceUrl;
      }

      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyUrlState]);

  // Keep URL in sync with the current app state
  useEffect(() => {
    if (!hasSyncedHistoryRef.current || liveViewShareId) return;

    const nextUrl = buildAppUrl({
      page: currentPage,
      selectedScenario,
      activeModal: getActiveModal(),
    });

    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      lastSyncedUrlRef.current = nextUrl;
      return;
    }

    if (nextUrl !== lastSyncedUrlRef.current) {
      window.history.pushState({}, '', nextUrl);
      lastSyncedUrlRef.current = nextUrl;
    }
  }, [
    currentPage,
    selectedScenario,
    liveViewShareId,
    getActiveModal,
  ]);

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
    if (page === currentPage && !selectedScenario) {
      return;
    }

    startTransition(() => {
      setCurrentPage(page);
      setSelectedScenario(null);
    });

    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    track('page_view', { page });

    // Clear app badge when user views reports
    if (page === 'reports' && 'clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  };

  const openScenarioDetail = useCallback((scenario, { source = 'scenarios', ensureScenariosPage = false } = {}) => {
    if (!scenario?.id) return;

    startTransition(() => {
      setSelectedScenario(scenario);
      if (ensureScenariosPage) {
        setCurrentPage('scenarios');
      }
    });

    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });

    persistRecentScenarioId(scenario.id);
    track('scenario_open', { id: scenario.id, title: scenario.title || scenario.id, source });
  }, []);

  // Handle scenario selection (from Scenarios list page)
  const handleSelectScenario = (scenario) => {
    openScenarioDetail(scenario, { source: 'scenarios' });
  };

  // NEW: Navigate directly to a specific scenario (from Home page or Emergency menu)
  // This sets BOTH at once so they don't overwrite each other
  const handleNavigateToScenario = (scenario) => {
    openScenarioDetail(scenario, { source: 'home', ensureScenariosPage: true });
  };

  // Handle back from scenario detail
  const handleBackFromScenario = () => {
    setSelectedScenario(null);
    setIsEmergencyNavigation(false);
    setEmergencyHandoff(null);
  };

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        // Pass onNavigate for regular navigation AND onNavigateToScenario for direct scenario links
        return (
          <Home
            onNavigate={handleNavigate}
            onNavigateToScenario={handleNavigateToScenario}
            onOpenEmergency={() => {
              alertHaptic();
              setBreathingResetKey((prev) => prev + 1);
              track('emergency_mode', { action: 'open', source: 'home' });
              setEmergencyMode(true);
            }}
            onOpenSettings={() => { setShowSettings(true); track('modal_open', { modal: 'settings', source: 'home' }); }}
            onShowWelcome={() => { setShowWelcome(true); track('modal_open', { modal: 'welcome' }); }}
            onShowFeatures={() => { setShowFeatures(true); track('modal_open', { modal: 'features' }); }}
            onOpenCheckRoute={() => { setShowCheckRoute(true); track('modal_open', { modal: 'check_route', source: 'home' }); }}
            onOpenLegalResponse={() => { setShowLegalResponse(true); track('modal_open', { modal: 'legal_response', source: 'home' }); }}
            onOpenCheckIn={() => { setShowCheckIn(true); track('modal_open', { modal: 'safety_checkin', source: 'home' }); }}
          />
        );
      case 'scenarios':
        // Show detail if scenario selected, otherwise show list
        return (
          <>
            {selectedScenario ? (
              // Custom components for special scenarios
              selectedScenario.id === 'de-escalation' ? (
                <DeEscalation
                  onBack={handleBackFromScenario}
                  onNavigate={handleNavigate}
                />
              ) : selectedScenario.id === 'trusted-contacts' ? (
                <TrustedContacts
                  key={tcRefreshKey}
                  onBack={handleBackFromScenario}
                  onOpenLegalResponse={() => { setShowLegalResponse(true); track('modal_open', { modal: 'legal_response', source: 'trusted_contacts' }); }}
                />
              ) : selectedScenario.id === 'family-kit' ? (
                <FamilyKit
                  onBack={handleBackFromScenario}
                  onNavigateToContacts={() => openScenarioDetail({ id: 'trusted-contacts' }, { source: 'family_kit' })}
                  onOpenLegalResponse={() => { setShowLegalResponse(true); track('modal_open', { modal: 'legal_response', source: 'family_kit' }); }}
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
              ) : selectedScenario.id === 'encounter-log-witness' ? (
                <EncounterLog
                  onBack={handleBackFromScenario}
                  witnessMode
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
                    openScenarioDetail(scenario, { source: 'post_encounter' });
                  }}
                />
              ) : selectedScenario.id === 'community-witnessing' ? (
                <CommunityWitnessing
                  onBack={handleBackFromScenario}
                  onOpenLegalResponse={() => { setShowLegalResponse(true); track('modal_open', { modal: 'legal_response', source: 'community_witnessing' }); }}
                  onOpenEncounterLog={() => { handleBackFromScenario(); setTimeout(() => handleNavigateToScenario({ id: 'encounter-log-witness' }), 150); }}
                />
              ) : (
                <ScenarioDetail
                  scenarioId={selectedScenario.id}
                  onBack={handleBackFromScenario}
                  initialMode={isEmergencyNavigation ? 'emergency' : 'study'}
                  handoffContext={isEmergencyNavigation ? emergencyHandoff : null}
                  onReturnToEmergency={() => {
                    alertHaptic();
                    setBreathingResetKey((prev) => prev + 1);
                    setEmergencyMode(true);
                    recordEmergencyUsage('return-to-panel', { type: 'panel' });
                  }}
                  onNavigateToScenario={(scenario) => {
                    setIsEmergencyNavigation(false);
                    setEmergencyHandoff(null);
                    openScenarioDetail(scenario, { source: 'scenario_detail' });
                  }}
                />
              )
            ) : (
              <Scenarios
                onNavigate={handleNavigate}
                onSelectScenario={handleSelectScenario}
              />
            )}
          </>
        );
      case 'reports':
        return <CommunityReports isDuressMode={isDuressMode} onOpenCheckRoute={() => { setShowCheckRoute(true); track('modal_open', { modal: 'check_route', source: 'reports' }); }} onNavigateToScenario={handleNavigateToScenario} onNavigate={handleNavigate} />;
      case 'record':
        return <Record isDuressMode={isDuressMode} onNavigate={handleNavigate} />;
      case 'legal':
        return <Legal onOpenLegalResponse={() => { setShowLegalResponse(true); track('modal_open', { modal: 'legal_response', source: 'legal_section' }); }} onNavigate={handleNavigate} />;
      case 'whistle':
        return <Whistle />;
      case 'faq':
        return <FAQ onBack={() => handleNavigate('home')} onNavigate={handleNavigate} />;
      case 'tech-security':
        return <TechSecurity onBack={() => handleNavigate('home')} onNavigate={handleNavigate} />;
      default:
        return (
          <Home
            onNavigate={handleNavigate}
            onNavigateToScenario={handleNavigateToScenario}
            onOpenEmergency={() => {
              alertHaptic();
              setBreathingResetKey((prev) => prev + 1);
              track('emergency_mode', { action: 'open', source: 'home' });
              setEmergencyMode(true);
            }}
            onOpenSettings={() => { setShowSettings(true); track('modal_open', { modal: 'settings', source: 'home' }); }}
            onShowWelcome={() => { setShowWelcome(true); track('modal_open', { modal: 'welcome' }); }}
            onShowFeatures={() => { setShowFeatures(true); track('modal_open', { modal: 'features' }); }}
            onOpenCheckRoute={() => { setShowCheckRoute(true); track('modal_open', { modal: 'check_route', source: 'home' }); }}
            onOpenLegalResponse={() => { setShowLegalResponse(true); track('modal_open', { modal: 'legal_response', source: 'home' }); }}
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
  const dismissEmergency = useCallback(() => {
    setEmergencyMode(false);
    setLocationError(null);
    setIsAcquiringLocation(false);
    setShowShareWarning(false);
    setShowPurgeConfirm(false);
    setPurgeAcknowledged(false);
    // Keep locationShared, lastSharedLocation, and live tracking intact
    // so they persist when the panel is reopened
    if (!isLiveTracking) {
      setLocationShared(false);
      setLastSharedLocation(null);
    }
  }, [isLiveTracking]);

  useEffect(() => {
    showPurgeConfirmRef.current = showPurgeConfirm;
  }, [showPurgeConfirm]);

  useEffect(() => {
    showShareWarningRef.current = showShareWarning;
  }, [showShareWarning]);

  const recordEmergencyUsage = useCallback((actionId, meta = {}) => {
    setEmergencyAnalytics((prev) => {
      const next = {
        counts: {
          ...(prev?.counts || {}),
          [actionId]: ((prev?.counts || {})[actionId] || 0) + 1,
        },
        lastAction: {
          id: actionId,
          updatedAt: new Date().toISOString(),
          ...meta,
        },
      };
      writeEmergencyAnalytics(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!emergencyMode) return undefined;

    previousFocusedElementRef.current = document.activeElement;

    const timeoutId = window.setTimeout(() => {
      emergencyPanelRef.current?.focus();
    }, 50);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEmergencyKeydown = (event) => {
      if (!emergencyPanelRef.current) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();

        if (showPurgeConfirmRef.current) {
          setShowPurgeConfirm(false);
          setPurgeAcknowledged(false);
          return;
        }

        if (showShareWarningRef.current) {
          setShowShareWarning(false);
          return;
        }

        dismissEmergency();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        emergencyPanelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => {
        const isDisabled = element.hasAttribute('disabled');
        const isHidden = element.getAttribute('aria-hidden') === 'true';
        return !isDisabled && !isHidden && element.offsetParent !== null;
      });

      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener('keydown', handleEmergencyKeydown, true);

    return () => {
      window.clearTimeout(timeoutId);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEmergencyKeydown, true);
      if (previousFocusedElementRef.current?.focus) {
        previousFocusedElementRef.current.focus();
      }
    };
  }, [dismissEmergency, emergencyMode]);

  // Handle emergency scenario selection
  const handleEmergencyScenario = (scenarioId) => {
    const locationState = isLiveTracking ? 'live' : locationShared ? 'shared' : 'idle';
    setEmergencyHandoff({
      scenarioId,
      locationState,
      lastShareMethod,
      recommendationTitle: emergencyRecommendation.title,
      enteredAt: Date.now(),
    });
    dismissEmergency();
    setIsEmergencyNavigation(true);
    track('emergency_scenario', { id: scenarioId });
    recordEmergencyUsage(`scenario:${scenarioId}`, { type: 'scenario', scenarioId });
    handleNavigateToScenario({ id: scenarioId });
  };

  // Handle sharing GPS location with trusted contacts
  const handleShareLocation = async () => {
    const contacts = await getTrustedContacts();

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

      const shareMethod = phoneContacts.length > 0
        ? 'sms'
        : emailContacts.length > 0
          ? 'email'
          : navigator.share
            ? 'share'
            : 'clipboard';

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
      setLastShareMethod(shareMethod);
      track('location_share', { method: shareMethod, live: !!shareId });
      recordEmergencyUsage('location-share', { type: 'location', method: shareMethod, live: !!shareId });
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
          setLastSharedLocation({
            lat: latitude,
            lng: longitude,
            accuracy,
            address,
            sharedAt: now,
          });
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
    setLastSharedLocation((prev) => (
      prev
        ? {
            ...prev,
            trackingStoppedAt: Date.now(),
          }
        : prev
    ));
    recordEmergencyUsage('location-stop', { type: 'location', state: 'stopped' });
  };

  // PIN-gated stop: require PIN entry if PIN is set
  const handleRequestStopTracking = () => {
    if (isPinEnabled()) {
      setShowStopPinPrompt(true);
    } else {
      handleStopLiveTracking();
    }
  };

  const openPurgeConfirmation = useCallback(async () => {
    setPurgeAcknowledged(false);
    setShowPurgeConfirm(true);

    try {
      const recordings = await getAllRecordings();
      setRecordingCount(recordings.length);
    } catch (err) {
      console.error('Failed to load recordings for purge confirmation:', err);
      setRecordingCount(null);
    }
  }, []);

  // Handle emergency data purge
  const handleEmergencyPurge = async () => {
    if (!purgeAcknowledged) return;

    warningHaptic();
    track('emergency_purge');
    recordEmergencyUsage('purge-confirm', { type: 'danger' });
    setIsPurgingData(true);
    try {
      await clearAllRecordings();
      setShowPurgeConfirm(false);
      setPurgeAcknowledged(false);
      setRecordingCount(0);
    } catch (err) {
      console.error('Emergency purge failed:', err);
    } finally {
      setIsPurgingData(false);
    }
  };

  const recordingCountLabel = recordingCount ?? 0;
  const locationLastUpdatedLabel = lastSharedLocation?.sharedAt
    ? formatRelativeTimestamp(lastSharedLocation.sharedAt)
    : null;
  const locationStatusEyebrow = isLiveTracking
    ? t('emergency.liveStatusActive')
    : locationShared
      ? t('emergency.liveStatusSent')
      : t('emergency.liveStatusReady');
  const locationStatusTitle = isLiveTracking
    ? t('emergency.liveStatusTrackingTitle')
    : locationShared
      ? t('emergency.liveStatusSentTitle')
      : t('emergency.liveStatusIdleTitle');
  const locationStatusDescription = isLiveTracking
    ? t('emergency.liveStatusTrackingDesc')
    : locationShared
      ? t('emergency.liveStatusSentDesc')
      : t('emergency.liveStatusIdleDesc');
  const recentEmergencyAction = emergencyAnalytics.lastAction;
  const scenarioUsageEntries = Object.entries(emergencyAnalytics.counts || {})
    .filter(([key]) => key.startsWith('scenario:'))
    .sort((a, b) => b[1] - a[1]);
  const mostUsedScenarioId = scenarioUsageEntries[0]?.[0]?.replace('scenario:', '') || null;
  const recentScenarioId = recentEmergencyAction?.type === 'scenario' ? recentEmergencyAction.scenarioId : null;
  const recentEmergencyActionLabel = recentEmergencyAction?.updatedAt
    ? formatRelativeTimestamp(new Date(recentEmergencyAction.updatedAt).getTime())
    : null;
  const scenarioCardItems = [
    {
      id: 'door',
      eyebrow: t('emergency.scenarioDoorEyebrow'),
      title: t('emergency.doorButton'),
      description: t('home.doorDesc'),
      icon: <Door size={26} weight="bold" />,
    },
    {
      id: 'street',
      eyebrow: t('emergency.scenarioStreetEyebrow'),
      title: t('emergency.streetButton'),
      description: t('home.streetDesc'),
      icon: <User size={26} weight="bold" />,
    },
    {
      id: 'vehicle',
      eyebrow: t('emergency.scenarioVehicleEyebrow'),
      title: t('emergency.vehicleButton'),
      description: t('home.vehicleDesc'),
      icon: <Car size={26} weight="bold" />,
    },
    {
      id: 'border',
      eyebrow: t('emergency.scenarioBorderEyebrow'),
      title: t('emergency.borderButton'),
      description: t('home.borderDesc'),
      icon: <Shield size={26} weight="bold" />,
    },
  ].sort((left, right) => {
    const score = (item) => {
      let value = (emergencyAnalytics.counts?.[`scenario:${item.id}`] || 0);
      if (item.id === mostUsedScenarioId) value += 5;
      if (item.id === recentScenarioId) value += 8;
      return value;
    };

    return score(right) - score(left);
  });

  const emergencyRecommendation = (() => {
    if (isLiveTracking) {
      return {
        eyebrow: t('emergency.recommendationLiveEyebrow'),
        title: t('emergency.recommendationLiveTitle'),
        desc: t('emergency.recommendationLiveDesc'),
        cta: t('emergency.recommendationChooseGuide'),
        onClick: () => scenarioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        accent: 'cyan',
      };
    }

    if (locationShared) {
      return {
        eyebrow: t('emergency.recommendationSentEyebrow'),
        title: t('emergency.recommendationSentTitle'),
        desc: t('emergency.recommendationSentDesc'),
        cta: t('emergency.recommendationRefreshShare'),
        onClick: () => {
          setLocationShared(false);
          setLocationError(null);
          setShowShareWarning(true);
          shareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
        accent: 'emerald',
      };
    }

    if (locationError === 'no-contacts' || locationError === 'no-contact-methods') {
      return {
        eyebrow: t('emergency.recommendationSetupEyebrow'),
        title: t('emergency.recommendationSetupTitle'),
        desc: t('emergency.recommendationSetupDesc'),
        cta: t('emergency.recommendationOpenContacts'),
        onClick: () => {
          dismissEmergency();
          handleNavigateToScenario({ id: 'trusted-contacts' });
        },
        accent: 'amber',
      };
    }

    if (locationError === 'permission-denied') {
      return {
        eyebrow: t('emergency.recommendationPermissionEyebrow'),
        title: t('emergency.recommendationPermissionTitle'),
        desc: t('emergency.recommendationPermissionDesc'),
        cta: t('emergency.recommendationOpenLegal'),
        onClick: () => {
          setShowLegalResponse(true);
          track('modal_open', { modal: 'legal_response', source: 'emergency_recommendation' });
        },
        accent: 'red',
      };
    }

    if (recentScenarioId) {
      const recentScenario = scenarioCardItems.find((item) => item.id === recentScenarioId);
      return {
        eyebrow: t('emergency.recommendationRecentEyebrow'),
        title: t('emergency.recommendationRecentTitle', { scenario: recentScenario?.title || t('emergency.scenarioHeading') }),
        desc: t('emergency.recommendationRecentDesc'),
        cta: t('emergency.recommendationRecentCta'),
        onClick: () => handleEmergencyScenario(recentScenarioId),
        accent: 'cyan',
      };
    }

    return {
      eyebrow: t('emergency.recommendationDefaultEyebrow'),
      title: t('emergency.recommendationDefaultTitle'),
      desc: t('emergency.recommendationDefaultDesc'),
      cta: t('emergency.recommendationShareFirst'),
      onClick: () => {
        setShowShareWarning(true);
        shareSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      accent: 'violet',
    };
  })();

  const recommendationAccentClasses = {
    cyan: 'border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.08] via-slate-950/95 to-slate-900/90 text-cyan-100',
    emerald: 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] via-slate-950/95 to-slate-900/90 text-emerald-100',
    amber: 'border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-slate-950/95 to-slate-900/90 text-amber-100',
    red: 'border-red-500/25 bg-gradient-to-br from-red-500/[0.08] via-slate-950/95 to-slate-900/90 text-red-100',
    violet: 'border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-slate-950/95 to-slate-900/90 text-violet-100',
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
        <Welcome
          onClose={dismissWelcome}
          onOpenSettings={handleWelcomeOpenSettings}
          onInstall={handleInstallBannerClick}
        />
      )}

      {/* Features Modal */}
      {showFeatures && (
        <Features onClose={() => setShowFeatures(false)} />
      )}

      {/* Offline Library Modal */}
      <OfflineLibrary
        isOpen={showOfflineLibrary}
        onClose={() => setShowOfflineLibrary(false)}
        onInstall={handleInstallBannerClick}
      />

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
      <nav data-shell-top-nav="true" className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-900 to-red-800 border-b-4 border-red-600 shadow-2xl safe-top-nav">
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
              className="p-2 rounded-full bg-red-950/50 text-white border border-red-400/50 hover:bg-red-950 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-red-950 focus-visible:ring-white/80"
              title={t('nav.securitySettingsTooltip')}
              aria-label={t('nav.securitySettingsTooltip')}
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
        className={`fixed inset-0 z-40 ${
          emergencyMode
            ? 'pointer-events-auto'
            : 'pointer-events-none'
        }`}
      >
        {/* Background overlay */}
        <div
          className={`absolute inset-0 bg-slate-950/98 transition-opacity duration-150 ease-out ${
            emergencyMode ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={dismissEmergency}
        />
        <div
          className={`absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.16),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.08),transparent_22%),rgba(2,6,23,0.82)] backdrop-blur-[14px] transition-opacity duration-200 ease-out ${
            emergencyMode ? 'opacity-100 delay-75' : 'opacity-0'
          }`}
        />

        {/* Emergency Panel */}
        <div
          ref={emergencyPanelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergency-panel-title"
          aria-describedby="emergency-panel-desc"
          aria-hidden={!emergencyMode}
          tabIndex={-1}
          className={`absolute left-0 right-0 bottom-0 overflow-y-auto overscroll-contain transition-all duration-300 ease-out ${
            emergencyMode ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
          }`}
          style={{ top: emergencyPanelTopOffset }}
        >
          <div className="mx-auto max-w-6xl px-3 py-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:py-6 sm:pb-32 xl:px-6">
            <div className="absolute inset-x-0 top-0 mx-auto h-40 max-w-xl bg-gradient-to-b from-red-500/10 via-red-500/4 to-transparent blur-3xl pointer-events-none" />
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {isAcquiringLocation
                ? t('location.acquiringGps')
                : isLiveTracking
                  ? t('location.liveTracking')
                  : locationShared
                    ? t('location.locationSent')
                    : ''}
            </div>

            <div className="relative mb-4 overflow-hidden rounded-[28px] border border-red-500/25 bg-gradient-to-br from-red-950/75 via-slate-950 to-slate-950 shadow-[0_22px_70px_rgba(127,29,29,0.22)] sm:mb-5">
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-red-300/60 to-transparent" />
              <div className="absolute -right-12 top-8 h-28 w-28 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
              <div className="border-b border-red-500/15 px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-200/75">
                      {t('emergency.headerEyebrow')}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <WarningCircle size={28} weight="bold" className="text-red-400" />
                      <h2 id="emergency-panel-title" className="text-2xl font-black text-white tracking-tight">
                        {t('emergency.title')}
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={dismissEmergency}
                    aria-label={t('emergency.dismiss')}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    <CloseX size={18} weight="bold" />
                  </button>
                </div>
                <p id="emergency-panel-desc" className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
                  {t('emergency.headerSupport')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-5">
                <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-red-100">
                  {t('emergency.fastActionsTag')}
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                  {t('emergency.locationTag')}
                </span>
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-100">
                  {t('emergency.legalTag')}
                </span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className={`relative mb-5 overflow-hidden rounded-[24px] border p-4 shadow-[0_16px_36px_rgba(2,6,23,0.18)] sm:mb-6 ${recommendationAccentClasses[emergencyRecommendation.accent]}`}
            >
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
                    {emergencyRecommendation.eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                    {emergencyRecommendation.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
                    {emergencyRecommendation.desc}
                  </p>
                </div>
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/15 xl:flex">
                  <WarningCircle size={24} weight="bold" className="text-white/85" />
                </div>
              </div>
              <button
                onClick={emergencyRecommendation.onClick}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {emergencyRecommendation.cta}
              </button>
            </motion.div>

            <div className="xl:grid xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:items-start xl:gap-6">
              <div className="xl:min-w-0">
            <div className="mb-5 sm:mb-6">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-300/80">
                {t('emergency.topActionsHeading')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {t('emergency.topActionsDesc')}
              </p>
            </div>

            <div className="mb-6 grid gap-3 sm:mb-8 sm:grid-cols-2">
              <div ref={shareSectionRef} className="relative overflow-hidden rounded-[24px] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.08] via-slate-950/95 to-slate-900/90 p-3.5 shadow-[0_14px_36px_rgba(2,6,23,0.18)] sm:p-4">
                <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent" />
                <div className="absolute -right-10 top-8 h-24 w-24 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10">
                    <NavigationArrow size={22} weight="bold" className="text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">
                      {t('emergency.locationCardEyebrow')}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-white">
                      {t('location.shareButton')}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">
                      {t('emergency.locationCardDesc')}
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                    {t('emergency.primaryActionTag')}
                  </span>
                  <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                    {t('emergency.locationPrivateTag')}
                  </span>
                  <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                    {t('emergency.locationLiveTag')}
                  </span>
                  <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                    {t('emergency.locationStopsTag')}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                {!locationShared ? (
                  <>
                    {showShareWarning && !isAcquiringLocation ? (
                      <div className="rounded-2xl border border-amber-700/40 bg-amber-950/30 p-4" aria-live="polite">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-300">
                          <Shield size={16} weight="bold" />
                          {t('shareWarning.title')}
                        </h3>
                        <ul className="mb-4 space-y-2 text-xs text-slate-300">
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 shrink-0 text-amber-500">&bull;</span>
                            <span>{t('shareWarning.smsInterception')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 shrink-0 text-green-500">&bull;</span>
                            <span>{t('shareWarning.e2eEncryption')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 shrink-0 text-amber-500">&bull;</span>
                            <span>{t('shareWarning.firebaseInfra')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 shrink-0 text-slate-400">&bull;</span>
                            <span>{t('shareWarning.liveUntilStop')}</span>
                          </li>
                        </ul>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            onClick={() => { setShowShareWarning(false); handleShareLocation(); }}
                            className="rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-amber-600"
                          >
                            {t('shareWarning.understand')}
                          </button>
                          <button
                            onClick={() => setShowShareWarning(false)}
                            className="text-xs font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-200"
                          >
                            {t('shareWarning.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowShareWarning(true)}
                        disabled={isAcquiringLocation}
                        className="w-full rounded-2xl border border-white/20 border-t-white/30 bg-gradient-to-b from-white/[0.18] to-white/[0.06] px-6 py-4 text-white shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all hover:from-white/[0.24] hover:to-white/[0.10] hover:border-t-white/40 hover:shadow-[0_6px_28px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-95 disabled:opacity-60"
                      >
                        <div className="flex items-center justify-center gap-3 font-black">
                          {isAcquiringLocation ? (
                            <>
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              <span className="uppercase tracking-wider">{t('location.acquiringGps')}</span>
                            </>
                          ) : (
                            <>
                              <NavigationArrow size={24} weight="bold" />
                              <span className="text-lg uppercase tracking-wider">{t('location.shareButton')}</span>
                            </>
                          )}
                        </div>
                      </button>
                    )}
                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                      {t('location.shareDescription')}
                    </p>
                    <button
                      onClick={() => { dismissEmergency(); handleNavigateToScenario({ id: 'trusted-contacts' }); }}
                      className="mt-2 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
                    >
                      {t('location.setupContacts')}
                    </button>
                  </>
                ) : (
                  <motion.div
                    key="location-success"
                    initial={{ opacity: 0, y: 10, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.985 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="rounded-2xl border border-green-700/40 bg-gradient-to-br from-green-950/40 to-slate-900/40 p-4"
                    aria-live="polite"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Check size={20} weight="bold" className="text-green-400" />
                        <p className="text-sm font-bold uppercase tracking-wider text-green-400">{locationStatusEyebrow}</p>
                      </div>
                      <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-green-100">
                        {isLiveTracking ? t('location.live') : t('emergency.locationStatusSentTag')}
                      </span>
                    </div>

                    <div className="mb-3 rounded-2xl border border-green-700/30 bg-slate-950/45 p-3">
                      <p className="text-base font-black text-white">{locationStatusTitle}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {locationStatusDescription}
                      </p>
                      {lastShareMethod && (
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-green-200/80">
                          {t('emergency.locationSentVia', { method: t(`emergency.shareMethod.${lastShareMethod}`) })}
                        </p>
                      )}
                    </div>
                    {lastSharedLocation && (
                      <div className="mb-3 space-y-1 text-xs text-slate-400">
                        <p>{lastSharedLocation.address || `${lastSharedLocation.lat.toFixed(5)}, ${lastSharedLocation.lng.toFixed(5)}`}</p>
                        <p className="text-slate-500">
                          {t('emergency.locationLastUpdated', { time: locationLastUpdatedLabel || new Date(lastSharedLocation.sharedAt).toLocaleTimeString() })}
                        </p>
                        {lastSharedLocation.trackingStoppedAt && (
                          <p className="text-slate-500">
                            {t('emergency.locationStoppedAt', { time: formatRelativeTimestamp(lastSharedLocation.trackingStoppedAt) })}
                          </p>
                        )}
                      </div>
                    )}

                    {isLiveTracking && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-700/30 bg-green-950/30 px-3 py-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-green-400">
                          {t('location.liveTracking')}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      {isLiveTracking ? (
                        <button
                          onClick={handleRequestStopTracking}
                          className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-500/15 hover:text-red-200"
                        >
                          {t('location.stopLive')}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setLocationShared(false);
                            setLocationError(null);
                            setShowShareWarning(true);
                          }}
                          className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300 transition-colors hover:bg-amber-500/15 hover:text-amber-200"
                        >
                          {t('emergency.locationResumeSharing')}
                        </button>
                      )}
                      <button
                        onClick={() => scenarioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {t('emergency.recommendationChooseGuide')}
                      </button>
                      <button
                        onClick={() => { setLocationShared(false); setLastSharedLocation(null); setLocationError(null); }}
                        className="text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300"
                      >
                        {t('location.clear')}
                      </button>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>

                {locationError === 'no-contacts' && (
                  <div className="mt-3 rounded-xl border border-amber-700/40 bg-amber-950/30 p-3" role="status" aria-live="polite">
                    <p className="mb-1 text-sm font-semibold text-amber-400">{t('location.noContacts')}</p>
                    <p className="mb-2 text-xs text-slate-400">{t('location.noContactsDesc')}</p>
                    <button
                      onClick={() => {
                        dismissEmergency();
                        handleNavigateToScenario({ id: 'trusted-contacts' });
                      }}
                      className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300"
                    >
                      {t('location.setupContactsShort')}
                    </button>
                  </div>
                )}
                {locationError === 'no-contact-methods' && (
                  <div className="mt-3 rounded-xl border border-amber-700/40 bg-amber-950/30 p-3" role="status" aria-live="polite">
                    <p className="mb-1 text-sm font-semibold text-amber-400">{t('location.noContactMethods')}</p>
                    <p className="mb-2 text-xs text-slate-400">{t('location.noContactMethodsDesc')}</p>
                    <button
                      onClick={() => {
                        dismissEmergency();
                        handleNavigateToScenario({ id: 'trusted-contacts' });
                      }}
                      className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300"
                    >
                      {t('location.editContacts')}
                    </button>
                  </div>
                )}
                {locationError === 'permission-denied' && (
                  <div className="mt-3 rounded-xl border border-red-700/40 bg-red-950/30 p-3" role="alert" aria-live="assertive">
                    <p className="text-sm font-semibold text-red-400">{t('location.permissionDenied')}</p>
                    <p className="text-xs text-slate-400">{t('location.permissionDeniedDesc')}</p>
                  </div>
                )}
                {(locationError === 'timeout' || locationError === 'position-unavailable' || locationError === 'unknown') && (
                  <div className="mt-3 rounded-xl border border-amber-700/40 bg-amber-950/30 p-3" role="status" aria-live="polite">
                    <p className="text-sm font-semibold text-amber-400">{t('location.couldNotGet')}</p>
                    <p className="mb-1 text-xs text-slate-400">{t('location.couldNotGetDesc')}</p>
                    <button
                      onClick={() => { setLocationError(null); handleShareLocation(); }}
                      className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300"
                    >
                      {t('location.retry')}
                    </button>
                  </div>
                )}
              </div>

              <div className="relative overflow-hidden rounded-[24px] border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-slate-950/95 to-slate-900/90 p-3.5 shadow-[0_14px_36px_rgba(2,6,23,0.18)] sm:p-4">
                <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/55 to-transparent" />
                <div className="absolute -right-10 top-8 h-24 w-24 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10">
                    <Scales size={22} weight="bold" className="text-amber-300" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
                      {t('emergency.legalCardEyebrow')}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-white">
                      {t('legalResponse.buttonLabel')}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">
                      {t('emergency.legalCardDesc')}
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-100">
                    {t('emergency.primaryActionTag')}
                  </span>
                  <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                    {t('emergency.legalHotlineTag')}
                  </span>
                  <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                    {t('emergency.legalUrgentTag')}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setShowLegalResponse(true);
                    track('modal_open', { modal: 'legal_response', source: 'emergency_panel' });
                    recordEmergencyUsage('legal-help', { type: 'support' });
                  }}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-700 to-amber-800 px-6 py-4 font-bold text-white shadow-lg transition-all hover:from-amber-600 hover:to-amber-700 active:scale-95"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Scales size={20} weight="bold" />
                    {t('legalResponse.buttonLabel')}
                  </span>
                </button>
              </div>
            </div>

            <div ref={scenarioSectionRef} className="relative mb-5 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/55 px-4 py-4 sm:mb-6">
              <div className="absolute inset-y-4 left-0 w-1 rounded-full bg-gradient-to-b from-red-500 via-red-400 to-amber-400" />
              <div className="pl-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-300/80">
                {t('emergency.scenarioHeading')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {t('emergency.scenarioDesc')}
              </p>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:mb-8 sm:grid-cols-2">
              {scenarioCardItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  onClick={() => handleEmergencyScenario(item.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: index * 0.03 }}
                  className="group relative overflow-hidden rounded-[22px] border border-red-500/70 bg-gradient-to-br from-red-900 to-red-800 p-4 text-left text-white shadow-[0_14px_32px_rgba(127,29,29,0.18)] transition-all hover:-translate-y-0.5 hover:from-red-800 hover:to-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                  <div className="absolute -right-10 top-10 h-24 w-24 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/15">
                    {item.icon}
                  </div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/75">{item.eyebrow}</p>
                    {item.id === recentScenarioId && (
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
                        {t('emergency.recentTag')}
                      </span>
                    )}
                    {item.id === mostUsedScenarioId && item.id !== recentScenarioId && (
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
                        {t('emergency.mostUsedTag')}
                      </span>
                    )}
                  </div>
                  <p className="text-base font-black uppercase tracking-[0.12em]">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-red-100/90">{item.description}</p>
                </motion.button>
              ))}
            </div>

              </div>

              <div className="space-y-4 xl:sticky xl:top-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut', delay: 0.08 }}
              className="hidden overflow-hidden rounded-[24px] border border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-950 to-slate-950 p-4 shadow-[0_18px_40px_rgba(2,6,23,0.24)] xl:block"
            >
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {t('emergency.desktopRailEyebrow')}
              </p>
              <h3 className="mt-2 text-lg font-black text-white">
                {t('emergency.desktopRailTitle')}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {recentEmergencyActionLabel
                  ? t('emergency.desktopRailDesc', { time: recentEmergencyActionLabel })
                  : t('emergency.desktopRailDescIdle')}
              </p>
              <div className="mt-4 space-y-3">
                {recentScenarioId && (
                  <button
                    onClick={() => handleEmergencyScenario(recentScenarioId)}
                    className="w-full rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-left transition-colors hover:bg-cyan-500/15"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">{t('emergency.recentTag')}</p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {scenarioCardItems.find((item) => item.id === recentScenarioId)?.title || t('emergency.scenarioHeading')}
                    </p>
                  </button>
                )}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{t('emergency.desktopRailLocationLabel')}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{locationStatusTitle}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{t('emergency.desktopRailUsageLabel')}</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {mostUsedScenarioId
                        ? scenarioCardItems.find((item) => item.id === mostUsedScenarioId)?.title
                        : t('emergency.desktopRailUsageEmpty')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/55 px-4 py-4 sm:mb-6">
              <div className="absolute inset-y-4 left-0 w-1 rounded-full bg-gradient-to-b from-cyan-400 via-blue-400 to-emerald-400" />
              <div className="pl-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {t('emergency.supportHeading')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t('emergency.supportDesc')}
              </p>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:mb-8">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    recordEmergencyUsage('support:log-now', { type: 'support' });
                    handleEmergencyScenario('encounter-log');
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/75 p-4 text-left text-white shadow-[0_10px_24px_rgba(2,6,23,0.14)] transition-all hover:border-slate-600/70 hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/30 to-transparent" />
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
                    <NotePencil size={20} weight="bold" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{t('emergency.secondaryActionTag')}</p>
                  <p className="mt-2 text-base font-bold tracking-[0.02em]">{t('emergency.logNowTitle')}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{t('emergency.logNowDesc')}</p>
                </button>
                <button
                  onClick={() => {
                    recordEmergencyUsage('support:log-after', { type: 'support' });
                    handleEmergencyScenario('encounter-log-after');
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/75 p-4 text-left text-white shadow-[0_10px_24px_rgba(2,6,23,0.14)] transition-all hover:border-slate-600/70 hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/30 to-transparent" />
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
                    <Clock2 size={20} weight="bold" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{t('emergency.secondaryActionTag')}</p>
                  <p className="mt-2 text-base font-bold tracking-[0.02em]">{t('emergency.logAfterTitle')}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{t('emergency.logAfterDesc')}</p>
                </button>
              </div>

              <button
                onClick={() => {
                  recordEmergencyUsage('support:post-encounter', { type: 'support' });
                  handleEmergencyScenario('post-encounter');
                }}
                className="group relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/75 p-4 text-left text-white shadow-[0_10px_24px_rgba(2,6,23,0.14)] transition-all hover:border-emerald-400/30 hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent" />
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10">
                  <FirstAidKit size={20} weight="bold" className="text-emerald-300" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{t('emergency.secondaryActionTag')}</p>
                <p className="mt-2 text-base font-bold tracking-[0.02em]">{t('emergency.postEncounterTitle')}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{t('emergency.postEncounterDesc')}</p>
              </button>

              <button
                onClick={() => {
                  recordEmergencyUsage('support:check-in', { type: 'support' });
                  setShowCheckIn(true);
                  setEmergencyMode(false);
                  track('modal_open', { modal: 'safety_checkin', source: 'emergency' });
                }}
                className="group relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/75 p-4 text-left text-white shadow-[0_10px_24px_rgba(2,6,23,0.14)] transition-all hover:border-blue-400/30 hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/35 to-transparent" />
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10">
                  <TimerEm size={20} weight="bold" className="text-blue-300" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{t('emergency.secondaryActionTag')}</p>
                <p className="mt-2 text-base font-bold tracking-[0.02em]">{t('emergency.checkInTitle')}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{t('emergency.checkInSupport')}</p>
              </button>
            </div>

            <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/55 px-4 py-4 sm:mb-6">
              <div className="absolute inset-y-4 left-0 w-1 rounded-full bg-gradient-to-b from-violet-400 via-slate-300 to-cyan-400" />
              <div className="pl-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {t('emergency.calmHeading')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t('emergency.calmDesc')}
              </p>
              </div>
            </div>

            <div className="relative mb-6 overflow-hidden rounded-[24px] border border-slate-800/80 bg-slate-950/70 p-4 shadow-[0_14px_34px_rgba(2,6,23,0.18)] sm:mb-8">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/35 to-transparent" />
              <div className="absolute -right-8 top-10 h-20 w-20 rounded-full bg-violet-400/10 blur-3xl pointer-events-none" />
              <div className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-950/75 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {t('emergency.calmToolEyebrow')}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {t('emergency.calmToolDesc')}
                </p>
              </div>
              <BreathingGuide compact={true} key={breathingResetKey} />
              <div className="mt-5 rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-4 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {t('emergency.calmQuoteEyebrow')}
                </p>
                <p className="mt-3 text-sm italic leading-relaxed text-slate-400">
                  {t('stoic.emergencyQuote')}
                </p>
                <p className="mt-2 text-xs text-slate-500">{t('stoic.emergencyAuthor')}</p>
              </div>
            </div>

            <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/55 px-4 py-4 sm:mb-6">
              <div className="absolute inset-y-4 left-0 w-1 rounded-full bg-gradient-to-b from-blue-400 via-slate-300 to-slate-500" />
              <div className="pl-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {t('emergency.utilitiesHeading')}
              </p>
              </div>
            </div>

            <div className="mb-8 grid gap-3 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/65 p-4 text-center shadow-[0_10px_24px_rgba(2,6,23,0.12)]">
                <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/35 to-transparent" />
                <button
                  onClick={() => {
                    recordEmergencyUsage('utility:install', { type: 'utility' });
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
                  className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-700"
                >
                  <DeviceMobile size={18} weight="bold" />
                  {t('emergency.installButton')}
                </button>
                <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">
                  {t('emergency.installRecommended')}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/65 p-4 text-center shadow-[0_10px_24px_rgba(2,6,23,0.12)]">
                <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/30 to-transparent" />
                <button
                  onClick={() => {
                    recordEmergencyUsage('utility:dismiss', { type: 'utility' });
                    dismissEmergency();
                  }}
                  className="mx-auto flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-medium uppercase tracking-wider text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <CloseX size={18} weight="bold" />
                  {t('emergency.dismiss')}
                </button>
                <p className="mt-2 text-xs text-slate-500">
                  {t('emergency.dismissSupport')}
                </p>
              </div>
            </div>

            <div className="relative mb-6 overflow-hidden rounded-[24px] border border-red-700/40 bg-red-950/15 p-4 shadow-[0_14px_32px_rgba(127,29,29,0.14)]">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-red-300/40 to-transparent" />
              <div className="absolute -right-10 top-10 h-24 w-24 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
              <div className="mb-3 flex items-center gap-2">
                <Trash size={18} weight="bold" className="text-red-400" />
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-300">
                  {t('emergency.dangerHeading')}
                </p>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-slate-300">
                {t('emergency.dangerDesc')}
              </p>
              <div className="mb-3 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-red-100">
                {t('emergency.dangerIrreversible')}
              </div>
              {!showPurgeConfirm ? (
                <button
                  onClick={() => {
                    recordEmergencyUsage('purge-review', { type: 'danger' });
                    openPurgeConfirmation();
                  }}
                  disabled={isPurgingData}
                  className="w-full rounded-2xl border-2 border-red-600 bg-slate-800/80 px-4 py-4 font-bold text-red-400 transition-all hover:bg-slate-700/80 disabled:opacity-50"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Trash size={22} weight="bold" />
                    <span>{t('emergency.purgeReviewButton')}</span>
                  </span>
                </button>
              ) : (
                <div className="rounded-2xl border border-red-500/25 bg-slate-950/55 p-4">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-red-200">
                    {t('emergency.purgeConfirmHeading')}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {t('emergency.purgeConfirmSummary', { count: recordingCountLabel })}
                  </p>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left">
                    <input
                      type="checkbox"
                      checked={purgeAcknowledged}
                      onChange={(event) => setPurgeAcknowledged(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-xs leading-relaxed text-slate-300">
                      {t('emergency.purgeAcknowledge')}
                    </span>
                  </label>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={handleEmergencyPurge}
                      disabled={isPurgingData || !purgeAcknowledged}
                      className="inline-flex items-center justify-center rounded-xl bg-red-700 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPurgingData ? t('emergency.purging') : t('emergency.purgeConfirmButton')}
                    </button>
                    <button
                      onClick={() => {
                        setShowPurgeConfirm(false);
                        setPurgeAcknowledged(false);
                      }}
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {t('lock.cancel')}
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">
                {t('emergency.purgeDescription')}
              </p>
            </div>

              </div>
            </div>

            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="text-amber-500">⚠️</span>
                <h3 className="text-xs font-medium tracking-wider text-amber-400">{t('disclaimer.title')}</h3>
              </div>
              <p className="mb-1 text-xs text-slate-500">
                {t('disclaimer.line1')}
              </p>
              <p className="mb-1 text-xs text-slate-500">
                {t('disclaimer.line2')}
              </p>
              <p className="mb-1 text-xs text-slate-500">
                {t('disclaimer.line3')}
              </p>
              <p className="text-xs text-slate-500">
                {t('disclaimer.line4')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <InstallHelp
        isOpen={showInstallHelp}
        onClose={() => setShowInstallHelp(false)}
        onInstalled={() => {
          setShowInstallBanner(false);
          setShowInstallHelp(false);
          localStorage.setItem('safeneighbor_install_dismissed', 'true');
        }}
      />

      {/* Proximity Alert Banner */}
      <ProximityAlert
        alert={activeAlert}
        onDismiss={dismissAlert}
        onViewMap={() => { dismissAlert(); handleNavigate('reports'); }}
        onRecord={() => { dismissAlert(); handleNavigate('record'); }}
        onSafetyPlan={() => { dismissAlert(); handleNavigateToScenario({ id: 'family-kit' }); }}
        onWitness={() => { dismissAlert(); handleNavigateToScenario({ id: 'encounter-log' }); }}
      />

      {/* PWA Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            data-shell-top-banner="true"
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed left-0 right-0 z-[44] bg-slate-800/95 backdrop-blur-sm border-b border-slate-600/50 px-4 pt-3 pb-2 flex items-center gap-3"
            style={{ top: 'calc(72px + env(safe-area-inset-top, 0px))' }}
          >
            <button
              onClick={handleInstallBannerClick}
              className="flex items-center gap-2 flex-1 min-w-0 text-left"
            >
              <DeviceMobile size={14} weight="bold" className="text-red-400 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 shrink-0">
                {t('installBanner.label')}
              </span>
              <span className="text-[10px] text-slate-500 truncate hidden sm:block">
                {t('installBanner.description')}
              </span>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest shrink-0 ml-auto">
                {t('installBanner.action')} →
              </span>
            </button>
            <button
              onClick={handleInstallBannerDismiss}
              className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 p-1"
              aria-label={t('installBanner.dismiss')}
            >
              <CloseX size={14} weight="bold" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Indicator Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            data-shell-top-banner="true"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed left-0 right-0 z-[45] bg-amber-900/90 backdrop-blur-sm border-b border-amber-600/50 text-amber-200 pt-4 pb-2 px-4"
            style={{ top: 'calc(72px + env(safe-area-inset-top, 0px))' }}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest leading-none">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {t('offline.message')}
              </span>
              <button
                onClick={() => setShowOfflineLibrary(true)}
                className="text-amber-300 hover:text-amber-100 font-bold text-[10px] uppercase tracking-widest underline transition-colors shrink-0"
              >
                {t('offlineLibrary.viewGuide')}
              </button>
            </div>
            <p className="text-center text-amber-300/70 text-[10px] mt-1.5 leading-snug">
              {t('offline.available')} · {t('offline.limited')}
            </p>
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

      {showInteractionShield && (
        <div className="fixed inset-0 z-[95] bg-transparent" aria-hidden="true" />
      )}

      {/* Main Content */}
      <main
        className="overflow-hidden"
        style={{
          paddingTop: topContentOffset,
          transition: 'padding-top 0.3s ease',
        }}
      >
        <div key={currentPage} className={(['scenarios', 'reports', 'home', 'record'].includes(currentPage)) ? '' : 'page-transition-in'}>
          {renderPage()}
        </div>
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
        <p className="text-slate-600 text-[10px] tracking-wide mt-1">
          Owned and Operated by SafeNeighbor LLC
        </p>
        <p className="text-red-400/90 text-[10px] tracking-[0.18em] uppercase mt-2">
          {`Build v${BUILD_VERSION} · ${BUILD_TIME}`}
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
          onInstall={handleInstallBannerClick}
          onOpenOfflineLibrary={() => { setShowSettings(false); setShowOfflineLibrary(true); }}
        />
      )}

      {/* Check My Route Modal */}
      <CheckMyRoute isOpen={showCheckRoute} onClose={() => setShowCheckRoute(false)} />

      {/* Safety Check-In Modal */}
      <SafetyCheckIn
        isOpen={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        onOpenTrustedContacts={() => {
          setShowCheckIn(false);
          setTcRefreshKey(k => k + 1);
          handleNavigateToScenario({ id: 'trusted-contacts' });
        }}
      />

      {/* Legal Response Modal */}
      <LegalResponse
        isOpen={showLegalResponse}
        onClose={() => setShowLegalResponse(false)}
        onOpenTrustedContacts={() => {
          setShowLegalResponse(false);
          setTcRefreshKey(k => k + 1);
          handleNavigateToScenario({ id: 'trusted-contacts' });
        }}
      />
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    if (active) {
      setIsPressed(false);
    }
  }, [active]);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      onBlur={() => setIsPressed(false)}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      className={`flex flex-col items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-2 rounded-lg transition-[transform,color,background-color,box-shadow] duration-150 active:scale-[0.96] ${
        active
          ? 'text-red-500 bg-red-950/30'
          : isPressed
            ? 'text-slate-100 bg-slate-800/80 shadow-[0_0_0_1px_rgba(255,255,255,0.05)] scale-[0.96]'
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
    <ReportsProvider>
      <App />
    </ReportsProvider>
  </ErrorBoundary>
);

export default AppWithBoundary;
