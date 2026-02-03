import React, { useState, useRef, useEffect } from 'react';
import { VideoCamera, Microphone, UploadSimple, Stop, Trash, FolderOpen, Link, Camera, Copy, DownloadSimple, Warning, Cloud, CloudSlash, Shield, Lock, EyeSlash } from '@phosphor-icons/react';
import { saveRecording, getAllRecordings, deleteRecording, clearAllRecordings, markForBackup } from '../utils/localStorageDB';
import BackupSettings from './BackupSettings';
import PinSetup from './PinSetup';
import { isPinEnabled } from '../utils/pinAuth';
import {
  processRecordingForPrivacy,
  stripImageMetadata,
  isLocationCaptureEnabled,
  isMetadataStripEnabled
} from '../utils/metadataStrip';

const Record = ({ isDuressMode = false }) => {
  const [activeTab, setActiveTab] = useState('video');
  
  // Video state
  const [cameraActive, setCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState('720p');
  const [error, setError] = useState(null);
  
  // Audio state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState(new Array(64).fill(0));
  
  // Vault state
  const [vaultRecordings, setVaultRecordings] = useState([]);
  const [selectedVaultItem, setSelectedVaultItem] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Purge state
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Backup state
  const [showBackupSettings, setShowBackupSettings] = useState(false);

  // PIN setup state
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(isPinEnabled());
  
  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const audioStreamRef = useRef(null);

  useEffect(() => {
    loadVault();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    stopCamera();
    stopAudioRecording();
    clearInterval(timerRef.current);
    cancelAnimationFrame(animationRef.current);
  };

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

  const generateThumbnail = (blob) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(blob);
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => video.currentTime = 0.1;
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        canvas.getContext('2d').drawImage(video, 0, 0, 160, 90);
        URL.revokeObjectURL(video.src);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      video.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 3000);
    });
  };

  const startVideoRecording = () => {
    if (!streamRef.current) {
      setError('Camera not started');
      return;
    }
    chunksRef.current = [];
    const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? { mimeType: 'video/webm;codecs=vp9' }
      : MediaRecorder.isTypeSupported('video/webm')
        ? { mimeType: 'video/webm' }
        : {};
    const recorder = new MediaRecorder(streamRef.current, options);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      clearInterval(timerRef.current);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setIsRecording(false);
      stopCamera();
      const thumbnail = await generateThumbnail(blob);
      await saveToVault(blob, duration, 'video', thumbnail);
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const recordMore = async () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setDuration(0);
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
    setRecordedUrl(null);
    setRecordedBlob(null);
    setDuration(0);
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
        setAudioLevels(new Array(64).fill(0));
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
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
        
        await saveToVault(blob, audioDuration, 'audio', null);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setAudioDuration(0);
      timerRef.current = setInterval(() => setAudioDuration(d => d + 1), 1000);
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
  const saveToVault = async (blob, dur, type, thumbnail) => {
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
        size: blob.size
      });

      await saveRecording(processedData);
      await loadVault();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleDelete = async (id) => {
    await deleteRecording(id);
    await loadVault();
    if (selectedVaultItem?.id === id) setSelectedVaultItem(null);
  };

  const selectVaultItem = (rec) => {
    if (selectedVaultItem?.url) URL.revokeObjectURL(selectedVaultItem.url);
    setSelectedVaultItem({ ...rec, url: URL.createObjectURL(rec.blob) });
    setPlaybackSpeed(1);
  };

  const downloadRecording = (rec) => {
    const ext = rec.type === 'video' ? 'webm' : 'webm';
    const filename = `SafeNeighbor_${rec.type}_${new Date(rec.id).toISOString().slice(0,19).replace(/[:-]/g, '')}.${ext}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(rec.blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const fmtB = (b) => !b ? '0 B' : b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';

  // BACKUP handler
  const handleToggleBackup = async (id, currentState) => {
    try {
      await markForBackup(id, !currentState);
      await loadVault();
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
      setError('Failed to purge data. Please try again.');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <VideoCamera size={60} weight="bold" className="text-red-400" />
            <h1 className="text-3xl font-black text-white tracking-wide">Record & Document</h1>
          </div>
          <div className="flex gap-2">
            {/* Privacy indicator - shows when metadata stripping is active */}
            {isMetadataStripEnabled() && (
              <div
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-emerald-400 bg-emerald-600/20"
                title="Metadata stripping active - recordings are privacy-protected"
              >
                <EyeSlash size={14} weight="bold" />
                <span className="hidden sm:inline">Private</span>
              </div>
            )}
            <button
              onClick={() => setShowPinSetup(true)}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${
                pinEnabled
                  ? 'text-green-400 bg-green-600/20 hover:text-green-300'
                  : 'text-amber-400 bg-amber-600/20 hover:text-amber-300'
              }`}
            >
              <Lock size={16} weight="bold" />
              {pinEnabled ? 'PIN I/O' : 'Set PIN'}
            </button>
            <button
              onClick={() => setShowBackupSettings(true)}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-2 text-sm bg-blue-600/20 px-3 py-1.5 rounded-lg"
            >
              <Shield size={16} weight="bold" />
              Backup
            </button>
          </div>
        </div>
        <p className="text-slate-400 text-sm">Recording is your First Amendment right. Properly documenting an encounter can provide critical evidence for your legal defense.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'video', label: 'VIDEO', icon: VideoCamera },
          { id: 'audio', label: 'AUDIO', icon: Microphone },
          { id: 'import', label: 'IMPORT MEDIA', icon: UploadSimple }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id !== 'video') stopCamera(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <tab.icon size={16} weight="bold" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIDEO TAB */}
      {activeTab === 'video' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50">
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`w-full h-full object-cover ${!cameraActive && !recordedUrl ? 'hidden' : ''}`}
              />
              
              {recordedUrl && (
                <video
                  src={recordedUrl}
                  controls
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {!cameraActive && !recordedUrl && (
                <div className="text-center p-6">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera size={36} weight="bold" className="text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm mb-4">Camera preview will appear here</p>
                  <button
                    onClick={startCamera}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    START CAMERA PREVIEW
                  </button>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">REC {fmt(duration)}</span>
                </div>
              )}

              {cameraActive && !isRecording && !recordedUrl && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-600 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  <span className="text-white text-sm font-medium">LIVE</span>
                </div>
              )}
            </div>

            <div className="p-4">
              {cameraActive && !recordedUrl && (
                <button
                  onClick={isRecording ? stopVideoRecording : startVideoRecording}
                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                    isRecording ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isRecording ? <Stop size={20} weight="bold" /> : <VideoCamera size={20} weight="bold" />}
                  {isRecording ? 'STOP RECORDING' : 'START VIDEO RECORDING'}
                </button>
              )}

              {recordedUrl && (
                <div className="flex gap-2">
                  <button onClick={recordMore} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                    <VideoCamera size={16} weight="bold" /> RECORD MORE
                  </button>
                  <button onClick={deleteCurrentRecording} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                    <Trash size={16} weight="bold" /> DELETE
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-400 mb-3">CAPTURE QUALITY PRESETS</h3>
            <p className="text-xs text-slate-500 mb-3">HARDWARE RESOLUTION</p>
            <div className="flex gap-2">
              {['480p', '720p', '1080p'].map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  disabled={isRecording}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    quality === q ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {q === '480p' ? 'SD 480P' : q === '720p' ? 'HD 720P' : 'FHD 1080P'}
                </button>
              ))}
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
              <span className="text-blue-400 text-sm font-medium">MIC ACTIVE</span>
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
              {isRecordingAudio ? 'STOP RECORDING' : 'START AUDIO RECORDING'}
            </button>
          )}

          {/* Post-recording buttons - RECORD MORE and DELETE */}
          {audioUrl && (
            <div className="flex gap-2">
              <button
                onClick={recordMoreAudio}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Microphone size={16} weight="bold" /> RECORD MORE
              </button>
              <button
                onClick={deleteCurrentAudio}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Trash size={16} weight="bold" /> DELETE
              </button>
            </div>
          )}
        </div>
      )}

      {/* IMPORT TAB */}
      {activeTab === 'import' && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={32} weight="bold" className="text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">LOCAL EVIDENCE VAULT</h3>
          <p className="text-slate-400 text-sm mb-4">Import existing media to keep them safe in encrypted storage.</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center gap-2">
            <UploadSimple size={18} weight="bold" /> SELECT FILES TO IMPORT
          </button>
        </div>
      )}

      {/* PURGE DATA Section - Hidden in duress mode */}
      {!isDuressMode && (
        <div className="mt-6 bg-red-950/30 border border-red-900/50 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-400 font-bold text-sm flex items-center gap-2">
                <Warning size={16} weight="bold" />
                EMERGENCY DATA PURGE
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Permanently delete all {vaultRecordings.length} recording{vaultRecordings.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowPurgeConfirm(true)}
              disabled={vaultRecordings.length === 0}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash size={16} weight="bold" />
              PURGE ALL
            </button>
          </div>
        </div>
      )}

      {/* Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-600 rounded-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Warning size={32} weight="bold" className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Confirm Data Purge</h3>
              <p className="text-slate-400 text-sm mb-4">
                This will permanently delete {vaultRecordings.length} recording{vaultRecordings.length !== 1 ? 's' : ''}.
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPurgeConfirm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePurgeAllData}
                  disabled={isPurging}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg transition-colors"
                >
                  {isPurging ? 'PURGING...' : 'DELETE ALL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VAULT */}
      <div className="mt-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2"><FolderOpen size={18} weight="bold" /> Vault</h3>
          <span className="text-slate-400 text-sm">{isDuressMode ? 0 : vaultRecordings.length} items</span>
        </div>

        {selectedVaultItem && !isDuressMode && (
          <div className="p-4 border-b border-slate-700 bg-slate-900/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-500">VAULT PLAYBACK</span>
              <button onClick={() => { URL.revokeObjectURL(selectedVaultItem.url); setSelectedVaultItem(null); }} className="text-slate-400 hover:text-white text-xs">Close</button>
            </div>
            {selectedVaultItem.type === 'video' ? (
              <video id="vaultPlayer" src={selectedVaultItem.url} controls autoPlay className="w-full rounded-lg" />
            ) : (
              <audio id="vaultPlayer" src={selectedVaultItem.url} controls autoPlay className="w-full" />
            )}
            
            {/* Playback controls */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button 
                onClick={() => navigator.clipboard.writeText(window.location.origin + '?play=' + selectedVaultItem.id)} 
                className="flex-1 min-w-[80px] bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-sm"
              >
                <Link size={14} weight="bold" /> Link
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.write([
                    new ClipboardItem({ [selectedVaultItem.blob.type]: selectedVaultItem.blob })
                  ]).catch(() => alert('Copy not supported in this browser'));
                }} 
                className="flex-1 min-w-[80px] bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-sm"
              >
                <Copy size={14} weight="bold" /> Copy
              </button>
              <button 
                onClick={() => downloadRecording(selectedVaultItem)} 
                className="flex-1 min-w-[80px] bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-sm"
              >
                <DownloadSimple size={14} weight="bold" /> Download
              </button>
              <div className="flex items-center gap-1 bg-slate-700 rounded-lg px-2">
                <span className="text-slate-400 text-xs">Speed:</span>
                {[0.5, 1, 1.5, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => {
                      const player = document.getElementById('vaultPlayer');
                      if (player) player.playbackRate = speed;
                      setPlaybackSpeed(speed);
                    }}
                    className={`px-2 py-1 text-xs rounded ${playbackSpeed === speed ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-700 max-h-80 overflow-y-auto">
          {/* Show empty state in duress mode to hide real recordings */}
          {(isDuressMode || vaultRecordings.length === 0) ? (
            <div className="p-6 text-center text-slate-500">No recordings yet.</div>
          ) : (
            vaultRecordings.map(rec => (
              <div key={rec.id} onClick={() => selectVaultItem(rec)} className={`p-3 flex items-center gap-3 hover:bg-slate-700/30 cursor-pointer ${selectedVaultItem?.id === rec.id ? 'bg-slate-700/50' : ''}`}>
                <div className="w-16 h-10 rounded overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
                  {rec.thumbnail ? <img src={rec.thumbnail} alt="" className="w-full h-full object-cover" /> : rec.type === 'video' ? <VideoCamera size={16} weight="bold" className="text-red-400" /> : <Microphone size={16} weight="bold" className="text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{rec.title}</p>
                  <p className="text-slate-500 text-xs">{fmt(rec.duration)} • {fmtB(rec.size)}</p>
                </div>
                {/* Backup status button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleBackup(rec.id, rec.markedForBackup); }}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    rec.backedUp
                      ? 'bg-green-600/20 text-green-400'
                      : rec.markedForBackup
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                  title={rec.backedUp ? 'Backed up to cloud' : rec.markedForBackup ? 'Pending backup' : 'Click to mark for backup'}
                >
                  {rec.backedUp ? <Cloud size={12} weight="bold" /> : rec.markedForBackup ? <Cloud size={12} weight="bold" /> : <CloudSlash size={12} weight="bold" />}
                  {rec.backedUp ? 'Backed Up' : rec.markedForBackup ? 'Pending' : 'Backup'}
                </button>
                <span className={`text-xs uppercase px-2 py-1 rounded ${rec.type === 'video' ? 'bg-red-600/20 text-red-400' : 'bg-blue-600/20 text-blue-400'}`}>{rec.type}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(rec.id); }} className="p-2 text-red-400 hover:bg-red-600/20 rounded"><Trash size={16} weight="bold" /></button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 text-center py-6 border-t border-slate-700">
        <p className="text-slate-400 italic text-sm">"You have power over your mind - not outside events. Realize this, and you will find strength."</p>
        <p className="text-slate-500 text-xs mt-2">— MARCUS AURELIUS</p>
      </div>

      {/* Backup Settings Modal */}
      {showBackupSettings && (
        <BackupSettings onClose={() => setShowBackupSettings(false)} />
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