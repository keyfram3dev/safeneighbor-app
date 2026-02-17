// src/components/PinSetup.js
// Modal for setting up or changing the app PIN
// Supports both normal PIN and duress PIN (decoy mode)
// Includes failed attempts protection with progressive lockout

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, Check, Warning, EyeSlash, Backspace } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import {
  setupPin,
  verifyPin,
  clearPin,
  isPinEnabled,
  setupDuressPin,
  clearDuressPin,
  isDuressEnabled,
  checkLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  getFailedAttempts
} from '../utils/pinAuth';
import {
  hasMasterKey,
  isKeyWrapped,
  wrapMasterKeyWithPin,
  unwrapMasterKeyWithPin,
  rewrapMasterKeyWithPin,
  removeKeyWrapping
} from '../utils/crypto';

const MAX_ATTEMPTS = 5;

const PinSetup = ({ onClose, onSuccess, mode = 'setup' }) => {
  const { t } = useTranslation();
  // mode: 'setup' | 'change' | 'remove' | 'duress_setup' | 'duress_change' | 'duress_remove'
  const isDuressMode = mode.startsWith('duress_');
  const baseMode = isDuressMode ? mode.replace('duress_', '') : mode;

  const [step, setStep] = useState(baseMode === 'change' || baseMode === 'remove' ? 'verify' : 'enter');
  // step: 'verify' (for change/remove), 'enter', 'confirm'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Lockout state for failed attempts protection
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState('');

  const maxDigits = 6;
  const minDigits = 4;

  // Check lockout status and update countdown
  const updateLockoutStatus = useCallback(() => {
    const lockout = checkLockout();
    setIsLockedOut(lockout.isLocked);
    setLockoutRemaining(lockout.remainingFormatted);

    if (!lockout.isLocked) {
      const failedAttempts = getFailedAttempts();
      setAttemptsRemaining(MAX_ATTEMPTS - failedAttempts);
    }

    return lockout.isLocked;
  }, []);

  // Initial check and countdown timer for lockout
  useEffect(() => {
    // Only check lockout if we're in verify step
    if (step === 'verify') {
      updateLockoutStatus();

      const interval = setInterval(() => {
        updateLockoutStatus();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [updateLockoutStatus, step]);

  const handleDigitPress = (digit) => {
    if (isLockedOut) return;
    setError('');
    if (step === 'verify') {
      if (pin.length < maxDigits) {
        setPin(prev => prev + digit);
      }
    } else if (step === 'enter') {
      if (pin.length < maxDigits) {
        setPin(prev => prev + digit);
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < maxDigits) {
        setConfirmPin(prev => prev + digit);
      }
    }
  };

  const handleBackspace = () => {
    setError('');
    if (step === 'verify' || step === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleContinue = async () => {
    // Block if locked out
    if (step === 'verify' && isLockedOut) {
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      if (step === 'verify') {
        // Verify current PIN before allowing change/remove
        // For duress mode, we verify the normal PIN first
        const result = await verifyPin(pin);
        if (!result.valid) {
          // Record failed attempt and check for lockout
          const lockoutResult = recordFailedAttempt();

          if (lockoutResult.isLocked) {
            setIsLockedOut(true);
            updateLockoutStatus();
            setError(t('pinSetup.tooManyAttempts'));
          } else {
            setAttemptsRemaining(lockoutResult.attemptsRemaining);
            setError(`${t('pinSetup.incorrectPin')} (${lockoutResult.attemptsRemaining})`);
          }

          setPin('');
          setIsProcessing(false);
          return;
        }

        // Clear failed attempts on successful verification
        clearFailedAttempts();

        if (baseMode === 'remove') {
          // Remove PIN (normal or duress)
          if (isDuressMode) {
            clearDuressPin();
          } else {
            // Remove key wrapping before clearing PIN
            if (isKeyWrapped()) {
              await removeKeyWrapping(pin);
            }
            clearPin();
            clearDuressPin();
          }
          onSuccess?.();
          onClose();
          return;
        }

        // For PIN change: unwrap the key now (we have the old PIN)
        // so it's in memory for rewrapping with the new PIN in the confirm step
        if (!isDuressMode && isKeyWrapped()) {
          await unwrapMasterKeyWithPin(pin);
        }

        // Move to enter new PIN
        setPin('');
        setStep('enter');
      } else if (step === 'enter') {
        if (pin.length < minDigits) {
          setError(t('pinSetup.pinMinDigits', { min: minDigits }));
          setIsProcessing(false);
          return;
        }
        setStep('confirm');
      } else if (step === 'confirm') {
        if (confirmPin !== pin) {
          setError(t('pinSetup.pinsDoNotMatch'));
          setConfirmPin('');
          setIsProcessing(false);
          return;
        }

        // Save the PIN (normal or duress)
        if (isDuressMode) {
          await setupDuressPin(pin);
        } else {
          await setupPin(pin);
          // Wrap the master encryption key with the new PIN
          const hasKey = await hasMasterKey();
          if (hasKey) {
            if (isKeyWrapped()) {
              // PIN change: rewrap with new PIN (key already in memory from verify step)
              await rewrapMasterKeyWithPin(pin);
            } else {
              // First PIN setup: wrap the key for the first time
              await wrapMasterKeyWithPin(pin);
            }
          }
        }
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPin = step === 'confirm' ? confirmPin : pin;
  const canContinue = !isLockedOut && (
    step === 'verify' ? pin.length >= minDigits :
    step === 'enter' ? pin.length >= minDigits :
    confirmPin.length >= minDigits
  );

  const getTitle = () => {
    if (step === 'verify') return t('pinSetup.enterCurrentPin');
    if (isDuressMode) {
      if (baseMode === 'change') return step === 'enter' ? t('pinSetup.enterNewDecoyPin') : t('pinSetup.confirmDecoyPin');
      return step === 'enter' ? t('pinSetup.createDecoyPin') : t('pinSetup.confirmDecoyPin');
    }
    if (baseMode === 'change') return step === 'enter' ? t('pinSetup.enterNewPin') : t('pinSetup.confirmNewPin');
    return step === 'enter' ? t('pinSetup.createYourPin') : t('pinSetup.confirmYourPin');
  };

  const getSubtitle = () => {
    if (step === 'verify') {
      if (isLockedOut) return t('pinSetup.tooManyAttempts');
      return t('pinSetup.enterCurrentToContinue');
    }
    if (isDuressMode) {
      if (step === 'enter') return t('pinSetup.decoyShowsEmpty');
      return t('pinSetup.confirmDecoyAgain');
    }
    if (step === 'enter') return t('pinSetup.choosePin', { min: minDigits, max: maxDigits });
    return t('pinSetup.confirmPinAgain');
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
        className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-sm overflow-hidden border border-slate-700/50 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            {isDuressMode ? (
              <EyeSlash size={20} weight="bold" className="text-amber-400" />
            ) : (
              <Shield size={20} weight="bold" className="text-red-400" />
            )}
            <h2 className="text-lg font-bold text-white">
              {isDuressMode ? t('pinSetup.decoyPinHeader') : t('pinSetup.securityPin')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">{getTitle()}</h3>
            <p className={`text-sm ${isLockedOut ? 'text-red-400' : 'text-slate-400'}`}>{getSubtitle()}</p>
          </div>

          {/* Lockout Countdown - shown during verify step when locked out */}
          {step === 'verify' && isLockedOut ? (
            <div className="mb-6">
              <div className="bg-red-950/50 border border-red-900 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm mb-1">{t('pinSetup.tryAgainIn')}</p>
                <p className="text-3xl font-mono font-bold text-red-400">
                  {lockoutRemaining}
                </p>
              </div>
              <p className="text-slate-500 text-xs text-center mt-3">
                {t('pinSetup.lockoutMessage')}
              </p>
            </div>
          ) : (
            <>
              {/* PIN Dots */}
              <div className="flex justify-center gap-3 mb-6">
                {[...Array(maxDigits)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      i < currentPin.length
                        ? isDuressMode
                          ? 'bg-amber-500 border-amber-500'
                          : 'bg-red-500 border-red-500'
                        : i < minDigits
                          ? 'border-slate-500'
                          : 'border-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm mb-4">
                  <Warning size={16} weight="bold" />
                  <span>{error}</span>
                </div>
              )}

              {/* Attempts remaining warning */}
              {step === 'verify' && !error && attemptsRemaining <= 3 && attemptsRemaining > 0 && (
                <div className="flex items-center justify-center gap-2 text-amber-500 text-xs mb-4">
                  <Warning size={14} weight="bold" />
                  <span>{t('pinSetup.attemptsRemaining', { count: attemptsRemaining })}</span>
                </div>
              )}

              {/* Number Keypad */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => handleDigitPress(String(num))}
                    className="h-14 bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/60 hover:to-slate-700/60 active:from-slate-500/60 active:to-slate-600/60 rounded-xl text-white text-2xl font-bold transition-all"
                  >
                    {num}
                  </button>
                ))}
                <div /> {/* Empty space */}
                <button
                  onClick={() => handleDigitPress('0')}
                  className="h-14 bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/60 hover:to-slate-700/60 active:from-slate-500/60 active:to-slate-600/60 rounded-xl text-white text-2xl font-bold transition-all"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  className="h-14 bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/60 hover:to-slate-700/60 active:from-slate-500/60 active:to-slate-600/60 rounded-xl text-white text-xl font-bold transition-all flex items-center justify-center"
                >
                  <Backspace size={22} weight="bold" />
                </button>
              </div>

              {/* Continue Button */}
              <button
                onClick={handleContinue}
                disabled={!canContinue || isProcessing}
                className={`w-full ${isDuressMode ? 'bg-amber-600 hover:bg-amber-500 disabled:hover:bg-amber-600' : 'bg-red-700 hover:bg-red-600 disabled:hover:bg-red-700'} disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors`}
              >
                {isProcessing ? (
                  t('pinSetup.processing')
                ) : (
                  <>
                    <Check size={18} weight="bold" />
                    {step === 'confirm' || (step === 'verify' && mode === 'remove') ? t('pinSetup.save') : t('pinSetup.continue')}
                  </>
                )}
              </button>

              {/* Skip option for initial setup */}
              {baseMode === 'setup' && step === 'enter' && (
                isDuressMode ? !isDuressEnabled() : !isPinEnabled()
              ) && (
                <button
                  onClick={onClose}
                  className="w-full mt-3 text-slate-500 hover:text-slate-400 text-sm"
                >
                  {t('pinSetup.skipForNow')}
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PinSetup;
