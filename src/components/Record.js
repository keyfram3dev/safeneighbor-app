import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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

const SETTINGS_KEY = 'safeneighbor_backup_settings';

/**
 * Initialize the upload queue from saved settings (if not already initialized)
 * Returns the queue if ready, null otherwise
 */
const initQueueFromSettings = async () => {
  const queue = getUploadQueue();
  if (queue.getActiveProviders().length > 0) return queue;

  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return null;

    const settings = JSON.parse(saved);
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

// Track if workflow guide has been shown this page load (resets on refresh, persists across navigations)
let workflowGuideShownThisLoad = false;

// Detect mobile device (for Web Share API vs download)
const isMobileDevice = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints > 0 && /Mobile|Tablet/i.test(navigator.userAgent));
};

const RecordSectionHeader = ({ eyebrow, title, description, accent = 'text-blue-400' }) => (
  <div className="mb-4">
    <p className={`mb-2 text-xs font-bold uppercase tracking-[0.22em] ${accent}`}>{eyebrow}</p>
    <h2 className="text-xl font-black tracking-wide text-white">{title}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
  </div>
);

const Record = ({ isDuressMode = false, onNavigate }) => {
  const { t } = useTranslation();
  const recordQuote = useRotatingQuote('record.aureliusQuote', 'record.aureliusAuthor', 'record');
  const [activeTab, setActiveTab] = useState('video');
  const [witnessMode, setWitnessMode] = useState(false);
  const [showWitnessReminder, setShowWitnessReminder] = useState(false);

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
  const [selectedVaultItem, setSelectedVaultItem] = useState(null);

  // Purge state
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

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

  // Workflow guide modal
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
  const [isWorkflowGuideClosing, setIsWorkflowGuideClosing] = useState(false);

  // PIN gate state — Record section requires PIN when key wrapping is active
  const [recordUnlocked, setRecordUnlocked] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);

  // Lock body scroll when any modal is open
  const anyModalOpen = showPurgeConfirm || showBackupSettings || showBackupInfo || showWorkflowGuide || showPinSetup;
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen]);

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

  // Helper to load vault and init backup queue
  const loadVaultAndInit = async () => {
    await loadVault();
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

  // Show workflow guide on first Record visit per page load (resets on refresh, not on navigation)
  useEffect(() => {
    if (recordUnlocked && !isDuressMode && !workflowGuideShownThisLoad) {
      setIsWorkflowGuideClosing(false);
      setShowWorkflowGuide(true);
      workflowGuideShownThisLoad = true;
    }
  }, [recordUnlocked, isDuressMode]);

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
    setIsWorkflowGuideClosing(true);
    workflowGuideCloseTimerRef.current = window.setTimeout(() => {
      setShowWorkflowGuide(false);
      setIsWorkflowGuideClosing(false);
    }, 150);
  }, [isWorkflowGuideClosing]);

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

      const blobUrl = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(blobUrl); // triggers useEffect that transitions videoRef to playback
      setIsRecording(false);

      // Defer thumbnail so the playback video can establish its media session first
      setTimeout(async () => {
        const thumbnail = await generateThumbnail(blob);
        await saveToVault(blob, duration, 'video', thumbnail, 'recorded', witnessMode ? 'witness-report' : 'default');
      }, 500);
    };
    recorder.start(1000); // 1-second timeslice (WebKit recommended pattern)
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
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

        await saveToVault(blob, audioDuration, 'audio', null, 'recorded', witnessMode ? 'witness-report' : 'default');
      };

      recorder.start(1000); // 1-second timeslice (WebKit recommended pattern)
      mediaRecorderRef.current = recorder;
      pulseHaptic();
      showRecordingNotification();
      setIsRecordingAudio(true);
      setAudioDuration(0);
      timerRef.current = setInterval(() => setAudioDuration(d => d + 1), 1000);
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
      await loadVault();

      // Auto-backup: if enabled, mark recording for backup and queue it
      try {
        const settingsJson = localStorage.getItem(SETTINGS_KEY);
        if (settingsJson) {
          const settings = JSON.parse(settingsJson);
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

  const downloadRecording = async (rec) => {
    try {
      const timestamp = new Date(Number(rec.id) || Date.now()).toISOString().slice(0,19).replace(/[:-]/g, '');

      // For non-restored recordings, encrypt with the BACKUP key and download as .enc
      // This ensures .enc files are compatible with the DECRYPT tab and cloud backups
      if (rec.source !== 'restored') {
        const settingsJson = localStorage.getItem(SETTINGS_KEY);
        const settings = settingsJson ? JSON.parse(settingsJson) : null;
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

  // Check if a backup encryption key is saved
  const getSavedEncryptionKey = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return null;
      const settings = JSON.parse(saved);
      return settings.encryptionKey || null;
    } catch { return null; }
  };

  // RESTORE ENCRYPTED BACKUP
  const restoreEncryptedFile = async (file) => {
    setIsRestoring(true);
    setError(null);
    try {
      // Try saved key first, then manual input
      const savedKey = getSavedEncryptionKey();
      const keyString = savedKey || decryptKeyInput.trim();

      if (!keyString) {
        setError(t('record.noEncKeyAvailable'));
        return;
      }

      // If using manual key, save it to backup settings for future use
      if (!savedKey && keyString) {
        try {
          const existing = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
          existing.encryptionKey = keyString;
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(existing));
          setDecryptKeySource('manual');
        } catch (e) { /* continue even if save fails */ }
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
  const savedEncryptionKey = getSavedEncryptionKey();
  const backedUpCount = vaultRecordings.filter((rec) => rec.backedUp).length;
  const pendingBackupCount = vaultRecordings.filter((rec) => rec.markedForBackup && !rec.backedUp).length;

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
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-3 page-section-stagger">
      <div className="mb-8 rounded-[28px] border border-slate-800/80 bg-gradient-to-br from-slate-950/90 via-slate-950/75 to-slate-900/70 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.95)] page-section-item">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 shadow-[0_0_0_1px_rgba(248,113,113,0.08)]">
              <VideoCamera size={26} weight="bold" />
            </div>
            <h1 className="text-3xl font-black tracking-wide text-white sm:text-[2.3rem]">
              {t('record.title')}
            </h1>
          </div>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-[1.05rem]">
            {t('record.subtitle')}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {isMetadataStripEnabled() && (
            <button
              onClick={() => {
                sessionStorage.setItem('faqScrollTarget', 'privacy');
                onNavigate('faq');
              }}
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-600/20 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 transition-colors hover:bg-emerald-600/30 active:scale-95"
              title={t('record.metadataStrippingActive')}
            >
              <EyeSlash size={13} weight="bold" />
              {t('record.private')}
            </button>
          )}
          <button
            onClick={() => setShowPinSetup(true)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors active:scale-95 ${
              pinEnabled
                ? 'border-green-500/30 bg-green-600/20 text-green-300 hover:bg-green-600/30'
                : 'border-amber-500/30 bg-amber-600/20 text-amber-300 hover:bg-amber-600/30'
            }`}
          >
            <Lock size={13} weight="bold" />
            PIN
          </button>
          <button
            onClick={() => { setBackupSettingsTab('google_drive'); setShowBackupSettings(true); }}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors active:scale-95 ${
              savedEncryptionKey
                ? 'border-blue-500/30 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
                : 'border-slate-600/50 bg-slate-700/40 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            <Cloud size={13} weight="bold" />
            {savedEncryptionKey ? t('record.backupReady') : t('record.backup')}
          </button>
        </div>
        {!pinEnabled && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-400/80">
            <Lock size={12} weight="bold" />
            {t('record.pinWarning')}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm flex justify-between page-section-item">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline">{t('record.dismiss')}</button>
        </div>
      )}

      <section className="mb-8 page-section-item">
        <RecordSectionHeader
          eyebrow={t('record.captureNowEyebrow')}
          title={t('record.captureNowTitle')}
          description={t('record.captureNowDesc')}
          accent="text-red-400"
        />
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/75 to-slate-900/45 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{t('record.captureStorageLabel')}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{t('record.captureStorageValue')}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/75 to-slate-900/45 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{t('record.captureBackupLabel')}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              {savedEncryptionKey ? t('record.captureBackupReady') : t('record.captureBackupSetup')}
            </p>
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
            onClick={() => { setActiveTab(tab.id); if (tab.id !== 'video') stopCamera(); }}
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
        </button>
        </div>

        {/* VIDEO TAB */}
        {activeTab === 'video' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50">
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
              {/* Witness Mode toggle */}
              {!isRecording && !recordedUrl && (
                <div className="mb-3">
                  <button
                    onClick={() => {
                      const next = !witnessMode;
                      setWitnessMode(next);
                      if (next) setShowWitnessReminder(true);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all active:scale-95 ${
                      witnessMode
                        ? 'bg-teal-900/40 border-teal-600/50 text-teal-300'
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Eye size={14} weight="bold" />
                    {t('record.witnessMode')}
                  </button>
                </div>
              )}

              {/* Witness reminder checklist */}
              {showWitnessReminder && witnessMode && !isRecording && (
                <div className="bg-teal-950/40 border border-teal-700/40 rounded-xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-teal-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Eye size={14} weight="bold" />
                      {t('record.witnessReminderTitle')}
                    </span>
                    <button onClick={() => setShowWitnessReminder(false)} className="text-slate-500 hover:text-white">
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                  <ul className="text-slate-300 text-xs space-y-1">
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />
                        {t(`communityWitnessing.doc${i}`)}
                      </li>
                    ))}
                  </ul>
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

        </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
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
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 text-center">
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

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{t('record.vault')}</p>
            <p className="mt-3 text-3xl font-black text-white">{isDuressMode ? 0 : vaultRecordings.length}</p>
            <p className="mt-2 text-sm text-slate-400">{t('record.manageVaultDesc', { count: backedUpCount, pending: pendingBackupCount })}</p>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{t('record.manageSecurityTitle')}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{t('record.manageSecurityDesc')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setShowPinSetup(true)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
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
                className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/40 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700"
              >
                <Question size={15} weight="bold" />
                {t('record.howRecordingWorks')}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{t('record.manageBackupTitle')}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{savedEncryptionKey ? t('record.manageBackupReadyDesc') : t('record.manageBackupSetupDesc')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setShowBackupSettings(true)}
                className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-600/20 px-3 py-2 text-sm text-blue-300 transition-colors hover:bg-blue-600/30"
              >
                <Shield size={15} weight="bold" />
                {t('record.backup')}
              </button>
              <button
                onClick={() => { setActiveTab('decrypt'); stopCamera(); }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === 'decrypt'
                    ? 'border-emerald-400/60 bg-emerald-500/25 text-emerald-300'
                    : 'border-emerald-500/50 bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/25 hover:border-emerald-400/60'
                }`}
              >
                <Key size={15} weight="bold" />
                {t('record.tabDecrypt')}
              </button>
              <button
                onClick={() => setShowBackupInfo(true)}
                className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-600/20 px-3 py-2 text-sm text-cyan-300 transition-colors hover:bg-cyan-600/30"
              >
                <Question size={15} weight="bold" />
                {t('record.whyBackup')}
              </button>
            </div>
          </div>
        </div>

      {/* DECRYPT TAB */}
      {activeTab === 'decrypt' && (
        <div className="space-y-4">
          {/* Key Status Card */}
          <div className={`rounded-2xl p-4 border ${getSavedEncryptionKey()
            ? 'bg-emerald-900/20 border-emerald-500/30'
            : 'bg-amber-900/20 border-amber-500/30'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                getSavedEncryptionKey() ? 'bg-emerald-900/50' : 'bg-amber-900/50'
              }`}>
                <Key size={20} weight="bold" className={getSavedEncryptionKey() ? 'text-emerald-400' : 'text-amber-400'} />
              </div>
              <div className="flex-1 min-w-0">
                {getSavedEncryptionKey() ? (
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
            {!getSavedEncryptionKey() && (
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
              isRestoring || (!getSavedEncryptionKey() && !decryptKeyInput.trim()) ? 'opacity-50 pointer-events-none' : ''
            }`}>
              <Shield size={18} weight="bold" />
              {isRestoring ? t('record.decrypting') : t('record.selectEncFile')}
              <input
                type="file"
                accept=".enc"
                className="hidden"
                disabled={isRestoring || (!getSavedEncryptionKey() && !decryptKeyInput.trim())}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await restoreEncryptedFile(file);
                  }
                  e.target.value = '';
                }}
              />
            </label>
            {!getSavedEncryptionKey() && !decryptKeyInput.trim() && (
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
      <div className="mt-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2"><FolderOpen size={18} weight="bold" /> {t('record.vault')}</h3>
          <span className="text-slate-400 text-sm">{isDuressMode ? 0 : vaultRecordings.length} {t('record.items')}</span>
        </div>

      {/* Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPurgeConfirm(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-slate-800 border border-red-600 rounded-xl p-6 max-w-sm w-full relative"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Warning size={32} weight="bold" className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('record.purgeConfirmTitle')}</h3>
              <p className="text-slate-400 text-sm mb-4">
                {t('record.purgeConfirmDesc', { count: vaultRecordings.length })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPurgeConfirm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  {t('record.cancel')}
                </button>
                <button
                  onClick={handlePurgeAllData}
                  disabled={isPurging}
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
            <div className="p-6 text-center text-slate-500">{t('record.noRecordings')}</div>
          ) : (
            vaultRecordings.map(rec => (
              <div key={rec.id}>
                {/* Recording row */}
                <div onClick={() => selectVaultItem(rec)} className={`p-3 flex items-center gap-3 hover:bg-slate-700/30 cursor-pointer transition-colors ${selectedVaultItem?.id === rec.id ? 'bg-blue-900/20 border-s-2 border-blue-500' : ''}`}>
                  <div className="w-16 h-10 rounded overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
                    {rec.thumbnail ? <img src={rec.thumbnail} alt="" className="w-full h-full object-cover" /> : rec.type === 'video' ? <VideoCamera size={16} weight="bold" className="text-red-400" /> : <Microphone size={16} weight="bold" className="text-blue-400" />}
                  </div>
                  {rec.source === 'restored'
                    ? <LockOpen size={14} weight="bold" className="text-emerald-400 shrink-0" title={t('record.decryptedFromBackupTooltip')} />
                    : rec.backedUp
                      ? <Lock size={14} weight="bold" className="text-emerald-400 shrink-0" title={t('record.encryptedBackupExists')} />
                      : <Lock size={14} weight="bold" className="text-amber-400 shrink-0" title={t('record.encryptedLocallyNotBacked')} />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      {rec.title}
                      {rec.source === 'restored' && <span className="ms-1.5 text-emerald-400 text-[10px] font-bold uppercase">{t('record.decrypted')}</span>}
                    </p>
                    <p className="text-slate-500 text-xs">{fmt(rec.duration)} • {fmtB(rec.size)}{rec.source === 'imported' ? ` • ${t('record.imported')}` : ''}</p>
                  </div>
                  {/* Backup status button */}
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
                onClick={() => setShowPurgeConfirm(true)}
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
          onSuccess={() => setPinEnabled(isPinEnabled())}
        />
      )}
    </div>
  );
};

export default Record;
