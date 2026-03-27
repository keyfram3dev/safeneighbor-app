// src/components/PinEntry.js
// Lock screen PIN entry component with keypad
// Includes failed attempts protection with progressive lockout

import React, { useState, useEffect, useCallback } from 'react';
import { LockKey, LockLaminated, Backspace } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import {
  verifyPin,
  checkLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  getFailedAttempts
} from '../utils/pinAuth';

const MAX_ATTEMPTS = 5;

const PinEntry = ({ onUnlock, inline = false, title: customTitle, subtitle: customSubtitle }) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState('');

  const maxDigits = 6;
  const minDigits = 4;

  // Check lockout status on mount and update countdown
  const updateLockoutStatus = useCallback(() => {
    const lockout = checkLockout();
    setIsLockedOut(lockout.isLocked);
    setLockoutRemaining(lockout.remainingFormatted);

    if (!lockout.isLocked) {
      // Update attempts remaining display
      const failedAttempts = getFailedAttempts();
      setAttemptsRemaining(MAX_ATTEMPTS - failedAttempts);
    }

    return lockout.isLocked;
  }, []);

  // Initial check and countdown timer
  useEffect(() => {
    updateLockoutStatus();

    // Update countdown every second while locked out
    const interval = setInterval(() => {
      const stillLocked = updateLockoutStatus();
      if (!stillLocked) {
        // Lockout ended, no need to keep updating frequently
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [updateLockoutStatus]);

  // Auto-verify when PIN reaches maximum length (6 digits)
  // For shorter PINs (4-5 digits), user must wait longer or we verify after pause
  useEffect(() => {
    if (pin.length >= minDigits) {
      // Immediate verify only at max length, otherwise wait for user to stop typing
      const delay = pin.length === maxDigits ? 100 : 1500;
      const timer = setTimeout(async () => {
        await handleVerify();
      }, delay);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleDigitPress = (digit) => {
    if (isVerifying || isLockedOut) return;
    setError(false);
    if (pin.length < maxDigits) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setError(false);
    setPin(prev => prev.slice(0, -1));
  };

  const handleVerify = async () => {
    if (pin.length < minDigits || isVerifying || isLockedOut) return;

    setIsVerifying(true);
    try {
      const result = await verifyPin(pin);
      if (result.valid) {
        // Clear failed attempts on successful login
        clearFailedAttempts();
        // Pass duress state and raw PIN to parent
        onUnlock(result.isDuress, pin);
      } else {
        // Record failed attempt and check for lockout
        const lockoutResult = recordFailedAttempt();

        if (lockoutResult.isLocked) {
          setIsLockedOut(true);
          updateLockoutStatus();
        } else {
          setAttemptsRemaining(lockoutResult.attemptsRemaining);
        }

        setError(true);
        setPin('');
        // Shake animation is handled by CSS
      }
    } catch (err) {
      setError(true);
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={inline
      ? "pin-entry-shell-in flex flex-col items-center justify-center p-4"
      : "pin-entry-shell-in fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4"
    }>
      <div className={`pin-entry-panel-in bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl w-full max-w-sm text-center shadow-[0_28px_80px_-42px_rgba(15,23,42,0.92)] ${inline ? 'p-5' : 'p-8'}`}>
        {/* Lock Icon */}
        <div className={`${inline ? 'mb-2' : 'mb-4'} flex justify-center`}>
          {isLockedOut ? (
            <LockLaminated size={inline ? 48 : 64} weight="bold" className="text-amber-500" />
          ) : (
            <LockKey size={inline ? 48 : 64} weight="bold" className={inline ? "text-red-400" : "text-white"} />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-white mb-2 tracking-wide">
          {isLockedOut ? t('pinEntry.temporarilyLocked') : (customTitle || t('pinEntry.sessionLocked'))}
        </h2>

        {/* Lockout Message */}
        {isLockedOut ? (
          <div className="mb-8">
            <p className="text-red-400 text-sm mb-2">
              {t('pinEntry.tooManyAttempts')}
            </p>
            <div className="bg-red-950/50 border border-red-900 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-1">{t('pinEntry.tryAgainIn')}</p>
              <p className="text-3xl font-mono font-bold text-red-400">
                {lockoutRemaining}
              </p>
            </div>
          </div>
        ) : (
          <p className={`text-slate-400 text-sm ${inline ? 'mb-4' : 'mb-8'}`}>
            {customSubtitle || t('pinEntry.enterPinToUnlock')}
          </p>
        )}

        {/* PIN Dots - Hidden during lockout */}
        {!isLockedOut && (
          <div className={`flex justify-center gap-3 mb-4 ${error ? 'animate-shake' : ''}`}>
            {[...Array(maxDigits)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  i < pin.length
                    ? error
                      ? 'bg-red-500 border-red-500'
                      : 'bg-white border-white'
                    : 'border-slate-600'
                }`}
              />
            ))}
          </div>
        )}

        {/* Error Message with attempts remaining */}
        {error && !isLockedOut && (
          <div className="mb-4">
            <p className="text-red-400 text-sm animate-pulse">
              {t('pinEntry.incorrectPin')}
            </p>
            {attemptsRemaining <= 3 && attemptsRemaining > 0 && (
              <p className="text-amber-500 text-xs mt-1">
                {t('pinEntry.attemptsRemaining', { count: attemptsRemaining })}
              </p>
            )}
          </div>
        )}

        {/* Number Keypad - Disabled during lockout */}
        {!isLockedOut && (
          <div className={`grid grid-cols-3 gap-3 ${inline ? 'mb-4' : 'mb-8'} max-w-[280px] mx-auto`}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleDigitPress(String(num))}
                disabled={isVerifying}
                className={`${inline ? 'h-14 w-14' : 'h-16 w-16'} bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/60 hover:to-slate-700/60 active:from-slate-500/60 active:to-slate-600/60 disabled:opacity-50 rounded-full text-white text-2xl font-bold transition-all active:scale-95 mx-auto`}
              >
                {num}
              </button>
            ))}
            <div /> {/* Empty space */}
            <button
              onClick={() => handleDigitPress('0')}
              disabled={isVerifying}
              className={`${inline ? 'h-14 w-14' : 'h-16 w-16'} bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/60 hover:to-slate-700/60 active:from-slate-500/60 active:to-slate-600/60 disabled:opacity-50 rounded-full text-white text-2xl font-bold transition-all active:scale-95 mx-auto`}
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              disabled={isVerifying || pin.length === 0}
              className={`${inline ? 'h-14 w-14' : 'h-16 w-16'} bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 hover:from-slate-600/60 hover:to-slate-700/60 active:from-slate-500/60 active:to-slate-600/60 disabled:opacity-50 rounded-full text-white text-xl font-bold transition-all active:scale-95 mx-auto flex items-center justify-center`}
            >
              <Backspace size={24} weight="bold" />
            </button>
          </div>
        )}

        {/* Lockout info during lockout */}
        {isLockedOut && (
          <div className="mb-8 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <p className="text-slate-500 text-xs">
              {t('pinEntry.lockoutMessage')}
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-slate-600 text-xs uppercase tracking-wider">
          {t('app.security')}
        </p>
      </div>

      {/* Shake animation style */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default PinEntry;
