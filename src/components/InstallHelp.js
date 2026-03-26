// src/components/InstallHelp.js
// Modal walkthrough showing how to install the PWA.
// Detects browser (Safari, Chrome, Firefox, Samsung, etc.) and shows
// tailored installation instructions with optional photo guide for Safari.

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DeviceMobile, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

// Detect browser/platform for install instructions
function detectBrowser() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isSamsung = /SamsungBrowser/i.test(ua);
  const isFirefox = /Firefox/i.test(ua) && !/Seamonkey/i.test(ua);
  const isChrome = /Chrome/i.test(ua) && !/Edg|OPR|Brave|SamsungBrowser/i.test(ua);
  const isEdge = /Edg/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|OPR|Edg/i.test(ua);

  if (isIOS && isSafari) return 'safari-ios';
  if (isIOS) return 'ios-other'; // Chrome/Firefox on iOS
  if (isSamsung) return 'samsung';
  if (isAndroid && isFirefox) return 'firefox-android';
  if (isAndroid && isChrome) return 'chrome-android';
  if (isAndroid) return 'android-other';
  if (isEdge) return 'edge-desktop';
  if (isChrome) return 'chrome-desktop';
  if (isFirefox) return 'firefox-desktop';
  if (isSafari) return 'safari-desktop';
  return 'unknown';
}

const InstallHelp = ({ isOpen, onClose, onInstalled }) => {
  const { t } = useTranslation();
  const [view, setView] = useState('instructions');
  const browser = useMemo(() => detectBrowser(), []);

  useEffect(() => {
    if (isOpen) setView('instructions');
  }, [isOpen]);

  // Browser-specific instructions
  const getInstructions = () => {
    switch (browser) {
      case 'safari-ios':
        return {
          description: t('installHelp.description'),
          steps: [
            t('installHelp.step1'),
            t('installHelp.step2'),
            t('installHelp.step3'),
            t('installHelp.step4'),
          ],
          hasPhotos: true,
          photos: [
            '/install-help/Step1.jpeg',
            '/install-help/Step2.jpeg',
            '/install-help/Step3.jpeg',
            '/install-help/Step4.jpeg',
          ],
        };
      case 'ios-other':
        return {
          description: t('installHelp.iosOtherDesc', 'Install SafeNeighbor as an app on your iPhone for offline access and a native experience.'),
          steps: [
            t('installHelp.iosOtherStep1', 'Tap the Share button (□↑) in the bottom-right corner of Chrome.'),
            t('installHelp.iosOtherStep2', 'Tap "View More" to see all options.'),
            t('installHelp.iosOtherStep3', 'Scroll down and tap "Add to Home Screen" to install SafeNeighbor.'),
          ],
          hasPhotos: true,
          photos: [
            '/install-help/ChromeStep1.jpeg',
            '/install-help/ChromeStep2.jpeg',
            '/install-help/ChromeStep3.jpeg',
          ],
        };
      case 'chrome-android':
        return {
          description: t('installHelp.chromeAndroidDesc', 'Install SafeNeighbor as an app on your Android device for offline access and a native experience.'),
          steps: [
            t('installHelp.chromeAndroidStep1', 'Tap the ⋮ menu button in the top-right corner of Chrome.'),
            t('installHelp.chromeAndroidStep2', 'Tap "Add to Home screen" or "Install app" from the menu.'),
            t('installHelp.chromeAndroidStep3', 'Tap "Install" on the confirmation popup.'),
            t('installHelp.chromeAndroidStep4', 'SafeNeighbor will appear on your home screen as an app.'),
          ],
          hasPhotos: false,
        };
      case 'samsung':
        return {
          description: t('installHelp.samsungDesc', 'Install SafeNeighbor as an app on your Samsung device.'),
          steps: [
            t('installHelp.samsungStep1', 'Tap the ≡ menu button at the bottom-right of Samsung Internet.'),
            t('installHelp.samsungStep2', 'Tap "Add page to" from the menu.'),
            t('installHelp.samsungStep3', 'Select "Home screen."'),
            t('installHelp.samsungStep4', 'Tap "Add" to install SafeNeighbor on your home screen.'),
          ],
          hasPhotos: false,
        };
      case 'firefox-android':
        return {
          description: t('installHelp.firefoxAndroidDesc', 'Install SafeNeighbor as an app using Firefox on Android.'),
          steps: [
            t('installHelp.firefoxAndroidStep1', 'Tap the ⋮ menu button in the top-right corner of Firefox.'),
            t('installHelp.firefoxAndroidStep2', 'Tap "Install" from the menu.'),
            t('installHelp.firefoxAndroidStep3', 'Confirm by tapping "Add" on the popup.'),
            t('installHelp.firefoxAndroidStep4', 'SafeNeighbor will be added to your home screen.'),
          ],
          hasPhotos: false,
        };
      case 'chrome-desktop':
        return {
          description: t('installHelp.chromeDesktopDesc', 'Install SafeNeighbor as a desktop app for quick access and offline use.'),
          steps: [
            t('installHelp.chromeDesktopStep1', 'Look for the install icon (⊕) in the right side of the address bar.'),
            t('installHelp.chromeDesktopStep2', 'Click "Install" on the popup that appears.'),
            t('installHelp.chromeDesktopStep3', 'If no icon appears, click the ⋮ menu → "Save and Share" → "Install SafeNeighbor."'),
            t('installHelp.chromeDesktopStep4', 'SafeNeighbor will open as its own app window.'),
          ],
          hasPhotos: false,
        };
      case 'edge-desktop':
        return {
          description: t('installHelp.edgeDesktopDesc', 'Install SafeNeighbor as a desktop app using Microsoft Edge.'),
          steps: [
            t('installHelp.edgeDesktopStep1', 'Look for the install icon (⊕) in the address bar.'),
            t('installHelp.edgeDesktopStep2', 'Click "Install" on the popup.'),
            t('installHelp.edgeDesktopStep3', 'Or click the ••• menu → "Apps" → "Install SafeNeighbor."'),
            t('installHelp.edgeDesktopStep4', 'SafeNeighbor will open as its own app window.'),
          ],
          hasPhotos: false,
        };
      case 'safari-desktop':
        return {
          description: t('installHelp.safariDesktopDesc', 'Add SafeNeighbor to your Mac Dock from Safari.'),
          steps: [
            t('installHelp.safariDesktopStep1', 'Click the Share button (□↑) in the Safari toolbar.'),
            t('installHelp.safariDesktopStep2', 'Click "Add to Dock" from the menu.'),
            t('installHelp.safariDesktopStep3', 'Click "Add" to confirm.'),
            t('installHelp.safariDesktopStep4', 'SafeNeighbor will appear in your Dock as a standalone app.'),
          ],
          hasPhotos: false,
        };
      default:
        return {
          description: t('installHelp.defaultDesc', 'Install SafeNeighbor as an app for offline access. Look for an "Install" or "Add to Home Screen" option in your browser menu.'),
          steps: [
            t('installHelp.defaultStep1', 'Open your browser\'s menu (usually ⋮ or ••• in the corner).'),
            t('installHelp.defaultStep2', 'Look for "Install app," "Add to Home Screen," or similar option.'),
            t('installHelp.defaultStep3', 'Confirm the installation when prompted.'),
            t('installHelp.defaultStep4', 'SafeNeighbor will be available as an app on your device.'),
          ],
          hasPhotos: false,
        };
    }
  };

  const instructions = getInstructions();

  // Browser-specific photo guide steps
  const photoSteps = (instructions.photos || []).map((image, idx) => ({
    image,
    caption: instructions.steps[idx],
  }));

  const handleInstalled = () => {
    onInstalled?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-slate-700/50 flex flex-col relative overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <DeviceMobile size={20} weight="bold" className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">{t('installHelp.title')}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-white/80"
                aria-label="Close install help"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {view === 'instructions' ? (
                /* ── View 1: Text Instructions ── */
                <motion.div
                  key="instructions"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                  className="p-5 overflow-y-auto overscroll-contain flex-1 flex flex-col"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <p className="text-slate-400 text-sm mb-5">
                    {instructions.description}
                  </p>

                  <div className="space-y-4 flex-1">
                    {instructions.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <p className="text-slate-300 text-sm leading-relaxed pt-0.5">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    {instructions.hasPhotos ? (
                      <button
                        onClick={() => setView('photos')}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-95"
                      >
                        {t('installHelp.viewScreenshots')}
                        <ArrowRight size={16} weight="bold" />
                      </button>
                    ) : (
                      <button
                        onClick={handleInstalled}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-95"
                      >
                        <CheckCircle size={18} weight="bold" />
                        {t('installHelp.doneInstalled')}
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* ── View 2: Photo Guide ── */
                <motion.div
                  key="photos"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                  className="p-5 overflow-y-auto overscroll-contain flex-1"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="space-y-6">
                    {photoSteps.map((step, idx) => (
                      <div key={idx}>
                        <div className="flex items-start gap-3 mb-3">
                          <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <p className="text-slate-300 text-sm leading-relaxed pt-0.5">
                            {step.caption}
                          </p>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50">
                          <img
                            src={step.image}
                            alt={`Step ${idx + 1}: ${step.caption}`}
                            className="w-full h-auto"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={handleInstalled}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-95"
                    >
                      <CheckCircle size={18} weight="bold" />
                      {t('installHelp.doneInstalled')}
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full text-slate-400 hover:text-white text-sm font-medium py-2 transition-colors"
                    >
                      {t('installHelp.gotIt')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallHelp;
