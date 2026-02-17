// src/components/FamilyKit.js
// Family Preparedness Kit — interactive form with stepped accordion,
// localStorage persistence, and shareable document generation.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ClipboardTextIcon as ClipboardText,
  CaretDown,
  CaretUp,
  Check,
  Plus,
  Trash,
  EnvelopeSimple,
  CopySimple,
  ShareNetwork,
  Printer,
  DownloadSimple,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { getTrustedContacts } from '../utils/backup/accessGrants';
import { generateFamilyPlan } from '../utils/familyKitDocument';
import { scenarios } from '../data/scenarioData';
import Disclaimer from './Disclaimer';
import InstallHelp from './InstallHelp';

const STORAGE_KEY = 'safeneighbor_family_kit';

const EMPTY_CONTACT = { name: '', phone: '', email: '', relationship: '' };
const EMPTY_CHILD = { name: '', school: '', grade: '', schoolPhone: '' };
const EMPTY_PICKUP = { name: '', phone: '', relationship: '' };
const EMPTY_NUMBER = { name: '', phone: '' };
const EMPTY_FAMILY_MEMBER = { name: '', briefed: false };

const DEFAULT_DATA = {
  contacts: [{ ...EMPTY_CONTACT }],
  poa: { name: '', phone: '', relationship: '', documentLocation: '', notarized: false },
  documents: { checklist: [], originalsLocation: '', copiesLocation: '', whoHoldsCopies: '' },
  school: {
    notApplicable: false,
    children: [{ ...EMPTY_CHILD }],
    pickupContacts: [{ ...EMPTY_PICKUP }],
    schoolNotified: false,
    notifiedDate: '',
  },
  goBag: { checklist: [], location: '', whoKnows: '', notes: '' },
  keyNumbers: {
    attorneyName: '',
    attorneyPhone: '',
    familyContactName: '',
    familyContactPhone: '',
    detentionHotline: '1-833-560-0927',
    additionalNumbers: [],
  },
  communication: {
    codeWord: '',
    meetingPlace: '',
    familyBriefed: [{ ...EMPTY_FAMILY_MEMBER }],
    lastDiscussionDate: '',
    notes: '',
  },
};

// Step metadata — title, description (from scenarioData), and completion check
const scenarioSteps = scenarios['family-kit']?.emergencyScript || [];

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

const FamilyKit = ({ onBack, onNavigateToContacts }) => {
  const { t } = useTranslation();

  const RELATIONSHIP_OPTIONS = [
    { value: 'Family', label: t('familyKit.relationshipFamily') },
    { value: 'Attorney', label: t('familyKit.relationshipAttorney') },
    { value: 'Community Organizer', label: t('familyKit.relationshipCommunityOrganizer') },
    { value: 'Friend', label: t('familyKit.relationshipFriend') },
    { value: 'Other', label: t('familyKit.relationshipOther') },
  ];

  const DOCUMENT_CHECKLIST = [
    { value: 'Government ID', label: t('familyKit.docGovernmentId') },
    { value: 'Birth Certificates', label: t('familyKit.docBirthCertificates') },
    { value: 'Immigration Documents', label: t('familyKit.docImmigrationDocuments') },
    { value: 'Medical Records', label: t('familyKit.docMedicalRecords') },
    { value: 'Insurance Cards', label: t('familyKit.docInsuranceCards') },
    { value: 'Social Security Cards', label: t('familyKit.docSocialSecurityCards') },
    { value: 'Bank Statements', label: t('familyKit.docBankStatements') },
    { value: 'Lease / Deed', label: t('familyKit.docLeaseDeed') },
    { value: 'Vehicle Title', label: t('familyKit.docVehicleTitle') },
    { value: 'School Records', label: t('familyKit.docSchoolRecords') },
  ];

  const GO_BAG_CHECKLIST = [
    { value: 'Phone Charger', label: t('familyKit.bagPhoneCharger') },
    { value: 'Cash', label: t('familyKit.bagCash') },
    { value: 'Prescription Medications', label: t('familyKit.bagPrescriptionMedications') },
    { value: 'Document Copies', label: t('familyKit.bagDocumentCopies') },
    { value: "Attorney's Card", label: t('familyKit.bagAttorneysCard') },
    { value: 'Change of Clothes', label: t('familyKit.bagChangeOfClothes') },
    { value: 'Water & Snacks', label: t('familyKit.bagWaterSnacks') },
    { value: 'Child Essentials', label: t('familyKit.bagChildEssentials') },
  ];

  const STEPS = [
    {
      key: 'contacts',
      title: t(scenarioSteps[0]?.action || 'familyKit.fallbackTrustedContacts'),
      description: t(scenarioSteps[0]?.explanation || ''),
      instruction: t(scenarioSteps[0]?.script || ''),
      isComplete: (d) => d.contacts?.some((c) => c.name.trim()),
    },
    {
      key: 'poa',
      title: t(scenarioSteps[1]?.action || 'familyKit.fallbackPowerOfAttorney'),
      description: t(scenarioSteps[1]?.explanation || ''),
      instruction: t(scenarioSteps[1]?.script || ''),
      isComplete: (d) => !!d.poa?.name?.trim(),
    },
    {
      key: 'documents',
      title: t(scenarioSteps[2]?.action || 'familyKit.fallbackImportantDocuments'),
      description: t(scenarioSteps[2]?.explanation || ''),
      instruction: t(scenarioSteps[2]?.script || ''),
      isComplete: (d) => d.documents?.checklist?.length > 0 && !!d.documents?.originalsLocation?.trim(),
    },
    {
      key: 'school',
      title: t(scenarioSteps[3]?.action || 'familyKit.fallbackSchoolPlan'),
      description: t(scenarioSteps[3]?.explanation || ''),
      instruction: t(scenarioSteps[3]?.script || ''),
      isComplete: (d) =>
        d.school?.notApplicable ||
        (d.school?.children?.some((c) => c.name.trim()) && d.school?.pickupContacts?.some((p) => p.name.trim())),
    },
    {
      key: 'goBag',
      title: t(scenarioSteps[4]?.action || 'familyKit.fallbackGoBag'),
      description: t(scenarioSteps[4]?.explanation || ''),
      instruction: t(scenarioSteps[4]?.script || ''),
      isComplete: (d) => !!d.goBag?.location?.trim(),
    },
    {
      key: 'keyNumbers',
      title: t(scenarioSteps[5]?.action || 'familyKit.fallbackKeyNumbers'),
      description: t(scenarioSteps[5]?.explanation || ''),
      instruction: t(scenarioSteps[5]?.script || ''),
      isComplete: (d) => !!d.keyNumbers?.attorneyPhone?.trim(),
    },
    {
      key: 'communication',
      title: t(scenarioSteps[6]?.action || 'familyKit.fallbackFamilyCommunication'),
      description: t(scenarioSteps[6]?.explanation || ''),
      instruction: t(scenarioSteps[6]?.script || ''),
      isComplete: (d) => d.communication?.familyBriefed?.some((m) => m.briefed),
    },
  ];
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [formData, setFormData] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults so new fields are always present
        return {
          ...DEFAULT_DATA,
          ...parsed,
          poa: { ...DEFAULT_DATA.poa, ...parsed.poa },
          documents: { ...DEFAULT_DATA.documents, ...parsed.documents },
          school: { ...DEFAULT_DATA.school, ...parsed.school },
          goBag: { ...DEFAULT_DATA.goBag, ...parsed.goBag },
          keyNumbers: { ...DEFAULT_DATA.keyNumbers, ...parsed.keyNumbers },
          communication: { ...DEFAULT_DATA.communication, ...parsed.communication },
        };
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_DATA, contacts: [{ ...EMPTY_CONTACT }] };
  });

  const [expandedStep, setExpandedStep] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importedCount, setImportedCount] = useState(null);

  const saveTimerRef = useRef(null);

  // Debounced auto-save
  const save = useCallback((data) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, 500);
  }, []);

  useEffect(() => {
    save(formData);
  }, [formData, save]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // ── helpers ─────────────────────────────────────────────

  const update = (section, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const completedCount = STEPS.filter((s) => s.isComplete(formData)).length;

  // ── Import from Trusted Contacts ───────────────────────

  const handleImportContacts = () => {
    const existing = getTrustedContacts();
    if (existing.length === 0) {
      alert(t('familyKit.noTrustedContactsAlert'));
      return;
    }
    const imported = existing.map((c) => ({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      relationship: c.relationship || '',
    }));
    setFormData((prev) => ({ ...prev, contacts: imported }));
    setImportedCount(imported.length);
    setTimeout(() => setImportedCount(null), 2500);
  };

  // ── Share ──────────────────────────────────────────────

  const getDocument = () => generateFamilyPlan(formData);

  const trackEvent = (event, data) => { if (window.umami) window.umami.track(event, data); };

  const handleEmail = () => {
    const doc = getDocument();
    const recipient = formData.contacts?.find((c) => c.email)?.email || '';
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(t('familyKit.familyPrepPlanSubject'))}&body=${encodeURIComponent(doc)}`;
    trackEvent('family_kit_share', { method: 'email' });
    window.location.href = mailto;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getDocument()).then(() => {
      setCopied(true);
      trackEvent('family_kit_share', { method: 'clipboard' });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      alert(t('familyKit.copyFailAlert'));
    });
  };

  const handleWebShare = () => {
    if (navigator.share) {
      trackEvent('family_kit_share', { method: 'web_share' });
      navigator.share({ title: t('familyKit.familyPrepPlanSubject'), text: getDocument() }).catch(() => {});
    }
  };

  const handlePrint = () => {
    const doc = getDocument();
    trackEvent('family_kit_share', { method: 'print' });
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<pre style="font-family:monospace;white-space:pre-wrap;max-width:700px;margin:auto;padding:24px;font-size:13px;">${doc.replace(/</g, '&lt;')}</pre>`);
      w.document.close();
      w.print();
    }
  };

  // ── Render helpers ─────────────────────────────────────

  const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors';
  const labelClass = 'text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block';
  const addBtnClass = 'mt-2 flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-bold uppercase tracking-wider transition-colors';
  const removeBtnClass = 'p-1.5 text-slate-600 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-all';

  // ── Dynamic list helpers ───────────────────────────────

  const addListItem = (section, key, template) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: [...(prev[section][key] || []), { ...template }],
      },
    }));
  };

  const updateListItem = (section, key, index, field, value) => {
    setFormData((prev) => {
      const list = [...(prev[section]?.[key] || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [section]: { ...prev[section], [key]: list } };
    });
  };

  const removeListItem = (section, key, index) => {
    setFormData((prev) => {
      const list = [...(prev[section]?.[key] || [])];
      list.splice(index, 1);
      return { ...prev, [section]: { ...prev[section], [key]: list } };
    });
  };

  // Contacts are top-level array
  const updateContact = (index, field, value) => {
    setFormData((prev) => {
      const contacts = [...prev.contacts];
      contacts[index] = { ...contacts[index], [field]: value };
      return { ...prev, contacts };
    });
  };
  const addContact = () => setFormData((prev) => ({ ...prev, contacts: [...prev.contacts, { ...EMPTY_CONTACT }] }));
  const removeContact = (index) => setFormData((prev) => ({ ...prev, contacts: prev.contacts.filter((_, i) => i !== index) }));

  // ── Checkbox toggle for checklists ─────────────────────

  const toggleChecklist = (section, item) => {
    setFormData((prev) => {
      const current = prev[section]?.checklist || [];
      const next = current.includes(item) ? current.filter((i) => i !== item) : [...current, item];
      return { ...prev, [section]: { ...prev[section], checklist: next } };
    });
  };

  // ── Step form renderers ────────────────────────────────

  const renderContactsForm = () => (
    <div className="space-y-4">
      <button onClick={handleImportContacts} className="w-full bg-slate-800/60 hover:bg-slate-800 border border-amber-700/30 hover:border-amber-600/50 text-amber-400 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
        <ArrowsClockwise size={16} weight="bold" />
        {t('familyKit.importFromTrustedContacts')}
      </button>
      {importedCount !== null && (
        <p className="text-emerald-400 text-xs text-center font-semibold">{t('familyKit.importedContacts', { count: importedCount })}</p>
      )}
      <p className="text-slate-500 text-xs text-center">
        {t('familyKit.needToSetupContacts')}{' '}
        <button onClick={onNavigateToContacts} className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors">
          {t('familyKit.goToTrustedContacts')}
        </button>
      </p>

      {formData.contacts.map((contact, i) => (
        <div key={i} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('familyKit.contactLabel', { number: i + 1 })}</span>
            {formData.contacts.length > 1 && (
              <button onClick={() => removeContact(i)} className={removeBtnClass}><Trash size={14} weight="bold" /></button>
            )}
          </div>
          <input type="text" placeholder={t('familyKit.placeholderFullName')} value={contact.name} onChange={(e) => updateContact(i, 'name', e.target.value)} className={inputClass} />
          <input type="tel" placeholder={t('familyKit.placeholderPhone')} value={contact.phone} onChange={(e) => updateContact(i, 'phone', e.target.value)} className={inputClass} />
          <input type="email" placeholder={t('familyKit.placeholderEmail')} value={contact.email} onChange={(e) => updateContact(i, 'email', e.target.value)} className={inputClass} />
          <select value={contact.relationship} onChange={(e) => updateContact(i, 'relationship', e.target.value)} className={`${inputClass} appearance-none`}>
            <option value="">{t('familyKit.placeholderRelationship')}</option>
            {RELATIONSHIP_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      ))}
      <button onClick={addContact} className={addBtnClass}><Plus size={14} weight="bold" /> {t('familyKit.addAnotherContact')}</button>
    </div>
  );

  const renderPoaForm = () => (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>{t('familyKit.poaDesigneeName')}</label>
        <input type="text" placeholder={t('familyKit.poaPlaceholderName')} value={formData.poa.name} onChange={(e) => update('poa', 'name', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t('familyKit.poaPhone')}</label>
        <input type="tel" placeholder={t('familyKit.poaPlaceholderPhone')} value={formData.poa.phone} onChange={(e) => update('poa', 'phone', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t('familyKit.poaRelationship')}</label>
        <select value={formData.poa.relationship} onChange={(e) => update('poa', 'relationship', e.target.value)} className={`${inputClass} appearance-none`}>
          <option value="">{t('familyKit.poaSelectRelationship')}</option>
          {RELATIONSHIP_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>{t('familyKit.poaDocumentLocation')}</label>
        <input type="text" placeholder={t('familyKit.poaPlaceholderDocLocation')} value={formData.poa.documentLocation} onChange={(e) => update('poa', 'documentLocation', e.target.value)} className={inputClass} />
      </div>
      <label className="flex items-center gap-3 mt-2 cursor-pointer">
        <input type="checkbox" checked={formData.poa.notarized} onChange={(e) => update('poa', 'notarized', e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500" />
        <span className="text-slate-300 text-sm">{t('familyKit.poaNotarized')}</span>
      </label>
    </div>
  );

  const renderDocumentsForm = () => (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-1">{t('familyKit.documentsInstruction')}</p>
      <div className="space-y-2">
        {DOCUMENT_CHECKLIST.map((item) => (
          <label key={item.value} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.documents.checklist?.includes(item.value) || false}
              onChange={() => toggleChecklist('documents', item.value)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-slate-300 text-sm">{item.label}</span>
          </label>
        ))}
      </div>
      <div className="pt-2">
        <label className={labelClass}>{t('familyKit.documentsOriginalsLocation')}</label>
        <input type="text" placeholder={t('familyKit.documentsPlaceholderOriginals')} value={formData.documents.originalsLocation} onChange={(e) => update('documents', 'originalsLocation', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t('familyKit.documentsCopiesLocation')}</label>
        <input type="text" placeholder={t('familyKit.documentsPlaceholderCopies')} value={formData.documents.copiesLocation} onChange={(e) => update('documents', 'copiesLocation', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t('familyKit.documentsWhoHoldsCopies')}</label>
        <input type="text" placeholder={t('familyKit.documentsPlaceholderWhoHolds')} value={formData.documents.whoHoldsCopies} onChange={(e) => update('documents', 'whoHoldsCopies', e.target.value)} className={inputClass} />
      </div>
    </div>
  );

  const renderSchoolForm = () => (
    <div className="space-y-3">
      <label className="flex items-center gap-3 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={formData.school.notApplicable}
          onChange={(e) => update('school', 'notApplicable', e.target.checked)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
        />
        <span className="text-slate-300 text-sm">{t('familyKit.schoolNotApplicable')}</span>
      </label>

      {!formData.school.notApplicable && (
        <>
          <p className={labelClass}>{t('familyKit.schoolChildren')}</p>
          {(formData.school.children || []).map((child, i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('familyKit.schoolChildLabel', { number: i + 1 })}</span>
                {formData.school.children.length > 1 && (
                  <button onClick={() => removeListItem('school', 'children', i)} className={removeBtnClass}><Trash size={14} weight="bold" /></button>
                )}
              </div>
              <input type="text" placeholder={t('familyKit.schoolPlaceholderChildName')} value={child.name} onChange={(e) => updateListItem('school', 'children', i, 'name', e.target.value)} className={inputClass} />
              <input type="text" placeholder={t('familyKit.schoolPlaceholderSchoolName')} value={child.school} onChange={(e) => updateListItem('school', 'children', i, 'school', e.target.value)} className={inputClass} />
              <div className="flex gap-2">
                <input type="text" placeholder={t('familyKit.schoolPlaceholderGrade')} value={child.grade} onChange={(e) => updateListItem('school', 'children', i, 'grade', e.target.value)} className={inputClass} />
                <input type="tel" placeholder={t('familyKit.schoolPlaceholderSchoolPhone')} value={child.schoolPhone} onChange={(e) => updateListItem('school', 'children', i, 'schoolPhone', e.target.value)} className={inputClass} />
              </div>
            </div>
          ))}
          <button onClick={() => addListItem('school', 'children', EMPTY_CHILD)} className={addBtnClass}><Plus size={14} weight="bold" /> {t('familyKit.schoolAddChild')}</button>

          <div className="border-t border-slate-700/40 my-3" />

          <p className={labelClass}>{t('familyKit.schoolAuthorizedPickup')}</p>
          {(formData.school.pickupContacts || []).map((p, i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('familyKit.schoolPickupLabel', { number: i + 1 })}</span>
                {formData.school.pickupContacts.length > 1 && (
                  <button onClick={() => removeListItem('school', 'pickupContacts', i)} className={removeBtnClass}><Trash size={14} weight="bold" /></button>
                )}
              </div>
              <input type="text" placeholder={t('familyKit.schoolPlaceholderName')} value={p.name} onChange={(e) => updateListItem('school', 'pickupContacts', i, 'name', e.target.value)} className={inputClass} />
              <div className="flex gap-2">
                <input type="tel" placeholder={t('familyKit.placeholderPhone')} value={p.phone} onChange={(e) => updateListItem('school', 'pickupContacts', i, 'phone', e.target.value)} className={inputClass} />
                <select value={p.relationship} onChange={(e) => updateListItem('school', 'pickupContacts', i, 'relationship', e.target.value)} className={`${inputClass} appearance-none`}>
                  <option value="">{t('familyKit.schoolPlaceholderRelation')}</option>
                  {RELATIONSHIP_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
          ))}
          <button onClick={() => addListItem('school', 'pickupContacts', EMPTY_PICKUP)} className={addBtnClass}><Plus size={14} weight="bold" /> {t('familyKit.schoolAddPickupContact')}</button>

          <div className="border-t border-slate-700/40 my-3" />

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.school.schoolNotified}
              onChange={(e) => update('school', 'schoolNotified', e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-slate-300 text-sm">{t('familyKit.schoolNotified')}</span>
          </label>
          {formData.school.schoolNotified && (
            <div className="mt-2">
              <label className={labelClass}>{t('familyKit.schoolDateNotified')}</label>
              <input type="date" value={formData.school.notifiedDate || ''} onChange={(e) => update('school', 'notifiedDate', e.target.value)} className={inputClass} />
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderGoBagForm = () => (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-1">{t('familyKit.goBagInstruction')}</p>
      <div className="space-y-2">
        {GO_BAG_CHECKLIST.map((item) => (
          <label key={item.value} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.goBag.checklist?.includes(item.value) || false}
              onChange={() => toggleChecklist('goBag', item.value)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-slate-300 text-sm">{item.label}</span>
          </label>
        ))}
      </div>
      <div className="pt-2">
        <label className={labelClass}>{t('familyKit.goBagLocation')}</label>
        <input type="text" placeholder={t('familyKit.goBagPlaceholderLocation')} value={formData.goBag.location} onChange={(e) => update('goBag', 'location', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t('familyKit.goBagWhoElseKnows')}</label>
        <input type="text" placeholder={t('familyKit.goBagPlaceholderWhoKnows')} value={formData.goBag.whoKnows} onChange={(e) => update('goBag', 'whoKnows', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t('familyKit.goBagNotes')}</label>
        <textarea placeholder={t('familyKit.goBagPlaceholderNotes')} value={formData.goBag.notes} onChange={(e) => update('goBag', 'notes', e.target.value)} rows={2} className={inputClass} />
      </div>
    </div>
  );

  const renderKeyNumbersForm = () => (
    <div className="space-y-3">
      <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3 space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('familyKit.keyNumbersAttorney')}</span>
        <input type="text" placeholder={t('familyKit.keyNumbersPlaceholderAttorneyName')} value={formData.keyNumbers.attorneyName} onChange={(e) => update('keyNumbers', 'attorneyName', e.target.value)} className={inputClass} />
        <input type="tel" placeholder={t('familyKit.keyNumbersPlaceholderAttorneyPhone')} value={formData.keyNumbers.attorneyPhone} onChange={(e) => update('keyNumbers', 'attorneyPhone', e.target.value)} className={inputClass} />
      </div>
      <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3 space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('familyKit.keyNumbersFamilyContact')}</span>
        <input type="text" placeholder={t('familyKit.keyNumbersPlaceholderFamilyName')} value={formData.keyNumbers.familyContactName} onChange={(e) => update('keyNumbers', 'familyContactName', e.target.value)} className={inputClass} />
        <input type="tel" placeholder={t('familyKit.keyNumbersPlaceholderFamilyPhone')} value={formData.keyNumbers.familyContactPhone} onChange={(e) => update('keyNumbers', 'familyContactPhone', e.target.value)} className={inputClass} />
      </div>
      <div className="bg-amber-950/20 border border-amber-700/30 rounded-xl p-3">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t('familyKit.keyNumbersDetentionHotline')}</span>
        <p className="text-white font-bold text-lg mt-1">{t('familyKit.keyNumbersDetentionNumber')}</p>
        <p className="text-slate-400 text-xs mt-0.5">{t('familyKit.keyNumbersDetentionDesc')}</p>
      </div>

      {(formData.keyNumbers.additionalNumbers || []).map((n, i) => (
        <div key={i} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('familyKit.keyNumbersAdditionalLabel', { number: i + 1 })}</span>
            <button onClick={() => removeListItem('keyNumbers', 'additionalNumbers', i)} className={removeBtnClass}><Trash size={14} weight="bold" /></button>
          </div>
          <input type="text" placeholder={t('familyKit.keyNumbersPlaceholderNameLabel')} value={n.name} onChange={(e) => updateListItem('keyNumbers', 'additionalNumbers', i, 'name', e.target.value)} className={inputClass} />
          <input type="tel" placeholder={t('familyKit.placeholderPhone')} value={n.phone} onChange={(e) => updateListItem('keyNumbers', 'additionalNumbers', i, 'phone', e.target.value)} className={inputClass} />
        </div>
      ))}
      <button onClick={() => addListItem('keyNumbers', 'additionalNumbers', EMPTY_NUMBER)} className={addBtnClass}><Plus size={14} weight="bold" /> {t('familyKit.keyNumbersAddNumber')}</button>
    </div>
  );

  const renderCommunicationForm = () => (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>{t('familyKit.commCodeWord')}</label>
        <input type="text" placeholder={t('familyKit.commPlaceholderCodeWord')} value={formData.communication.codeWord} onChange={(e) => update('communication', 'codeWord', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t('familyKit.commMeetingPlace')}</label>
        <input type="text" placeholder={t('familyKit.commPlaceholderMeetingPlace')} value={formData.communication.meetingPlace} onChange={(e) => update('communication', 'meetingPlace', e.target.value)} className={inputClass} />
      </div>

      <div className="border-t border-slate-700/40 my-3" />

      <p className={labelClass}>{t('familyKit.commFamilyMembersBriefed')}</p>
      {(formData.communication.familyBriefed || []).map((m, i) => (
        <div key={i} className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={m.briefed}
            onChange={(e) => updateListItem('communication', 'familyBriefed', i, 'briefed', e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
          />
          <input
            type="text"
            placeholder={t('familyKit.commPlaceholderFamilyMember')}
            value={m.name}
            onChange={(e) => updateListItem('communication', 'familyBriefed', i, 'name', e.target.value)}
            className={`${inputClass} flex-1`}
          />
          {formData.communication.familyBriefed.length > 1 && (
            <button onClick={() => removeListItem('communication', 'familyBriefed', i)} className={removeBtnClass}><Trash size={14} weight="bold" /></button>
          )}
        </div>
      ))}
      <button onClick={() => addListItem('communication', 'familyBriefed', EMPTY_FAMILY_MEMBER)} className={addBtnClass}><Plus size={14} weight="bold" /> {t('familyKit.commAddFamilyMember')}</button>

      <div className="border-t border-slate-700/40 my-3" />

      <div>
        <label className={labelClass}>{t('familyKit.commLastDiscussion')}</label>
        <input type="date" value={formData.communication.lastDiscussionDate || ''} onChange={(e) => update('communication', 'lastDiscussionDate', e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t('familyKit.commNotes')}</label>
        <textarea placeholder={t('familyKit.commPlaceholderNotes')} value={formData.communication.notes} onChange={(e) => update('communication', 'notes', e.target.value)} rows={3} className={inputClass} />
      </div>
    </div>
  );

  const stepRenderers = [
    renderContactsForm,
    renderPoaForm,
    renderDocumentsForm,
    renderSchoolForm,
    renderGoBagForm,
    renderKeyNumbersForm,
    renderCommunicationForm,
  ];

  // ── Main render ────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Header */}
      <div className="pt-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft size={20} weight="bold" className="rtl:scale-x-[-1]" />
          <span className="text-sm font-medium">{t('familyKit.backToScenarios')}</span>
        </button>
        <div className="flex items-center gap-3 mb-2">
          <ClipboardText size={36} weight="bold" className="text-amber-400" />
          <h1 className="text-3xl font-black text-white tracking-wide">{t('familyKit.title')}</h1>
        </div>
        <p className="text-slate-400 text-sm">
          {t('familyKit.description')}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('familyKit.progress')}</span>
          <span className="text-xs font-bold text-amber-400">{completedCount} / {STEPS.length}</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((step, i) => {
            const complete = step.isComplete(formData);
            return (
              <button
                key={step.key}
                onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                className={`flex-1 h-2 rounded-full transition-all ${
                  complete ? 'bg-emerald-500' : expandedStep === i ? 'bg-amber-500/60' : 'bg-slate-700'
                }`}
                title={`Step ${i + 1}: ${step.title}`}
              />
            );
          })}
        </div>
      </div>

      {/* Stepped Accordion */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isOpen = expandedStep === i;
          const complete = step.isComplete(formData);
          return (
            <div
              key={step.key}
              className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all ${
                isOpen ? 'border-amber-600/40' : complete ? 'border-emerald-700/30' : 'border-slate-700/50'
              }`}
            >
              {/* Accordion header */}
              <button
                onClick={() => setExpandedStep(isOpen ? null : i)}
                className="w-full flex items-center gap-3 p-4 text-start"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all ${
                  complete
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {complete ? <Check size={16} weight="bold" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{step.title}</p>
                </div>
                {isOpen ? (
                  <CaretUp size={18} weight="bold" className="text-slate-500 flex-shrink-0" />
                ) : (
                  <CaretDown size={18} weight="bold" className="text-slate-500 flex-shrink-0" />
                )}
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-5">
                  {/* Educational blurb */}
                  <div className="bg-amber-950/20 border border-amber-700/20 rounded-xl p-3 mb-4">
                    <p className="text-amber-200 text-xs leading-relaxed font-medium">{step.instruction}</p>
                    <p className="text-slate-400 text-xs leading-relaxed mt-2">{step.description}</p>
                  </div>

                  {/* Form fields */}
                  {stepRenderers[i]()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Share Plan Button */}
      <div className="mt-8">
        <button
          onClick={() => setShowShareModal(true)}
          className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-wider"
        >
          <ShareNetwork size={24} weight="bold" />
          {t('familyKit.sharePlan')}
        </button>
        <p className="text-slate-500 text-xs text-center mt-2">
          {t('familyKit.shareDescription')}
        </p>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-8 sm:pb-6 safe-bottom-padding">
            <h3 className="text-white font-black text-lg mb-1">{t('familyKit.shareModalTitle')}</h3>
            <p className="text-slate-400 text-xs mb-5">{t('familyKit.shareModalDescription')}</p>

            <div className="space-y-3">
              <button onClick={handleEmail} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <EnvelopeSimple size={20} weight="bold" />
                <span>{t('familyKit.sendViaEmail')}</span>
              </button>

              <button onClick={handleCopy} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <CopySimple size={20} weight="bold" />
                <span>{copied ? t('familyKit.copied') : t('familyKit.copyToClipboard')}</span>
              </button>

              {typeof navigator.share === 'function' && (
                <button onClick={handleWebShare} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                  <ShareNetwork size={20} weight="bold" />
                  <span>{t('familyKit.share')}</span>
                </button>
              )}

              <button onClick={handlePrint} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-3 active:scale-95">
                <Printer size={20} weight="bold" />
                <span>{t('familyKit.print')}</span>
              </button>
            </div>

            <button onClick={() => setShowShareModal(false)} className="w-full mt-4 text-slate-400 hover:text-white text-sm font-medium uppercase tracking-wider transition-colors py-2">
              {t('familyKit.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8">
        <Disclaimer>
          {t('familyKit.disclaimerLine1')}
          <br />{t('familyKit.disclaimerLine2')}
          <br />{t('familyKit.disclaimerLine3')}
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
              alert(t('home.installAlert'));
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
        <button
          onClick={() => setShowInstallHelp(true)}
          className="text-blue-400 hover:text-blue-300 text-xs font-semibold mt-2 transition-colors"
        >
          {t('emergency.installHelp')}
        </button>
      </div>
      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
};

export default FamilyKit;
