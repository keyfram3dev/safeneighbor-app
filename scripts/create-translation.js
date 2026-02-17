#!/usr/bin/env node
// scripts/create-translation.js
// Creates a translation file from English source, copying structure with English values as placeholders
// Usage: node scripts/create-translation.js <lang-code>
// This creates src/i18n/<lang>/common.json with English values that can then be translated

const fs = require('fs');
const path = require('path');

const langCode = process.argv[2];
if (!langCode) {
  console.error('Usage: node scripts/create-translation.js <lang-code>');
  process.exit(1);
}

const enPath = path.join(__dirname, '..', 'src', 'i18n', 'en', 'common.json');
const outDir = path.join(__dirname, '..', 'src', 'i18n', langCode);
const outPath = path.join(outDir, 'common.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Write the English content as a starting point for translation
fs.writeFileSync(outPath, JSON.stringify(en, null, 2) + '\n', 'utf8');

console.log(`Created ${outPath} (${Object.keys(en).length} sections, English placeholder values)`);
console.log('This file needs to be translated from English to', langCode);
