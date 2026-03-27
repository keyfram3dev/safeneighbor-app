// src/components/LegalResponse.js
// Rapid Legal Response modal — 3-tier legal help:
//   1. Attorney from Trusted Contacts
//   2. Local legal aid orgs (auto-detected by GPS state)
//   3. National emergency hotlines (24/7 first)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  X, Scales, Phone, ChatText, MapPin, WarningCircle, Spinner, Crosshair,
  ArrowSquareOut, PlusCircle, CheckCircle, VideoCamera, Lightning,
} from '@phosphor-icons/react';
import { getTrustedContacts, addTrustedContact } from '../utils/backup/accessGrants';
import { reverseGeocode, buildLocationSmsUri } from '../utils/locationShare';
import { NATIONAL_RESOURCES, STATE_RESOURCES, ALL_STATES, INSTANT_HELP_SERVICES, SPECIALTY_FILTERS, filterOrgsBySpecialty, PROTEST_RESOURCES } from '../data/legalResourceData';

// Map common state abbreviations / full names → ALL_STATES value keys
const STATE_NAME_MAP = (() => {
  const map = {};
  ALL_STATES.forEach(({ value, label }) => {
    map[label.toLowerCase()] = value;
    map[value.toLowerCase()] = value;
  });
  // Common abbreviations
  const abbrevs = {
    al:'alabama',ak:'alaska',az:'arizona',ar:'arkansas',ca:'california',
    co:'colorado',ct:'connecticut',de:'delaware',fl:'florida',ga:'georgia',
    hi:'hawaii',id:'idaho',il:'illinois',in:'indiana',ia:'iowa',
    ks:'kansas',ky:'kentucky',la:'louisiana',me:'maine',md:'maryland',
    ma:'massachusetts',mi:'michigan',mn:'minnesota',ms:'mississippi',mo:'missouri',
    mt:'montana',ne:'nebraska',nv:'nevada',nh:'new hampshire',nj:'new jersey',
    nm:'new mexico',ny:'new york',nc:'north carolina',nd:'north dakota',oh:'ohio',
    ok:'oklahoma',or:'oregon',pa:'pennsylvania',ri:'rhode island',sc:'south carolina',
    sd:'south dakota',tn:'tennessee',tx:'texas',ut:'utah',vt:'vermont',
    va:'virginia',wa:'washington',wv:'west virginia',wi:'wisconsin',wy:'wyoming',
    dc:'district of columbia',
  };
  Object.entries(abbrevs).forEach(([abbr, full]) => { map[abbr] = full; });
  return map;
})();

function parseStateFromAddress(stateStr) {
  if (!stateStr) return null;
  return STATE_NAME_MAP[stateStr.trim().toLowerCase()] || null;
}

// ─── Section Header ──────────────────────────────────────────
const SectionHeader = ({ icon, label, accent = 'text-slate-400' }) => (
  <div className={`flex items-center gap-2 mb-3 ${accent}`}>
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </div>
);

// ─── Call + Message row for attorney / saved org contacts ─────
const AttorneyRow = ({ contact, onMessage }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="text-white font-bold text-sm truncate">{contact.name}</p>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
          contact.relationship === 'Attorney'
            ? 'text-amber-400 bg-amber-400/10'
            : 'text-blue-400 bg-blue-400/10'
        }`}>
          {contact.relationship}
        </span>
      </div>
      <p className="text-slate-500 text-xs">{contact.phone || contact.email}</p>
    </div>
    <div className="flex gap-2 shrink-0 ml-3">
      {contact.phone && (
        <a
          href={`tel:${contact.phone}`}
          aria-label={`Call ${contact.name}`}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors active:scale-95"
        >
          <Phone size={14} weight="bold" />
        </a>
      )}
      {contact.phone && (
        <button
          onClick={() => onMessage(contact)}
          aria-label={`Text ${contact.name}`}
          className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors active:scale-95"
        >
          <ChatText size={14} weight="bold" />
        </button>
      )}
    </div>
  </div>
);

// ─── Save-to-contacts button ───────────────────────────────────
const SaveButton = ({ isSaved, onSave, saveLabel, savedLabel }) => (
  <button
    onClick={onSave}
    disabled={isSaved}
    title={isSaved ? savedLabel : saveLabel}
    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors shrink-0 ${
      isSaved
        ? 'bg-teal-700/40 text-teal-400 cursor-default'
        : 'bg-slate-700/60 text-slate-400 hover:bg-slate-600 hover:text-white'
    }`}
  >
    {isSaved
      ? <CheckCircle size={13} weight="bold" />
      : <PlusCircle size={13} weight="bold" />
    }
    <span>{isSaved ? savedLabel : saveLabel}</span>
  </button>
);

// ─── Hotline row ──────────────────────────────────────────────
const HotlineRow = ({ org, isSaved, onSave, saveLabel, savedLabel }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
    <div className="min-w-0 flex-1 pr-3">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-white font-bold text-sm">{org.name}</p>
        {org.available24_7 ? (
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded uppercase tracking-wider">24/7</span>
        ) : org.hours ? (
          <span className="text-[9px] font-bold text-slate-400 bg-slate-700/60 px-1.5 py-0.5 rounded">{org.hours}</span>
        ) : null}
      </div>
      <p className="text-slate-400 text-xs mt-0.5">{org.phone}</p>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      <SaveButton isSaved={isSaved} onSave={onSave} saveLabel={saveLabel} savedLabel={savedLabel} />
      <a
        href={`tel:${org.phone}`}
        aria-label={`Call ${org.name}`}
        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors active:scale-95"
      >
        <Phone size={14} weight="bold" />
      </a>
    </div>
  </div>
);

// ─── Local org row ────────────────────────────────────────────
const LocalOrgRow = ({ org, isSaved, onSave, saveLabel, savedLabel }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-slate-700/50 last:border-0">
    <div className="min-w-0 flex-1 pr-3">
      <p className="text-white font-bold text-sm">{org.name}</p>
      {org.city && <p className="text-slate-500 text-xs">{org.city}</p>}
      {org.services && (
        <p className="text-slate-500 text-xs mt-0.5 truncate">{org.services.slice(0, 3).join(' · ')}</p>
      )}
    </div>
    {org.phone && (
      <div className="flex items-center gap-1.5 shrink-0">
        <SaveButton isSaved={isSaved} onSave={onSave} saveLabel={saveLabel} savedLabel={savedLabel} />
        <a
          href={`tel:${org.phone}`}
          aria-label={`Call ${org.name}`}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors active:scale-95"
        >
          <Phone size={14} weight="bold" />
        </a>
      </div>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────
const LegalResponse = ({ isOpen, onClose, onOpenTrustedContacts, onOpenLegalDirectory }) => {
  const { t } = useTranslation();
  const [selectedState, setSelectedState] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [isLocating, setIsLocating] = useState(false);
  const [locationData, setLocationData] = useState(null); // { address, lat, lng }
  const [saveVersion, setSaveVersion] = useState(0); // bump to re-derive from localStorage

  // Name prompt state (shown before sending SMS)
  const [namePromptContact, setNamePromptContact] = useState(null);
  const [nameInput, setNameInput] = useState('');

  // Always read live from localStorage — saveVersion bump triggers re-read
  const [allContacts, setAllContacts] = useState([]);
  useEffect(() => {
    (async () => {
      setAllContacts(await getTrustedContacts());
    })();
  }, [saveVersion, isOpen]);
  const savedPhones = useMemo(
    () => new Set(allContacts.map((c) => c.phone).filter(Boolean)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saveVersion, isOpen]
  );
  const attorneyContacts = allContacts.filter(
    (c) => (c.relationship === 'Attorney' || c.relationship === 'Organization') && (c.phone || c.email)
  );

  const stateData = selectedState && STATE_RESOURCES[selectedState] ? STATE_RESOURCES[selectedState] : null;
  const allStateOrgs = stateData ? stateData.organizations.filter((o) => o.phone) : [];
  const stateOrgs = filterOrgsBySpecialty(allStateOrgs, selectedSpecialty).slice(0, 8);
  const barAssociation = stateData?.barAssociation || null;
  const protestChapters = (selectedSpecialty === 'protest' && selectedState && PROTEST_RESOURCES[selectedState]) || [];

  const hotlines24_7 = NATIONAL_RESOURCES.hotlines.filter((h) => h.available24_7 && h.phone);
  const hotlinesBusiness = NATIONAL_RESOURCES.hotlines.filter((h) => !h.available24_7 && h.phone);

  // Opt-in location detect — no localStorage persistence
  const detectState = useCallback(async () => {
    setIsLocating(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) { reject(new Error('Geolocation not supported')); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        });
      });
      const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (geo.state) {
        const stateKey = parseStateFromAddress(geo.state);
        if (stateKey) setSelectedState(stateKey);
      }
      if (geo.address) {
        setLocationData({
          address: geo.address,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      }
    } catch {
      // GPS unavailable — user can still pick state manually
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Refresh saved contacts when modal reopens; reset state when closed
  useEffect(() => {
    if (isOpen) {
      setSaveVersion((v) => v + 1);
    } else {
      setSelectedState('');
      setSelectedSpecialty('all');
      setLocationData(null);
      setNamePromptContact(null);
      setNameInput('');
    }
  }, [isOpen]);

  // Show name prompt before sending SMS
  const promptForName = useCallback((contact) => {
    setNameInput(localStorage.getItem('safeneighbor_user_name') || '');
    setNamePromptContact(contact);
  }, []);

  // Build SMS for attorney message (no localStorage persistence)
  const handleMessage = useCallback(async (contact, overrideName) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userName = overrideName || localStorage.getItem('safeneighbor_user_name') || t('legalResponse.anonymousUser');
    const contactName = contact.name || '';
    let message;
    if (locationData) {
      message = t('legalResponse.smsMessage', {
        contactName,
        userName,
        time,
        address: locationData.address || 'unknown',
        coords: `${locationData.lat}, ${locationData.lng}`,
        mapsLink: `https://maps.google.com/maps?q=${locationData.lat},${locationData.lng}`,
      });
    } else {
      // Try a quick silent location grab (no localStorage save)
      try {
        const pos = await new Promise((resolve, reject) => {
          if (!('geolocation' in navigator)) { reject(new Error('No geolocation')); return; }
          const timer = setTimeout(() => reject(new Error('Timeout')), 5000);
          navigator.geolocation.getCurrentPosition(
            (p) => { clearTimeout(timer); resolve(p); },
            (e) => { clearTimeout(timer); reject(e); },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        });
        const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        message = t('legalResponse.smsMessage', {
          contactName,
          userName,
          time,
          address: geo.address || 'unknown',
          coords: `${pos.coords.latitude}, ${pos.coords.longitude}`,
          mapsLink: `https://maps.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
        });
      } catch {
        message = t('legalResponse.smsMessageNoLocation', { contactName, userName, time });
      }
    }
    const uri = buildLocationSmsUri([contact], message);
    window.open(uri, '_self');
  }, [locationData, t]);

  // Confirm name and send SMS
  const confirmNameAndSend = useCallback(() => {
    const name = nameInput.trim();
    if (name) localStorage.setItem('safeneighbor_user_name', name);
    const contact = namePromptContact;
    setNamePromptContact(null);
    setNameInput('');
    if (contact) handleMessage(contact, name);
  }, [nameInput, namePromptContact, handleMessage]);

  // Save a hotline or org to Trusted Contacts
  const handleSaveOrg = useCallback(async (org) => {
    if (!org.phone || savedPhones.has(org.phone)) return;
    try {
      await addTrustedContact({
        name: org.name,
        phone: org.phone,
        relationship: 'Organization',
        email: '',
      });
      setSaveVersion((v) => v + 1); // trigger re-render to re-read from localStorage
    } catch (error) {
      alert(t('trustedContacts.saveContactFailed'));
    }
  }, [savedPhones, t]);

  const saveLabel = t('legalResponse.saveContact');
  const savedLabel = t('legalResponse.contactSaved');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm safe-modal-frame"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="safe-modal-panel bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-2xl w-full max-w-md overflow-hidden border border-slate-700/50 flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="safe-modal-header flex items-center justify-between p-4 border-b border-slate-700/50 shrink-0">
              <div className="flex items-center gap-2">
                <Scales size={20} weight="bold" className="text-amber-400" />
                <h2 className="text-lg font-bold text-white">{t('legalResponse.title')}</h2>
              </div>
              <button
                onClick={onClose}
                className="safe-modal-close p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-white/80"
                aria-label="Close legal response"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">

              {/* ── Section 0: Instant Legal Help ── */}
              <div>
                <SectionHeader
                  icon={<Lightning size={14} weight="bold" />}
                  label={t('legalResponse.instantHelp')}
                  accent="text-red-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  {INSTANT_HELP_SERVICES.map((svc) => (
                    <a
                      key={svc.id}
                      href={svc.type === 'phone' ? `tel:${svc.phone}` : svc.url}
                      target={svc.type === 'video' ? '_blank' : undefined}
                      rel={svc.type === 'video' ? 'noopener noreferrer' : undefined}
                      className="flex flex-col items-center gap-2 bg-gradient-to-b from-red-600/20 to-red-900/10 border border-red-500/30 hover:border-red-400/50 rounded-xl p-3 transition-all active:scale-95 text-center"
                    >
                      <div className="p-2 bg-red-500/20 rounded-full">
                        {svc.type === 'video'
                          ? <VideoCamera size={20} weight="bold" className="text-red-400" />
                          : <Phone size={20} weight="bold" className="text-red-400" />
                        }
                      </div>
                      <div>
                        <p className="text-white font-bold text-xs">{t(`legalResponse.${svc.id.replace('instant-', '')}Button`)}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{t(`legalResponse.${svc.id.replace('instant-', '')}Desc`)}</p>
                        <p className="text-slate-500 text-[9px] mt-0.5 font-medium">{svc.name}{svc.phone ? ` · ${svc.phone}` : ''}</p>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {svc.available24_7 ? '24/7' : ''}
                        {svc.type === 'phone' ? ' FREE' : ''}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* ── Section 1: Your Attorney ── */}
              <div>
                <SectionHeader
                  icon={<Scales size={14} weight="bold" />}
                  label={t('legalResponse.yourAttorney')}
                  accent="text-amber-400"
                />
                {attorneyContacts.length > 0 ? (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-3">
                    {attorneyContacts.map((c) => (
                      <AttorneyRow key={c.id} contact={c} onMessage={promptForName} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between">
                    <p className="text-slate-400 text-sm">{t('legalResponse.noAttorney')}</p>
                    <button
                      onClick={onOpenTrustedContacts}
                      className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors shrink-0 ml-3"
                    >
                      {t('legalResponse.addAttorney')}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Section 2: Local Legal Aid ── */}
              <div>
                <div className="mb-3">
                  <SectionHeader
                    icon={<MapPin size={14} weight="bold" />}
                    label={t('legalResponse.localAid')}
                    accent="text-blue-400"
                  />
                </div>

                <div className="flex gap-2 mb-2">
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 256 256'%3E%3Cpath d='M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  >
                    <option value="">{t('legalResponse.selectState')}</option>
                    {ALL_STATES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={detectState}
                    disabled={isLocating}
                    className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-400 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors active:scale-95 shrink-0 disabled:opacity-50"
                    title={t('legalResponse.detectState')}
                  >
                    {isLocating
                      ? <Spinner size={14} className="animate-spin" />
                      : <Crosshair size={14} weight="bold" />
                    }
                    <span className="hidden sm:inline">{t('legalResponse.detectState')}</span>
                  </button>
                </div>

                {/* Specialty filter pills */}
                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                  {SPECIALTY_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedSpecialty(f.id)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                        selectedSpecialty === f.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/60 text-slate-400 hover:bg-slate-600 hover:text-white'
                      }`}
                    >
                      {t(f.labelKey)}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 min-h-[56px] flex flex-col justify-center">
                  {stateOrgs.length > 0 ? (
                    stateOrgs.map((o) => (
                      <LocalOrgRow key={o.id} org={o}
                        isSaved={savedPhones.has(o.phone)}
                        onSave={() => handleSaveOrg(o)}
                        saveLabel={saveLabel} savedLabel={savedLabel}
                      />
                    ))
                  ) : (
                    <div className="py-3 text-center">
                      <p className="text-slate-500 text-sm">
                        {!selectedState ? t('legalResponse.selectState')
                          : selectedSpecialty !== 'all' && allStateOrgs.length > 0
                            ? t('legalResponse.noFilterResults')
                            : t('legalResponse.noLocalOrgs')
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* NLG Protest Chapters (shown when Protest filter active) */}
                {protestChapters.length > 0 && (
                  <div className="mt-2 bg-purple-500/5 border border-purple-500/20 rounded-xl px-3">
                    <div className="flex items-center gap-2 py-2 border-b border-purple-500/10">
                      <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">{t('legalResponse.nlgChapters')}</span>
                    </div>
                    {protestChapters.map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-white font-bold text-sm">{ch.name}</p>
                          <p className="text-slate-500 text-xs">{ch.city}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <SaveButton isSaved={savedPhones.has(ch.phone)} onSave={() => handleSaveOrg(ch)} saveLabel={saveLabel} savedLabel={savedLabel} />
                          <a
                            href={`tel:${ch.phone}`}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors active:scale-95"
                          >
                            <Phone size={14} weight="bold" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bar Association Referral */}
                {barAssociation && (
                  <div className="flex items-center justify-between mt-2 bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-slate-300 text-xs font-medium truncate">{barAssociation.name}</p>
                      <p className="text-slate-500 text-[10px]">{t('legalResponse.barReferral')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <SaveButton isSaved={savedPhones.has(barAssociation.phone)} onSave={() => handleSaveOrg(barAssociation)} saveLabel={saveLabel} savedLabel={savedLabel} />
                      <a
                        href={`tel:${barAssociation.phone}`}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors active:scale-95"
                      >
                        <Phone size={14} weight="bold" />
                      </a>
                    </div>
                  </div>
                )}

                {/* View all link */}
                {onOpenLegalDirectory && selectedState && stateOrgs.length > 0 && (
                  <button
                    onClick={onOpenLegalDirectory}
                    className="flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ArrowSquareOut size={12} weight="bold" />
                    {t('legalResponse.viewAll')}
                  </button>
                )}
              </div>

              {/* ── Quick Links ── */}
              <div>
                <SectionHeader
                  icon={<ArrowSquareOut size={14} weight="bold" />}
                  label={t('legalResponse.quickLinks')}
                  accent="text-emerald-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: t('legalResponse.iceLocatorLabel'), url: 'https://locator.ice.gov/odls/', gov: true },
                    { label: t('legalResponse.immAdvocatesLabel'), url: 'https://www.immigrationadvocates.org/nonprofit/legaldirectory/' },
                    { label: t('legalResponse.ailaLabel'), url: 'https://ailalawyer.com' },
                    { label: t('legalResponse.acluLabel'), url: 'https://www.aclu.org/know-your-rights/immigrants-rights' },
                  ].map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (link.gov && !window.confirm(t('legalResponse.govSiteWarning'))) {
                          e.preventDefault();
                        }
                      }}
                      className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 hover:border-emerald-500/30 rounded-lg px-3 py-2.5 transition-colors"
                    >
                      <ArrowSquareOut size={12} weight="bold" className="text-emerald-400 shrink-0" />
                      <span className="text-slate-300 text-xs font-medium">{link.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* ── Section 3: Emergency Hotlines ── */}
              <div>
                <SectionHeader
                  icon={<Phone size={14} weight="bold" />}
                  label={t('legalResponse.hotlines')}
                  accent="text-red-400"
                />
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3">
                  {hotlines24_7.map((h) => (
                    <HotlineRow key={h.id} org={h}
                      isSaved={savedPhones.has(h.phone)}
                      onSave={() => handleSaveOrg(h)}
                      saveLabel={saveLabel} savedLabel={savedLabel}
                    />
                  ))}
                  {hotlinesBusiness.map((h) => (
                    <HotlineRow key={h.id} org={h}
                      isSaved={savedPhones.has(h.phone)}
                      onSave={() => handleSaveOrg(h)}
                      saveLabel={saveLabel} savedLabel={savedLabel}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Name Prompt Overlay */}
            <AnimatePresence>
              {namePromptContact && (
                <motion.div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setNamePromptContact(null)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600/50 rounded-2xl p-5 mx-4 w-full max-w-sm shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-white font-bold text-base mb-1">{t('legalResponse.namePromptTitle')}</h3>
                    <p className="text-slate-400 text-xs mb-4 leading-relaxed">{t('legalResponse.namePromptDescription')}</p>
                    <label htmlFor="legal-response-name-prompt" className="sr-only">
                      {t('legalResponse.namePromptTitle')}
                    </label>
                    <input
                      id="legal-response-name-prompt"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) confirmNameAndSend(); }}
                      placeholder={t('legalResponse.namePromptPlaceholder')}
                      autoComplete="name"
                      className="w-full bg-slate-700/60 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-emerald-400 focus:border-emerald-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNamePromptContact(null)}
                        className="flex-1 text-slate-400 hover:text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                      >
                        {t('legalResponse.namePromptCancel')}
                      </button>
                      <button
                        onClick={confirmNameAndSend}
                        disabled={!nameInput.trim()}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold py-2.5 rounded-xl transition-colors active:scale-95"
                      >
                        <ChatText size={16} weight="bold" />
                        {t('legalResponse.namePromptSend')}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="px-4 pb-4 pt-3 border-t border-slate-700/50 shrink-0 space-y-3">
              <button
                onClick={onOpenTrustedContacts}
                className="w-full flex items-center justify-center gap-2 bg-slate-700/60 hover:bg-slate-600 text-slate-300 hover:text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors active:scale-95"
              >
                <ArrowSquareOut size={14} weight="bold" />
                {t('legalResponse.manageTrustedContacts')}
              </button>
              <div className="flex items-start gap-2 text-slate-500">
                <WarningCircle size={14} weight="bold" className="shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">{t('legalResponse.disclaimer')}</p>
              </div>
              <button
                onClick={onClose}
                className="w-full text-slate-400 hover:text-white text-sm font-medium py-1.5 transition-colors"
              >
                {t('legalResponse.close')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LegalResponse;
