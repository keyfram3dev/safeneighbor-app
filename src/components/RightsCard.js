// src/components/RightsCard.js
// Offline "Know Your Rights" card — two-sided wallet card inspired by ILRC Red Card.
// Side 1: Quick reference instructions for the person.
// Side 2: Formal constitutional assertions to show/give to an agent.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  IdentificationCardIcon as IdentificationCard,
  ShareNetwork,
  EnvelopeSimple,
  CopySimple,
  Printer,
  ShieldCheck,
  Phone,
  DownloadSimple,
  Crosshair,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import useDirection from '../hooks/useDirection';
import { reverseGeocode } from '../utils/locationShare';
import { STATE_RESOURCES } from '../data/legalResourceData';
import Disclaimer from './Disclaimer';
import InstallHelp from './InstallHelp';

const JURISDICTION_STORAGE_KEY = 'safeneighbor_rights_card_state';
const STATE_NAME_MAP = (() => {
  const map = {};
  const abbrevs = {
    al:'alabama',ak:'alaska',az:'arizona',ar:'arkansas',ca:'california',co:'colorado',ct:'connecticut',
    de:'delaware',fl:'florida',ga:'georgia',hi:'hawaii',id:'idaho',il:'illinois',in:'indiana',
    ia:'iowa',ks:'kansas',ky:'kentucky',la:'louisiana',me:'maine',md:'maryland',ma:'massachusetts',
    mi:'michigan',mn:'minnesota',ms:'mississippi',mo:'missouri',mt:'montana',ne:'nebraska',
    nv:'nevada',nh:'new hampshire',nj:'new jersey',nm:'new mexico',ny:'new york',nc:'north carolina',
    nd:'north dakota',oh:'ohio',ok:'oklahoma',or:'oregon',pa:'pennsylvania',ri:'rhode island',
    sc:'south carolina',sd:'south dakota',tn:'tennessee',tx:'texas',ut:'utah',vt:'vermont',
    va:'virginia',wa:'washington',wv:'west virginia',wi:'wisconsin',wy:'wyoming',dc:'district of columbia',
  };
  Object.keys(STATE_RESOURCES).forEach((key) => { map[key] = key; });
  Object.entries(STATE_RESOURCES).forEach(([key, value]) => { map[String(value?.name || '').trim().toLowerCase()] = key; });
  Object.entries(abbrevs).forEach(([abbr, full]) => { map[abbr] = full; });
  return map;
})();

const parseStateFromAddress = (stateStr) => {
  if (!stateStr) return null;
  return STATE_NAME_MAP[String(stateStr).trim().toLowerCase()] || null;
};

const RightsCard = ({ onBack }) => {
  const { t, i18n } = useTranslation();
  const { isRTL, dir } = useDirection();
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [selectedState, setSelectedState] = useState(
    () => localStorage.getItem(JURISDICTION_STORAGE_KEY) || localStorage.getItem('safeneighbor_home_state') || ''
  );
  const [isLocatingState, setIsLocatingState] = useState(false);

  const trackEvent = (event, data) => { if (window.umami) window.umami.track(event, data); };
  const stateOptions = useMemo(
    () => Object.entries(STATE_RESOURCES)
      .map(([key, value]) => ({ key, name: value.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const selectedStateName = selectedState ? STATE_RESOURCES[selectedState]?.name || selectedState : '';

  const getJurisdictionNote = useCallback(() => {
    if (!selectedStateName) {
      return t('rightsCard.jurisdictionFallback', {
        defaultValue: 'Select your state so this card follows your local context, especially if you later need recording-law details or attorney resources.',
      });
    }
    return t('rightsCard.jurisdictionSelected', {
      defaultValue: 'Using {{state}} as your jurisdiction. Core constitutional rights still apply nationwide, but recording, consent, and local enforcement rules can vary by state.',
      state: selectedStateName,
    });
  }, [selectedStateName, t]);

  const persistState = useCallback((stateKey) => {
    setSelectedState(stateKey);
    if (!stateKey) {
      localStorage.removeItem(JURISDICTION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(JURISDICTION_STORAGE_KEY, stateKey);
    localStorage.setItem('safeneighbor_home_state', stateKey);
  }, []);

  const detectState = useCallback(async () => {
    setIsLocatingState(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) { reject(new Error('Geolocation not supported')); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      const stateKey = parseStateFromAddress(geo.state);
      if (stateKey) {
        persistState(stateKey);
        trackEvent('rights_card_jurisdiction', { method: 'geolocation', state: stateKey });
      }
    } catch {
      // Manual selection remains available.
    } finally {
      setIsLocatingState(false);
    }
  }, [persistState]);

  useEffect(() => {
    let cancelled = false;
    if (selectedState || !navigator.permissions?.query) return undefined;
    navigator.permissions.query({ name: 'geolocation' })
      .then((result) => {
        if (!cancelled && result.state === 'granted') {
          detectState();
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [detectState, selectedState]);

  // ── Plain text version for copy/email/share ──────────────
  const getPlainText = () => {
    const lines = [];
    lines.push(t('rightsCard.cardHeader'));
    lines.push('');
    if (selectedStateName) {
      lines.push(`${t('rightsCard.jurisdictionLabel', { defaultValue: 'Jurisdiction' })}: ${selectedStateName}`);
      lines.push(getJurisdictionNote());
      lines.push('');
    }
    lines.push(`• ${t('rightsCard.right1')}`);
    lines.push(`• ${t('rightsCard.right2')}`);
    lines.push(`• ${t('rightsCard.right3')}`);
    lines.push(`• ${t('rightsCard.right4')}`);
    lines.push(`• ${t('rightsCard.right5')}`);
    lines.push('');
    lines.push('─'.repeat(40));
    lines.push('');
    lines.push(t('rightsCard.agentHeader').toUpperCase());
    lines.push('');
    lines.push(t('rightsCard.assertion1'));
    lines.push('');
    lines.push(t('rightsCard.assertion2'));
    lines.push('');
    lines.push(t('rightsCard.assertion3'));
    lines.push('');
    lines.push(t('rightsCard.assertion4'));
    lines.push('');
    lines.push(t('rightsCard.agentFooter'));
    lines.push('');
    lines.push('─'.repeat(40));
    lines.push(`${t('rightsCard.hotlineLabel')}: ${t('rightsCard.hotlineNumber')}`);
    lines.push('');
    lines.push(t('rightsCard.disclaimer'));
    lines.push('SafeNeighbor.us');
    return lines.join('\n');
  };

  // ── Share handlers (same pattern as FamilyKit) ───────────
  const handleEmail = () => {
    const text = getPlainText();
    const mailto = `mailto:?subject=${encodeURIComponent(t('rightsCard.emailSubject'))}&body=${encodeURIComponent(text)}`;
    trackEvent('rights_card_share', { method: 'email' });
    window.location.href = mailto;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getPlainText()).then(() => {
      setCopied(true);
      trackEvent('rights_card_share', { method: 'clipboard' });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      alert('Could not copy to clipboard');
    });
  };

  const handleWebShare = () => {
    if (navigator.share) {
      trackEvent('rights_card_share', { method: 'web_share' });
      navigator.share({ title: t('rightsCard.emailSubject'), text: getPlainText() }).catch(() => {});
    }
  };

  const handlePrint = () => {
    trackEvent('rights_card_share', { method: 'print' });
    const lang = i18n.language || 'en';
    const cardPairHtml = buildCardPairHtml();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t('rightsCard.emailSubject')}</title>
<style>
  @page { size: letter; margin: 0.5in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #000; }
  .print-instructions { text-align: center; font-size: 11px; color: #666; margin-bottom: 16px; padding: 8px; border: 1px dashed #ccc; border-radius: 4px; }
  .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card-pair { display: contents; }
  .card { border: 2px dashed #999; border-radius: 8px; padding: 12px; width: 3.375in; height: 2.125in; overflow: hidden; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .card-dark { background: #1e293b; color: #fff; }
  .card-red { background: #b91c1c; color: #fff; }
  .card h3 { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .card-dark h3 { color: #f87171; }
  .card-red h3 { color: #fecaca; }
  .card ul { list-style: none; padding: 0; }
  .card ul li { font-size: 7.5px; line-height: 1.35; margin-bottom: 3px; padding-${isRTL ? 'right' : 'left'}: 8px; text-indent: -8px; }
  .card ul li::before { content: "• "; font-weight: bold; }
  .card-red p { font-size: 7px; line-height: 1.35; margin-bottom: 3px; }
  .card-red .assertion-bold { font-weight: 700; font-size: 7.5px; margin-top: 4px; }
  .card-red .card-footer { font-style: italic; font-size: 6.5px; margin-top: 4px; opacity: 0.85; }
  .hotline { text-align: center; font-size: 9px; margin-top: 12px; font-weight: bold; }
  @media print { .print-instructions { display: none; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="print-instructions">${t('rightsCard.printInstructions')}</div>
<div class="card-grid">
${cardPairHtml}
${cardPairHtml}
${cardPairHtml}
${cardPairHtml}
</div>
<div class="hotline">${t('rightsCard.hotlineLabel')}: ${t('rightsCard.hotlineNumber')}</div>
</body>
</html>`);
    w.document.close();
    w.print();
  };

  const buildCardPairHtml = () => {
    const escape = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `<div class="card-pair">
  <div class="card card-dark">
    <h3>${escape(t('rightsCard.cardHeader'))}</h3>
    ${selectedStateName ? `<p style="font-size:6.5px;line-height:1.3;color:#cbd5e1;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.6px;">${escape(t('rightsCard.jurisdictionLabel', { defaultValue: 'Jurisdiction' }))}: ${escape(selectedStateName)}</p>` : ''}
    <ul>
      <li>${escape(t('rightsCard.right1'))}</li>
      <li>${escape(t('rightsCard.right2'))}</li>
      <li>${escape(t('rightsCard.right3'))}</li>
      <li>${escape(t('rightsCard.right4'))}</li>
      <li>${escape(t('rightsCard.right5'))}</li>
    </ul>
  </div>
  <div class="card card-red">
    <h3>${escape(t('rightsCard.agentHeader'))}</h3>
    <p>${escape(t('rightsCard.assertion1'))}</p>
    <p>${escape(t('rightsCard.assertion2'))}</p>
    <p>${escape(t('rightsCard.assertion3'))}</p>
    <p class="assertion-bold">${escape(t('rightsCard.assertion4'))}</p>
    <p class="card-footer">${escape(t('rightsCard.agentFooter'))}</p>
  </div>
</div>`;
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto pb-24 px-4" dir={dir}>
      {/* Header */}
      <div className="pt-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft size={20} weight="bold" className="rtl:scale-x-[-1]" />
          <span className="text-sm font-medium">{t('rightsCard.backToScenarios')}</span>
        </button>
        <div className="flex items-center gap-3 mb-2">
          <IdentificationCard size={36} weight="bold" className="text-red-400" />
          <h1 className="text-3xl font-black text-white tracking-wide">{t('rightsCard.title')}</h1>
        </div>
        <p className="text-slate-400 text-sm">{t('rightsCard.subtitle')}</p>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-300">
              {t('rightsCard.jurisdictionLabel', { defaultValue: 'Jurisdiction' })}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {getJurisdictionNote()}
            </p>
          </div>
          <button
            type="button"
            onClick={detectState}
            disabled={isLocatingState}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200 transition-colors hover:bg-red-500/15 disabled:opacity-60"
          >
            <Crosshair size={16} weight="bold" />
            <span>
              {isLocatingState
                ? t('rightsCard.detectingJurisdiction', { defaultValue: 'Detecting…' })
                : t('rightsCard.detectJurisdiction', { defaultValue: 'Auto-detect' })}
            </span>
          </button>
        </div>
        <div className="mt-3">
          <select
            value={selectedState}
            onChange={(e) => {
              persistState(e.target.value);
              trackEvent('rights_card_jurisdiction', { method: 'manual', state: e.target.value || 'none' });
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-semibold text-white focus:border-red-500 focus:outline-none"
          >
            <option value="">{t('rightsCard.selectJurisdiction', { defaultValue: 'Select your state or DC' })}</option>
            {stateOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Side 1 — Your Rights (dark card) */}
      <div className="mb-4">
        <div className="w-full bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 border-2 border-red-600/40 rounded-xl p-5 sm:p-6 shadow-2xl shadow-red-900/20 relative overflow-hidden">
          {/* Decorative corner */}
          <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-red-600/15 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-black text-red-400 uppercase tracking-wider leading-tight">
              {t('rightsCard.cardHeader')}
            </h2>
            <ShieldCheck size={24} weight="bold" className="text-red-500/40 shrink-0" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-start gap-2.5">
                <span className="text-red-500 font-black text-sm mt-0.5 shrink-0">•</span>
                <p className="text-sm text-white leading-relaxed font-medium">
                  {t(`rightsCard.right${n}`)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {selectedStateName ? `${selectedStateName} • SafeNeighbor.us` : 'SafeNeighbor.us'}
            </span>
            <span className="text-[10px] text-slate-600">{t('rightsCard.disclaimer')}</span>
          </div>
        </div>
      </div>

      {/* Side 2 — Show to Agent (red card) */}
      <div className="mb-6">
        <div className="w-full bg-gradient-to-br from-red-700 to-red-800 border-2 border-red-500/40 rounded-xl p-5 sm:p-6 shadow-2xl shadow-red-900/30 relative overflow-hidden">
          {/* Decorative corner */}
          <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-white/10 to-transparent pointer-events-none" />

          <h2 className="text-sm sm:text-base font-black text-red-100 uppercase tracking-wider mb-4">
            {t('rightsCard.agentHeader')}
          </h2>

          <div className="space-y-3">
            <p className="text-sm text-white/90 leading-relaxed">{t('rightsCard.assertion1')}</p>
            <p className="text-sm text-white/90 leading-relaxed">{t('rightsCard.assertion2')}</p>
            <p className="text-sm text-white/90 leading-relaxed">{t('rightsCard.assertion3')}</p>
            <p className="text-base text-white font-black leading-relaxed mt-3">{t('rightsCard.assertion4')}</p>
          </div>

          <div className="mt-4 pt-3 border-t border-red-500/30">
            <p className="text-xs text-red-200/80 italic">{t('rightsCard.agentFooter')}</p>
          </div>
        </div>
      </div>

      {/* Hotline */}
      <div className="flex justify-center mb-6">
        <a
          href={`tel:${t('rightsCard.hotlineNumber')}`}
          className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-3 hover:border-red-600/40 transition-all active:scale-95"
        >
          <Phone size={20} weight="bold" className="text-red-400" />
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('rightsCard.hotlineLabel')}</p>
            <p className="text-white font-black text-lg">{t('rightsCard.hotlineNumber')}</p>
          </div>
        </a>
      </div>

      {/* Print Wallet Cards Button */}
      <button
        onClick={handlePrint}
        className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-slate-900/30 hover:shadow-slate-900/50 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-wider mb-3 border border-slate-600/50"
      >
        <Printer size={24} weight="bold" />
        {t('rightsCard.printCards')}
      </button>

      {/* Save & Share Button */}
      <button
        onClick={() => { setShowShareModal(true); trackEvent('rights_card_open_share'); }}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-wider"
      >
        <ShareNetwork size={24} weight="bold" />
        {t('rightsCard.shareTitle')}
      </button>

      {/* Screenshot Tip */}
      <div className="mt-4 bg-blue-950/30 border border-blue-700/30 rounded-xl p-3 text-center">
        <p className="text-blue-300 text-xs font-semibold">{t('rightsCard.screenshotTip')}</p>
        <p className="text-slate-500 text-[10px] mt-1">
          {/iphone|ipad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
            ? t('rightsCard.screenshotIos')
            : t('rightsCard.screenshotAndroid')}
        </p>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-8 sm:pb-6 safe-bottom-padding">
            <h3 className="text-white font-black text-lg mb-1">{t('rightsCard.shareTitle')}</h3>
            <p className="text-slate-400 text-xs mb-5">{t('rightsCard.shareDescription')}</p>

            <div className="space-y-3">
              <button onClick={handleEmail} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <EnvelopeSimple size={20} weight="bold" />
                <span>{t('rightsCard.sendEmail')}</span>
              </button>

              <button onClick={handleCopy} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <CopySimple size={20} weight="bold" />
                <span>{copied ? t('rightsCard.copied') : t('rightsCard.copyText')}</span>
              </button>

              {typeof navigator.share === 'function' && (
                <button onClick={handleWebShare} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                  <ShareNetwork size={20} weight="bold" />
                  <span>{t('rightsCard.share')}</span>
                </button>
              )}

              <button onClick={handlePrint} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <Printer size={20} weight="bold" />
                <span>{t('rightsCard.printCards')}</span>
              </button>
            </div>

            <button onClick={() => setShowShareModal(false)} className="w-full mt-4 text-slate-400 hover:text-white text-sm font-medium uppercase tracking-wider transition-colors py-2">
              {t('rightsCard.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8">
        <Disclaimer>
          {t('rightsCard.disclaimer')}
        </Disclaimer>
      </div>

      {/* Install PWA Button */}
      <div className="mt-8 text-center">
        <button
          onClick={() => {
            if (window.deferredPrompt) {
              window.deferredPrompt.prompt();
              window.deferredPrompt.userChoice.then((choice) => {
                if (choice.outcome === 'accepted') console.log('User accepted install');
                window.deferredPrompt = null;
              });
            } else {
              setShowInstallHelp(true);
            }
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 inline-flex items-center gap-2"
        >
          <DownloadSimple size={18} weight="bold" />
          {t('emergency.installButton')}
        </button>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
          {t('emergency.installRecommended')}
        </p>
      </div>
      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
};

export default RightsCard;
