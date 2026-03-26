// src/utils/guardiansManualPDF.js
// Generates a polished, single-sheet "Guardian's Manual" PDF.
// Uses styled HTML opened in a new window — the browser's native
// print dialog lets users "Save as PDF".

// ── Color palette ──────────────────────────────────────────
const C = {
  brand:      '#2563eb', // blue-600
  brandLight: '#dbeafe', // blue-100
  brandDark:  '#1e3a5f',
  amber:      '#d97706',
  amberLight: '#fef3c7',
  amberDark:  '#92400e',
  red:        '#dc2626',
  redLight:   '#fef2f2',
  redDark:    '#991b1b',
  emerald:    '#059669',
  emeraldLight:'#ecfdf5',
  emeraldDark:'#065f46',
  blue:       '#2563eb',
  blueLight:  '#eff6ff',
  blueDark:   '#1e40af',
  slate50:    '#f8fafc',
  slate100:   '#f1f5f9',
  slate200:   '#e2e8f0',
  slate400:   '#94a3b8',
  slate600:   '#475569',
  slate700:   '#334155',
  slate800:   '#1e293b',
  slate900:   '#0f172a',
};

// ── Section header ─────────────────────────────────────────
function sectionHeader(number, title, subtitle, color) {
  return `
    <div style="margin:22px 0 10px 0;page-break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;">${number}</div>
        <div>
          <h2 style="margin:0;font-size:15px;font-weight:800;color:${C.slate800};text-transform:uppercase;letter-spacing:1.5px;">${title}</h2>
          ${subtitle ? `<div style="font-size:10px;color:${C.slate400};text-transform:uppercase;letter-spacing:1px;margin-top:1px;">${subtitle}</div>` : ''}
        </div>
      </div>
      <div style="height:2px;background:linear-gradient(to right,${color},transparent);margin-left:38px;"></div>
    </div>
  `;
}

// ── Bullet item ────────────────────────────────────────────
function bullet(label, desc, color) {
  return `
    <div style="display:flex;gap:8px;margin-bottom:8px;page-break-inside:avoid;">
      <div style="width:6px;height:6px;border-radius:50%;background:${color};margin-top:6px;flex-shrink:0;"></div>
      <div>
        <span style="font-weight:700;font-size:12px;color:${C.slate800};">${label}:</span>
        <span style="font-size:12px;color:${C.slate600};line-height:1.6;"> ${desc}</span>
      </div>
    </div>
  `;
}

// ── Script blockquote ──────────────────────────────────────
function scriptQuote(text) {
  return `
    <div style="background:${C.slate50};border-left:3px solid ${C.red};padding:8px 12px;margin:8px 0;border-radius:0 6px 6px 0;page-break-inside:avoid;">
      <div style="font-size:12px;font-weight:700;color:${C.slate800};line-height:1.5;font-style:italic;">"${text}"</div>
    </div>
  `;
}

// ── Checklist item ─────────────────────────────────────────
function checkItem(label, desc) {
  return `
    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;page-break-inside:avoid;">
      <span style="display:inline-block;width:14px;height:14px;border:2px solid ${C.emerald};border-radius:3px;margin-top:1px;flex-shrink:0;"></span>
      <div>
        <span style="font-weight:700;font-size:12px;color:${C.slate800};">${label}</span>
        <span style="font-size:11px;color:${C.slate600};"> — ${desc}</span>
      </div>
    </div>
  `;
}

// ── Main generator ─────────────────────────────────────────
export function generateGuardiansManualPDF(t) {

  // ── Part 1: The Stoic Mindset ──────────────────────────
  const stoicHTML = `
    ${sectionHeader(1, t('guardiansManual.stoicTitle'), t('guardiansManual.stoicSubtitle'), C.amber)}
    <div style="margin-left:38px;">
      <div style="background:${C.amberLight};border-radius:8px;padding:10px 14px;margin-bottom:10px;border:1px solid ${C.amber}40;page-break-inside:avoid;">
        <div style="font-size:12px;font-style:italic;color:${C.amberDark};line-height:1.5;">${t('guardiansManual.stoicQuote')}</div>
        <div style="font-size:10px;color:${C.amber};margin-top:4px;font-weight:600;">${t('guardiansManual.stoicQuoteAuthor')}</div>
      </div>
      ${bullet(t('guardiansManual.stoicAccept'), t('guardiansManual.stoicAcceptDesc'), C.amber)}
      ${bullet(t('guardiansManual.stoicBreathe'), t('guardiansManual.stoicBreatheDesc'), C.amber)}
      ${bullet(t('guardiansManual.stoicDuty'), t('guardiansManual.stoicDutyDesc'), C.amber)}
    </div>
  `;

  // ── Part 2: The Legal Shield ───────────────────────────
  const legalHTML = `
    ${sectionHeader(2, t('guardiansManual.legalTitle'), t('guardiansManual.legalSubtitle'), C.red)}
    <div style="margin-left:38px;">
      <div style="margin-bottom:14px;page-break-inside:avoid;">
        <h3 style="margin:0 0 4px 0;font-size:13px;font-weight:800;color:${C.redDark};">${t('guardiansManual.scenarioATitle')}</h3>
        <div style="font-size:11px;color:${C.red};font-weight:600;margin-bottom:6px;">⚠ ${t('guardiansManual.scenarioARule')}</div>
        ${scriptQuote(t('guardiansManual.scenarioAScript'))}
        <div style="font-size:11px;color:${C.slate600};line-height:1.5;margin-top:6px;background:${C.redLight};padding:8px 10px;border-radius:6px;">
          ${t('guardiansManual.scenarioAWarrant')}
        </div>
      </div>
      <div style="page-break-inside:avoid;">
        <h3 style="margin:0 0 4px 0;font-size:13px;font-weight:800;color:${C.redDark};">${t('guardiansManual.scenarioBTitle')}</h3>
        <div style="font-size:11px;color:${C.red};font-weight:600;margin-bottom:6px;">⚠ ${t('guardiansManual.scenarioBRule')}</div>
        ${scriptQuote(t('guardiansManual.scenarioBScript1'))}
        <div style="font-size:11px;color:${C.slate400};font-style:italic;margin:-4px 0 6px 16px;">${t('guardiansManual.scenarioBScript1Note')}</div>
        ${scriptQuote(t('guardiansManual.scenarioBScript2'))}
      </div>
    </div>
  `;

  // ── Part 3: The Community Map ──────────────────────────
  const mapHTML = `
    ${sectionHeader(3, t('guardiansManual.mapTitle'), t('guardiansManual.mapSubtitle'), C.blue)}
    <div style="margin-left:38px;">
      <div style="font-size:12px;color:${C.slate600};margin-bottom:8px;line-height:1.5;">${t('guardiansManual.mapIntro')}</div>
      ${bullet(t('guardiansManual.mapObserve'), t('guardiansManual.mapObserveDesc'), C.blue)}
      ${bullet(t('guardiansManual.mapPin'), t('guardiansManual.mapPinDesc'), C.blue)}
      ${bullet(t('guardiansManual.mapVerify'), t('guardiansManual.mapVerifyDesc'), C.blue)}
    </div>
  `;

  // ── Part 4: Emergency Checklist ────────────────────────
  const checklistHTML = `
    ${sectionHeader(4, t('guardiansManual.checklistTitle'), '', C.emerald)}
    <div style="margin-left:38px;background:${C.emeraldLight};border:1px solid ${C.emerald}30;border-radius:8px;padding:12px 14px;">
      ${checkItem(t('guardiansManual.checklistPhone'), t('guardiansManual.checklistPhoneDesc'))}
      ${checkItem(t('guardiansManual.checklistContact'), t('guardiansManual.checklistContactDesc'))}
      ${checkItem(t('guardiansManual.checklistBookmark'), t('guardiansManual.checklistBookmarkDesc'))}
      ${checkItem(t('guardiansManual.checklistSilence'), t('guardiansManual.checklistSilenceDesc'))}
    </div>
  `;

  // ── Assemble ───────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>The Guardian's Manual — SafeNeighbor</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; padding: 0; }
      .page { padding: 24px 32px; box-shadow: none; border: none; }
    }
    @page {
      margin: 0.4in;
      size: letter portrait;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', 'Noto Sans CJK SC', 'Noto Sans Arabic', sans-serif;
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
      color: ${C.slate800};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 32px 40px;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <!-- Print toolbar -->
  <div class="no-print" style="max-width:800px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:13px;color:${C.slate600};">
      Use <strong>Ctrl+P</strong> (or <strong>⌘+P</strong>) → "<strong>Save as PDF</strong>" to download.
    </div>
    <button onclick="window.print()" style="background:${C.brand};color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">
      Print / Save PDF
    </button>
  </div>

  <div class="page">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:16px;padding-bottom:16px;border-bottom:3px solid ${C.brand};">
      <div style="font-size:11px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:${C.brand};margin-bottom:6px;">Safe Neighbor</div>
      <h1 style="margin:0;font-size:24px;font-weight:900;color:${C.slate900};letter-spacing:1px;">${t('guardiansManual.title')}</h1>
      <div style="font-size:12px;color:${C.slate400};margin-top:6px;font-style:italic;letter-spacing:0.5px;">"${t('guardiansManual.subtitle')}"</div>
    </div>

    ${stoicHTML}
    ${legalHTML}
    ${mapHTML}
    ${checklistHTML}

    <!-- Footer CTA -->
    <div style="margin-top:20px;text-align:center;background:${C.blueLight};border:2px solid ${C.brand};border-radius:10px;padding:14px 20px;page-break-inside:avoid;">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:${C.slate400};margin-bottom:4px;">For Real-Time Updates & Encrypted Scripts</div>
      <div style="font-size:18px;font-weight:900;color:${C.brand};letter-spacing:1px;">${t('guardiansManual.footerUrl')}</div>
      <div style="font-size:11px;color:${C.slate600};margin-top:4px;font-weight:600;">${t('guardiansManual.footerTagline')}</div>
    </div>

    <!-- Disclaimer -->
    <div style="margin-top:14px;padding-top:10px;border-top:1px solid ${C.slate200};text-align:center;font-size:9px;color:${C.slate400};line-height:1.5;">
      <div>${t('guardiansManual.footerDisclaimer')}</div>
      <div style="margin-top:2px;">Generated by <strong>SafeNeighbor</strong></div>
    </div>
  </div>
</body>
</html>`;

  return html;
}

// ── Open in a new window & trigger print ────────────────
export function openGuardiansManualPDF(t) {
  const html = generateGuardiansManualPDF(t);
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }
}
