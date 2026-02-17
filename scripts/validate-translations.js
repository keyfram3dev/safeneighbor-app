#!/usr/bin/env node

/**
 * Translation Validation Script
 * Compares all language files against en/common.json
 * Reports: missing keys, extra keys, interpolation variable mismatches
 */

const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'src', 'i18n');

// Flatten nested JSON into dot-notation keys
function flattenKeys(obj, prefix = '') {
  const keys = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(keys, flattenKeys(value, fullKey));
    } else {
      keys[fullKey] = value;
    }
  }
  return keys;
}

// Extract {{variable}} interpolation patterns from a string
function extractVars(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/\{\{(\w+)\}\}/g) || [];
  return matches.sort();
}

// Load and parse a JSON file
function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`  Failed to parse ${filePath}: ${e.message}`);
    return null;
  }
}

// Main
const enPath = path.join(I18N_DIR, 'en', 'common.json');
const enData = loadJson(enPath);
if (!enData) {
  console.error('Cannot load English source file. Aborting.');
  process.exit(1);
}

const enKeys = flattenKeys(enData);
const enKeySet = new Set(Object.keys(enKeys));
const totalKeys = enKeySet.size;

console.log(`\nEnglish source: ${totalKeys} keys\n`);
console.log('='.repeat(70));

// Find all language directories
const langDirs = fs.readdirSync(I18N_DIR).filter(d => {
  const fullPath = path.join(I18N_DIR, d);
  return fs.statSync(fullPath).isDirectory() && d !== 'en';
});

let hasErrors = false;
const summary = [];

for (const lang of langDirs.sort()) {
  const langPath = path.join(I18N_DIR, lang, 'common.json');
  if (!fs.existsSync(langPath)) {
    console.log(`\n[${lang}] No common.json found — skipping`);
    continue;
  }

  const langData = loadJson(langPath);
  if (!langData) continue;

  const langKeys = flattenKeys(langData);
  const langKeySet = new Set(Object.keys(langKeys));

  // Missing keys (in EN but not in this language)
  const missing = [...enKeySet].filter(k => !langKeySet.has(k));

  // Extra keys (in this language but not in EN)
  const extra = [...langKeySet].filter(k => !enKeySet.has(k));

  // Interpolation mismatches
  const varMismatches = [];
  for (const key of [...enKeySet].filter(k => langKeySet.has(k))) {
    const enVars = extractVars(enKeys[key]);
    const langVars = extractVars(langKeys[key]);
    if (JSON.stringify(enVars) !== JSON.stringify(langVars)) {
      varMismatches.push({ key, expected: enVars, got: langVars });
    }
  }

  const present = totalKeys - missing.length;
  const pct = ((present / totalKeys) * 100).toFixed(1);

  console.log(`\n[${lang}] ${present}/${totalKeys} keys (${pct}%)`);

  if (missing.length > 0) {
    // Group missing keys by top-level section
    const missingSections = {};
    for (const key of missing) {
      const section = key.split('.')[0];
      if (!missingSections[section]) missingSections[section] = [];
      missingSections[section].push(key);
    }
    console.log(`  Missing (${missing.length}):`);
    for (const [section, keys] of Object.entries(missingSections)) {
      console.log(`    ${section}: ${keys.length} keys`);
    }
  }

  if (extra.length > 0) {
    console.log(`  Extra keys (${extra.length}): ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? '...' : ''}`);
  }

  if (varMismatches.length > 0) {
    hasErrors = true;
    console.log(`  Interpolation mismatches (${varMismatches.length}):`);
    for (const m of varMismatches.slice(0, 5)) {
      console.log(`    ${m.key}: expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.got)}`);
    }
    if (varMismatches.length > 5) {
      console.log(`    ... and ${varMismatches.length - 5} more`);
    }
  }

  if (missing.length === 0 && extra.length === 0 && varMismatches.length === 0) {
    console.log('  Complete — no issues');
  }

  summary.push({ lang, present, total: totalKeys, pct, missing: missing.length, extra: extra.length, varMismatches: varMismatches.length });
}

// Summary table
console.log('\n' + '='.repeat(70));
console.log('\nSummary:');
console.log(`${'Lang'.padEnd(6)} ${'Keys'.padStart(6)} ${'%'.padStart(7)} ${'Missing'.padStart(8)} ${'Extra'.padStart(6)} ${'VarErr'.padStart(7)}`);
console.log('-'.repeat(42));
for (const s of summary) {
  console.log(`${s.lang.padEnd(6)} ${String(s.present).padStart(6)} ${(s.pct + '%').padStart(7)} ${String(s.missing).padStart(8)} ${String(s.extra).padStart(6)} ${String(s.varMismatches).padStart(7)}`);
}

console.log('');

if (hasErrors) {
  console.log('WARN: Interpolation variable mismatches found — these may cause runtime errors.');
  process.exit(1);
}
