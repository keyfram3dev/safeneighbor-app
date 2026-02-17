// src/components/SecuritySettings.js
// Security settings modal with PIN configuration and Duress PIN (decoy mode)

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Shield, Clock, CaretRight, EyeSlash, Warning, MapPin, FileX, Database, GlobeIcon as Globe } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeLanguage } from '../i18n';
import PinSetup from './PinSetup';
import { isPinEnabled, isDuressEnabled, clearDuressPin, verifyPin } from '../utils/pinAuth';
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
  const { t, i18n } = useTranslation();
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
        alert(t('settings.encryptionFailed'));
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
    // Use PinSetup in 'remove' mode to require PIN verification
    // This ensures key wrapping is properly removed before PIN is cleared
    setPinSetupMode('remove');
    setShowPinSetup(true);
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
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-700 relative">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Shield size={20} weight="bold" className="text-red-400" />
              <h2 className="text-lg font-bold text-white">{t('settings.title')}</h2>
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
                  <h3 className="text-white font-bold mb-1">{t('settings.pinLock')}</h3>
                  <p className="text-slate-400 text-sm mb-3">
                    {pinEnabled
                      ? t('settings.pinProtected')
                      : t('settings.pinPrompt')
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
                      {pinEnabled ? t('settings.changePin') : t('settings.setupPin')}
                    </button>
                    {pinEnabled && (
                      <button
                        onClick={() => setShowRemoveConfirm(true)}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        {t('settings.remove')}
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
                    <h3 className="text-white font-bold mb-1">{t('settings.decoyPin')}</h3>
                    <p className="text-slate-400 text-sm mb-3">
                      {duressEnabled
                        ? t('settings.decoyActive')
                        : t('settings.decoyPrompt')
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
                        {duressEnabled ? t('settings.changeDecoyPin') : t('settings.setupDecoyPin')}
                      </button>
                      {duressEnabled && (
                        <button
                          onClick={() => setShowDuressRemoveConfirm(true)}
                          className="px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                        >
                          {t('settings.remove')}
                        </button>
                      )}
                    </div>

                    {/* Info about how it works */}
                    <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                      <div className="flex items-start gap-2">
                        <Warning size={14} weight="bold" className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-500 text-xs">
                          <span className="text-amber-400 font-bold">{t('settings.decoyHowItWorks')}</span> {t('settings.decoyExplanation')}
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
                  <h3 className="text-white font-bold mb-1">{t('settings.autoLock')}</h3>
                  <p className="text-slate-400 text-sm">
                    {t('settings.autoLockDesc', { defaultValue: 'App automatically locks after <1>7 minutes</1> of inactivity.' }).split('<1>').map((part, i) => {
                      if (i === 0) return part;
                      const [bold, rest] = part.split('</1>');
                      return <React.Fragment key={i}><span className="text-white font-bold">{bold}</span>{rest}</React.Fragment>;
                    })}
                    {pinEnabled
                      ? ` ${t('settings.autoLockWithPin')}`
                      : ` ${t('settings.autoLockWithoutPin')}`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Language Section */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-violet-700/50 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-violet-600/20">
                  <Globe size={20} weight="bold" className="text-violet-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-1">{t('language.title')}</h3>
                  <p className="text-slate-400 text-sm">
                    Currently: <span className="text-white font-bold">{SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.nativeName || 'English'}</span>
                  </p>
                </div>
              </div>

              {/* Language Pill Buttons */}
              <div className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`px-2 py-2.5 rounded-xl text-center transition-all active:scale-95 ${
                      i18n.language === lang.code
                        ? 'bg-red-700 border border-red-500/50 text-white shadow-lg shadow-red-900/30'
                        : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{lang.flag}</div>
                    <p className="text-[10px] font-bold leading-tight">{lang.nativeName}</p>
                    {lang.quality === 'limited' && (
                      <p className="text-[8px] text-amber-500 font-bold mt-0.5">Beta</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Info note */}
              <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-start gap-2">
                  <Globe size={14} weight="bold" className="text-violet-500 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-500 text-xs">
                    {t('language.changeDescription')}
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
                  <h3 className="text-white font-bold mb-1">{t('settings.recordingPrivacy')}</h3>
                  <p className="text-slate-400 text-sm">
                    {t('settings.recordingPrivacyDesc')}
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
                    <div className="text-start">
                      <p className="text-white text-sm font-medium">{t('settings.stripMetadata')}</p>
                      <p className="text-slate-500 text-xs">{t('settings.stripMetadataDesc')}</p>
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
                    <div className="text-start">
                      <p className="text-white text-sm font-medium">{t('settings.saveLocation')}</p>
                      <p className="text-slate-500 text-xs">{t('settings.saveLocationDesc')}</p>
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
                    <span className="text-emerald-400 font-bold">{t('settings.privacyProtection')}</span> {t('settings.privacyExplanation')} {locationCapture ? t('settings.locationFuzzied') : t('settings.locationNotSaved')}.
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
                  <h3 className="text-white font-bold mb-1">{t('settings.localEncryption')}</h3>
                  <p className="text-slate-400 text-sm">
                    {t('settings.localEncryptionDesc')}
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
                  <div className="text-start">
                    <p className="text-white text-sm font-medium">
                      {isInitializingEncryption ? t('settings.initializing') : t('settings.encryptRecordings')}
                    </p>
                    <p className="text-slate-500 text-xs">{t('settings.encryptionType')}</p>
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
                    <span className="text-purple-400 font-bold">{t('settings.encryptionHowItWorks')}</span> {t('settings.encryptionExplanation')}
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
                  <div className="text-start">
                    <h3 className="text-white font-bold">{t('settings.cloudBackup')}</h3>
                    <p className="text-slate-400 text-sm">{t('settings.cloudBackupDesc')}</p>
                  </div>
                </div>
                <CaretRight size={20} weight="bold" className="text-slate-500 rtl:scale-x-[-1]" />
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 border-t border-slate-700 bg-slate-800/30">
            <p className="text-slate-500 text-xs text-center">
              {t('settings.footerText')}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Remove PIN Confirmation */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowRemoveConfirm(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-slate-900 rounded-2xl w-full max-w-sm p-6 border border-slate-700 relative"
          >
            <h3 className="text-xl font-bold text-white mb-2">{t('settings.removePinTitle')}</h3>
            <p className="text-slate-400 text-sm mb-6">
              {t('settings.removePinDesc')}
              {duressEnabled && ` ${t('settings.removePinDuressNote')}`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl"
              >
                {t('settings.cancelButton')}
              </button>
              <button
                onClick={handleRemovePin}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl"
              >
                {t('settings.removePinButton')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Remove Duress PIN Confirmation */}
      {showDuressRemoveConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowDuressRemoveConfirm(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-slate-900 rounded-2xl w-full max-w-sm p-6 border border-amber-700/50 relative"
          >
            <h3 className="text-xl font-bold text-white mb-2">{t('settings.removeDecoyTitle')}</h3>
            <p className="text-slate-400 text-sm mb-6">
              {t('settings.removeDecoyDesc')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuressRemoveConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl"
              >
                {t('settings.cancelButton')}
              </button>
              <button
                onClick={handleRemoveDuressPin}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl"
              >
                {t('settings.remove')}
              </button>
            </div>
          </motion.div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleCancelVerify}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-slate-900 rounded-2xl w-full max-w-sm p-6 border border-slate-700 relative"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-600/20">
                <Lock size={20} weight="bold" className="text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{t('settings.verifyPin')}</h3>
                <p className="text-slate-500 text-sm">
                  {pendingDisableAction === 'encryption'
                    ? t('settings.verifyEncryption')
                    : t('settings.verifyMetadata')
                  }
                </p>
              </div>
            </div>

            <p className="text-slate-400 text-sm mb-4">
              {t('settings.verifyPrompt')}
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
                placeholder={t('settings.enterPin')}
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
                {t('settings.cancelButton')}
              </button>
              <button
                onClick={handleVerifyPinSubmit}
                disabled={verifyPin_.length < 4 || isVerifying}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {isVerifying ? t('settings.verifying') : t('settings.confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

export default SecuritySettings;
