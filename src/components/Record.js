import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { VideoCamera, Microphone, UploadSimple, Stop, Trash, FolderOpen, Camera, DownloadSimple, Warning, Cloud, CloudSlash, Shield, Lock, LockOpen, EyeSlash, CameraRotate, Question, X, CheckCircle, CloudArrowUp, Key, ClipboardText, Eye } from '@phosphor-icons/react';
import { saveRecording, getAllRecordings, deleteRecording, clearAllRecordings, markForBackup, getDecryptedRecording } from '../utils/localStorageDB';
import BackupSettings from './BackupSettings';
import PinSetup from './PinSetup';
import PinEntry from './PinEntry';
import Disclaimer from './Disclaimer';
import FaqCta from './FaqCta';
import { isPinEnabled } from '../utils/pinAuth';
import { useRotatingQuote } from '../utils/quoteRotation';
import {
  processRecordingForPrivacy,
  stripImageMetadata,
  isLocationCaptureEnabled,
  isMetadataStripEnabled
} from '../utils/metadataStrip';
import { getUploadQueue } from '../utils/backup/uploadQueue';
import {
  importKey, encrypt, decrypt, ensureEncryptionReady,
  isMasterKeyInMemory, isKeyWrapped, hasMasterKey,
  wrapMasterKeyWithPin, unwrapMasterKeyWithPin, clearCachedKey
} from '../utils/crypto';
import { pulseHaptic } from '../utils/haptics';
import { readEncrypted, writeEncrypted } from '../utils/encryptedStorage';
import {
  clearEncounterAttachmentLaunchIntent,
  readEncounterAttachmentLaunchIntent,
  writePendingEncounterAttachmentIntent,
} from '../utils/encounterAttachmentLaunch';

const aniDelay = (s) => ({ animationDelay: `${s}s` });
const SETTINGS_KEY = 'safeneighbor_backup_settings';
const WORKFLOW_GUIDE_DISMISSED_KEY = 'safeneighbor_record_workflow_dismissed';
const WITNESS_CHECKLIST_COUNT = 8;
const MOBILE_SCROLL_TOP_PADDING = 104;
const MOBILE_SCROLL_BOTTOM_PADDING = 126;
const RECORD_DESKTOP_QUOTES = [
  {
    quote: 'Stick to what is real.',
    author: 'Epictetus',
    theme: 'Stoic grounding',
  },
  {
    quote: 'The palest ink is better than the best memory.',
    author: 'Chinese Proverb',
    theme: 'Clarity and diligence',
  },
  {
    quote: 'Truth is the only safe ground to stand upon.',
    author: 'Elizabeth Cady Stanton',
    theme: 'Logical guardian',
  },
  {
    quote: 'A problem well-stated is a problem half-solved.',
    author: 'Charles Kettering',
    theme: 'Clear observation',
  },
  {
    quote: 'Luck is what happens when preparation meets opportunity.',
    author: 'Seneca',
    theme: 'Preparedness',
  },
  {
    quote: 'He who is brave is free.',
    author: 'Seneca',
    theme: 'Protector',
  },
  {
    quote: 'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.',
    author: 'Marcus Aurelius',
    theme: 'Objective record',
  },
  {
    quote: 'A man who is prepared has his battle half fought.',
    author: 'Miguel de Cervantes',
    theme: 'Preparedness',
  },
];

/**
 * Initialize the upload queue from saved settings (if not already initialized)
 * Returns the queue if ready, null otherwise
 */
const initQueueFromSettings = async () => {
  const queue = getUploadQueue();
  if (queue.getActiveProviders().length > 0) return queue;

  try {
    const settings = await readEncrypted(SETTINGS_KEY, null);
    if (!settings) return null;
    if (!settings.isConfigured || !settings.encryptionKey) return null;

    const key = await importKey(settings.encryptionKey);
    const providerConfigs = {};
    if (settings.credentials?.accessKeyId) providerConfigs.r2 = settings.credentials;
    if (settings.activeProviders?.includes('google_drive')) providerConfigs.google_drive = true;

    if (Object.keys(providerConfigs).length === 0) return null;

    await queue.initialize(key, providerConfigs);
    return queue;
  } catch (error) {
    console.error('Failed to init backup queue:', error);
    return null;
  }
};

// Detect mobile device (for Web Share API vs download)
const isMobileDevice = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints > 0 && /Mobile|Tablet/i.test(navigator.userAgent));
};

const RecordSectionHeader = ({ eyebrow, title, description, accent = 'text-blue-400' }) => (
  <div className="mb-4">
    <p className={`mb-2 text-[11px] font-black uppercase tracking-[0.18em] ${accent}`}>{eyebrow}</p>
    <h2 className="text-xl font-black tracking-tight text-white sm:text-[1.65rem]">{title}</h2>
    <p className="mt-2 max-w-[42rem] text-sm leading-[1.62] text-slate-300">{description}</p>
  </div>
);

const Record = ({ isDuressMode = false, onNavigate, onNavigateToScenario }) => {
  const { t } = useTranslation();
  const recordQuote = useRotatingQuote('record.aureliusQuote', 'record.aureliusAuthor', 'record');
  const [activeTab, setActiveTab] = useState('video');
  const [witnessMode, setWitnessMode] = useState(false);
  const [showWitnessReminder, setShowWitnessReminder] = useState(false);
  const [desktopQuoteIndex, setDesktopQuoteIndex] = useState(0);

  // Video state
  const [cameraActive, setCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = rear, 'user' = front
  const [, setUsedNativeCamera] = useState(false); // Track if native camera was used

  // Audio state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState(new Array(64).fill(0));
  
  // Vault state
  const [vaultRecordings, setVaultRecordings] = useState([]);
  const [vaultLoaded, setVaultLoaded] = useState(false);
  const [selectedVaultItem, setSelectedVaultItem] = useState(null);
  const [encounterAttachmentIntent, setEncounterAttachmentIntent] = useState(() => readEncounterAttachmentLaunchIntent());

  // Purge state
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeAcknowledged, setPurgeAcknowledged] = useState(false);

  // Backup state
  const [showBackupSettings, setShowBackupSettings] = useState(false);
  const [backupSettingsTab, setBackupSettingsTab] = useState('r2');
  const [showBackupInfo, setShowBackupInfo] = useState(false);

  // Restore encrypted backup state
  const [isRestoring, setIsRestoring] = useState(false);
  const [decryptKeyInput, setDecryptKeyInput] = useState('');
  const [, setDecryptKeySource] = useState(null); // 'saved' | 'manual' | null

  // PIN setup state
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(isPinEnabled());
  const [hideRecommendationCard, setHideRecommendationCard] = useState(false);
  const [backupSettings, setBackupSettings] = useState(null);

  // Workflow guide modal
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
  const [isWorkflowGuideClosing, setIsWorkflowGuideClosing] = useState(false);
  const [witnessChecklist, setWitnessChecklist] = useState(() => Array.from({ length: WITNESS_CHECKLIST_COUNT }, () => false));

  // PIN gate state — Record section requires PIN when key wrapping is active
  const [recordUnlocked, setRecordUnlocked] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);
  const activeDesktopQuote = RECORD_DESKTOP_QUOTES[desktopQuoteIndex];

  // Lock body scroll when any modal is open
  const anyModalOpen = showPurgeConfirm || showBackupSettings || showBackupInfo || showWorkflowGuide || showPinSetup;
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDesktopQuoteIndex((currentIndex) => (currentIndex + 1) % RECORD_DESKTOP_QUOTES.length);
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const refreshIntent = () => setEncounterAttachmentIntent(readEncounterAttachmentLaunchIntent());
    refreshIntent();
    window.addEventListener('focus', refreshIntent);
    return () => window.removeEventListener('focus', refreshIntent);
  }, []);

  // Refs
  const videoRef = useRef(null);    // Live camera preview
  const playbackRef = useRef(null); // Recorded video playback (separate element avoids Safari srcObject→src bug)
  const streamRef = useRef(null);
  const wakeLockRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const audioStreamRef = useRef(null);
  const workflowGuideCloseTimerRef = useRef(null);
  const videoCaptureRef = useRef(null);
  const audioCaptureRef = useRef(null);
  const importCaptureRef = useRef(null);
  const decryptSectionRef = useRef(null);
  const vaultSectionRef = useRef(null);
  const vaultRowRefs = useRef({});
  const videoDurationRef = useRef(0);
  const audioDurationRef = useRef(0);

  const getTopChromeBottom = useCallback(() => {
    const topNav = document.querySelector('[data-shell-top-nav="true"]');
    const topBanners = Array.from(document.querySelectorAll('[data-shell-top-banner="true"]'));

    const navBottom = topNav ? topNav.getBoundingClientRect().bottom : 0;
    const bannerBottom = topBanners.reduce((maxBottom, banner) => {
      const rect = banner.getBoundingClientRect();
      if (rect.height <= 0 || rect.bottom <= 0) return maxBottom;
      return Math.max(maxBottom, rect.bottom);
    }, 0);

    return Math.max(navBottom, bannerBottom);
  }, []);

  const getShellAwareTopPadding = useCallback((gap = 18, fallback = MOBILE_SCROLL_TOP_PADDING) => (
    Math.max(fallback, getTopChromeBottom() + gap)
  ), [getTopChromeBottom]);

  const getVideoPreviewTopPadding = useCallback(() => (
    getShellAwareTopPadding(12, 102)
  ), [getShellAwareTopPadding]);

  const getAudioPreviewTopPadding = useCallback(() => (
    getShellAwareTopPadding(12, 102)
  ), [getShellAwareTopPadding]);

  const getScrollTopForElement = useCallback((element, {
    topPadding = MOBILE_SCROLL_TOP_PADDING,
    bottomPadding = MOBILE_SCROLL_BOTTOM_PADDING,
    preferCenterIfFits = false,
  } = {}) => {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const availableHeight = Math.max(viewportHeight - topPadding - bottomPadding, 0);
    const elementTop = window.scrollY + rect.top;

    if (preferCenterIfFits && rect.height > 0 && rect.height <= availableHeight) {
      const centeredOffset = topPadding + ((availableHeight - rect.height) / 2);
      return Math.max(elementTop - centeredOffset, 0);
    }

    return Math.max(elementTop - topPadding, 0);
  }, []);

  const scrollToCaptureRef = useCallback((ref, options = {}) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const element = ref.current;
        if (!element) return;

        const top = getScrollTopForElement(element, options);
        if (top === null) return;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }, [getScrollTopForElement]);

  const scrollToElement = useCallback((element, options = {}) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!element) return;

        const top = getScrollTopForElement(element, options);
        if (top === null) return;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }, [getScrollTopForElement]);

  const loadBackupSettings = useCallback(async () => {
    try {
      const settings = await readEncrypted(SETTINGS_KEY, null);
      setBackupSettings(settings || null);
      return settings || null;
    } catch (error) {
      console.error('Failed to load backup settings in Record:', error);
      setBackupSettings(null);
      return null;
    }
  }, []);

  // Helper to load vault and init backup queue
  const loadVaultAndInit = async () => {
    await loadVault();
    await loadBackupSettings();
    await initQueueFromSettings();
  };

  // Handle successful PIN entry for Record section
  const handleRecordUnlock = async (isDuress, pin) => {
    if (isDuress) {
      // Duress mode: show empty vault, no key needed
      setRecordUnlocked(true);
      setNeedsPin(false);
      return;
    }

    try {
      // Ensure encryption key exists
      await ensureEncryptionReady();

      if (isKeyWrapped()) {
        // Key already wrapped — unwrap with PIN
        await unwrapMasterKeyWithPin(pin);
      } else {
        // Key exists but not wrapped — wrap it now with the PIN
        const hasKey = await hasMasterKey();
        if (hasKey) {
          await wrapMasterKeyWithPin(pin);
        }
      }

      await loadVaultAndInit();
      setRecordUnlocked(true);
      setNeedsPin(false);
    } catch (err) {
      console.error('Failed to unlock vault:', err);
      setError(t('record.failedUnlock'));
    }
  };

  useEffect(() => {
    // Register queue callback immediately (doesn't need auth)
    const queue = getUploadQueue();
    queue.setStatusChangeCallback((item) => {
      if (item.status === 'completed' || item.status === 'failed') {
        loadVault();
      }
    });

    const checkAccess = async () => {
      if (isPinEnabled()) {
        // If key is already in memory (from app-level unlock), grant access
        if (isMasterKeyInMemory()) {
          await loadVaultAndInit();
          setRecordUnlocked(true);
        } else {
          // Need PIN to access recordings
          setNeedsPin(true);
        }
      } else {
        // No PIN — direct access
        await ensureEncryptionReady();
        await loadVaultAndInit();
        setRecordUnlocked(true);
      }
    };

    checkAccess();

    return () => {
      cleanup();
      // Clear encryption key from memory when leaving Record section
      if (isPinEnabled()) {
        clearCachedKey();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for external requests to open BackupSettings (from EncounterLog "Set up backup" link)
  useEffect(() => {
    const handler = () => setShowBackupSettings(true);
    window.addEventListener('openBackupSettings', handler);
    return () => window.removeEventListener('openBackupSettings', handler);
  }, []);

  useEffect(() => {
    if (!recordUnlocked) return;
    loadBackupSettings();
  }, [recordUnlocked, showBackupSettings, loadBackupSettings]);

  const persistWorkflowGuideDismissal = useCallback(() => {
    try {
      localStorage.setItem(WORKFLOW_GUIDE_DISMISSED_KEY, 'true');
    } catch (error) {
      console.warn('Failed to persist Record workflow guide dismissal', error);
    }
  }, []);

  // Show the workflow guide only on true first-use states: no vault items yet
  // and no prior persistent dismissal on this device.
  useEffect(() => {
    if (!recordUnlocked || isDuressMode || !vaultLoaded || showWorkflowGuide) return;

    const wasDismissed = localStorage.getItem(WORKFLOW_GUIDE_DISMISSED_KEY) === 'true';
    if (vaultRecordings.length === 0 && !wasDismissed) {
      setIsWorkflowGuideClosing(false);
      setShowWorkflowGuide(true);
    }
  }, [recordUnlocked, isDuressMode, vaultLoaded, vaultRecordings.length, showWorkflowGuide]);

  useEffect(() => {
    return () => {
      if (workflowGuideCloseTimerRef.current) {
        window.clearTimeout(workflowGuideCloseTimerRef.current);
      }
    };
  }, []);

  const dismissWorkflowGuide = useCallback((event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (isWorkflowGuideClosing) return;
    persistWorkflowGuideDismissal();
    setIsWorkflowGuideClosing(true);
    workflowGuideCloseTimerRef.current = window.setTimeout(() => {
      setShowWorkflowGuide(false);
      setIsWorkflowGuideClosing(false);
    }, 150);
  }, [isWorkflowGuideClosing, persistWorkflowGuideDismissal]);

  const recordingNotificationRef = useRef(null);

  const showRecordingNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      recordingNotificationRef.current = new Notification('SafeNeighbor Recording', {
        body: 'Recording is active. Tap to return to the app.',
        icon: '/logo192.png',
        tag: 'recording-active',
        requireInteraction: true,
        silent: true
      });
    }
  };

  const closeRecordingNotification = () => {
    if (recordingNotificationRef.current) {
      recordingNotificationRef.current.close();
      recordingNotificationRef.current = null;
    }
  };

  const cleanup = () => {
    stopCamera();
    stopAudioRecording();
    clearInterval(timerRef.current);
    cancelAnimationFrame(animationRef.current);
    closeRecordingNotification();
    releaseWakeLock();
  };

  // Screen Wake Lock — keeps screen on during recording (iOS 16.4+, all modern browsers)
  const acquireWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch {}
    }
  };

  const releaseWakeLock = () => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  };

  // Set up playback video when a recording is ready.
  // Uses a SEPARATE element from the live preview to avoid Safari's srcObject→src transition bug.
  useEffect(() => {
    const vid = playbackRef.current;
    if (!vid || !recordedUrl) return;
    vid.src = recordedUrl;
    // Force Safari to decode and display the first frame
    const showFirstFrame = () => {
      vid.currentTime = 0.01;
      vid.removeEventListener('loadeddata', showFirstFrame);
    };
    vid.addEventListener('loadeddata', showFirstFrame);
    // Fallback: if blob URL fails on Safari, try data URL
    const tryDataUrl = () => {
      vid.removeEventListener('error', tryDataUrl);
      if (recordedBlob && vid.src?.startsWith('blob:')) {
        const reader = new FileReader();
        reader.onload = () => { vid.src = reader.result; vid.load(); };
        reader.readAsDataURL(recordedBlob);
      }
    };
    vid.addEventListener('error', tryDataUrl);
    vid.load();
    return () => {
      vid.removeEventListener('loadeddata', showFirstFrame);
      vid.removeEventListener('error', tryDataUrl);
    };
  }, [recordedUrl, recordedBlob]);

  const loadVault = async () => {
    try {
      const recordings = await getAllRecordings();
      setVaultRecordings(recordings || []);
    } catch (err) {
      console.error('Vault load error:', err);
    } finally {
      setVaultLoaded(true);
    }
  };

  const startCamera = async () => {
    setError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setError(`Camera error: ${err.name} - ${err.message}`);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const flipCamera = async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);

    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    // Start with new facingMode at 1080p
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: newMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError(`Camera error: ${err.message}`);
    }
  };

  const generateThumbnail = (blob) => {
    return new Promise((resolve) => {
      let resolved = false;
      const done = (result) => {
        if (resolved) return;
        resolved = true;
        URL.revokeObjectURL(video.src);
        video.remove();
        resolve(result);
      };

      const video = document.createElement('video');
      // Append to DOM — Safari requires video elements to be in the document tree for decoding
      video.style.position = 'fixed';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      video.style.width = '1px';
      video.style.height = '1px';
      document.body.appendChild(video);
      video.src = URL.createObjectURL(blob);
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      const capture = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 90;
          canvas.getContext('2d').drawImage(video, 0, 0, 160, 90);
          video.pause();
          done(canvas.toDataURL('image/jpeg', 0.7));
        } catch {
          done(null);
        }
      };

      video.onseeked = capture;

      video.onloadeddata = () => {
        // Safari needs play() before seeking works reliably
        video.play().then(() => {
          video.pause();
          video.currentTime = 0.1;
        }).catch(() => {
          // Fallback: try seeking directly (works in Chrome/Firefox)
          video.currentTime = 0.1;
        });
      };

      video.onerror = () => done(null);
      setTimeout(() => done(null), 5000);
    });
  };

  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'auto'; // Load more data for iOS
      video.muted = true;
      video.playsInline = true;

      let resolved = false;
      const finish = (dur) => {
        if (resolved) return;
        resolved = true;
        URL.revokeObjectURL(video.src);
        video.remove();
        resolve(dur);
      };

      // Try multiple events for better iOS compatibility
      video.onloadeddata = () => {
        if (video.duration && video.duration !== Infinity && !isNaN(video.duration)) {
          finish(Math.round(video.duration));
        }
      };

      video.ondurationchange = () => {
        if (video.duration && video.duration !== Infinity && !isNaN(video.duration)) {
          finish(Math.round(video.duration));
        }
      };

      video.oncanplaythrough = () => {
        if (video.duration && video.duration !== Infinity && !isNaN(video.duration)) {
          finish(Math.round(video.duration));
        }
      };

      video.onerror = () => finish(0);

      // Longer timeout for iOS (5 seconds)
      setTimeout(() => {
        if (video.duration && video.duration !== Infinity && !isNaN(video.duration)) {
          finish(Math.round(video.duration));
        } else {
          finish(0);
        }
      }, 5000);

      video.src = URL.createObjectURL(file);
      video.load();
    });
  };

  const startVideoRecording = () => {
    if (!streamRef.current) {
      setError(t('record.cameraNotStarted'));
      return;
    }
    pulseHaptic();
    showRecordingNotification();
    chunksRef.current = [];
    // Use browser defaults for best compatibility (especially iOS Safari)
    const recorder = new MediaRecorder(streamRef.current);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      clearInterval(timerRef.current);
      pulseHaptic();
      closeRecordingNotification();
      releaseWakeLock();

      // Stop camera and release decoder BEFORE any state updates so Safari
      // fully releases the media pipeline before the playback element loads
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraActive(false);

      // WebKit recommended pattern: always concatenate chunks into a new Blob
      // using recorder.mimeType (the actual format chosen by the browser)
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/mp4' });
      const finalDuration = videoDurationRef.current;

      const blobUrl = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(blobUrl); // triggers useEffect that transitions videoRef to playback
      setIsRecording(false);

      // Defer thumbnail so the playback video can establish its media session first
      setTimeout(async () => {
        const thumbnail = await generateThumbnail(blob);
        await saveToVault(blob, finalDuration, 'video', thumbnail, 'recorded', witnessMode ? 'witness-report' : 'default');
      }, 500);
    };
    recorder.start(1000); // 1-second timeslice (WebKit recommended pattern)
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setDuration(0);
    videoDurationRef.current = 0;
    timerRef.current = setInterval(() => {
      setDuration((currentDuration) => {
        const nextDuration = currentDuration + 1;
        videoDurationRef.current = nextDuration;
        return nextDuration;
      });
    }, 1000);
    acquireWakeLock();
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const recordMore = async () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null); // unmounts playback element
    setRecordedBlob(null);
    setDuration(0);
    videoDurationRef.current = 0;
    setUsedNativeCamera(false);
    await startCamera();
    setTimeout(() => {
      if (streamRef.current) startVideoRecording();
    }, 500);
  };

  const deleteCurrentRecording = async () => {
    if (vaultRecordings.length > 0) {
      const mostRecent = vaultRecordings[0];
      await handleDelete(mostRecent.id);
    }
    resetVideo();
  };

  const resetVideo = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null); // unmounts playback element
    setRecordedBlob(null);
    setDuration(0);
    videoDurationRef.current = 0;
    setUsedNativeCamera(false);
  };

  // AUDIO FUNCTIONS
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      audioContextRef.current.createMediaStreamSource(stream).connect(analyserRef.current);

      const tick = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const bars = [];
        for (let i = 0; i < 64; i++) {
          const idx = Math.floor(i * data.length / 64);
          bars.push(data[idx]);
        }
        setAudioLevels(bars);
        animationRef.current = requestAnimationFrame(tick);
      };
      tick();

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        clearInterval(timerRef.current);
        cancelAnimationFrame(animationRef.current);
        pulseHaptic();
        closeRecordingNotification();
        releaseWakeLock();
        setAudioLevels(new Array(64).fill(0));
        
        // WebKit recommended pattern: always concatenate chunks with recorder.mimeType
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' });
        const finalAudioDuration = audioDurationRef.current;
        setAudioUrl(URL.createObjectURL(blob));
        setIsRecordingAudio(false);

        // Clean up audio stream
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
          audioStreamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        await saveToVault(blob, finalAudioDuration, 'audio', null, 'recorded', witnessMode ? 'witness-report' : 'default');
      };

      recorder.start(1000); // 1-second timeslice (WebKit recommended pattern)
      mediaRecorderRef.current = recorder;
      pulseHaptic();
      showRecordingNotification();
      setIsRecordingAudio(true);
      setAudioDuration(0);
      audioDurationRef.current = 0;
      timerRef.current = setInterval(() => {
        setAudioDuration((currentDuration) => {
          const nextDuration = currentDuration + 1;
          audioDurationRef.current = nextDuration;
          return nextDuration;
        });
      }, 1000);
      acquireWakeLock();
    } catch (err) {
      setError(`Mic error: ${err.message}`);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const recordMoreAudio = async () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioDuration(0);
    audioDurationRef.current = 0;
    setTimeout(() => {
      startAudioRecording();
    }, 300);
  };

  const deleteCurrentAudio = async () => {
    if (vaultRecordings.length > 0) {
      const mostRecent = vaultRecordings.find(r => r.type === 'audio');
      if (mostRecent) await handleDelete(mostRecent.id);
    }
    resetAudio();
  };

  const resetAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioDuration(0);
    audioDurationRef.current = 0;
    setAudioLevels(new Array(64).fill(0));
  };

  // VAULT FUNCTIONS
  const saveToVault = async (blob, dur, type, thumbnail, source = 'recorded', template = 'default') => {
    try {
      // Only capture location if enabled in privacy settings
      let location = null;
      if (isLocationCaptureEnabled()) {
        try {
          const pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
          );
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {}
      }

      // Strip metadata from thumbnail if enabled
      const cleanThumbnail = stripImageMetadata(thumbnail);

      // Process recording for privacy (strips metadata, generates clean title, etc.)
      const processedData = await processRecordingForPrivacy({
        blob,
        duration: dur,
        location,
        type,
        thumbnail: cleanThumbnail,
        size: blob.size,
        source,
        template,
      });

      const saved = await saveRecording(processedData);
      persistWorkflowGuideDismissal();
      await loadVault();

      // Auto-backup: if enabled, mark recording for backup and queue it
      try {
        const settings = backupSettings || await readEncrypted(SETTINGS_KEY, null);
        if (settings) {
          if (settings.isConfigured && settings.autoBackup && settings.activeProviders?.length > 0) {
            await markForBackup(saved.id, true);
            await loadVault();
            const queue = await initQueueFromSettings();
            if (queue) {
              const providers = queue.getActiveProviders();
              for (const provider of providers) {
                await queue.addToQueue(saved.id, provider);
              }
            }
          }
        }
      } catch (backupErr) {
        console.error('Auto-backup queue error:', backupErr);
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleDelete = async (id) => {
    await deleteRecording(id);
    await loadVault();
    if (selectedVaultItem?.id === id) setSelectedVaultItem(null);
  };

  const selectVaultItem = async (rec) => {
    if (selectedVaultItem?.url) URL.revokeObjectURL(selectedVaultItem.url);

    try {
      // Get decrypted recording to ensure blob is valid
      const decryptedRec = await getDecryptedRecording(rec.id);
      if (!decryptedRec || !decryptedRec.blob) {
        setError(t('record.failedLoadRecording'));
        return;
      }

      // Ensure we have a proper Blob object
      let blob = decryptedRec.blob;
      if (!(blob instanceof Blob)) {
        // Convert Uint8Array or ArrayBuffer to Blob — use mp4 as fallback (universally playable)
        const mimeType = rec._mimeType || (rec.type === 'video' ? 'video/mp4' : 'audio/mp4');
        blob = new Blob([blob], { type: mimeType });
      }

      // Fix wrongly-labeled recordings: Safari can't play WebM, so if the stored type
      // says webm but the browser doesn't support it, re-label as mp4 (the actual codec)
      if (blob.type?.includes('webm') && typeof MediaRecorder !== 'undefined'
          && !MediaRecorder.isTypeSupported?.('video/webm')) {
        const correctedType = rec.type === 'video' ? 'video/mp4' : 'audio/mp4';
        blob = new Blob([blob], { type: correctedType });
      }

      setSelectedVaultItem({ ...rec, blob, url: URL.createObjectURL(blob) });
    } catch (err) {
      console.error('Failed to load vault item:', err);
      setError(t('record.failedLoadRecording'));
    }
  };

  const handleAttachRecordingToEncounter = (recording) => {
    if (!encounterAttachmentIntent?.logId || !encounterAttachmentIntent?.scenarioId || !onNavigateToScenario || !recording) return;

    const providers = [recording.backups?.r2?.backedUp && 'R2', recording.backups?.google_drive?.backedUp && 'Google Drive']
      .filter(Boolean)
      .join(', ');

    writePendingEncounterAttachmentIntent({
      logId: encounterAttachmentIntent.logId,
      scenarioId: encounterAttachmentIntent.scenarioId,
      attachment: {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sourceType: 'vault-recording',
        attachmentType: recording.type || 'recording',
        recordingId: recording.id,
        label: recording.title || `${recording.type || 'recording'} attachment`,
        createdAt: recording.createdAt || new Date().toISOString(),
        storage: 'Encrypted local vault',
        notes: recording.source === 'imported' ? 'Imported into the encrypted vault.' : 'Captured in the encrypted vault.',
        backupStatus: recording.backedUp ? `Backed up${providers ? ` (${providers})` : ''}` : recording.markedForBackup ? 'Marked for backup' : 'Local only',
      },
    });

    clearEncounterAttachmentLaunchIntent();
    setEncounterAttachmentIntent(null);
    onNavigateToScenario({ id: encounterAttachmentIntent.scenarioId });
  };

  const downloadRecording = async (rec) => {
    try {
      const timestamp = new Date(Number(rec.id) || Date.now()).toISOString().slice(0,19).replace(/[:-]/g, '');

      // For non-restored recordings, encrypt with the BACKUP key and download as .enc
      // This ensures .enc files are compatible with the DECRYPT tab and cloud backups
      if (rec.source !== 'restored') {
        const settings = backupSettings || await readEncrypted(SETTINGS_KEY, null);
        if (!settings?.encryptionKey) {
          setError(t('record.noEncKeyForBackup'));
          return;
        }

        // Get the decrypted blob (already available on selectedVaultItem)
        if (!rec.blob || !(rec.blob instanceof Blob) || rec.blob.size === 0) {
          setError(t('record.recordingDataNA'));
          return;
        }

        const backupKey = await importKey(settings.encryptionKey);
        const blobBuffer = await rec.blob.arrayBuffer();
        const encryptedData = await encrypt(new Uint8Array(blobBuffer), backupKey);

        const mime = rec._mimeType || rec.blob?.type || (rec.type === 'video' ? 'video/webm' : 'audio/webm');
        const fileExt = mime.includes('mp4') ? 'mp4' : 'webm';
        const prefix = rec.template === 'witness-report' ? 'WitnessReport' : 'SafeNeighbor';
        const filename = `${prefix}_${rec.type}_${timestamp}.${fileExt}.enc`;
        const encBlob = new Blob([encryptedData], { type: 'application/octet-stream' });

        if (isMobileDevice() && navigator.share) {
          try {
            const file = new File([encBlob], filename, { type: 'application/octet-stream' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: 'SafeNeighbor Encrypted Recording' });
              return;
            }
          } catch (err) {
            if (err.name === 'AbortError') return;
          }
        }

        const url = URL.createObjectURL(encBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        return;
      }

      // For restored/decrypted recordings, download the playable file
      if (!rec.blob) {
        setError(t('record.recordingDataNA'));
        return;
      }

      if (!(rec.blob instanceof Blob) || rec.blob.size === 0) {
        setError(t('record.invalidRecordingData'));
        return;
      }

      const blobMime = rec.blob?.type || rec._mimeType || (rec.type === 'video' ? 'video/webm' : 'audio/webm');
      const ext = blobMime.includes('mp4') ? 'mp4' : 'webm';
      const prefix = rec.template === 'witness-report' ? 'WitnessReport' : 'SafeNeighbor';
      const filename = `${prefix}_${rec.type}_${timestamp}.${ext}`;

      if (isMobileDevice() && navigator.share) {
        try {
          const file = new File([rec.blob], filename, { type: blobMime });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'SafeNeighbor Recording' });
            return;
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      const url = URL.createObjectURL(rec.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    } catch (outerErr) {
      console.error('Download error:', outerErr);
      setError(`Download failed: ${outerErr.message}`);
    }
  };

  // RESTORE ENCRYPTED BACKUP
  const restoreEncryptedFile = async (file) => {
    setIsRestoring(true);
    setError(null);
    try {
      // Try saved key first, then manual input
      const savedKey = backupSettings?.encryptionKey || null;
      const keyString = savedKey || decryptKeyInput.trim();

      if (!keyString) {
        setError(t('record.noEncKeyAvailable'));
        return;
      }

      // If using manual key, save it to backup settings for future use
      if (!savedKey && keyString) {
        try {
          const existing = (backupSettings || await readEncrypted(SETTINGS_KEY, {})) || {};
          const nextSettings = { ...existing, encryptionKey: keyString };
          const didPersistKey = await writeEncrypted(SETTINGS_KEY, nextSettings);
          if (!didPersistKey) {
            console.warn('Unable to persist backup decryption key; keeping it in memory for this session.');
          }
          setBackupSettings(nextSettings);
          setDecryptKeySource('manual');
        } catch (persistError) {
          console.warn('Failed to persist manual decryption key:', persistError);
        }
      } else {
        setDecryptKeySource('saved');
      }

      const key = await importKey(keyString);

      // Read the .enc file
      const encryptedData = new Uint8Array(await file.arrayBuffer());

      // Decrypt
      const decryptedBuffer = await decrypt(encryptedData, key);

      // Detect actual format from decrypted data magic bytes
      const header = new Uint8Array(decryptedBuffer.slice(0, 12));
      const isWebM = header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3; // EBML header = WebM/MKV
      const name = file.name.toLowerCase();
      const isAudio = name.includes('.webm.enc') && !name.includes('.mp4');
      const mimeType = isAudio ? 'audio/webm' : (isWebM ? 'video/webm' : 'video/mp4');
      const type = isAudio ? 'audio' : 'video';

      const blob = new Blob([decryptedBuffer], { type: mimeType });

      // Generate thumbnail for video
      const thumbnail = type === 'video' ? await generateThumbnail(blob) : null;

      // Get duration
      let dur = 0;
      if (type === 'video') {
        dur = await getVideoDuration(blob);
      }

      // Show the restored recording
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);

      // Save to vault (mark as restored from encrypted backup)
      await saveToVault(blob, dur, type, thumbnail, 'restored');
      setActiveTab('video');
    } catch (err) {
      console.error('Restore failed:', err);
      // Web Crypto OperationError = wrong key or corrupted data
      if (err.name === 'OperationError' || err.message?.includes('decrypt') || err.message?.includes('operation')) {
        setError(t('record.decryptionFailed'));
      } else {
        setError(`Restore failed: ${err.message}`);
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const fmtB = (b) => !b ? '0 B' : b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';
  const savedEncryptionKey = backupSettings?.encryptionKey || null;
  const backupReady = Boolean(backupSettings?.isConfigured && backupSettings?.activeProviders?.length);
  const backedUpCount = vaultRecordings.filter((rec) => rec.backedUp).length;
  const pendingBackupCount = vaultRecordings.filter((rec) => rec.markedForBackup && !rec.backedUp).length;
  const privacyEnabled = isMetadataStripEnabled();
  const latestRecording = vaultRecordings[0] || null;
  const setupItems = [
    {
      id: 'privacy',
      label: t('record.readinessPrivacyLabel', { defaultValue: 'Private capture' }),
      status: privacyEnabled
        ? t('record.readinessOn', { defaultValue: 'On' })
        : t('record.readinessReview', { defaultValue: 'Review' }),
      ready: privacyEnabled,
      onClick: () => {
        sessionStorage.setItem('faqScrollTarget', 'privacy');
        onNavigate('faq');
      },
    },
    {
      id: 'pin',
      label: 'PIN',
      status: pinEnabled
        ? t('record.readinessOn', { defaultValue: 'On' })
        : t('record.readinessNeeded', { defaultValue: 'Needed' }),
      ready: pinEnabled,
      onClick: () => setShowPinSetup(true),
    },
    {
      id: 'backup',
      label: t('record.backup'),
      status: backupReady
        ? t('record.readinessOn', { defaultValue: 'On' })
        : t('record.readinessNeeded', { defaultValue: 'Needed' }),
      ready: backupReady,
      onClick: () => {
        setBackupSettingsTab('google_drive');
        setShowBackupSettings(true);
      },
    },
  ];
  const setupReadyCount = setupItems.filter((item) => item.ready).length;
  const setupProgressPercent = Math.round((setupReadyCount / setupItems.length) * 100);
  const quickCaptureDisabled = isRecording || isRecordingAudio || isRestoring || isPurging;
  const witnessChecklistItems = Array.from({ length: WITNESS_CHECKLIST_COUNT }, (_, index) => t(`communityWitnessing.doc${index + 1}`));
  const witnessChecklistCompleteCount = witnessChecklist.filter(Boolean).length;
  const showPrimaryRecommendation = !hideRecommendationCard && setupReadyCount < setupItems.length;
  const showReadinessSection = setupReadyCount < setupItems.length;

  useEffect(() => {
    if (setupReadyCount === setupItems.length) {
      setHideRecommendationCard(true);
      return;
    }

    if (!pinEnabled) {
      setHideRecommendationCard(false);
    }
  }, [pinEnabled, setupItems.length, setupReadyCount]);

  const handleOpenVideoCapture = async ({ scrollTarget = 'preview' } = {}) => {
    if (quickCaptureDisabled) return;
    setError(null);
    setActiveTab('video');
    scrollToCaptureRef(videoCaptureRef, {
      topPadding: scrollTarget === 'preview'
        ? getVideoPreviewTopPadding()
        : getShellAwareTopPadding(14, MOBILE_SCROLL_TOP_PADDING),
      bottomPadding: 116,
    });
    if (recordedUrl) {
      await recordMore();
      return;
    }
    if (cameraActive) {
      if (!isRecording) startVideoRecording();
      return;
    }
    await startCamera();
    window.setTimeout(() => {
      if (streamRef.current && !isRecording) {
        startVideoRecording();
      }
    }, 320);
  };

  const handleOpenAudioCapture = async () => {
    if (quickCaptureDisabled) return;
    setError(null);
    stopCamera();
    setActiveTab('audio');
    scrollToCaptureRef(audioCaptureRef, {
      topPadding: getAudioPreviewTopPadding(),
      bottomPadding: 116,
    });
    if (audioUrl) {
      await recordMoreAudio();
      window.setTimeout(() => {
        scrollToCaptureRef(audioCaptureRef, {
          topPadding: getAudioPreviewTopPadding(),
          bottomPadding: 116,
        });
      }, 220);
      return;
    }
    if (!isRecordingAudio) {
      await startAudioRecording();
      window.setTimeout(() => {
        scrollToCaptureRef(audioCaptureRef, {
          topPadding: getAudioPreviewTopPadding(),
          bottomPadding: 116,
        });
      }, 220);
    }
  };

  const handleOpenImport = () => {
    if (quickCaptureDisabled) return;
    stopCamera();
    setActiveTab('import');
    scrollToCaptureRef(importCaptureRef, {
      topPadding: getShellAwareTopPadding(16, 118),
      bottomPadding: 118,
    });
  };

  const handleOpenDecrypt = () => {
    if (quickCaptureDisabled) return;
    stopCamera();
    setActiveTab('decrypt');
    scrollToCaptureRef(decryptSectionRef, {
      topPadding: getShellAwareTopPadding(16, 118),
      bottomPadding: 118,
    });
  };

  const handleWitnessModeToggle = useCallback(() => {
    if (witnessMode) {
      setWitnessMode(false);
      setShowWitnessReminder(false);
      setWitnessChecklist(Array.from({ length: WITNESS_CHECKLIST_COUNT }, () => false));
      return;
    }

    setWitnessMode(true);
    setShowWitnessReminder(true);
    setActiveTab('video');
    scrollToCaptureRef(videoCaptureRef, {
      topPadding: getVideoPreviewTopPadding(),
      bottomPadding: 116,
    });
  }, [getVideoPreviewTopPadding, scrollToCaptureRef, witnessMode]);

  const handleWitnessChecklistToggle = useCallback((index) => {
    setWitnessChecklist((current) => current.map((checked, itemIndex) => (
      itemIndex === index ? !checked : checked
    )));
  }, []);

  const handlePinSetupSuccess = useCallback(() => {
    const nextPinEnabled = isPinEnabled();
    setPinEnabled(nextPinEnabled);
    setShowPinSetup(false);

    if (nextPinEnabled) {
      setHideRecommendationCard(true);
    }
  }, []);

  let primaryRecommendation = {
    eyebrow: t('record.recReadyEyebrow', { defaultValue: 'Ready now' }),
    title: t('record.recReadyTitle', { defaultValue: 'Your capture tools are ready' }),
    description: t('record.recReadyDesc', { defaultValue: 'Record first, then decide what to keep, back up, or decrypt when the moment is over.' }),
    ctaLabel: t('record.recReadyCta', { defaultValue: 'Start video' }),
    onClick: handleOpenVideoCapture,
    accentClasses: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15',
    iconWrap: 'border-emerald-400/20 bg-emerald-500/10',
    iconColor: 'text-emerald-300',
    meta: t('record.recReadyMeta', { defaultValue: 'Capture stores locally first' }),
  };

  if (!pinEnabled) {
    primaryRecommendation = {
      eyebrow: t('record.recPinEyebrow', { defaultValue: 'Security first' }),
      title: t('record.recPinTitle', { defaultValue: 'Set a PIN before you rely on this' }),
      description: t('record.recPinDesc', { defaultValue: 'A PIN helps keep recordings locked if someone gets access to your phone while you are under stress.' }),
      ctaLabel: t('record.recPinCta', { defaultValue: 'Set PIN' }),
      onClick: () => setShowPinSetup(true),
      accentClasses: 'border-amber-400/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15',
      iconWrap: 'border-amber-400/20 bg-amber-500/10',
      iconColor: 'text-amber-300',
      meta: t('record.recPinMeta', { defaultValue: 'Recommended before first use' }),
    };
  } else if (!backupReady) {
    primaryRecommendation = {
      eyebrow: t('record.recBackupEyebrow', { defaultValue: 'Backup next' }),
      title: t('record.recBackupTitle', { defaultValue: 'Turn on encrypted backup' }),
      description: t('record.recBackupDesc', { defaultValue: 'Your recordings stay on-device by default. Add encrypted backup so you are not relying on one phone.' }),
      ctaLabel: t('record.recBackupCta', { defaultValue: 'Set up backup' }),
      onClick: () => {
        setBackupSettingsTab('google_drive');
        setShowBackupSettings(true);
      },
      accentClasses: 'border-blue-400/25 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15',
      iconWrap: 'border-blue-400/20 bg-blue-500/10',
      iconColor: 'text-blue-300',
      meta: t('record.recBackupMeta', { defaultValue: 'Local-first, cloud when you choose it' }),
    };
  } else if (pendingBackupCount > 0) {
    primaryRecommendation = {
      eyebrow: t('record.recPendingEyebrow', { defaultValue: 'Follow up' }),
      title: t('record.recPendingTitle', { count: pendingBackupCount, defaultValue: pendingBackupCount === 1 ? '1 item waiting for backup' : `${pendingBackupCount} items waiting for backup` }),
      description: t('record.recPendingDesc', { defaultValue: 'You already marked evidence for backup. Open backup settings to confirm providers and keep things moving.' }),
      ctaLabel: t('record.recPendingCta', { defaultValue: 'Review backup' }),
      onClick: () => {
        setBackupSettingsTab('google_drive');
        setShowBackupSettings(true);
      },
      accentClasses: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15',
      iconWrap: 'border-cyan-400/20 bg-cyan-500/10',
      iconColor: 'text-cyan-300',
      meta: t('record.recPendingMeta', { defaultValue: 'Pending items stay encrypted locally' }),
    };
  } else if (vaultRecordings.length === 0) {
    primaryRecommendation = {
      eyebrow: t('record.recPracticeEyebrow', { defaultValue: 'First run' }),
      title: t('record.recPracticeTitle', { defaultValue: 'Do one dry run before you need this' }),
      description: t('record.recPracticeDesc', { defaultValue: 'A short test recording helps you confirm permissions, storage, and backup while things are calm.' }),
      ctaLabel: t('record.recPracticeCta', { defaultValue: 'Open guide' }),
      onClick: () => setShowWorkflowGuide(true),
      accentClasses: 'border-red-400/25 bg-red-500/10 text-red-100 hover:bg-red-500/15',
      iconWrap: 'border-red-400/20 bg-red-500/10',
      iconColor: 'text-red-300',
      meta: t('record.recPracticeMeta', { defaultValue: 'Best done before an emergency' }),
    };
  }

  const scrollToVault = async ({ recording = null, preferPending = false } = {}) => {
    const targetRecording = recording || (preferPending
      ? vaultRecordings.find((item) => item.markedForBackup && !item.backedUp)
      : null);

    if (targetRecording) {
      await selectVaultItem(targetRecording);
      scrollToElement(vaultRowRefs.current[targetRecording.id] || vaultSectionRef.current, {
        topPadding: getShellAwareTopPadding(10, 92),
        bottomPadding: 144,
        preferCenterIfFits: true,
      });
      return;
    }

    scrollToElement(vaultSectionRef.current, {
      topPadding: getShellAwareTopPadding(10, 92),
      bottomPadding: 144,
    });
  };

  // BACKUP handler
  const handleToggleBackup = async (id, currentState) => {
    try {
      const newState = !currentState;
      await markForBackup(id, newState);
      await loadVault();

      // If marking FOR backup, immediately queue and start upload
      if (newState) {
        const queue = await initQueueFromSettings();
        if (queue) {
          const providers = queue.getActiveProviders();
          for (const provider of providers) {
            await queue.addToQueue(id, provider);
          }
        }
      }
    } catch (err) {
      console.error('Backup toggle error:', err);
    }
  };

  // PURGE ALL DATA handler
  const handlePurgeAllData = async () => {
    setIsPurging(true);
    try {
      // Revoke any active blob URLs
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (selectedVaultItem?.url) URL.revokeObjectURL(selectedVaultItem.url);

      // Clear all recordings from IndexedDB
      await clearAllRecordings();

      // Reset state
      setRecordedUrl(null);
      setRecordedBlob(null);
      setAudioUrl(null);
      setVaultRecordings([]);
      setSelectedVaultItem(null);
      setPurgeAcknowledged(false);
      setShowPurgeConfirm(false);
    } catch (err) {
      console.error('Purge error:', err);
      setError(t('record.failedPurge'));
    } finally {
      setIsPurging(false);
    }
  };

  // PIN gate: show inline PinEntry when authentication is needed
  if (needsPin) {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4 pt-3">
        <PinEntry
          onUnlock={handleRecordUnlock}
          inline
          title={t('record.vaultLocked')}
          subtitle={t('record.vaultLockedSubtitle')}
        />
      </div>
    );
  }

  // Loading state while checking access
  if (!recordUnlocked) {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4 pt-3 flex items-center justify-center min-h-[40vh]">
        <div className="text-slate-500 text-sm">{t('record.loading')}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-3 page-transition-in page-section-stagger">
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <section className="relative overflow-hidden rounded-[32px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/80 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.95)] page-section-item">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-red-400/35 to-transparent" />
        <div className="pointer-events-none absolute -top-20 right-0 h-52 w-52 rounded-full bg-red-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 86%)' }} />

        <div className="relative xl:grid xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] xl:items-start xl:gap-4">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-red-300/80 scenario-fade-in" style={aniDelay(0.06)}>
              {t('record.captureNowEyebrow')}
            </p>

            <div className="mb-4 flex flex-col items-center gap-3 text-center xl:flex-row xl:items-start xl:text-left scenario-rise-in" style={aniDelay(0.18)}>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 shadow-[0_0_28px_rgba(239,68,68,0.18)]">
                <VideoCamera size={30} weight="bold" />
              </div>
              <h1 className="max-w-3xl text-[2rem] font-black text-white sm:text-[2.75rem] xl:text-left">
                {t('record.title')}
              </h1>
            </div>

            <p className="max-w-3xl text-base leading-[1.6] text-slate-300 sm:text-[1.05rem] scenario-fade-in" style={aniDelay(0.32)}>
              {t('record.subtitle')}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-[1.6] text-slate-400 scenario-fade-in" style={aniDelay(0.44)}>
              {t('record.heroSupport', { defaultValue: 'Capture first. Organize, protect, and back up after the moment passes. Record keeps evidence local by default and lets you decide what leaves the device.' })}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 xl:justify-start scenario-fade-in" style={aniDelay(0.56)}>
              {privacyEnabled && (
                <button
                  onClick={() => {
                    sessionStorage.setItem('faqScrollTarget', 'privacy');
                    onNavigate('faq');
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300 transition-colors hover:bg-emerald-500/15"
                  title={t('record.metadataStrippingActive')}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <EyeSlash size={13} weight="bold" />
                  {t('record.private')}
                </button>
              )}
              <button
                onClick={() => setShowPinSetup(true)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  pinEnabled
                    ? 'border-green-500/20 bg-green-500/10 text-green-300 hover:bg-green-500/15'
                    : 'border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${pinEnabled ? 'bg-green-400' : 'bg-amber-400'}`} />
                <Lock size={13} weight="bold" />
                PIN
              </button>
              <button
                onClick={() => { setBackupSettingsTab('google_drive'); setShowBackupSettings(true); }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  backupReady
                    ? 'border-blue-500/20 bg-blue-500/10 text-blue-300 hover:bg-blue-500/15'
                    : 'border-slate-600/50 bg-slate-700/40 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${backupReady ? 'bg-blue-400' : 'bg-slate-400'}`} />
                <Cloud size={13} weight="bold" />
                {backupReady ? t('record.backupReady') : t('record.backup')}
              </button>
              <button
                onClick={() => setShowWorkflowGuide(true)}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200 transition-colors hover:bg-cyan-500/15"
              >
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                <Question size={13} weight="bold" />
                {t('record.howRecordingWorks')}
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row xl:justify-start scenario-rise-in" style={aniDelay(0.68)}>
              <button
                onClick={() => handleOpenVideoCapture({ scrollTarget: 'preview' })}
                disabled={quickCaptureDisabled}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/50 bg-gradient-to-r from-red-600 to-red-700 px-6 py-3.5 text-sm font-black uppercase tracking-widest text-white transition-all shadow-[0_12px_32px_rgba(127,29,29,0.35)] hover:from-red-500 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <VideoCamera size={18} weight="bold" />
                <span>{t('record.startVideoRecording')}</span>
              </button>
              <button
                onClick={handleOpenAudioCapture}
                disabled={quickCaptureDisabled}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-6 py-3.5 text-sm font-bold text-white transition-all shadow-[0_10px_24px_rgba(15,23,42,0.28)] hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Microphone size={18} weight="bold" className="text-blue-300" />
                <span>{t('record.startAudioRecording')}</span>
              </button>
              <button
                onClick={handleOpenImport}
                disabled={quickCaptureDisabled}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-sm font-bold text-slate-200 transition-all hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <UploadSimple size={18} weight="bold" className="text-cyan-300" />
                <span>{t('record.tabImport')}</span>
              </button>
            </div>

            {!pinEnabled && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-amber-400/80 xl:justify-start">
                <Lock size={12} weight="bold" />
                {t('record.pinWarning')}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:mt-0 xl:h-full scenario-rise-in" style={aniDelay(0.46)}>
            {showPrimaryRecommendation && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/65">
                      {primaryRecommendation.eyebrow}
                    </p>
                    <h2 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl">
                      {primaryRecommendation.title}
                    </h2>
                    <p className="mt-2 max-w-[34ch] text-sm leading-[1.62] text-slate-300">
                      {primaryRecommendation.description}
                    </p>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${primaryRecommendation.iconWrap}`}>
                    <Shield size={20} weight="bold" className={primaryRecommendation.iconColor} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
                    {primaryRecommendation.meta}
                  </span>
                  <button
                    type="button"
                    onClick={primaryRecommendation.onClick}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${primaryRecommendation.accentClasses}`}
                  >
                    {primaryRecommendation.ctaLabel}
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {showReadinessSection && (
                <motion.div
                  key="record-readiness"
                  initial={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.32, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.07] via-slate-950/90 to-slate-900/90 px-4 py-4 text-left shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300">
                          {t('record.readinessEyebrow', { defaultValue: 'Recording readiness' })}
                        </p>
                        <p className="mt-1 max-w-[34ch] text-sm leading-[1.62] text-slate-300">
                          {t('record.readinessSupportText', { defaultValue: 'Finish the basics once so this screen is calmer when you are under pressure.' })}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/80">
                        {setupReadyCount}/{setupItems.length}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.14em]">
                        <span className="text-white/85">
                          {t('record.readinessProgressLabel', { ready: setupReadyCount, total: setupItems.length, defaultValue: `${setupReadyCount}/${setupItems.length} essentials complete` })}
                        </span>
                        <span className="text-amber-300">
                          {t('record.readinessLeft', { count: setupItems.length - setupReadyCount, defaultValue: setupItems.length - setupReadyCount === 1 ? '1 item left' : `${setupItems.length - setupReadyCount} items left` })}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 transition-all duration-500"
                          style={{ width: `${setupProgressPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {setupItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3 text-left transition-all hover:border-white/20 hover:bg-slate-950/60"
                        >
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                              {item.label}
                            </p>
                            <p className={`mt-1 text-xs font-black uppercase tracking-[0.14em] ${item.ready ? 'text-emerald-300' : 'text-amber-300'}`}>
                              {item.status}
                            </p>
                          </div>
                          <CheckCircle size={16} weight="bold" className={item.ready ? 'text-emerald-300' : 'text-slate-500'} />
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950/85 via-slate-950/70 to-slate-900/80 px-4 py-3 shadow-[0_14px_30px_rgba(2,6,23,0.12)] sm:py-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                {t('record.storageTrustEyebrow', { defaultValue: 'Storage behavior' })}
              </p>
              <p className="mt-1 max-w-[44ch] text-[13px] leading-[1.62] text-slate-300 sm:text-sm">
                {t('record.storageTrustIntro', { defaultValue: 'Recordings save to your encrypted local vault first. Backup only happens when you set it up or mark items for cloud protection.' })}
              </p>
            </div>

            <div className="hidden flex-1 xl:flex">
              <div className="relative flex h-full min-h-[212px] w-full flex-col justify-between overflow-hidden rounded-[28px] border border-slate-800/70 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.8),rgba(2,6,23,0.92))] px-5 py-4 shadow-[0_16px_34px_rgba(2,6,23,0.16)]">
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
                <div className="pointer-events-none absolute -bottom-14 right-0 h-32 w-32 rounded-full bg-cyan-500/8 blur-3xl" />

                <div className="relative flex items-start justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200/60">
                    {t('record.desktopQuoteEyebrow', { defaultValue: 'Quote library' })}
                  </p>
                  <span className="rounded-full border border-white/10 bg-slate-950/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65">
                    {desktopQuoteIndex + 1}/{RECORD_DESKTOP_QUOTES.length}
                  </span>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${activeDesktopQuote.author}-${desktopQuoteIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="relative mt-3 flex-1"
                  >
                    <p
                      className="max-w-[28ch] text-[1.02rem] font-medium italic leading-[1.58] tracking-[0.003em] text-slate-400/72"
                      style={{
                        fontFamily: '"Palatino Linotype", "Book Antiqua", "Iowan Old Style", ui-serif, Georgia, serif',
                      }}
                    >
                      “{activeDesktopQuote.quote}”
                    </p>

                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500/85">
                        {activeDesktopQuote.theme}
                      </p>
                      <p className="mt-1 text-[12px] font-semibold tracking-[0.01em] text-slate-500">
                        {activeDesktopQuote.author}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="relative mt-3 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    {RECORD_DESKTOP_QUOTES.map((quoteItem, quoteIndex) => (
                      <button
                        key={`${quoteItem.author}-${quoteIndex}`}
                        type="button"
                        onClick={() => setDesktopQuoteIndex(quoteIndex)}
                        className={`h-2.5 rounded-full transition-all ${
                          quoteIndex === desktopQuoteIndex
                            ? 'w-6 bg-cyan-300/75'
                            : 'w-2.5 bg-slate-600/80 hover:bg-slate-500'
                        }`}
                        aria-label={t('record.desktopQuoteJump', {
                          index: quoteIndex + 1,
                          defaultValue: `Show quote ${quoteIndex + 1}`,
                        })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm flex justify-between page-section-item">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline">{t('record.dismiss')}</button>
        </div>
      )}

      <section className="mt-8 mb-8 page-section-item sm:mt-10">
        <RecordSectionHeader
          eyebrow={t('record.captureNowEyebrow')}
          title={t('record.captureNowTitle')}
          description={t('record.captureNowDesc')}
          accent="text-red-400"
        />
        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-[24px] border border-red-500/20 bg-gradient-to-br from-red-500/[0.10] via-slate-950/90 to-slate-900/85 p-4 shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-300">
                  {t('record.capturePrimaryEyebrow', { defaultValue: 'Start here' })}
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-white">
                  {t('record.capturePrimaryTitle', { defaultValue: 'Choose the fastest safe capture path' })}
                </h3>
                <p className="mt-2 max-w-[38ch] text-sm leading-[1.62] text-slate-300">
                  {t('record.capturePrimaryDesc', { defaultValue: 'Video is best when you need a full visual record. Audio is lower profile. Import keeps outside clips in the same protected vault.' })}
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                <VideoCamera size={22} weight="bold" className="text-red-300" />
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => handleOpenVideoCapture({ scrollTarget: 'preview' })}
                disabled={quickCaptureDisabled}
                className="rounded-2xl border border-red-500/30 bg-red-500/12 px-4 py-4 text-left transition-all hover:bg-red-500/16 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <VideoCamera size={20} weight="bold" className="text-red-300" />
                <p className="mt-3 text-[15px] font-black leading-snug tracking-[0.01em] text-white">
                  {t('record.captureVideoLabel', { defaultValue: 'Video now' })}
                </p>
                <p className="mt-1 text-[13px] leading-[1.55] text-slate-300">
                  {t('record.captureVideoSupport', { defaultValue: 'Best for documenting people, vehicles, and context.' })}
                </p>
              </button>
              <button
                type="button"
                onClick={handleOpenAudioCapture}
                disabled={quickCaptureDisabled}
                className="rounded-2xl border border-blue-500/25 bg-blue-500/[0.08] px-4 py-4 text-left transition-all hover:bg-blue-500/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Microphone size={20} weight="bold" className="text-blue-300" />
                <p className="mt-3 text-[15px] font-black leading-snug tracking-[0.01em] text-white">
                  {t('record.captureAudioLabel', { defaultValue: 'Audio only' })}
                </p>
                <p className="mt-1 text-[13px] leading-[1.55] text-slate-300">
                  {t('record.captureAudioSupport', { defaultValue: 'Use when you need a lower-profile recording option.' })}
                </p>
              </button>
              <button
                type="button"
                onClick={handleOpenImport}
                disabled={quickCaptureDisabled}
                className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.08] px-4 py-4 text-left transition-all hover:bg-cyan-500/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <UploadSimple size={20} weight="bold" className="text-cyan-300" />
                <p className="mt-3 text-[15px] font-black leading-snug tracking-[0.01em] text-white">
                  {t('record.captureImportLabel', { defaultValue: 'Import clip' })}
                </p>
                <p className="mt-1 text-[13px] leading-[1.55] text-slate-300">
                  {t('record.captureImportSupport', { defaultValue: 'Bring in media you already captured elsewhere.' })}
                </p>
              </button>
              <button
                type="button"
                onClick={handleOpenDecrypt}
                disabled={quickCaptureDisabled}
                className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-4 text-left transition-all hover:bg-emerald-500/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Key size={20} weight="bold" className="text-emerald-300" />
                <p className="mt-3 text-[15px] font-black leading-snug tracking-[0.01em] text-white">
                  {t('record.tabDecrypt')}
                </p>
                <p className="mt-1 text-[13px] leading-[1.55] text-slate-300">
                  {t('record.captureDecryptSupport', { defaultValue: 'Coming back to open an encrypted clip from another device? Tap decrypt.' })}
                </p>
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <button
              type="button"
              onClick={() => scrollToVault()}
              className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/75 to-slate-900/45 px-4 py-3 text-left transition-colors hover:border-slate-500/70 hover:bg-slate-900/70"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{t('record.captureStorageLabel')}</p>
              <p className="mt-2 text-[13px] leading-[1.58] text-slate-200 sm:text-sm">{t('record.captureStorageValue')}</p>
            </button>
            <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/75 to-slate-900/45 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{t('record.captureBackupLabel')}</p>
              <p className="mt-2 text-[13px] leading-[1.58] text-slate-200 sm:text-sm">
                {backupReady ? t('record.captureBackupReady') : t('record.captureBackupSetup')}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/75 to-slate-900/45 px-4 py-3 sm:col-span-2 lg:col-span-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {t('record.captureWitnessLabel', { defaultValue: 'Witness mode' })}
                  </p>
                  <p className="mt-2 text-[13px] leading-[1.58] text-slate-200 sm:text-sm">
                    {witnessMode
                      ? t('record.captureWitnessActive', { defaultValue: 'Witness guidance is on. The checklist stays pinned near capture so you can document for someone else more clearly.' })
                      : t('record.captureWitnessValue', { defaultValue: 'Use witness mode when you are documenting for someone else. It keeps the reminder checklist close to the camera controls.' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleWitnessModeToggle}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] transition-colors ${
                    witnessMode
                      ? 'border-teal-500/40 bg-teal-500/12 text-teal-200 hover:bg-teal-500/18'
                      : 'border-slate-600/60 bg-slate-900/70 text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <Eye size={13} weight="bold" />
                  {witnessMode
                    ? t('record.witnessModeOn', { defaultValue: 'On' })
                    : t('record.witnessModeOff', { defaultValue: 'Turn on' })}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleWitnessModeToggle}
                  className="inline-flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-teal-100 transition-colors hover:bg-teal-500/15"
                >
                  <Eye size={14} weight="bold" />
                  {witnessMode
                    ? t('record.witnessModeReady', { defaultValue: 'Witness guide active' })
                    : t('record.witnessModeStart', { defaultValue: 'Prepare witness capture' })}
                </button>
                {witnessMode && (
                  <button
                    type="button"
                    onClick={handleOpenAudioCapture}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-600/60 bg-slate-900/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-200 transition-colors hover:bg-slate-800/80"
                  >
                    <Microphone size={14} weight="bold" />
                    {t('record.witnessAudioOption', { defaultValue: 'Use audio instead' })}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-2 sm:justify-start">
        {[
          { id: 'video', label: t('record.tabVideo'), icon: VideoCamera },
          { id: 'audio', label: t('record.tabAudio'), icon: Microphone },
          { id: 'import', label: t('record.tabImport'), icon: UploadSimple },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'video') {
                setActiveTab('video');
                scrollToCaptureRef(videoCaptureRef, {
                  topPadding: getVideoPreviewTopPadding(),
                  bottomPadding: 116,
                });
                return;
              }

              stopCamera();
              setActiveTab(tab.id);
              scrollToCaptureRef(tab.id === 'audio' ? audioCaptureRef : importCaptureRef, tab.id === 'audio'
                ? { topPadding: getAudioPreviewTopPadding(), bottomPadding: 116 }
                : { topPadding: getShellAwareTopPadding(16, 118), bottomPadding: 118 });
            }}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.16em] transition-colors backdrop-blur-sm ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white border border-blue-500/50'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
            }`}
          >
            <tab.icon size={16} weight="bold" />
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setShowWorkflowGuide(true)}
          className="flex items-center gap-1.5 rounded-full border border-slate-600/50 bg-slate-700/50 px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors backdrop-blur-sm hover:bg-slate-700"
          title={t('record.howRecordingWorks')}
          aria-label={t('record.howRecordingWorks')}
        >
          <Question size={16} weight="bold" />
          <span className="hidden sm:inline">{t('record.howRecordingWorks')}</span>
        </button>
        </div>

        {/* VIDEO TAB */}
        {activeTab === 'video' && (
        <div className="space-y-4">
          <div ref={videoCaptureRef} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50">
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {/* Live camera preview — always in DOM so startCamera() can set srcObject.
                  Hidden via CSS (not unmounted) when not active. */}
              <video
                ref={videoRef}
                muted
                playsInline
                className={`w-full h-full object-cover ${cameraActive && !recordedUrl ? '' : 'hidden'}`}
              />

              {/* Recorded video playback — separate element, conditionally rendered.
                  Safari can't transition a single element from srcObject→src, so we use
                  a fresh element that has never had srcObject set on it. */}
              {recordedUrl && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black p-4">
                  <video
                    ref={playbackRef}
                    controls
                    playsInline
                    preload="auto"
                    className="w-full max-h-[70%] object-contain"
                    onError={(e) => {
                      console.error('Video playback error:', e.target.error);
                      setError(t('record.videoPreviewUnavailable'));
                    }}
                  />
                  {/* Save/Share button */}
                <button
                  onClick={async () => {
                    if (!recordedBlob) return;

                    const blobType = recordedBlob.type || 'video/webm';
                    const fileExt = blobType.includes('mp4') ? 'mp4' : 'webm';
                    const fnPrefix = witnessMode ? 'WitnessReport' : 'SafeNeighbor';
                    const filename = `${fnPrefix}_${Date.now()}.${fileExt}`;
                    const mimeType = blobType;

                    // Only use Web Share API on mobile (desktop Safari opens unhelpful share sheet)
                    if (isMobileDevice() && navigator.share && navigator.canShare) {
                      try {
                        const file = new File([recordedBlob], filename, { type: mimeType });
                        if (navigator.canShare({ files: [file] })) {
                          await navigator.share({
                            files: [file],
                            title: 'SafeNeighbor Recording'
                          });
                          return; // Success, exit early
                        }
                      } catch (err) {
                        if (err.name === 'AbortError') return; // User cancelled
                        // Fall through to download
                      }
                    }

                    // Download fallback for desktop browsers
                    const url = URL.createObjectURL(recordedBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }, 100);
                  }}
                  className="mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                >
                  <DownloadSimple size={16} weight="bold" />
                  {isMobileDevice() ? t('record.saveToPhotos') : t('record.download')}
                </button>
                  <p className="text-slate-400 text-xs mt-2">
                    {isMobileDevice() ? t('record.saveToPhotosHint') : t('record.downloadHint')}
                  </p>
                </div>
              )}

              {!cameraActive && !recordedUrl && (
                <div className="text-center p-6">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera size={36} weight="bold" className="text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm mb-4">{t('record.chooseRecord')}</p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={startCamera}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                      {t('record.inAppCamera')}
                    </button>
                    <label className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors cursor-pointer">
                      {t('record.nativeCamera')}
                      <input
                        type="file"
                        accept="video/*"
                        capture="environment"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUsedNativeCamera(true);
                            const url = URL.createObjectURL(file);
                            const videoDuration = await getVideoDuration(file);
                            setRecordedBlob(file);
                            setRecordedUrl(url);
                            const thumbnail = await generateThumbnail(file);
                            await saveToVault(file, videoDuration, 'video', thumbnail);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <p className="text-slate-500 text-xs">{t('record.nativeCameraHint')}</p>
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-4 start-4 flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">REC {fmt(duration)}</span>
                </div>
              )}

              {cameraActive && !isRecording && !recordedUrl && (
                <div className="absolute top-4 start-4 flex items-center gap-2 bg-green-600 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  <span className="text-white text-sm font-medium">LIVE</span>
                </div>
              )}

              {/* Camera flip button */}
              {cameraActive && !isRecording && (
                <button
                  onClick={flipCamera}
                  className="absolute top-4 end-4 bg-slate-900/70 hover:bg-slate-800 p-2.5 rounded-full transition-colors"
                  title={facingMode === 'environment' ? 'Switch to front camera' : 'Switch to rear camera'}
                >
                  <CameraRotate size={20} weight="bold" className="text-white" />
                </button>
              )}
            </div>

            <div className="p-4">
              {!isRecording && !recordedUrl && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Eye size={14} weight="bold" className={witnessMode ? 'text-teal-300' : 'text-slate-500'} />
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
                        {t('record.witnessMode')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {witnessMode
                          ? t('record.witnessModeLive', { defaultValue: 'Saved as a witness report with the guidance checklist active.' })
                          : t('record.witnessModeHint', { defaultValue: 'Turn this on before recording when you are documenting for someone else.' })}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleWitnessModeToggle}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors ${
                      witnessMode
                        ? 'border-teal-500/40 bg-teal-500/12 text-teal-100 hover:bg-teal-500/18'
                        : 'border-slate-600/60 bg-slate-900/70 text-slate-200 hover:bg-slate-800/80'
                    }`}
                  >
                    <Eye size={12} weight="bold" />
                    {witnessMode
                      ? t('record.turnOff', { defaultValue: 'Turn off' })
                      : t('record.turnOn', { defaultValue: 'Turn on' })}
                  </button>
                </div>
              )}

              {cameraActive && !recordedUrl && (
                <button
                  onClick={isRecording ? stopVideoRecording : startVideoRecording}
                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                    isRecording ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isRecording ? <Stop size={20} weight="bold" /> : <VideoCamera size={20} weight="bold" />}
                  {isRecording ? t('record.stopRecording') : t('record.startVideoRecording')}
                </button>
              )}

              {recordedUrl && (
                <div className="flex gap-2">
                  <button onClick={recordMore} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                    <VideoCamera size={16} weight="bold" /> {t('record.recordMore')}
                  </button>
                  <button onClick={deleteCurrentRecording} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                    <Trash size={16} weight="bold" /> {t('record.delete')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {witnessMode && showWitnessReminder && (
            <div className="rounded-[24px] border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.10] via-slate-950/92 to-slate-900/90 p-4 shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-teal-300">
                    {t('record.witnessReminderTitle')}
                  </p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-white">
                    {t('record.witnessGuideTitle', { defaultValue: 'Document what happened to someone else' })}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                    {t('record.witnessGuideDesc', { defaultValue: 'Stay at a safe distance, narrate only what you can directly observe, and use this checklist so the recording is useful later.' })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-slate-950/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-100">
                    <CheckCircle size={12} weight="bold" />
                    {t('record.witnessProgress', { defaultValue: `${witnessChecklistCompleteCount}/${WITNESS_CHECKLIST_COUNT} captured` })}
                  </span>
                  <button
                    type="button"
                    onClick={handleWitnessModeToggle}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-600/60 bg-slate-900/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-slate-800/80"
                  >
                    <X size={12} weight="bold" />
                    {t('record.turnOff', { defaultValue: 'Turn off' })}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 lg:grid-cols-2">
                {witnessChecklistItems.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleWitnessChecklistToggle(index)}
                    className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                      witnessChecklist[index]
                        ? 'border-teal-500/35 bg-teal-500/10 text-teal-50'
                        : 'border-white/10 bg-slate-950/45 text-slate-200 hover:border-teal-500/20 hover:bg-slate-950/60'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      witnessChecklist[index]
                        ? 'border-teal-300 bg-teal-400/20 text-teal-100'
                        : 'border-slate-500 text-transparent'
                    }`}>
                      <CheckCircle size={12} weight="bold" />
                    </span>
                    <span className={`text-sm leading-relaxed ${witnessChecklist[index] ? 'line-through text-slate-300/90' : ''}`}>
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && (
        <div ref={audioCaptureRef} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          {/* High fidelity visualizer */}
          <div className="h-40 flex items-center justify-center gap-[2px] mb-4 bg-slate-800 rounded-lg p-4 overflow-hidden">
            {audioLevels.map((level, i) => {
              const normalizedLevel = level / 255;
              const height = Math.max(4, normalizedLevel * 100);
              return (
                <div
                  key={i}
                  className="w-1.5 rounded-full transition-all duration-[50ms] ease-out"
                  style={{ 
                    height: `${height}%`,
                    background: `linear-gradient(to top, #3b82f6, #60a5fa, #93c5fd)`,
                    opacity: 0.6 + normalizedLevel * 0.4,
                    transform: `scaleY(${0.3 + normalizedLevel * 0.7})`
                  }}
                />
              );
            })}
          </div>

          {/* Mic active indicator */}
          {isRecordingAudio && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Microphone size={16} weight="bold" className="text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">{t('record.micActive')}</span>
            </div>
          )}

          {/* Duration display */}
          <div className="text-center mb-4">
            <span className="text-3xl font-mono text-white">{fmt(isRecordingAudio ? audioDuration : audioDuration)}</span>
          </div>

          {/* Audio playback */}
          {audioUrl && <audio src={audioUrl} controls className="w-full mb-4" />}

          {/* Record button - only show when no recorded audio */}
          {!audioUrl && (
            <button
              onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${
                isRecordingAudio ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'
              } text-white`}
            >
              {isRecordingAudio ? <Stop size={20} weight="bold" /> : <Microphone size={20} weight="bold" />}
              {isRecordingAudio ? t('record.stopRecording') : t('record.startAudioRecording')}
            </button>
          )}

          {/* Post-recording buttons - RECORD MORE and DELETE */}
          {audioUrl && (
            <div className="flex gap-2">
              <button
                onClick={recordMoreAudio}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Microphone size={16} weight="bold" /> {t('record.recordMore')}
              </button>
              <button
                onClick={deleteCurrentAudio}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Trash size={16} weight="bold" /> {t('record.delete')}
              </button>
            </div>
          )}
        </div>
        )}

        {/* IMPORT TAB */}
        {activeTab === 'import' && (
        <div className="space-y-4">
          {/* Import from Photos */}
          <div ref={importCaptureRef} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen size={32} weight="bold" className="text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('record.importTitle')}</h3>
            <p className="text-slate-400 text-sm mb-4">
              {t('record.importDesc')}
            </p>
            <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center gap-2 cursor-pointer">
              <UploadSimple size={18} weight="bold" /> {t('record.selectVideoImport')}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setError(null);
                    try {
                      const url = URL.createObjectURL(file);
                      const videoDuration = await getVideoDuration(file);
                      setRecordedBlob(file);
                      setRecordedUrl(url);
                      const thumbnail = await generateThumbnail(file);
                      await saveToVault(file, videoDuration, 'video', thumbnail, 'imported');
                      setActiveTab('video');
                    } catch (err) {
                      setError(`Import failed: ${err.message}`);
                    }
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <p className="text-slate-500 text-xs mt-4">
              {t('record.importTip')}
            </p>
          </div>

        </div>
        )}
      </section>

      <section className="mb-6 page-section-item">
        <RecordSectionHeader
          eyebrow={t('record.manageEyebrow')}
          title={t('record.manageTitle')}
          description={t('record.manageDesc')}
          accent="text-blue-400"
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)] mb-6">
          <div className="rounded-[26px] border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{t('record.vault')}</p>
                <button
                  type="button"
                  onClick={() => scrollToVault()}
                  className="mt-3 block text-left text-3xl font-black leading-none tracking-[-0.03em] text-white transition-colors hover:text-blue-300"
                >
                  {isDuressMode ? 0 : vaultRecordings.length}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToVault()}
                  className="mt-5 block max-w-[28ch] text-left text-[13px] leading-[1.6] text-slate-400 transition-colors hover:text-slate-200 sm:text-sm"
                >
                  {t('record.manageVaultDesc', { count: backedUpCount, pending: pendingBackupCount })}
                </button>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
                <FolderOpen size={22} weight="bold" className="text-blue-300" />
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => latestRecording && scrollToVault({ recording: latestRecording })}
                className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-left transition-colors hover:border-white/20 hover:bg-slate-950/60"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {t('record.manageLatestLabel', { defaultValue: 'Latest capture' })}
                </p>
                <p className="mt-2 text-[15px] font-semibold leading-snug text-white">
                  {latestRecording ? latestRecording.title : t('record.manageLatestEmpty', { defaultValue: 'Nothing saved yet' })}
                </p>
                <p className="mt-1 text-[13px] leading-[1.55] text-slate-400">
                  {latestRecording
                    ? `${fmt(latestRecording.duration)} • ${fmtB(latestRecording.size)}`
                    : t('record.manageLatestSupport', { defaultValue: 'Your first recording will show up here once it is saved.' })}
                </p>
              </button>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {t('record.manageBackedLabel', { defaultValue: 'Backed up' })}
                </p>
                <p className="mt-2 text-[15px] font-semibold leading-snug text-white">
                  {backedUpCount} {backedUpCount === 1 ? t('record.item', { defaultValue: 'item' }) : t('record.items')}
                </p>
                <p className="mt-1 text-[13px] leading-[1.55] text-slate-400">
                  {backupReady
                    ? t('record.manageBackedSupport', { defaultValue: 'Encrypted copies exist for the items you have already backed up.' })
                    : t('record.manageBackedLocked', { defaultValue: 'Backups stay unavailable until you finish backup setup.' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => scrollToVault({ preferPending: true })}
                className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-left transition-colors hover:border-white/20 hover:bg-slate-950/60"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {t('record.managePendingLabel', { defaultValue: 'Needs attention' })}
                </p>
                <p className="mt-2 text-[15px] font-semibold leading-snug text-white">
                  {pendingBackupCount === 0
                    ? t('record.managePendingClear', { defaultValue: 'Nothing waiting' })
                    : t('record.managePendingCount', { count: pendingBackupCount, defaultValue: pendingBackupCount === 1 ? '1 pending backup' : `${pendingBackupCount} pending backups` })}
                </p>
                <p className="mt-1 text-[13px] leading-[1.55] text-slate-400">
                  {pendingBackupCount === 0
                    ? t('record.managePendingSupport', { defaultValue: 'Mark important items for backup whenever you want cloud protection.' })
                    : t('record.managePendingWarning', { defaultValue: 'These items are still only on this device until backup finishes.' })}
                </p>
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{t('record.manageSecurityTitle')}</p>
              <p className="mt-3 max-w-[34ch] text-sm leading-[1.62] text-slate-300">{t('record.manageSecurityDesc')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setShowPinSetup(true)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[0.95rem] font-semibold transition-colors ${
                    pinEnabled
                      ? 'border-green-500/30 bg-green-600/20 text-green-300 hover:bg-green-600/30'
                      : 'border-amber-500/30 bg-amber-600/20 text-amber-300 hover:bg-amber-600/30'
                  }`}
                >
                  <Lock size={15} weight="bold" />
                  {pinEnabled ? t('record.pinIO') : t('record.setPin')}
                </button>
                <button
                  onClick={() => setShowWorkflowGuide(true)}
                  className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/40 px-3 py-2 text-[0.95rem] font-semibold text-slate-200 transition-colors hover:bg-slate-700"
                >
                  <Question size={15} weight="bold" />
                  {t('record.howRecordingWorks')}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{t('record.manageBackupTitle')}</p>
              <p className="mt-3 max-w-[34ch] text-sm leading-[1.62] text-slate-300">{backupReady ? t('record.manageBackupReadyDesc') : t('record.manageBackupSetupDesc')}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  onClick={() => setShowBackupSettings(true)}
                  className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-600/20 px-2 py-2 text-[0.9rem] font-semibold tracking-[0.01em] text-blue-300 transition-colors hover:bg-blue-600/30 sm:gap-2 sm:px-3"
                >
                  <Shield size={15} weight="bold" className="shrink-0" />
                  <span className="truncate">{t('record.backup')}</span>
                </button>
                <button
                  onClick={handleOpenDecrypt}
                  className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[0.9rem] font-semibold tracking-[0.01em] transition-colors sm:gap-2 sm:px-3 ${
                    activeTab === 'decrypt'
                      ? 'border-emerald-400/60 bg-emerald-500/25 text-emerald-300'
                      : 'border-emerald-500/50 bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/25 hover:border-emerald-400/60'
                  }`}
                >
                  <Key size={15} weight="bold" className="shrink-0" />
                  <span className="truncate">{t('record.tabDecrypt')}</span>
                </button>
                <button
                  onClick={() => setShowBackupInfo(true)}
                  className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-600/20 px-2 py-2 text-[0.9rem] font-semibold tracking-[0.01em] text-cyan-300 transition-colors hover:bg-cyan-600/30 sm:gap-2 sm:px-3"
                >
                  <Question size={15} weight="bold" className="shrink-0" />
                  <span className="truncate">{t('record.whyBackup')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* DECRYPT TAB */}
      {activeTab === 'decrypt' && (
        <div ref={decryptSectionRef} className="space-y-4">
          {/* Key Status Card */}
          <div className={`rounded-2xl p-4 border ${savedEncryptionKey
            ? 'bg-emerald-900/20 border-emerald-500/30'
            : 'bg-amber-900/20 border-amber-500/30'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                savedEncryptionKey ? 'bg-emerald-900/50' : 'bg-amber-900/50'
              }`}>
                <Key size={20} weight="bold" className={savedEncryptionKey ? 'text-emerald-400' : 'text-amber-400'} />
              </div>
              <div className="flex-1 min-w-0">
                {savedEncryptionKey ? (
                  <>
                    <p className="text-emerald-400 font-bold text-sm">{t('record.encKeysSaved')}</p>
                    <p className="text-slate-400 text-xs mt-1">{t('record.encKeysSavedDesc')}</p>
                  </>
                ) : (
                  <>
                    <p className="text-amber-400 font-bold text-sm">{t('record.noEncKey')}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {t('record.noEncKeyDesc')}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Manual key input — always visible when no saved key, collapsible when key exists */}
            {!savedEncryptionKey && (
              <div className="mt-3">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-1.5">
                  {t('record.pasteEncKey')}
                </label>
                <textarea
                  value={decryptKeyInput}
                  onChange={(e) => setDecryptKeyInput(e.target.value)}
                  placeholder='Paste the key from your "SafeNeighbor Backup Encryption Key" email...'
                  className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 text-green-400 text-xs font-mono placeholder:text-slate-600 resize-none focus:outline-none focus:border-emerald-500/50"
                  rows={3}
                />
                {decryptKeyInput.trim() && (
                  <p className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1">
                    <CheckCircle size={12} weight="bold" />
                    {t('record.keyEnteredHint')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Decrypt action card */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} weight="bold" className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('record.decryptTitle')}</h3>
            <p className="text-slate-400 text-sm mb-4">
              {t('record.decryptDesc')}
            </p>
            <label className={`bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
              isRestoring || (!savedEncryptionKey && !decryptKeyInput.trim()) ? 'opacity-50 pointer-events-none' : ''
            }`}>
              <Shield size={18} weight="bold" />
              {isRestoring ? t('record.decrypting') : t('record.selectEncFile')}
              <input
                type="file"
                accept=".enc"
                className="hidden"
                disabled={isRestoring || (!savedEncryptionKey && !decryptKeyInput.trim())}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await restoreEncryptedFile(file);
                  }
                  e.target.value = '';
                }}
              />
            </label>
            {!savedEncryptionKey && !decryptKeyInput.trim() && (
              <p className="text-amber-400/70 text-xs mt-3">
                {t('record.pasteKeyHint')}
              </p>
            )}
          </div>

          {/* Cross-device recovery guide */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <ClipboardText size={18} weight="bold" className="text-slate-400" />
              {t('record.recoveryTitle')}
            </h3>
            <p className="text-slate-400 text-sm mb-3">
              {t('record.recoveryDesc')}
            </p>
            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold text-sm mt-0.5">1.</span>
                <p className="text-slate-300 text-sm">{t('record.recoveryStep1')}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold text-sm mt-0.5">2.</span>
                <p className="text-slate-300 text-sm">{t('record.recoveryStep2')}</p>
              </div>
            </div>
            <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3">
              <p className="text-amber-400 text-xs font-semibold mb-1">{t('record.recoveryWarningTitle')}</p>
              <p className="text-slate-400 text-xs">
                {t('record.recoveryWarningDesc')}
              </p>
            </div>
          </div>

          {/* How it works workflow */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <Question size={18} weight="bold" className="text-slate-400" />
              {t('record.howItWorksTitle')}
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-400 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t('record.step1Title')}</p>
                  <p className="text-slate-400 text-xs">{t('record.step1Desc')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-400 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t('record.step2Title')}</p>
                  <p className="text-slate-400 text-xs">{t('record.step2Desc')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-400 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t('record.step3Title')}</p>
                  <p className="text-slate-400 text-xs">{t('record.step3Desc')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-emerald-400 text-xs font-bold">4</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t('record.step4Title')}</p>
                  <p className="text-slate-400 text-xs">{t('record.step4Desc')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-green-400 text-xs font-bold">5</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t('record.step5Title')}</p>
                  <p className="text-slate-400 text-xs">{t('record.step5Desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VAULT */}
      <div ref={vaultSectionRef} className="mt-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2"><FolderOpen size={18} weight="bold" /> {t('record.vault')}</h3>
          <button
            type="button"
            onClick={() => scrollToVault()}
            className="text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            {isDuressMode ? 0 : vaultRecordings.length} {t('record.items')}
          </button>
        </div>

        {encounterAttachmentIntent && !isDuressMode && (
          <div className="mx-4 mt-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-blue-300">
                  {t('record.attachToEncounterTitle', { defaultValue: 'Attach evidence to active encounter log' })}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  {t('record.attachToEncounterDesc', { defaultValue: 'Choose a vault recording below and send it back into the encounter log as a linked evidence attachment.' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearEncounterAttachmentLaunchIntent();
                  setEncounterAttachmentIntent(null);
                }}
                className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white"
              >
                {t('record.cancelAttachToEncounter', { defaultValue: 'Cancel' })}
              </button>
            </div>
          </div>
        )}

      {/* Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-modal-frame">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => { setPurgeAcknowledged(false); setShowPurgeConfirm(false); }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="safe-modal-panel bg-slate-800 border border-red-600 rounded-xl p-6 max-w-sm w-full relative"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Warning size={32} weight="bold" className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('record.purgeConfirmTitle')}</h3>
              <p className="text-slate-400 text-sm mb-4">
                {t('record.purgeConfirmDesc', { count: vaultRecordings.length })}
              </p>
              <button
                type="button"
                onClick={() => setPurgeAcknowledged((current) => !current)}
                className={`mb-4 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                  purgeAcknowledged
                    ? 'border-red-500/40 bg-red-500/10 text-red-100'
                    : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-900/80'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded border ${purgeAcknowledged ? 'border-red-400 bg-red-500/20 text-red-200' : 'border-slate-500 text-transparent'}`}>
                  <CheckCircle size={13} weight="bold" />
                </span>
                <span className="text-sm leading-relaxed">
                  {t('record.purgeAcknowledge', { defaultValue: 'I understand this deletes every local recording on this device.' })}
                </span>
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setPurgeAcknowledged(false); setShowPurgeConfirm(false); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  {t('record.cancel')}
                </button>
                <button
                  onClick={handlePurgeAllData}
                  disabled={isPurging || !purgeAcknowledged}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg transition-colors"
                >
                  {isPurging ? t('record.purging') : t('record.deleteAll')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

        <div className="divide-y divide-slate-700">
          {/* Show empty state in duress mode to hide real recordings */}
          {(isDuressMode || vaultRecordings.length === 0) ? (
            <div className="p-6">
              <div className="rounded-2xl border border-dashed border-slate-700/70 bg-slate-950/35 px-5 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/80">
                  <FolderOpen size={24} weight="bold" className="text-slate-400" />
                </div>
                <p className="mt-4 text-base font-bold text-white">{t('record.noRecordings')}</p>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
                  {t('record.vaultEmptySupport', { defaultValue: 'New recordings, audio captures, and imported clips will appear here. Keep only what matters and mark important items for backup when you are ready.' })}
                </p>
                {!isDuressMode && (
                  <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleOpenVideoCapture}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-100 transition-colors hover:bg-red-500/15"
                    >
                      <VideoCamera size={16} weight="bold" />
                      {t('record.startVideoRecording')}
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenImport}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800/80"
                    >
                      <UploadSimple size={16} weight="bold" />
                      {t('record.tabImport')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            vaultRecordings.map(rec => (
              <div
                key={rec.id}
                ref={(element) => {
                  if (element) {
                    vaultRowRefs.current[rec.id] = element;
                  } else {
                    delete vaultRowRefs.current[rec.id];
                  }
                }}
              >
                {/* Recording row */}
                <div className={`p-3 flex items-center gap-3 transition-colors ${selectedVaultItem?.id === rec.id ? 'bg-blue-900/20 border-s-2 border-blue-500' : 'hover:bg-slate-700/30'}`}>
                  <button
                    type="button"
                    onClick={() => selectVaultItem(rec)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="w-16 h-10 rounded overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
                      {rec.thumbnail ? <img src={rec.thumbnail} alt="" className="w-full h-full object-cover" /> : rec.type === 'video' ? <VideoCamera size={16} weight="bold" className="text-red-400" /> : <Microphone size={16} weight="bold" className="text-blue-400" />}
                    </div>
                    {rec.source === 'restored'
                      ? <LockOpen size={14} weight="bold" className="text-emerald-400 shrink-0" title={t('record.decryptedFromBackupTooltip')} />
                      : rec.backedUp
                        ? <Lock size={14} weight="bold" className="text-emerald-400 shrink-0" title={t('record.encryptedBackupExists')} />
                        : <Lock size={14} weight="bold" className="text-amber-400 shrink-0" title={t('record.encryptedLocallyNotBacked')} />
                    }
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm truncate">
                        {rec.title}
                        {rec.source === 'restored' && <span className="ms-1.5 text-emerald-400 text-[10px] font-bold uppercase">{t('record.decrypted')}</span>}
                      </p>
                      <p className="text-slate-500 text-xs">{fmt(rec.duration)} • {fmtB(rec.size)}{rec.source === 'imported' ? ` • ${t('record.imported')}` : ''}</p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleBackup(rec.id, rec.markedForBackup); }}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      rec.backedUp
                        ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                        : rec.markedForBackup
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 border border-slate-600/50'
                    }`}
                    title={rec.backedUp ? `Backed up to: ${[rec.backups?.r2?.backedUp && 'R2', rec.backups?.google_drive?.backedUp && 'Google Drive'].filter(Boolean).join(', ') || 'cloud'}` : rec.markedForBackup ? 'Pending backup' : 'Click to mark for backup'}
                  >
                    {rec.backedUp ? <Cloud size={12} weight="bold" /> : rec.markedForBackup ? <Cloud size={12} weight="bold" /> : <CloudSlash size={12} weight="bold" />}
                    {rec.backedUp ? t('record.backedUp') : rec.markedForBackup ? t('record.pending') : t('record.backupLabel')}
                  </button>
                  {encounterAttachmentIntent && !isDuressMode && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleAttachRecordingToEncounter(rec); }}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30"
                    >
                      <ClipboardText size={12} weight="bold" />
                      {t('record.attachToEncounterCta', { defaultValue: 'Attach' })}
                    </button>
                  )}
                  <span className={`text-xs uppercase px-2 py-1 rounded ${rec.type === 'video' ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'}`}>{rec.type}</span>
                  {rec.template === 'witness-report' && (
                    <span className="text-[10px] uppercase px-2 py-1 rounded bg-teal-600/20 text-teal-400 border border-teal-500/30 font-bold tracking-wider flex items-center gap-1">
                      <Eye size={10} weight="bold" />
                      {t('record.witnessReport')}
                    </span>
                  )}
                </div>

                {/* Inline expanded panel - appears directly below the selected recording */}
                {selectedVaultItem?.id === rec.id && !isDuressMode && (
                  <div className="bg-slate-900/80 border-s-2 border-blue-500 px-4 py-3 space-y-3">
                    {/* Encryption status banner */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      rec.source === 'restored'
                        ? 'bg-emerald-600/15 border border-emerald-500/30 text-emerald-400'
                        : rec.backedUp
                          ? 'bg-emerald-600/15 border border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-600/15 border border-amber-500/30 text-amber-400'
                    }`}>
                      {rec.source === 'restored'
                        ? <><LockOpen size={13} weight="bold" /> {t('record.decryptedFromBackup')}</>
                        : rec.backedUp
                          ? <><Lock size={13} weight="bold" /> {t('record.encryptedInCloud')}</>
                          : <><Lock size={13} weight="bold" /> {t('record.encryptedLocally')}</>
                      }
                    </div>
                    {/* Player */}
                    {selectedVaultItem.url && (
                      selectedVaultItem.type === 'video' ? (
                        <video
                          controls
                          playsInline
                          preload="auto"
                          src={selectedVaultItem.url}
                          className="w-full rounded-lg bg-black max-h-48"
                          key={selectedVaultItem.url}
                          onLoadedData={(e) => { e.target.currentTime = 0.01; }}
                          onError={(e) => {
                            // Fallback: if blob URL fails on Safari, try data URL
                            if (selectedVaultItem.blob && e.target.src?.startsWith('blob:')) {
                              const reader = new FileReader();
                              reader.onload = () => { e.target.src = reader.result; e.target.load(); };
                              reader.readAsDataURL(selectedVaultItem.blob);
                            }
                          }}
                        />
                      ) : (
                        <audio
                          src={selectedVaultItem.url}
                          controls
                          className="w-full"
                        />
                      )
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadRecording(selectedVaultItem); }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors text-sm"
                      >
                        <DownloadSimple size={16} weight="bold" /> {isMobileDevice() ? t('record.save') : t('record.download')}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(selectedVaultItem.id); setSelectedVaultItem(null); }}
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-400 py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 border border-red-500/30 backdrop-blur-sm transition-colors text-sm"
                      >
                        <Trash size={16} weight="bold" /> {t('record.delete')}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (selectedVaultItem.url) URL.revokeObjectURL(selectedVaultItem.url); setSelectedVaultItem(null); }}
                        className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white py-2.5 px-3 rounded-lg flex items-center justify-center border border-slate-600/50 transition-colors text-sm"
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      </section>

      {!isDuressMode && (
        <section className="mt-6 page-section-item">
          <RecordSectionHeader
            eyebrow={t('record.dangerEyebrow')}
            title={t('record.dangerTitle')}
            description={t('record.dangerDesc')}
            accent="text-red-400"
          />

          <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-red-400 font-bold text-sm flex items-center gap-2">
                  <Warning size={16} weight="bold" />
                  {t('record.purgeTitle')}
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {t('record.purgeDesc', { count: vaultRecordings.length })}
                </p>
              </div>
              <button
                onClick={() => { setPurgeAcknowledged(false); setShowPurgeConfirm(true); }}
                disabled={vaultRecordings.length === 0}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Trash size={16} weight="bold" />
                {t('record.purgeAll')}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="mt-6 text-center py-6 border-t border-slate-700 page-section-item">
        <p className="text-slate-400 italic text-sm">{recordQuote.quote}</p>
        <p className="text-slate-500 text-xs mt-2">{recordQuote.author}</p>
      </div>

      {/* FAQ Link */}
      <FaqCta onNavigate={onNavigate} className="mt-3 mb-6 page-section-item" />

      {/* Disclaimer */}
      <div className="mt-2 mb-6 page-section-item">
        <Disclaimer>
          {t('record.disclaimerLine1')}
          <br />{t('record.disclaimerLine2')}
          <br />{t('record.disclaimerLine3')}
          <br />{t('record.disclaimerLine4')}
        </Disclaimer>
      </div>

      {/* Backup Settings Modal */}
      {showBackupSettings && (
        <BackupSettings onClose={() => setShowBackupSettings(false)} defaultTab={backupSettingsTab} />
      )}

      {/* Backup Info Modal */}
      {showBackupInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowBackupInfo(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-slate-700/50 flex flex-col relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <CloudArrowUp size={22} weight="bold" className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">{t('record.whyBackup')}</h2>
              </div>
              <button
                onClick={() => setShowBackupInfo(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Main Message */}
              <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4">
                <h3 className="text-red-400 font-bold text-sm mb-2 flex items-center gap-2">
                  <Shield size={18} weight="bold" />
                  {t('record.protectEvidence')}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {t('record.protectEvidenceDesc')}
                </p>
              </div>

              {/* Cloudflare E2E Encryption */}
              <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-4">
                <h3 className="text-blue-400 font-bold text-sm mb-2 flex items-center gap-2">
                  <Lock size={18} weight="bold" />
                  {t('record.e2eTitle')}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                  {t('record.e2eDesc')}
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle size={16} weight="bold" className="text-green-400 mt-0.5 shrink-0" />
                    <span>{t('record.e2eBullet1')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle size={16} weight="bold" className="text-green-400 mt-0.5 shrink-0" />
                    <span>{t('record.e2eBullet2')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle size={16} weight="bold" className="text-green-400 mt-0.5 shrink-0" />
                    <span>{t('record.e2eBullet3')}</span>
                  </li>
                </ul>
              </div>

              {/* How to Record */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <h3 className="text-slate-300 font-bold text-sm mb-2 flex items-center gap-2">
                  <VideoCamera size={18} weight="bold" className="text-red-400" />
                  {t('record.recordingOnMobile')}
                </h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">1.</span>
                    <span>{t('record.recordingMobile1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold">2.</span>
                    <span>{t('record.recordingMobile2')}</span>
                  </li>
                </ul>
              </div>

              {/* How to Backup */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <h3 className="text-slate-300 font-bold text-sm mb-2 flex items-center gap-2">
                  <Cloud size={18} weight="bold" className="text-cyan-400" />
                  {t('record.setupCloudflare')}
                </h3>
                <ol className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">1.</span>
                    <span>{t('record.cloudflareStep1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">2.</span>
                    <span>{t('record.cloudflareStep2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">3.</span>
                    <span>{t('record.cloudflareStep3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">4.</span>
                    <span>{t('record.cloudflareStep4')}</span>
                  </li>
                </ol>
              </div>

              {/* Google Drive */}
              <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-4">
                <h3 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2">
                  <Cloud size={18} weight="bold" />
                  {t('record.googleDriveTitle')}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                  {t('record.googleDriveDesc')}
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle size={16} weight="bold" className="text-green-400 mt-0.5 shrink-0" />
                    <span>{t('record.googleDriveBullet1')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle size={16} weight="bold" className="text-green-400 mt-0.5 shrink-0" />
                    <span>{t('record.googleDriveBullet2')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-slate-300">
                    <CheckCircle size={16} weight="bold" className="text-green-400 mt-0.5 shrink-0" />
                    <span>{t('record.googleDriveBullet3')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 shrink-0">
              <button
                onClick={() => setShowBackupInfo(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
              >
                {t('record.gotIt')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Record Workflow Guide Modal */}
      {showWorkflowGuide && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 safe-modal-frame transition-opacity duration-100 ${isWorkflowGuideClosing ? 'bg-black/0 opacity-0' : 'feature-modal-backdrop-in bg-black/80 backdrop-blur-sm opacity-100'}`}
          onClick={dismissWorkflowGuide}
        >
          <div
            className={`safe-modal-panel bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl w-full max-w-md overflow-hidden border border-slate-700/50 flex flex-col relative transition-[opacity,transform] duration-150 ease-out ${isWorkflowGuideClosing ? 'opacity-0 translate-y-1.5 scale-[0.986]' : 'feature-modal-panel-in opacity-100 translate-y-0 scale-100'}`}
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="safe-modal-header flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <Shield size={22} weight="bold" className="text-red-400" />
                <h2 className="text-lg font-bold text-white">{t('record.howRecordingWorks')}</h2>
              </div>
              <button
                onPointerDown={dismissWorkflowGuide}
                onClick={dismissWorkflowGuide}
                className="safe-modal-close p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.9] active:bg-slate-700/90 active:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="safe-modal-scroll p-5 overflow-y-auto flex-1 space-y-4">
              {/* Overview */}
              <p className="text-slate-300 text-sm leading-relaxed">
                {t('record.workflowOverview')}
              </p>

              {/* Setup Reminder */}
              <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 space-y-3">
                <h3 className="text-red-400 font-bold text-sm">{t('record.beforeYouStart')}</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => { dismissWorkflowGuide(); setShowPinSetup(true); }}
                    className="w-full flex items-start gap-3 text-start group"
                  >
                    <Lock size={18} weight="bold" className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white text-sm font-semibold group-hover:text-amber-400 transition-colors">{t('record.setupPinTitle')} <span className="text-amber-400 text-xs">{t('record.tapToSetup')}</span></p>
                      <p className="text-slate-400 text-xs">{t('record.setupPinDesc')}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { dismissWorkflowGuide(); setShowBackupSettings(true); }}
                    className="w-full flex items-start gap-3 text-start group"
                  >
                    <Cloud size={18} weight="bold" className="text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white text-sm font-semibold group-hover:text-cyan-400 transition-colors">{t('record.configureBackupTitle')} <span className="text-cyan-400 text-xs">{t('record.tapToConfigure')}</span></p>
                      <p className="text-slate-400 text-xs">{t('record.configureBackupDesc')}</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 1: Capture */}
              <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center shrink-0">
                    <span className="text-blue-400 text-xs font-bold">1</span>
                  </div>
                  <h3 className="text-blue-400 font-bold text-sm">{t('record.wfCaptureTitle')}</h3>
                </div>
                <ul className="space-y-1.5 text-sm text-slate-300 ms-8">
                  <li>{t('record.wfCaptureBullet1')}</li>
                  <li>{t('record.wfCaptureBullet2')}</li>
                  <li>{t('record.wfCaptureBullet3')}</li>
                </ul>
              </div>

              {/* Step 2: Encrypt */}
              <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/30 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 text-xs font-bold">2</span>
                  </div>
                  <h3 className="text-emerald-400 font-bold text-sm">{t('record.wfEncryptTitle')}</h3>
                </div>
                <p className="text-slate-300 text-sm ms-8">
                  {t('record.wfEncryptDesc')}
                </p>
              </div>

              {/* Step 3: Back Up */}
              <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-600/30 flex items-center justify-center shrink-0">
                    <span className="text-cyan-400 text-xs font-bold">3</span>
                  </div>
                  <h3 className="text-cyan-400 font-bold text-sm">{t('record.wfBackupTitle')}</h3>
                </div>
                <p className="text-slate-300 text-sm ms-8 mb-2">
                  {t('record.wfBackupDesc')}
                </p>
                <ul className="space-y-1 text-sm text-slate-300 ms-8">
                  <li>{t('record.wfBackupBullet1')}</li>
                  <li>{t('record.wfBackupBullet2')}</li>
                </ul>
              </div>

              {/* Step 4: Save Your Key */}
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-amber-600/30 flex items-center justify-center shrink-0">
                    <span className="text-amber-400 text-xs font-bold">4</span>
                  </div>
                  <h3 className="text-amber-400 font-bold text-sm">{t('record.wfSaveKeyTitle')}</h3>
                </div>
                <p className="text-slate-300 text-sm ms-8">
                  {t('record.wfSaveKeyDesc')}
                </p>
              </div>

              {/* Step 5: Decrypt */}
              <div className="bg-purple-950/30 border border-purple-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center shrink-0">
                    <span className="text-purple-400 text-xs font-bold">5</span>
                  </div>
                  <h3 className="text-purple-400 font-bold text-sm">{t('record.wfDecryptTitle')}</h3>
                </div>
                <p className="text-slate-300 text-sm ms-8">
                  {t('record.wfDecryptDesc')}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 shrink-0">
              <button
                onClick={dismissWorkflowGuide}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95"
              >
                {t('record.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Setup Modal */}
      {showPinSetup && (
        <PinSetup
          mode={pinEnabled ? 'change' : 'setup'}
          onClose={() => setShowPinSetup(false)}
          onSuccess={handlePinSetupSuccess}
        />
      )}
    </div>
  );
};

export default Record;
