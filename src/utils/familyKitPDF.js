// src/utils/familyKitPDF.js
// Generates a polished, print-ready Family Preparedness Plan document.
// Uses a styled HTML page opened in a new window — the browser's native
// print dialog lets users "Save as PDF" with full Unicode / multilingual
// support (CJK, Arabic, Devanagari, etc.) via system fonts.

import { SUPPORTED_LANGUAGES } from '../i18n/languages';

// ── Color palette ──────────────────────────────────────────
const COLORS = {
  brand:      '#d97706', // amber-600
  brandLight: '#fef3c7', // amber-100
  brandDark:  '#92400e', // amber-800
  slate50:    '#f8fafc',
  slate100:   '#f1f5f9',
  slate200:   '#e2e8f0',
  slate400:   '#94a3b8',
  slate600:   '#475569',
  slate700:   '#334155',
  slate800:   '#1e293b',
  slate900:   '#0f172a',
  emerald:    '#059669',
  red:        '#dc2626',
  blue:       '#2563eb',
};

// ── Section header colors ──────────────────────────────────
const SECTION_COLORS = [
  '#d97706', // amber
  '#7c3aed', // violet
  '#2563eb', // blue
  '#059669', // emerald
  '#dc2626', // red
  '#0891b2', // cyan
  '#c026d3', // fuchsia
];

// ── HTML escape helper — MUST wrap all user-entered content ─
function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Helper: get language display name ──────────────────────
function getLanguageName(code) {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.nativeName : code;
}

// ── Bilingual text helper ──────────────────────────────────
function bilingualCell(enText, localText, isEnglish) {
  if (isEnglish) {
    return `<td style="padding:4px 8px;border-bottom:1px solid ${COLORS.slate200};">${enText}</td>`;
  }
  return `
    <td style="padding:4px 8px;border-bottom:1px solid ${COLORS.slate200};width:50%;">${enText}</td>
    <td style="padding:4px 8px;border-bottom:1px solid ${COLORS.slate200};width:50%;color:${COLORS.slate600};font-style:italic;">${localText}</td>
  `;
}

// ── Build section header ───────────────────────────────────
function sectionHeader(number, enTitle, localTitle, isEnglish, color) {
  const title = isEnglish
    ? enTitle
    : `${enTitle} / ${localTitle}`;
  return `
    <div style="margin:20px 0 8px 0;page-break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;">${number}</div>
        <h2 style="margin:0;font-size:15px;font-weight:800;color:${COLORS.slate800};text-transform:uppercase;letter-spacing:1.5px;">${title}</h2>
      </div>
      <div style="height:2px;background:linear-gradient(to right,${color},transparent);margin-left:38px;"></div>
    </div>
  `;
}

// ── Checkbox icon ──────────────────────────────────────────
function checkbox(checked) {
  if (checked) {
    return `<span style="display:inline-block;width:14px;height:14px;border:2px solid ${COLORS.emerald};border-radius:3px;background:${COLORS.emerald};color:white;font-size:10px;line-height:14px;text-align:center;margin-right:6px;">✓</span>`;
  }
  return `<span style="display:inline-block;width:14px;height:14px;border:2px solid ${COLORS.slate400};border-radius:3px;margin-right:6px;"></span>`;
}

// ── Main generator ─────────────────────────────────────────
export function generateFamilyPlanPDF(data, t, currentLang = 'en') {
  const isEnglish = currentLang === 'en';
  const langName = getLanguageName(currentLang);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Column header for bilingual tables
  const colHeaders = isEnglish
    ? ''
    : `<tr style="background:${COLORS.slate100};">
        <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.slate600};width:50%;">English</th>
        <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.slate600};width:50%;">${langName}</th>
       </tr>`;

  // ── 1. Contacts ────────────────────────────────────────
  let contactsHTML = '';
  if (data.contacts && data.contacts.length > 0 && data.contacts.some(c => c.name?.trim())) {
    contactsHTML = data.contacts.filter(c => c.name?.trim()).map((c, i) => `
      <div style="background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:8px;padding:10px 12px;margin-bottom:6px;page-break-inside:avoid;">
        <div style="font-weight:700;color:${COLORS.slate800};font-size:13px;margin-bottom:4px;">${i + 1}. ${h(c.name)}</div>
        ${c.phone ? `<div style="font-size:12px;color:${COLORS.slate600};">📞 ${h(c.phone)}</div>` : ''}
        ${c.email ? `<div style="font-size:12px;color:${COLORS.slate600};">✉ ${h(c.email)}</div>` : ''}
        ${c.relationship ? `<div style="font-size:11px;color:${COLORS.slate400};margin-top:2px;">${h(c.relationship)}</div>` : ''}
      </div>
    `).join('');
  } else {
    contactsHTML = `<p style="color:${COLORS.slate400};font-style:italic;font-size:12px;">${t('familyKit.pdfNoContacts', 'No contacts entered')}</p>`;
  }

  // ── 2. Power of Attorney ───────────────────────────────
  let poaHTML = '';
  if (data.poa?.name?.trim()) {
    const p = data.poa;
    poaHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        ${colHeaders}
        <tr>${bilingualCell(`<strong>Designee:</strong> ${h(p.name)}`, `<strong>${t('familyKit.poaDesigneeName')}:</strong> ${h(p.name)}`, isEnglish)}</tr>
        ${p.phone ? `<tr>${bilingualCell(`<strong>Phone:</strong> ${h(p.phone)}`, `<strong>${t('familyKit.poaPhone')}:</strong> ${h(p.phone)}`, isEnglish)}</tr>` : ''}
        ${p.relationship ? `<tr>${bilingualCell(`<strong>Relationship:</strong> ${h(p.relationship)}`, `<strong>${t('familyKit.poaRelationship')}:</strong> ${h(p.relationship)}`, isEnglish)}</tr>` : ''}
        ${p.documentLocation ? `<tr>${bilingualCell(`<strong>Document Location:</strong> ${h(p.documentLocation)}`, `<strong>${t('familyKit.poaDocumentLocation')}:</strong> ${h(p.documentLocation)}`, isEnglish)}</tr>` : ''}
        <tr>${bilingualCell(`<strong>Notarized:</strong> ${p.notarized ? 'Yes ✓' : 'No'}`, `<strong>${t('familyKit.poaNotarized')}:</strong> ${p.notarized ? '✓' : '✗'}`, isEnglish)}</tr>
      </table>
    `;
  } else {
    poaHTML = `<p style="color:${COLORS.slate400};font-style:italic;font-size:12px;">${t('familyKit.pdfNotCompleted', 'Not completed')}</p>`;
  }

  // ── 3. Documents ───────────────────────────────────────
  let docsHTML = '';
  if (data.documents) {
    const docs = data.documents;
    const allDocs = [
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

    const checklistHTML = allDocs.map(d => {
      const checked = docs.checklist?.includes(d.value);
      const label = isEnglish ? d.value : `${d.value} / ${d.label}`;
      return `<div style="margin:3px 0;font-size:12px;color:${checked ? COLORS.slate800 : COLORS.slate400};">${checkbox(checked)} ${label}</div>`;
    }).join('');

    docsHTML = `
      <div style="margin-bottom:10px;">${checklistHTML}</div>
      ${docs.originalsLocation ? `<div style="font-size:12px;margin:3px 0;"><strong style="color:${COLORS.slate600};">Originals stored at:</strong> ${h(docs.originalsLocation)}</div>` : ''}
      ${docs.copiesLocation ? `<div style="font-size:12px;margin:3px 0;"><strong style="color:${COLORS.slate600};">Copies stored at:</strong> ${h(docs.copiesLocation)}</div>` : ''}
      ${docs.whoHoldsCopies ? `<div style="font-size:12px;margin:3px 0;"><strong style="color:${COLORS.slate600};">Who holds copies:</strong> ${h(docs.whoHoldsCopies)}</div>` : ''}
    `;
  } else {
    docsHTML = `<p style="color:${COLORS.slate400};font-style:italic;font-size:12px;">${t('familyKit.pdfNotCompleted', 'Not completed')}</p>`;
  }

  // ── 4. School Plan ─────────────────────────────────────
  let schoolHTML = '';
  if (data.school) {
    if (data.school.notApplicable) {
      schoolHTML = `<p style="color:${COLORS.slate400};font-style:italic;font-size:12px;">N/A — ${t('familyKit.schoolNotApplicable')}</p>`;
    } else {
      if (data.school.children?.length > 0 && data.school.children.some(c => c.name?.trim())) {
        schoolHTML += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${COLORS.slate600};margin-bottom:4px;">Children</div>`;
        schoolHTML += data.school.children.filter(c => c.name?.trim()).map((child, i) => `
          <div style="background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:8px;padding:8px 12px;margin-bottom:4px;page-break-inside:avoid;">
            <div style="font-weight:700;color:${COLORS.slate800};font-size:12px;">${i + 1}. ${h(child.name)}</div>
            ${child.school ? `<div style="font-size:11px;color:${COLORS.slate600};">School: ${h(child.school)}</div>` : ''}
            ${child.grade ? `<span style="font-size:11px;color:${COLORS.slate400};">Grade: ${h(child.grade)}</span>` : ''}
            ${child.schoolPhone ? `<span style="font-size:11px;color:${COLORS.slate400};margin-left:12px;">Phone: ${h(child.schoolPhone)}</span>` : ''}
          </div>
        `).join('');
      }
      if (data.school.pickupContacts?.length > 0 && data.school.pickupContacts.some(p => p.name?.trim())) {
        schoolHTML += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${COLORS.slate600};margin:10px 0 4px;">Authorized Pickup</div>`;
        schoolHTML += data.school.pickupContacts.filter(p => p.name?.trim()).map((p, i) => `
          <div style="font-size:12px;margin:2px 0;">${i + 1}. <strong>${h(p.name)}</strong> — ${h(p.phone || 'no phone')} (${h(p.relationship || 'n/a')})</div>
        `).join('');
      }
      schoolHTML += `<div style="font-size:12px;margin-top:8px;color:${COLORS.slate600};">
        School notified: ${data.school.schoolNotified ? `<strong style="color:${COLORS.emerald};">Yes</strong>` : 'No'}
        ${data.school.notifiedDate ? ` (${data.school.notifiedDate})` : ''}
      </div>`;
    }
  } else {
    schoolHTML = `<p style="color:${COLORS.slate400};font-style:italic;font-size:12px;">${t('familyKit.pdfNotCompleted', 'Not completed')}</p>`;
  }

  // ── 5. Go Bag ──────────────────────────────────────────
  let bagHTML = '';
  if (data.goBag) {
    const bag = data.goBag;
    const allItems = [
      { value: 'Phone Charger', label: t('familyKit.bagPhoneCharger') },
      { value: 'Cash', label: t('familyKit.bagCash') },
      { value: 'Prescription Medications', label: t('familyKit.bagPrescriptionMedications') },
      { value: 'Document Copies', label: t('familyKit.bagDocumentCopies') },
      { value: "Attorney's Card", label: t('familyKit.bagAttorneysCard') },
      { value: 'Change of Clothes', label: t('familyKit.bagChangeOfClothes') },
      { value: 'Water & Snacks', label: t('familyKit.bagWaterSnacks') },
      { value: 'Child Essentials', label: t('familyKit.bagChildEssentials') },
    ];

    const checklistHTML = allItems.map(item => {
      const checked = bag.checklist?.includes(item.value);
      const label = isEnglish ? item.value : `${item.value} / ${item.label}`;
      return `<div style="margin:3px 0;font-size:12px;color:${checked ? COLORS.slate800 : COLORS.slate400};">${checkbox(checked)} ${label}</div>`;
    }).join('');

    bagHTML = `
      <div style="margin-bottom:10px;">${checklistHTML}</div>
      ${bag.location ? `<div style="font-size:12px;margin:3px 0;"><strong style="color:${COLORS.slate600};">Bag location:</strong> ${h(bag.location)}</div>` : ''}
      ${bag.whoKnows ? `<div style="font-size:12px;margin:3px 0;"><strong style="color:${COLORS.slate600};">Who else knows:</strong> ${h(bag.whoKnows)}</div>` : ''}
      ${bag.notes ? `<div style="font-size:12px;margin:3px 0;"><strong style="color:${COLORS.slate600};">Notes:</strong> ${h(bag.notes)}</div>` : ''}
    `;
  } else {
    bagHTML = `<p style="color:${COLORS.slate400};font-style:italic;font-size:12px;">${t('familyKit.pdfNotCompleted', 'Not completed')}</p>`;
  }

  // ── 6. Key Numbers ─────────────────────────────────────
  let numbersHTML = '';
  if (data.keyNumbers) {
    const kn = data.keyNumbers;
    numbersHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;">`;
    if (kn.attorneyName || kn.attorneyPhone) {
      numbersHTML += `
        <div style="flex:1;min-width:200px;background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:8px;padding:10px 12px;page-break-inside:avoid;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${COLORS.brand};margin-bottom:4px;">Attorney</div>
          <div style="font-size:13px;font-weight:700;color:${COLORS.slate800};">${h(kn.attorneyName || '(name)')}</div>
          <div style="font-size:14px;font-weight:800;color:${COLORS.slate900};">${h(kn.attorneyPhone || '(phone)')}</div>
        </div>
      `;
    }
    if (kn.familyContactName || kn.familyContactPhone) {
      numbersHTML += `
        <div style="flex:1;min-width:200px;background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:8px;padding:10px 12px;page-break-inside:avoid;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${COLORS.blue};margin-bottom:4px;">Family Contact</div>
          <div style="font-size:13px;font-weight:700;color:${COLORS.slate800};">${h(kn.familyContactName || '(name)')}</div>
          <div style="font-size:14px;font-weight:800;color:${COLORS.slate900};">${h(kn.familyContactPhone || '(phone)')}</div>
        </div>
      `;
    }
    numbersHTML += `
      <div style="flex:1;min-width:200px;background:${COLORS.brandLight};border:1px solid ${COLORS.brand};border-radius:8px;padding:10px 12px;page-break-inside:avoid;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${COLORS.brandDark};margin-bottom:4px;">Detention Hotline</div>
        <div style="font-size:18px;font-weight:900;color:${COLORS.brandDark};">1-833-560-0927</div>
        <div style="font-size:10px;color:${COLORS.brandDark};">National Immigration Detention Hotline</div>
      </div>
    `;
    numbersHTML += `</div>`;

    if (kn.additionalNumbers?.length > 0) {
      numbersHTML += `<div style="margin-top:8px;">`;
      kn.additionalNumbers.forEach(n => {
        if (n.name || n.phone) {
          numbersHTML += `<div style="font-size:12px;margin:2px 0;"><strong>${h(n.name || '(name)')}:</strong> ${h(n.phone || '(phone)')}</div>`;
        }
      });
      numbersHTML += `</div>`;
    }
  } else {
    numbersHTML = `
      <div style="background:${COLORS.brandLight};border:1px solid ${COLORS.brand};border-radius:8px;padding:10px 12px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${COLORS.brandDark};">Detention Hotline</div>
        <div style="font-size:18px;font-weight:900;color:${COLORS.brandDark};">1-833-560-0927</div>
      </div>
    `;
  }

  // ── 7. Communication ───────────────────────────────────
  let commHTML = '';
  if (data.communication) {
    const comm = data.communication;
    commHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px;">`;
    if (comm.codeWord) {
      commHTML += `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid ${COLORS.slate200};font-weight:700;width:35%;color:${COLORS.slate600};">Code Word / Phrase</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${COLORS.slate200};font-weight:800;font-size:14px;color:${COLORS.red};">${h(comm.codeWord)}</td>
      </tr>`;
    }
    if (comm.meetingPlace) {
      commHTML += `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid ${COLORS.slate200};font-weight:700;color:${COLORS.slate600};">Meeting Place</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${COLORS.slate200};">${h(comm.meetingPlace)}</td>
      </tr>`;
    }
    commHTML += `</table>`;

    if (comm.familyBriefed?.length > 0) {
      commHTML += `<div style="margin-top:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${COLORS.slate600};">Family Members Briefed</div>`;
      comm.familyBriefed.forEach(m => {
        if (m.name?.trim()) {
          commHTML += `<div style="font-size:12px;margin:3px 0;">${checkbox(m.briefed)} ${h(m.name)}</div>`;
        }
      });
    }
    if (comm.lastDiscussionDate) {
      commHTML += `<div style="font-size:12px;margin-top:6px;color:${COLORS.slate400};">Last discussed: ${h(comm.lastDiscussionDate)}</div>`;
    }
    if (comm.notes) {
      commHTML += `<div style="font-size:12px;margin-top:4px;color:${COLORS.slate600};">Notes: ${h(comm.notes)}</div>`;
    }
  } else {
    commHTML = `<p style="color:${COLORS.slate400};font-style:italic;font-size:12px;">${t('familyKit.pdfNotCompleted', 'Not completed')}</p>`;
  }

  // ── Assemble the full document ─────────────────────────
  const sections = [
    { en: 'Trusted Contacts', local: t('familyKit.fallbackTrustedContacts'), content: contactsHTML },
    { en: 'Power of Attorney', local: t('familyKit.fallbackPowerOfAttorney'), content: poaHTML },
    { en: 'Important Documents', local: t('familyKit.fallbackImportantDocuments'), content: docsHTML },
    { en: 'School Plan', local: t('familyKit.fallbackSchoolPlan'), content: schoolHTML },
    { en: 'Go Bag', local: t('familyKit.fallbackGoBag'), content: bagHTML },
    { en: 'Key Numbers to Memorize', local: t('familyKit.fallbackKeyNumbers'), content: numbersHTML },
    { en: 'Family Communication Plan', local: t('familyKit.fallbackFamilyCommunication'), content: commHTML },
  ];

  const sectionsHTML = sections.map((s, i) =>
    `${sectionHeader(i + 1, s.en, s.local, isEnglish, SECTION_COLORS[i])}
     <div style="margin-left:38px;margin-bottom:16px;">${s.content}</div>`
  ).join('');

  const langSubtitle = isEnglish
    ? ''
    : `<div style="font-size:12px;color:${COLORS.slate600};margin-top:2px;">Bilingual: English + ${langName}</div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Family Preparedness Plan — SafeNeighbor</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; padding: 0; }
      .page { padding: 28px 36px; box-shadow: none; border: none; }
    }
    @page {
      margin: 0.5in;
      size: letter portrait;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', 'Noto Sans CJK SC', 'Noto Sans Arabic', sans-serif;
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
      color: ${COLORS.slate800};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 36px 44px;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <!-- Print toolbar -->
  <div class="no-print" style="max-width:800px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:13px;color:${COLORS.slate600};">
      Use <strong>Ctrl+P</strong> (or <strong>⌘+P</strong>) → "<strong>Save as PDF</strong>" to download.
    </div>
    <button onclick="window.print()" style="background:${COLORS.brand};color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">
      Print / Save PDF
    </button>
  </div>

  <div class="page">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px;padding-bottom:20px;border-bottom:3px solid ${COLORS.brand};">
      <div style="font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:${COLORS.brand};margin-bottom:4px;">SafeNeighbor</div>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:${COLORS.slate900};letter-spacing:1px;">
        ${t('familyKit.title')}
      </h1>
      ${langSubtitle}
      <div style="font-size:11px;color:${COLORS.slate400};margin-top:8px;">
        Generated: ${date}
      </div>
    </div>

    <!-- Sections -->
    ${sectionsHTML}

    <!-- Important Reminders -->
    <div style="margin-top:28px;background:${COLORS.brandLight};border:2px solid ${COLORS.brand};border-radius:10px;padding:16px 20px;page-break-inside:avoid;">
      <h3 style="margin:0 0 8px 0;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:${COLORS.brandDark};">Important Reminders</h3>
      <div style="font-size:12px;line-height:1.8;color:${COLORS.brandDark};">
        <div>• You have the <strong>RIGHT to remain silent</strong>.</div>
        <div>• You do <strong>NOT</strong> have to open your door without a judicial warrant.</div>
        <div>• <strong>Memorize</strong> the National Immigration Detention Hotline: <strong>1-833-560-0927</strong></div>
        <div>• Review and update this plan every <strong>3–6 months</strong>.</div>
        <div>• Make sure your trusted contacts have a copy.</div>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:20px;padding-top:12px;border-top:1px solid ${COLORS.slate200};text-align:center;font-size:10px;color:${COLORS.slate400};line-height:1.6;">
      <div>Generated by <strong>SafeNeighbor</strong> — safeneighbor-33bb0.web.app</div>
      <div>This is not legal advice. Consult a licensed attorney.</div>
    </div>
  </div>
</body>
</html>`;

  return html;
}

// ── Open in a new window & trigger print ────────────────
export function openFamilyPlanPDF(data, t, currentLang = 'en') {
  const html = generateFamilyPlanPDF(data, t, currentLang);
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    // Small delay to let styles render before triggering print
    setTimeout(() => w.print(), 400);
  }
}
