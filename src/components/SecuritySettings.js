// src/components/SecuritySettings.js
// Security settings modal with PIN configuration and Duress PIN (decoy mode)

import React, { useState } from 'react';
import { X, Lock, Shield, Clock, CaretRight, EyeSlash, Warning, MapPin, FileX, Database } from '@phosphor-icons/react';
import PinSetup from './PinSetup';
import { isPinEnabled, clearPin, isDuressEnabled, clearDuressPin, verifyPin } from '../utils/pinAuth';
import {
  isMetadataStripEnabled,
  setMetadataStripEnabled,
  isLocationCaptureEnabled,
  setLocationCaptureEnabled
} from '../utils/metadataStrip';
import {
  isEncryptionEnabled,
  setEncryptionEnabled,
  initializeEncryption,
  hasMasterKey
} from '../utils/crypto';

function SecuritySettings({ onClose, onOpenBackup }) {
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSetupMode, setPinSetupMode] = useState('setup');
  const [pinEnabled, setPinEnabled] = useState(isPinEnabled());
  const [duressEnabled, setDuressEnabled] = useState(isDuressEnabled());
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showDuressRemoveConfirm, setShowDuressRemoveConfirm] = useState(false);

  // Privacy settings state
  const [metadataStrip, setMetadataStrip] = useState(isMetadataStripEnabled());
  const [locationCapture, setLocationCapture] = useState(isLocationCaptureEnabled());

  // Encryption state
  const [encryptionEnabled, setEncryptionEnabledState] = useState(isEncryptionEnabled());
  const [isInitializingEncryption, setIsInitializingEncryption] = useState(false);

  // PIN verification state for disabling protected features
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [pendingDisableAction, setPendingDisableAction] = useState(null); // 'encryption' or 'metadata'
  const [verifyPin_, setVerifyPin] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleToggleEncryption = async () => {
    if (!encryptionEnabled) {
      // Enabling encryption - no PIN required
      setIsInitializingEncryption(true);
      try {
        const hasKey = await hasMasterKey();
        if (!hasKey) {
          await initializeEncryption();
        } else {
          setEncryptionEnabled(true);
        }
        setEncryptionEnabledState(true);
      } catch (error) {
        console.error('Failed to initialize encryption:', error);
        alert('Failed to enable encryption. Please try again.');
      } finally {
        setIsInitializingEncryption(false);
      }
    } else {
      // Disabling encryption - require PIN if enabled
      if (pinEnabled) {
        setPendingDisableAction('encryption');
        setVerifyPin('');
        setVerifyError('');
        setShowPinVerify(true);
      } else {
        setEncryptionEnabled(false);
        setEncryptionEnabledState(false);
      }
    }
  };

  const handleToggleMetadataStrip = () => {
    if (metadataStrip) {
      // Disabling metadata strip - require PIN if enabled
      if (pinEnabled) {
        setPendingDisableAction('metadata');
        setVerifyPin('');
        setVerifyError('');
        setShowPinVerify(true);
      } else {
        setMetadataStripEnabled(false);
        setMetadataStrip(false);
      }
    } else {
      // Enabling metadata strip - no PIN required
      setMetadataStripEnabled(true);
      setMetadataStrip(true);
    }
  };

  // Handle PIN verification for disabling protected features
  const handleVerifyPinSubmit = async () => {
    if (verifyPin_.length < 4) {
      setVerifyError('PIN must be at least 4 digits');
      return;
    }

    setIsVerifying(true);
    setVerifyError('');

    try {
      const result = await verifyPin(verifyPin_);

      if (result.valid && !result.isDuress) {
        // PIN verified - complete the pending action
        if (pendingDisableAction === 'encryption') {
          setEncryptionEnabled(false);
          setEncryptionEnabledState(false);
        } else if (pendingDisableAction === 'metadata') {
          setMetadataStripEnabled(false);
          setMetadataStrip(false);
        }

        // Close modal and reset state
        setShowPinVerify(false);
        setPendingDisableAction(null);
        setVerifyPin('');
      } else if (result.isDuress) {
        // Don't allow duress PIN to disable security features
        setVerifyError('Invalid PIN');
        setVerifyPin('');
      } else {
        setVerifyError('Incorrect PIN');
        setVerifyPin('');
      }
    } catch (error) {
      setVerifyError('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelVerify = () => {
    setShowPinVerify(false);
    setPendingDisableAction(null);
    setVerifyPin('');
    setVerifyError('');
  };

  const handleToggleLocationCapture = () => {
    const newValue = !locationCapture;
    setLocationCaptureEnabled(newValue);
    setLocationCapture(newValue);
  };

  const handleSetupPin = () => {
    setPinSetupMode(pinEnabled ? 'change' : 'setup');
    setShowPinSetup(true);
  };

  const handleRemovePin = () => {
    clearPin();
    clearDuressPin(); // Also clear duress PIN when removing main PIN
    setPinEnabled(false);
    setDuressEnabled(false);
    setShowRemoveConfirm(false);
  };

  const handleSetupDuressPin = () => {
    setPinSetupMode(duressEnabled ? 'duress_change' : 'duress_setup');
    setShowPinSetup(true);
  };

  const handleRemoveDuressPin = () => {
    clearDuressPin();
    setDuressEnabled(false);
    setShowDuressRemoveConfirm(false);
  };

  const handlePinSuccess = () => {
    setPinEnabled(isPinEnabled());
    setDuressEnabled(isDuressEnabled());
    setShowPinSetup(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-700">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Shield size={20} weight="bold" className="text-red-400" />
              <h2 className="text-lg font-bold text-white">Security Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* PIN Lock Section */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${pinEnabled ? 'bg-green-600/20' : 'bg-amber-600/20'}`}>
                  <Lock size={20} weight="bold" className={pinEnabled ? 'text-green-400' : 'text-amber-400'} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-1">PIN Lock</h3>
                  <p className="text-slate-400 text-sm mb-3">
                    {pinEnabled
                      ? 'Your app is protected with a PIN'
                      : 'Add a PIN to protect your data when the app locks'
                    }
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSetupPin}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        pinEnabled
                          ? 'bg-slate-700 hover:bg-slate-600 text-white'
                          : 'bg-red-700 hover:bg-red-600 text-white'
                      }`}
                    >
                      {pinEnabled ? 'Change PIN' : 'Set Up PIN'}
                    </button>
                    {pinEnabled && (
                      <button
                        onClick={() => setShowRemoveConfirm(true)}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Duress PIN (Decoy Mode) Section - Only show if PIN is enabled */}
            {pinEnabled && (
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-amber-700/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${duressEnabled ? 'bg-amber-600/20' : 'bg-slate-700/50'}`}>
                    <EyeSlash size={20} weight="bold" className={duressEnabled ? 'text-amber-400' : 'text-slate-500'} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-1">Decoy PIN</h3>
                    <p className="text-slate-400 text-sm mb-3">
                      {duressEnabled
                        ? 'A second PIN that shows an empty app when used'
                        : 'Set up a decoy PIN that hides your data if you\'re forced to unlock'
                      }
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSetupDuressPin}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                          duressEnabled
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                        }`}
                      >
                        {duressEnabled ? 'Change Decoy PIN' : 'Set Up Decoy PIN'}
                      </button>
                      {duressEnabled && (
                        <button
                          onClick={() => setShowDuressRemoveConfirm(true)}
                          className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Info about how it works */}
                    <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                      <div className="flex items-start gap-2">
                        <Warning size={14} weight="bold" className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-500 text-xs">
                          <span className="text-amber-400 font-bold">How it works:</span> If someone forces you to unlock, use the decoy PIN. The app will appear empty with no recordings or reports visible.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-Lock Info */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-600/20">
                  <Clock size={20} weight="bold" className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-1">Auto-Lock</h3>
                  <p className="text-slate-400 text-sm">
                    App automatically locks after <span className="text-white font-bold">7 minutes</span> of inactivity.
                    {pinEnabled
                      ? ' PIN required to unlock.'
                      : ' Set up a PIN to require authentication when unlocking.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Recording Privacy Settings */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-emerald-700/50 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-600/20">
                  <FileX size={20} weight="bold" className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-1">Recording Privacy</h3>
                  <p className="text-slate-400 text-sm">
                    Control what metadata is saved with your recordings
                  </p>
                </div>
              </div>

              {/* Metadata Stripping Toggle */}
              <div className="space-y-3">
                <button
                  onClick={handleToggleMetadataStrip}
                  className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileX size={18} weight="bold" className={metadataStrip ? 'text-emerald-400' : 'text-slate-500'} />
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">Strip Metadata</p>
                      <p className="text-slate-500 text-xs">Remove identifying info from recordings</p>
                    </div>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-colors ${metadataStrip ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${metadataStrip ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
                  </div>
                </button>

                {/* Location Capture Toggle */}
                <button
                  onClick={handleToggleLocationCapture}
                  className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin size={18} weight="bold" className={locationCapture ? 'text-amber-400' : 'text-slate-500'} />
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">Save Location</p>
                      <p className="text-slate-500 text-xs">Attach GPS coordinates to recordings</p>
                    </div>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-colors ${locationCapture ? 'bg-amber-600' : 'bg-slate-700'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${locationCapture ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              </div>

              {/* Privacy info */}
              <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-start gap-2">
                  <Shield size={14} weight="bold" className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-500 text-xs">
                    <span className="text-emerald-400 font-bold">Privacy protection:</span> When metadata stripping is enabled, recordings won't contain timestamps, device info, or browser fingerprints. Location is {locationCapture ? 'fuzzied to ~1km' : 'not saved'}.
                  </p>
                </div>
              </div>
            </div>

            {/* Local Encryption Section */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-purple-700/50 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-2 rounded-lg ${encryptionEnabled ? 'bg-purple-600/20' : 'bg-slate-700/50'}`}>
                  <Database size={20} weight="bold" className={encryptionEnabled ? 'text-purple-400' : 'text-slate-500'} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-1">Local Encryption</h3>
                  <p className="text-slate-400 text-sm">
                    Encrypt recordings stored on this device with AES-256
                  </p>
                </div>
              </div>

              {/* Encryption Toggle */}
              <button
                onClick={handleToggleEncryption}
                disabled={isInitializingEncryption}
                className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Lock size={18} weight="bold" className={encryptionEnabled ? 'text-purple-400' : 'text-slate-500'} />
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">
                      {isInitializingEncryption ? 'Initializing...' : 'Encrypt Recordings'}
                    </p>
                    <p className="text-slate-500 text-xs">AES-256-GCM encryption at rest</p>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors ${encryptionEnabled ? 'bg-purple-600' : 'bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${encryptionEnabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {/* Encryption info */}
              <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-start gap-2">
                  <Shield size={14} weight="bold" className="text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-500 text-xs">
                    <span className="text-purple-400 font-bold">How it works:</span> When enabled, new recordings are encrypted before being saved to your device. This protects your data if someone gains access to your device's storage.
                  </p>
                </div>
              </div>
            </div>

            {/* Backup Settings Link */}
            {onOpenBackup && (
              <button
                onClick={() => {
                  onClose();
                  onOpenBackup();
                }}
                className="w-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-600/20">
                    <Shield size={20} weight="bold" className="text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-bold">Cloud Backup</h3>
                    <p className="text-slate-400 text-sm">Encrypted backup to Cloudflare R2</p>
                  </div>
                </div>
                <CaretRight size={20} weight="bold" className="text-slate-500" />
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 border-t border-slate-700 bg-slate-800/30">
            <p className="text-slate-500 text-xs text-center">
              SafeNeighbor Security protects your data locally on this device
            </p>
          </div>
        </div>
      </div>

      {/* Remove PIN Confirmation */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-2">Remove PIN?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Anyone will be able to access your app by tapping the screen when it locks.
              {duressEnabled && ' This will also remove your decoy PIN.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePin}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl"
              >
                Remove PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Duress PIN Confirmation */}
      {showDuressRemoveConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-6 border border-amber-700/50">
            <h3 className="text-xl font-bold text-white mb-2">Remove Decoy PIN?</h3>
            <p className="text-slate-400 text-sm mb-6">
              You will no longer have a decoy option if forced to unlock your app.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuressRemoveConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveDuressPin}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Setup Modal */}
      {showPinSetup && (
        <PinSetup
          mode={pinSetupMode}
          onClose={() => setShowPinSetup(false)}
          onSuccess={handlePinSuccess}
        />
      )}

      {/* PIN Verification Modal for Disabling Protected Features */}
      {showPinVerify && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-600/20">
                <Lock size={20} weight="bold" className="text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Verify PIN</h3>
                <p className="text-slate-500 text-sm">
                  {pendingDisableAction === 'encryption'
                    ? 'Required to disable encryption'
                    : 'Required to disable metadata stripping'
                  }
                </p>
              </div>
            </div>

            <p className="text-slate-400 text-sm mb-4">
              Enter your PIN to confirm disabling this security feature.
            </p>

            {/* PIN Input */}
            <div className="mb-4">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyPin_}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setVerifyPin(value);
                  setVerifyError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && verifyPin_.length >= 4) {
                    handleVerifyPinSubmit();
                  }
                }}
                placeholder="Enter PIN"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-red-500"
                autoFocus
              />
              {verifyError && (
                <p className="text-red-400 text-sm mt-2 text-center">{verifyError}</p>
              )}
            </div>

            {/* PIN dots indicator */}
            <div className="flex justify-center gap-2 mb-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i < verifyPin_.length ? 'bg-red-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelVerify}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPinSubmit}
                disabled={verifyPin_.length < 4 || isVerifying}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {isVerifying ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SecuritySettings;
