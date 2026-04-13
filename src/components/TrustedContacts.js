// src/components/TrustedContacts.js
// Trusted Contact Network — manage emergency contacts and one-tap SOS alerts

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, UsersThree, Plus, Trash, EnvelopeSimple, Phone, ChatText, PaperPlaneTilt, WarningCircle, UserCirclePlus, CaretDown, CaretUp, DownloadSimple, MagnifyingGlass, Spinner, MapPin } from '@phosphor-icons/react';
import { getTrustedContacts, addTrustedContact, removeTrustedContact } from '../utils/backup/accessGrants';
import { buildLocationSmsUri, reverseGeocode } from '../utils/locationShare';
import { isKeyWrapped, unwrapMasterKeyWithPin } from '../utils/crypto';
import PinEntry from './PinEntry';
import Disclaimer from './Disclaimer';
import InstallHelp from './InstallHelp';

const TrustedContacts = ({ onBack, onOpenLegalResponse }) => {
  const { t } = useTranslation();

  const RELATIONSHIP_OPTIONS = [
    { value: 'Family', label: t('trustedContacts.relationshipFamily') },
    { value: 'Attorney', label: t('trustedContacts.relationshipAttorney') },
    { value: 'Organization', label: t('trustedContacts.relationshipOrganization') },
    { value: 'Community Organizer', label: t('trustedContacts.relationshipCommunityOrganizer') },
    { value: 'Friend', label: t('trustedContacts.relationshipFriend') },
    { value: 'Other', label: t('trustedContacts.relationshipOther') },
  ];

  const planReference = localStorage.getItem('safeneighbor_family_kit')
    ? '\n' + t('trustedContacts.planReference') + '\n'
    : '';

  const MESSAGE_TEMPLATES = [
    {
      id: 'happening-now',
      label: t('trustedContacts.templateHappeningLabel'),
      color: 'red',
      message: (name, time, location) =>
        t('trustedContacts.templateHappeningMessage', { name: name || t('trustedContacts.yourContact'), time, location, planReference }),
    },
    {
      id: 'detained',
      label: t('trustedContacts.templateDetainedLabel'),
      color: 'amber',
      message: (name, time, location) =>
        t('trustedContacts.templateDetainedMessage', { name: name || t('trustedContacts.yourContact'), time, location, planReference }),
    },
    {
      id: 'wellness',
      label: t('trustedContacts.templateWellnessLabel'),
      color: 'blue',
      message: (name, time, location) =>
        t('trustedContacts.templateWellnessMessage', { name: name || t('trustedContacts.yourContact'), time, location, planReference }),
    },
  ];
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', relationship: '' });
  const [expandedTemplate, setExpandedTemplate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [needsPin, setNeedsPin] = useState(false);
  const [pendingContact, setPendingContact] = useState(null);
  const [userName, setUserName] = useState(() => localStorage.getItem('safeneighbor_user_name') || '');
  const [showNamePrompt, setShowNamePrompt] = useState(() => !localStorage.getItem('safeneighbor_user_name'));
  const [isSending, setIsSending] = useState(false); // GPS acquisition in progress

  useEffect(() => {
    (async () => {
      const contacts = await getTrustedContacts();
      setContacts(contacts);
      // If contacts appear empty but encrypted data exists and key is PIN-locked,
      // the data is there but unreadable — prompt for PIN to decrypt
      if (contacts.length === 0 && isKeyWrapped() && localStorage.getItem('safeneighbor_trusted_contacts') !== null) {
        setNeedsPin(true);
      }
    })();
  }, []);

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaveError('');

    const contact = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      relationship: formData.relationship || 'Other',
    };

    try {
      await addTrustedContact(contact);
      setContacts(await getTrustedContacts());
      setFormData({ name: '', phone: '', email: '', relationship: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to save trusted contact:', error);
      if (isKeyWrapped()) {
        setPendingContact(contact);
        setNeedsPin(true);
      } else {
        setSaveError(t('trustedContacts.saveContactFailed'));
      }
    }
  };

  const handlePinUnlock = async (isDuress, pin) => {
    if (isDuress || !pin) {
      setNeedsPin(false);
      setPendingContact(null);
      return;
    }
    try {
      await unwrapMasterKeyWithPin(pin);
      if (pendingContact) {
        await addTrustedContact(pendingContact);
        setFormData({ name: '', phone: '', email: '', relationship: '' });
        setShowForm(false);
        setPendingContact(null);
      }
      setContacts(await getTrustedContacts());
      setNeedsPin(false);
    } catch (err) {
      console.error('Failed to unlock and save contact:', err);
      setSaveError(t('trustedContacts.saveContactFailed'));
      setNeedsPin(false);
      setPendingContact(null);
    }
  };

  const handleRemoveContact = async (id) => {
    try {
      const updated = await removeTrustedContact(id);
      setContacts(updated);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to remove trusted contact:', error);
      alert(t('trustedContacts.deleteContactFailed'));
    }
  };

  const handleSendSOS = useCallback(async (template) => {
    const phoneNumbers = contacts.filter(c => c.phone).map(c => c.phone);
    const emails = contacts.filter(c => c.email).map(c => c.email);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setIsSending(true);

    // Grab GPS without localStorage persistence (5s timeout, silent fail)
    let location = '';
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
      const { latitude, longitude } = pos.coords;
      const geo = await reverseGeocode(latitude, longitude).catch(() => ({}));
      const mapsLink = `https://maps.google.com/maps?q=${latitude},${longitude}`;
      location = `${t('trustedContacts.lastKnownLocation')}:\n${geo.address || t('trustedContacts.unknownAddress')}\nGPS: ${latitude}, ${longitude}\n${mapsLink}`;
    } catch {
      location = t('trustedContacts.locationUnavailable');
    }

    setIsSending(false);

    const body = template.message(userName, time, location);
    if (window.umami) window.umami.track('sos_alert', { template: template.id, contacts: contacts.length });

    // Try SMS first (mobile), then email fallback
    if (phoneNumbers.length > 0) {
      window.location.href = buildLocationSmsUri(contacts, body);
    } else if (emails.length > 0) {
      const mailto = `mailto:${emails.join(',')}?subject=${encodeURIComponent(t('trustedContacts.emailSubject'))}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    } else {
      // Web Share API fallback
      if (navigator.share) {
        navigator.share({ title: t('trustedContacts.shareTitle'), text: body }).catch(() => {});
      } else {
        // Copy to clipboard as last resort
        navigator.clipboard.writeText(body).then(() => {
          alert(t('trustedContacts.clipboardCopied'));
        }).catch(() => {
          alert(t('trustedContacts.noContactMethods'));
        });
      }
    }
  }, [contacts, userName, t]);

  const handleSaveUserName = () => {
    localStorage.setItem('safeneighbor_user_name', userName);
    setShowNamePrompt(false);
  };

  if (needsPin) {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4 pt-3">
        <PinEntry
          onUnlock={handlePinUnlock}
          inline
          title="Unlock Contacts"
          subtitle="Your contacts are encrypted. Enter your PIN to view and manage them."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Header */}
      <div className="pt-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={20} weight="bold" className="rtl:scale-x-[-1]" />
          <span className="text-sm font-medium">{t('trustedContacts.backToScenarios')}</span>
        </button>
        <div className="flex items-center gap-3 mb-2">
          <UsersThree size={36} weight="bold" className="text-amber-400" />
          <h1 className="text-3xl font-black text-white tracking-wide flex-1">{t('trustedContacts.title')}</h1>
          {onOpenLegalResponse && (
            <button
              onClick={onOpenLegalResponse}
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider transition-colors flex-shrink-0"
            >
              <MagnifyingGlass size={16} weight="bold" />
              <span className="hidden sm:inline">{t('trustedContacts.searchContacts')}</span>
              <span className="sm:hidden">{t('trustedContacts.search')}</span>
            </button>
          )}
        </div>
        <p className="text-slate-400 text-sm">
          {t('trustedContacts.subtitle')}
        </p>
      </div>

      {/* Your Name (for message personalization) */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('trustedContacts.yourNameLabel')}</p>
            {userName && !showNamePrompt ? (
              <p className="text-white font-semibold">{userName}</p>
            ) : (
              <p className="text-slate-500 text-sm italic">{t('trustedContacts.nameNotSet')}</p>
            )}
          </div>
          <button
            onClick={() => setShowNamePrompt(!showNamePrompt)}
            className="text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-amber-400 rounded"
          >
            {showNamePrompt ? t('trustedContacts.cancel') : t('trustedContacts.edit')}
          </button>
        </div>
        {showNamePrompt && (
          <div className="mt-3 flex gap-2">
            <label htmlFor="trusted-contacts-user-name" className="sr-only">
              {t('trustedContacts.yourNameLabel')}
            </label>
            <input
              id="trusted-contacts-user-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder={t('trustedContacts.namePlaceholder')}
              autoComplete="name"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-amber-400 focus:border-amber-500"
            />
            <button
              onClick={handleSaveUserName}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-amber-300"
            >
              {t('trustedContacts.save')}
            </button>
          </div>
        )}
      </div>

      {/* Contact List */}
      <div className="mb-6">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          {t('trustedContacts.yourContactsHeading', { count: contacts.length })}
        </h4>

        {contacts.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-700/40 border-dashed rounded-2xl p-8 text-center">
            <UserCirclePlus size={40} weight="bold" className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm mb-1">{t('trustedContacts.noContactsYet')}</p>
            <p className="text-slate-600 text-xs">{t('trustedContacts.noContactsHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{contact.name}</p>
                    <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mt-0.5">
                      {contact.relationship}
                    </p>
                    {contact.phone && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Phone size={14} weight="bold" className="text-slate-500" />
                        <a href={`tel:${contact.phone}`} className="text-slate-400 text-sm hover:text-white transition-colors">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <EnvelopeSimple size={14} weight="bold" className="text-slate-500" />
                        <a href={`mailto:${contact.email}`} className="text-slate-400 text-sm hover:text-white transition-colors truncate">
                          {contact.email}
                        </a>
                      </div>
                    )}
                  </div>
                  <div>
                    {deleteConfirm === contact.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveContact(contact.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          {t('trustedContacts.delete')}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          {t('trustedContacts.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(contact.id)}
                        className="p-2 text-slate-600 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-red-400"
                        aria-label={`Delete ${contact.name}`}
                      >
                        <Trash size={18} weight="bold" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Contact Button / Form */}
        {showForm ? (
          <form onSubmit={handleAddContact} className="mt-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-amber-700/40 rounded-2xl p-5">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <UserCirclePlus size={20} weight="bold" className="text-amber-400" />
              {t('trustedContacts.addTrustedContact')}
            </h4>

            <div className="space-y-3">
              <div>
                <label htmlFor="trusted-contact-name" className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t('trustedContacts.nameLabel')}</label>
                <input
                  id="trusted-contact-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('trustedContacts.namePlaceholderFull')}
                  autoComplete="name"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-amber-400 focus:border-amber-500"
                />
              </div>
              <div>
                <label htmlFor="trusted-contact-phone" className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t('trustedContacts.phoneLabel')}</label>
                <input
                  id="trusted-contact-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('trustedContacts.phonePlaceholder')}
                  autoComplete="tel"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-amber-400 focus:border-amber-500"
                />
              </div>
              <div>
                <label htmlFor="trusted-contact-email" className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t('trustedContacts.emailLabel')}</label>
                <input
                  id="trusted-contact-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('trustedContacts.emailPlaceholder')}
                  autoComplete="email"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-amber-400 focus:border-amber-500"
                />
              </div>
              <div>
                <label htmlFor="trusted-contact-relationship" className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t('trustedContacts.relationshipLabel')}</label>
                <select
                  id="trusted-contact-relationship"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base sm:text-sm appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-amber-400 focus:border-amber-500"
                >
                  <option value="">{t('trustedContacts.selectRelationship')}</option>
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {saveError && (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {saveError}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                type="submit"
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-amber-300"
              >
                {t('trustedContacts.saveContact')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', phone: '', email: '', relationship: '' });
                  setSaveError('');
                }}
                className="px-4 py-2.5 text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-white/80"
              >
                {t('trustedContacts.cancel')}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => {
              setSaveError('');
              setShowForm(true);
            }}
            className="mt-4 w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-600/30 text-slate-300 hover:text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-amber-400"
          >
            <Plus size={18} weight="bold" className="text-amber-400" />
            {t('trustedContacts.addContact')}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-700/50 my-6" />

      {/* Emergency Message Templates */}
      <div className="mb-6">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          {t('trustedContacts.emergencyTemplatesHeading')}
        </h4>
        <p className="text-slate-500 text-xs mb-4">
          {t('trustedContacts.emergencyTemplatesDesc')}
        </p>

        <div className="space-y-3">
          {MESSAGE_TEMPLATES.map((template) => {
            const isExpanded = expandedTemplate === template.id;
            const colorMap = { red: 'border-red-700/40 bg-red-950/20', amber: 'border-amber-700/40 bg-amber-950/20', blue: 'border-blue-700/40 bg-blue-950/20' };
            const textColorMap = { red: 'text-red-400', amber: 'text-amber-400', blue: 'text-blue-400' };
            const btnColorMap = { red: 'from-red-700 to-red-800 hover:from-red-600 hover:to-red-700', amber: 'from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700', blue: 'from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700' };

            return (
              <div key={template.id} className={`border rounded-2xl overflow-hidden transition-all ${colorMap[template.color]}`}>
                <button
                  onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <ChatText size={20} weight="bold" className={textColorMap[template.color]} />
                    <span className="text-white font-semibold text-sm">{template.label}</span>
                  </div>
                  {isExpanded ? (
                    <CaretUp size={18} weight="bold" className="text-slate-500" />
                  ) : (
                    <CaretDown size={18} weight="bold" className="text-slate-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 mb-3">
                      <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">
                        {template.message(
                          userName || t('trustedContacts.yourContact'),
                          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          `[${t('trustedContacts.locationIncluded')}]`
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] mb-2">
                      <MapPin size={12} weight="bold" />
                      <span>{t('trustedContacts.locationNote')}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (contacts.length === 0) {
                          alert(t('trustedContacts.addContactFirst'));
                          return;
                        }
                        handleSendSOS(template);
                      }}
                      disabled={isSending}
                      className={`w-full bg-gradient-to-r ${btnColorMap[template.color]} text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60`}
                    >
                      {isSending ? (
                        <>
                          <Spinner size={18} className="animate-spin" />
                          {t('trustedContacts.acquiringLocation')}
                        </>
                      ) : (
                        <>
                          <PaperPlaneTilt size={18} weight="bold" />
                          {t('trustedContacts.sendToContacts', { count: contacts.length })}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-700/50 my-6" />

      {/* One-Tap SOS */}
      {contacts.length > 0 && (
        <div className="mb-8">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            {t('trustedContacts.oneTapHeading')}
          </h4>
          <button
            onClick={() => {
              const template = MESSAGE_TEMPLATES[0]; // "Something is happening" — most urgent
              handleSendSOS(template);
            }}
            disabled={isSending}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black py-5 px-6 rounded-2xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {isSending ? (
              <>
                <Spinner size={28} className="animate-spin" />
                <span className="text-lg uppercase tracking-wider">{t('trustedContacts.acquiringLocation')}</span>
              </>
            ) : (
              <>
                <WarningCircle size={28} weight="bold" />
                <span className="text-lg uppercase tracking-wider">{t('trustedContacts.alertAllContacts')}</span>
              </>
            )}
          </button>
          <p className="text-slate-500 text-xs text-center mt-2">
            {t('trustedContacts.oneTapDesc')}
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-slate-900/50 border border-slate-700/40 rounded-2xl p-4 mb-6">
        <h4 className="text-white font-bold text-sm mb-2">{t('trustedContacts.howItWorksTitle')}</h4>
        <ul className="text-slate-400 text-xs space-y-2 leading-relaxed">
          <li>&#8226; {t('trustedContacts.howItWorks1Prefix')} <span className="text-amber-400 font-semibold">{t('trustedContacts.howItWorks1Highlight')}</span> {t('trustedContacts.howItWorks1Suffix')}</li>
          <li>&#8226; {t('trustedContacts.howItWorks2')}</li>
          <li>&#8226; {t('trustedContacts.howItWorks3')}</li>
        </ul>
      </div>

      {/* Disclaimer */}
      <Disclaimer>
        {t('trustedContacts.disclaimerLine1')}
        <br />{t('trustedContacts.disclaimerLine2')}
        <br />{t('trustedContacts.disclaimerLine3')}
      </Disclaimer>

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

export default TrustedContacts;
