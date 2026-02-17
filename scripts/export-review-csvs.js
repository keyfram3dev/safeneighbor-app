#!/usr/bin/env node
/**
 * Export critical translation keys as per-language CSV files
 * for native speaker review.
 *
 * Usage: node scripts/export-review-csvs.js
 * Output: scripts/review-csvs/<lang>.csv
 *
 * Priority tiers:
 *   P1 — Constitutional rights, emergency instructions, rights card (life-safety)
 *   P2 — Scenario scripts, encounter log, legal info (high-use)
 *   P3 — UI/nav labels, settings (lower risk)
 *
 * We export P1 + P2 (~200 keys) so reviewers focus on what matters most.
 */

const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'src', 'i18n');
const OUT_DIR = path.join(__dirname, 'review-csvs');

// Languages to export (all non-English)
const LANGUAGES = [
  'ar', 'am', 'es', 'fa', 'fr', 'hi', 'ht', 'ko',
  'mh', 'my', 'ne', 'pa', 'pt', 'quc', 'ru', 'so', 'tl', 'vi', 'zh'
];

const TIER_LABELS = {
  ar: 'Arabic (Tier 2)',
  tl: 'Tagalog (Tier 2)',
  fr: 'French (Tier 3)',
  so: 'Somali (Tier 3)',
  am: 'Amharic (Tier 3)',
  fa: 'Dari/Farsi (Tier 3)',
  ne: 'Nepali (Tier 3)',
  pa: 'Punjabi (Tier 3)',
  hi: 'Hindi (Tier 3)',
  my: 'Burmese (Tier 3)',
  ht: 'Haitian Creole (Tier 3)',
  pt: 'Portuguese (Tier 3)',
  es: 'Spanish (Tier 1 — spot-check)',
  ko: 'Korean (Tier 1 — spot-check)',
  vi: 'Vietnamese (Tier 1 — spot-check)',
  zh: 'Chinese (Tier 1 — spot-check)',
  quc: "K'iche' (Tier 4 — lowest confidence)",
  mh: 'Marshallese (Tier 4 — lowest confidence)',
  ru: 'Russian (Tier 4)',
};

// ── Define which keys to extract, grouped by priority ──────

// P1: Life-safety — rights assertions, emergency panel, rights card
const P1_SECTIONS = {
  rightsCard: 'all',  // all 31 keys
  emergency: 'all',   // all 21 keys
};

// P2: High-use legal & scenario content (selected keys)
const P2_SECTIONS = {
  legal: [
    'title', 'subtitle',
    'silentTitle', 'silentContent',
    'searchTitle', 'searchContent',
    'signTitle', 'signContent',
    'warrantTitle', 'warrantContent',
    'consentTitle', 'consentContent',
    'iceTitle', 'iceContent',
    'courtRightsTitle', 'courtRightsContent',
    'courtRightsInfo1', 'courtRightsInfo2', 'courtRightsInfo3',
    'courtRightsInfo4', 'courtRightsInfo5', 'courtRightsInfo6',
    'courtRightsInfo7', 'courtRightsInfo8',
    'resourcesTitle', 'resourcesContent',
    'neverSignWarning', 'neverSignTitle', 'neverSignContent',
  ],
  scenarioDetail: [
    'doorKnockTitle', 'doorKnockIntro',
    'doorStep1', 'doorStep2', 'doorStep3', 'doorStep4', 'doorStep5',
    'publicTitle', 'publicIntro',
    'publicStep1', 'publicStep2', 'publicStep3', 'publicStep4',
    'vehicleTitle', 'vehicleIntro',
    'vehicleStep1', 'vehicleStep2', 'vehicleStep3', 'vehicleStep4',
    'borderTitle', 'borderIntro',
    'borderStep1', 'borderStep2', 'borderStep3', 'borderStep4',
  ],
  encounterLog: [
    'title', 'subtitle', 'nowMode', 'afterMode',
    'nowSubtitle', 'afterSubtitle',
    'agentsAtDoor', 'askedForWarrant', 'showedWarrant', 'noWarrant',
    'detained', 'searched', 'askedQuestions', 'refusedEntry',
    'vehicleDescription', 'agentCount', 'badgeNumbers',
    'shareReport', 'shareReportDesc',
  ],
  trustedContacts: [
    'title', 'subtitle', 'sosMessage', 'sosButton',
    'contactName', 'contactPhone', 'contactRelationship',
    'template1Title', 'template1Body',
    'template2Title', 'template2Body',
    'template3Title', 'template3Body',
  ],
  familyKit: [
    'title', 'subtitle',
    'step1Title', 'step1Desc',
    'step2Title', 'step2Desc',
    'step3Title', 'step3Desc',
    'step4Title', 'step4Desc',
    'step5Title', 'step5Desc',
    'step6Title', 'step6Desc',
    'step7Title', 'step7Desc',
    'shareButton',
  ],
  postEncounter: [
    'title', 'subtitle',
    'detained', 'detainedDesc',
    'notDetained', 'notDetainedDesc',
    'witnessedRaid', 'witnessedRaidDesc',
  ],
  deescalation: [
    'title', 'subtitle',
    'stayCalm', 'stayCalmDesc',
    'speakSoftly', 'speakSoftlyDesc',
    'doNotRun', 'doNotRunDesc',
    'recordIfSafe', 'recordIfSafeDesc',
  ],
};

// ── Helpers ────────────────────────────────────────────────

function escapeCsv(str) {
  if (str == null) return '';
  const s = String(str);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flattenKeys(v, key));
    } else {
      result[key] = String(v);
    }
  }
  return result;
}

function getNestedValue(obj, dotPath) {
  const parts = dotPath.split('.');
  let current = obj;
  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[p];
  }
  return current;
}

// ── Main ──────────────────────────────────────────────────

function main() {
  // Load English
  const en = require(path.join(I18N_DIR, 'en', 'common.json'));

  // Build ordered list of keys to export
  const keysToExport = []; // { dotPath, priority, section }

  // P1 keys
  for (const [section, spec] of Object.entries(P1_SECTIONS)) {
    if (spec === 'all' && en[section]) {
      for (const k of Object.keys(en[section])) {
        keysToExport.push({ dotPath: `${section}.${k}`, priority: 'P1', section });
      }
    }
  }

  // P2 keys
  for (const [section, keys] of Object.entries(P2_SECTIONS)) {
    for (const k of keys) {
      if (en[section] && en[section][k] !== undefined) {
        keysToExport.push({ dotPath: `${section}.${k}`, priority: 'P2', section });
      }
    }
  }

  console.log(`Exporting ${keysToExport.length} critical keys across ${LANGUAGES.length} languages.\n`);

  // Ensure output dir
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const lang of LANGUAGES) {
    const langFile = path.join(I18N_DIR, lang, 'common.json');
    if (!fs.existsSync(langFile)) {
      console.log(`  SKIP ${lang} — file not found`);
      continue;
    }
    const langData = JSON.parse(fs.readFileSync(langFile, 'utf8'));
    const label = TIER_LABELS[lang] || lang;

    const rows = [];
    // Header
    rows.push([
      'Priority',
      'Section',
      'Key',
      'English',
      `Current ${label}`,
      'Suggested Fix (leave blank if correct)',
      'Notes',
    ].map(escapeCsv).join(','));

    for (const { dotPath, priority, section } of keysToExport) {
      const enValue = getNestedValue(en, dotPath) || '';
      const langValue = getNestedValue(langData, dotPath) || '⚠️ MISSING';
      rows.push([
        priority,
        section,
        dotPath,
        escapeCsv(String(enValue)),
        escapeCsv(String(langValue)),
        '',
        '',
      ].join(','));
    }

    const safeName = label.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const csvPath = path.join(OUT_DIR, `${lang}-${safeName}.csv`);
    fs.writeFileSync(csvPath, '\ufeff' + rows.join('\n'), 'utf8'); // BOM for Excel UTF-8
    console.log(`  ✓ ${csvPath.split('/').pop()} — ${keysToExport.length} keys`);
  }

  console.log(`\nDone! Files in: ${OUT_DIR}/`);
  console.log('\nInstructions for reviewers:');
  console.log('1. Open the CSV in Google Sheets (File → Import → Upload)');
  console.log('2. Review the "Current Translation" column against "English"');
  console.log('3. If a translation is wrong or awkward, write the fix in "Suggested Fix"');
  console.log('4. Add notes for context (e.g., "too formal", "wrong legal term")');
  console.log('5. Leave blank if the translation is correct');
}

main();
