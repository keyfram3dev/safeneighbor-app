// src/utils/encounterEvidencePackage.js
// Generates a structured legal evidence package for an encounter log.
// Uses styled HTML opened in a new window so users can print or save as PDF.

import { getEncounterAttachment } from './localStorageDB';

const COLORS = {
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  red: '#dc2626',
  amber: '#d97706',
  amberLight: '#fef3c7',
  amberDark: '#92400e',
  blue: '#2563eb',
  blueLight: '#dbeafe',
  blueDark: '#1d4ed8',
  emerald: '#059669',
  emeraldLight: '#ecfdf5',
  emeraldDark: '#065f46',
};

const CATEGORY_LABELS = {
  door: 'At the Door',
  response: 'Your Response',
  escalation: 'Escalation',
  details: 'Details',
  observation: 'Observation',
  detained: 'Detained Person',
  scene: 'Scene',
  documentation: 'Documentation',
};

const SOURCE_LABELS = {
  'vault-recording': 'Vault recording',
  'imported-file': 'Imported file',
  'external-note': 'Manual reference',
};

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAttachmentType(type) {
  return String(type || 'attachment')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSourceLabel(sourceType) {
  return SOURCE_LABELS[sourceType] || formatAttachmentType(sourceType || 'reference');
}

function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDuration(startISO, endISO) {
  if (!startISO || !endISO) return 'Ongoing / not completed';
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 'Less than 1 minute';
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return 'Less than 1 minute';
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function getLogModeLabel(log) {
  if (log?.witnessLog) return 'Witness Documentation';
  if (log?.afterTheFact) return 'After-the-Fact Reconstruction';
  return 'Real-Time Encounter Log';
}

function getIntegrityStatement(log) {
  if (log?.witnessLog) {
    return 'This package was assembled from a witness log created by a bystander documenting from a public space. Event times come from the device clock at the moment entries were saved.';
  }
  if (log?.afterTheFact) {
    return 'This package was assembled from an encounter reconstructed after the event. Dates and times may reflect the user’s later reconstruction rather than live capture.';
  }
  return 'This package was assembled from a real-time encounter log. Event times come from the device clock at the moment entries were saved.';
}

function normalizeForHash(log) {
  const events = [...(log?.events || [])]
    .map((event) => ({
      timestamp: event.timestamp,
      category: event.category,
      label: event.label,
      note: event.note || '',
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    id: log?.id || null,
    startedAt: log?.startedAt || null,
    endedAt: log?.endedAt || null,
    updatedAt: log?.updatedAt || null,
    afterTheFact: Boolean(log?.afterTheFact),
    witnessLog: Boolean(log?.witnessLog),
    location: log?.location
      ? {
          lat: log.location.lat,
          lng: log.location.lng,
          accuracy: log.location.accuracy || null,
          address: log.location.address || '',
        }
      : null,
    notes: log?.notes || '',
    evidenceDetails: {
      agency: log?.evidenceDetails?.agency || '',
      agentIdentifiers: log?.evidenceDetails?.agentIdentifiers || '',
      vehicleDetails: log?.evidenceDetails?.vehicleDetails || '',
      witnessDetails: log?.evidenceDetails?.witnessDetails || '',
      injuries: log?.evidenceDetails?.injuries || '',
      propertyDamage: log?.evidenceDetails?.propertyDamage || '',
      attachmentNotes: log?.evidenceDetails?.attachmentNotes || '',
      chainOfCustody: log?.evidenceDetails?.chainOfCustody || '',
    },
    attachments: (log?.attachments || []).map((attachment) => ({
      id: attachment.id,
      sourceType: attachment.sourceType || '',
      attachmentType: attachment.attachmentType || '',
      recordingId: attachment.recordingId || '',
      label: attachment.label || '',
      createdAt: attachment.createdAt || '',
      storage: attachment.storage || '',
      notes: attachment.notes || '',
      backupStatus: attachment.backupStatus || '',
    })),
    events,
  };
}

async function sha256Hex(input) {
  if (!window.crypto?.subtle) {
    return `local-${String(input.length).padStart(8, '0')}`;
  }

  const encoded = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function computePackageHash(log) {
  const normalized = JSON.stringify(normalizeForHash(log));
  const hex = await sha256Hex(normalized);
  return hex.slice(0, 16).toUpperCase();
}

function summaryCard(label, value, accent = COLORS.blue) {
  return `
    <div class="avoid-break" style="background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-top:4px solid ${accent};border-radius:10px;padding:12px 14px;min-height:88px;">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.4px;color:${COLORS.slate400};margin-bottom:6px;">${h(label)}</div>
      <div style="font-size:14px;font-weight:700;line-height:1.45;color:${COLORS.slate800};">${h(value || '—')}</div>
    </div>
  `;
}

function sectionHeader(number, title, subtitle, color) {
  return `
    <div style="margin:24px 0 10px 0;page-break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;">${number}</div>
        <div>
          <h2 style="margin:0;font-size:15px;font-weight:900;color:${COLORS.slate900};text-transform:uppercase;letter-spacing:1.4px;">${h(title)}</h2>
          ${subtitle ? `<div style="font-size:10px;color:${COLORS.slate400};text-transform:uppercase;letter-spacing:1px;margin-top:2px;">${h(subtitle)}</div>` : ''}
        </div>
      </div>
      <div style="height:2px;background:linear-gradient(to right,${color},transparent);margin-left:38px;"></div>
    </div>
  `;
}

function buildTimelineRows(log) {
  const rows = [];
  rows.push(`
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-weight:700;color:${COLORS.slate800};white-space:nowrap;">${h(formatTime(log.startedAt))}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-weight:700;color:${COLORS.blueDark};">Encounter Started</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};color:${COLORS.slate600};">${h(log.location?.address || 'Location not captured')}</td>
    </tr>
  `);

  const events = [...(log.events || [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const event of events) {
    const category = CATEGORY_LABELS[event.category] || event.category || 'Event';
    const detail = event.note ? `${event.label} — ${event.note}` : event.label;
    rows.push(`
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-weight:700;color:${COLORS.slate800};white-space:nowrap;">${h(formatTime(event.timestamp))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-weight:700;color:${COLORS.slate700};">${h(category)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};color:${COLORS.slate600};">${h(detail)}</td>
      </tr>
    `);
  }

  if (log.endedAt) {
    rows.push(`
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-weight:700;color:${COLORS.slate800};white-space:nowrap;">${h(formatTime(log.endedAt))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-weight:700;color:${COLORS.red};">Encounter Ended</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};color:${COLORS.slate600};">User marked the log complete.</td>
      </tr>
    `);
  }

  return rows.join('');
}

function detailBlock(label, value) {
  return `
    <div class="avoid-break" style="background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:12px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.2px;color:${COLORS.slate400};margin-bottom:6px;">${h(label)}</div>
      <div style="font-size:13px;line-height:1.65;color:${COLORS.slate700};white-space:pre-wrap;">${h(value || 'Not recorded')}</div>
    </div>
  `;
}

function attachmentRow(attachment) {
  const createdLabel = attachment.createdAt ? formatDateTime(attachment.createdAt) : '—';
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-size:12px;color:${COLORS.slate700};font-weight:700;">${h(attachment.label || 'Attachment')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-size:12px;color:${COLORS.slate600};">${h(formatAttachmentType(attachment.attachmentType))}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-size:12px;color:${COLORS.slate600};">${h(getSourceLabel(attachment.sourceType))}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-size:12px;color:${COLORS.slate600};">${h(attachment.storage || 'Not specified')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-size:12px;color:${COLORS.slate600};">${h(attachment.backupStatus || 'Not specified')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.slate200};font-size:12px;color:${COLORS.slate600};">${h(createdLabel)}</td>
    </tr>
    ${attachment.notes ? `
      <tr>
        <td colspan="6" style="padding:0 12px 12px;border-bottom:1px solid ${COLORS.slate200};font-size:12px;color:${COLORS.slate600};line-height:1.65;">
          <strong style="color:${COLORS.slate700};">Notes:</strong> ${h(attachment.notes)}
        </td>
      </tr>
    ` : ''}
  `;
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function ensureAttachmentBlob(stored, fallbackMimeType = 'application/octet-stream') {
  if (!stored?.blob) return null;
  if (stored.blob instanceof Blob) return stored.blob;
  return new Blob([stored.blob], { type: stored._mimeType || fallbackMimeType });
}

async function hydrateAttachmentPreviews(attachments) {
  const hydrated = await Promise.all((attachments || []).map(async (attachment) => {
    if (!attachment?.importedFileId) {
      return {
        ...attachment,
        previewKind: 'reference-only',
        previewUrl: null,
      };
    }

    try {
      const stored = await getEncounterAttachment(attachment.importedFileId);
      const mimeType = stored?._mimeType || attachment.mimeType || '';
      const isImage = mimeType.startsWith('image/');
      const blob = ensureAttachmentBlob(stored, mimeType || 'application/octet-stream');

      if (!blob || !isImage) {
        return {
          ...attachment,
          previewKind: 'stored-file',
          previewUrl: null,
          mimeType,
        };
      }

      const previewUrl = await readBlobAsDataUrl(blob);
      return {
        ...attachment,
        previewKind: 'image',
        previewUrl,
        mimeType,
      };
    } catch (error) {
      console.error('Failed to hydrate encounter attachment preview:', error);
      return {
        ...attachment,
        previewKind: 'unavailable',
        previewUrl: null,
      };
    }
  }));

  return hydrated;
}

function buildAttachmentPreviewCards(attachments) {
  const previewable = attachments.filter((attachment) => attachment.previewKind === 'image' && attachment.previewUrl);
  const referencedOnly = attachments.filter((attachment) => attachment.previewKind !== 'image');

  return `
    ${previewable.length > 0 ? `
      <div class="preview-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;">
        ${previewable.map((attachment, index) => `
          <div style="border:1px solid ${COLORS.slate200};border-radius:14px;overflow:hidden;background:white;page-break-inside:avoid;">
            <div style="padding:10px 12px;background:${COLORS.slate50};border-bottom:1px solid ${COLORS.slate200};">
              <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.1px;color:${COLORS.red};">Evidence Image ${index + 1}</div>
              <div style="font-size:13px;font-weight:700;color:${COLORS.slate800};margin-top:4px;">${h(attachment.label || 'Imported image')}</div>
              <div style="font-size:11px;color:${COLORS.slate500};margin-top:4px;">${h(formatAttachmentType(attachment.attachmentType))} • ${h(getSourceLabel(attachment.sourceType))} • ${h(formatDateTime(attachment.createdAt))}</div>
            </div>
            <div style="padding:12px;background:white;">
              <img src="${attachment.previewUrl}" alt="${h(attachment.label || 'Evidence image')}" style="display:block;width:100%;max-height:320px;object-fit:contain;border-radius:10px;background:${COLORS.slate50};border:1px solid ${COLORS.slate200};" />
              ${attachment.notes ? `<div style="margin-top:10px;font-size:12px;line-height:1.7;color:${COLORS.slate600};"><strong style="color:${COLORS.slate700};">Notes:</strong> ${h(attachment.notes)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div style="background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.7;color:${COLORS.slate600};">
        No importable image evidence was available to embed directly in this package. Supporting files are still listed in the manifest below.
      </div>
    `}
    ${referencedOnly.length > 0 ? `
      <div style="margin-top:14px;background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:12px;padding:14px 16px;">
        <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.1px;color:${COLORS.slate500};margin-bottom:8px;">Referenced But Not Embedded</div>
        ${referencedOnly.map((attachment) => `
          <div style="font-size:12px;line-height:1.7;color:${COLORS.slate600};margin-bottom:8px;">
            <strong style="color:${COLORS.slate700};">${h(attachment.label || 'Attachment')}</strong>
            <span> • ${h(formatAttachmentType(attachment.attachmentType))}</span>
            <span> • ${h(getSourceLabel(attachment.sourceType))}</span>
            <span> • ${h(attachment.storage || 'Storage not specified')}</span>
            ${attachment.notes ? `<div style="margin-top:2px;">${h(attachment.notes)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

export async function generateEncounterEvidencePackageHtml(log) {
  const generatedAt = new Date().toISOString();
  const packageHash = await computePackageHash(log);
  const modeLabel = getLogModeLabel(log);
  const eventCount = (log.events || []).length;
  const duration = formatDuration(log.startedAt, log.endedAt);
  const locationLabel = log.location?.address
    || (log.location?.lat && log.location?.lng
      ? `${log.location.lat.toFixed(6)}, ${log.location.lng.toFixed(6)}`
      : 'Location not captured');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Device local timezone';
  const evidenceDetails = log.evidenceDetails || {};
  const hasEvidenceDetails = Object.values(evidenceDetails).some((value) => String(value || '').trim());
  const attachments = await hydrateAttachmentPreviews(log.attachments || []);

  const attorneyChecklist = [
    'Review chronology against any companion audio, video, screenshots, or warrant photos.',
    'Preserve this package with the original device files and any synced encrypted backups.',
    'Confirm whether the log was created live, reconstructed later, or prepared by a witness.',
    'Export or preserve any related post-encounter notes, contact information, and supporting documents.',
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Legal Evidence Package — ${h(log.id || 'Encounter')}</title>
  <style>
    @page {
      margin: 0.45in;
      size: letter portrait;
    }
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; padding: 0; background: white; }
      .page { box-shadow: none; border: none; border-radius: 0; }
      .avoid-break {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .section-block {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .detail-grid,
      .summary-grid,
      .preview-grid {
        break-inside: auto;
        page-break-inside: auto;
      }
      .detail-grid > *,
      .summary-grid > *,
      .preview-grid > * {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
      .attachment-table tr,
      .meta-table tr {
        break-inside: avoid-page;
        page-break-inside: avoid;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif;
      background: ${COLORS.slate100};
      margin: 0;
      padding: 20px;
      color: ${COLORS.slate800};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 860px;
      margin: 0 auto;
      background: white;
      border-radius: 14px;
      box-shadow: 0 10px 40px rgba(15, 23, 42, 0.12);
      padding: 34px 40px 32px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .hero-grid {
      display:grid;
      grid-template-columns:minmax(0, 1.3fr) minmax(260px, 0.7fr);
      gap:18px;
      align-items:stretch;
    }
    .meta-table td {
      padding: 8px 10px;
      border-bottom: 1px solid ${COLORS.slate200};
      vertical-align: top;
      font-size: 12px;
    }
    .meta-table td:first-child {
      width: 170px;
      color: ${COLORS.slate400};
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-size: 10px;
    }
    @media (max-width: 680px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .hero-grid {
        grid-template-columns: 1fr;
      }
      .page {
        padding: 24px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width:860px;margin:0 auto 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
    <div style="font-size:13px;color:${COLORS.slate600};">
      Use <strong>Print</strong> or <strong>Save as PDF</strong> to preserve this evidence package.
    </div>
    <button onclick="window.print()" style="background:${COLORS.blue};color:white;border:none;padding:10px 18px;border-radius:10px;font-weight:800;font-size:14px;cursor:pointer;">
      Print / Save PDF
    </button>
  </div>

  <div class="page">
    <div style="background:linear-gradient(135deg,#7f1d1d 0%,#991b1b 35%,#b91c1c 100%);border-radius:18px;padding:22px 22px 20px;color:white;box-shadow:0 16px 36px rgba(127,29,29,0.22);">
      <div class="hero-grid">
        <div>
          <div style="display:inline-flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid rgba(255,255,255,0.14);border-radius:999px;background:rgba(15,23,42,0.18);margin-bottom:14px;">
            <div style="font-size:10px;font-weight:900;letter-spacing:2.5px;text-transform:uppercase;">SafeNeighbor</div>
            <div style="width:1px;height:14px;background:rgba(255,255,255,0.22);"></div>
            <div style="font-size:10px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:rgba(255,255,255,0.82);">Attorney Evidence Export</div>
          </div>
          <h1 style="margin:0;font-size:31px;line-height:1.05;font-weight:950;color:white;">Legal Evidence Package</h1>
          <div style="margin-top:10px;font-size:14px;font-weight:700;color:rgba(255,255,255,0.88);">${h(modeLabel)}</div>
          <div style="margin-top:14px;max-width:460px;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.82);">
            Structured timeline, notes, and supporting evidence prepared from the SafeNeighbor encounter log for preservation and attorney review.
          </div>
        </div>
        <div style="background:rgba(15,23,42,0.18);border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:14px 16px;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.4px;color:rgba(255,255,255,0.72);margin-bottom:8px;">Package Metadata</div>
          <div style="font-size:12px;color:white;line-height:1.7;">
            <div><strong>Encounter ID:</strong> ${h(log.id || '—')}</div>
            <div><strong>Generated:</strong> ${h(formatDateTime(generatedAt))}</div>
            <div><strong>Timezone:</strong> ${h(timezone)}</div>
            <div><strong>Package Hash:</strong> ${h(packageHash)}</div>
            <div><strong>Attachments:</strong> ${h(String(attachments.length))}</div>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:${COLORS.amberLight};border:1px solid rgba(217,119,6,0.28);color:${COLORS.amberDark};font-size:13px;line-height:1.6;">
      <strong>Integrity Note:</strong> ${h(getIntegrityStatement(log))}
    </div>

    <div style="margin-top:18px;" class="grid summary-grid">
      ${summaryCard('Encounter date', formatDateTime(log.startedAt), COLORS.red)}
      ${summaryCard('End / status', log.endedAt ? formatDateTime(log.endedAt) : 'Still marked in progress', COLORS.blue)}
      ${summaryCard('Location', locationLabel, COLORS.emerald)}
      ${summaryCard('Duration / events', `${duration} • ${eventCount} logged event${eventCount === 1 ? '' : 's'} • ${attachments.length} attachment${attachments.length === 1 ? '' : 's'}`, COLORS.amber)}
    </div>

    ${sectionHeader(1, 'Encounter Summary', 'Core metadata for counsel review', COLORS.red)}
    <div class="section-block" style="margin-left:38px;">
      <table class="meta-table attachment-table" style="width:100%;border-collapse:collapse;">
        <tr><td>Encounter ID</td><td>${h(log.id || '—')}</td></tr>
        <tr><td>Log type</td><td>${h(modeLabel)}</td></tr>
        <tr><td>Started</td><td>${h(formatDateTime(log.startedAt))}</td></tr>
        <tr><td>Ended</td><td>${h(log.endedAt ? formatDateTime(log.endedAt) : 'Still marked in progress')}</td></tr>
        <tr><td>Duration</td><td>${h(duration)}</td></tr>
        <tr><td>Generated on</td><td>${h(formatDateTime(generatedAt))}</td></tr>
        <tr><td>Package hash</td><td>${h(packageHash)}</td></tr>
        <tr><td>Timezone</td><td>${h(timezone)}</td></tr>
        <tr><td>Location</td><td>${h(locationLabel)}</td></tr>
        ${log.location?.lat && log.location?.lng ? `<tr><td>Coordinates</td><td>${h(`${log.location.lat.toFixed(6)}, ${log.location.lng.toFixed(6)}`)}</td></tr>` : ''}
      </table>
    </div>

    ${sectionHeader(2, 'Timeline of Events', 'Chronological device-captured event sequence', COLORS.blue)}
    <div class="section-block" style="margin-left:38px;">
      <table class="attachment-table" style="width:100%;border-collapse:collapse;background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:${COLORS.blueLight};">
            <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.blueDark};">Time</th>
            <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.blueDark};">Category</th>
            <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.blueDark};">Event Detail</th>
          </tr>
        </thead>
        <tbody>
          ${buildTimelineRows(log)}
        </tbody>
      </table>
    </div>

    ${sectionHeader(3, 'Narrative Notes', 'User-entered freeform notes', COLORS.emerald)}
    <div class="section-block" style="margin-left:38px;">
      <div class="avoid-break" style="background:${COLORS.emeraldLight};border:1px solid rgba(5,150,105,0.22);border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.75;color:${COLORS.slate700};white-space:pre-wrap;">${h(log.notes?.trim() || 'No additional notes were entered for this encounter.')}</div>
    </div>

    ${sectionHeader(4, 'Evidence Details', 'Identifiers, witnesses, damage, and preservation context', COLORS.emerald)}
    <div class="section-block grid detail-grid" style="margin-left:38px;">
      ${detailBlock('Agency or unit', evidenceDetails.agency)}
      ${detailBlock('Agent identifiers', evidenceDetails.agentIdentifiers)}
      ${detailBlock('Vehicle details', evidenceDetails.vehicleDetails)}
      ${detailBlock('Witness details', evidenceDetails.witnessDetails)}
      ${detailBlock('Injuries or medical concerns', evidenceDetails.injuries)}
      ${detailBlock('Property damage or seized items', evidenceDetails.propertyDamage)}
      ${detailBlock('Attachment notes', evidenceDetails.attachmentNotes)}
      ${detailBlock('Preservation / chain of custody', evidenceDetails.chainOfCustody)}
    </div>
    ${!hasEvidenceDetails ? `
      <div class="section-block" style="margin-left:38px;margin-top:10px;font-size:12px;color:${COLORS.slate600};line-height:1.7;">
        No richer evidence-detail fields were filled in for this package. The package still includes the core timeline, notes, and location data captured in the encounter log.
      </div>
    ` : ''}

    ${sectionHeader(5, 'Attorney Handoff', 'Recommended preservation and review steps', COLORS.amber)}
    <div class="section-block" style="margin-left:38px;">
      <div class="avoid-break" style="background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:12px;padding:14px 16px;">
        ${attorneyChecklist.map((item, index) => `
          <div style="display:flex;gap:10px;margin-bottom:${index === attorneyChecklist.length - 1 ? '0' : '10px'};">
            <div style="width:18px;height:18px;border-radius:4px;border:2px solid ${COLORS.amber};margin-top:1px;flex-shrink:0;"></div>
            <div style="font-size:13px;line-height:1.6;color:${COLORS.slate700};">${h(item)}</div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:10px;font-size:12px;color:${COLORS.slate600};line-height:1.7;">
        This packet should be preserved together with any recordings, screenshots, photographs, warrants, and cloud-synced encrypted copies related to the same event.
      </div>
    </div>

    ${sectionHeader(6, 'Attachment Manifest', 'Referenced supporting files and vault recordings', COLORS.blue)}
    <div class="section-block" style="margin-left:38px;">
      ${buildAttachmentPreviewCards(attachments)}
    </div>

    <div class="section-block" style="margin-left:38px;margin-top:14px;">
      ${attachments.length > 0 ? `
        <table class="attachment-table" style="width:100%;border-collapse:collapse;background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:${COLORS.blueLight};">
              <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.blueDark};">Label</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.blueDark};">Type</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.blueDark};">Source</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.blueDark};">Storage</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.blueDark};">Preservation</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${COLORS.blueDark};">Created</th>
            </tr>
          </thead>
          <tbody>
            ${attachments.map(attachmentRow).join('')}
          </tbody>
        </table>
      ` : `
        <div style="background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.7;color:${COLORS.slate600};">
          No attachment manifest entries were recorded for this encounter package.
        </div>
      `}
    </div>

    <div style="margin-top:24px;padding-top:14px;border-top:1px solid ${COLORS.slate200};font-size:10px;line-height:1.7;color:${COLORS.slate400};">
      <div><strong style="color:${COLORS.slate600};">Generated by:</strong> SafeNeighbor</div>
      <div><strong style="color:${COLORS.slate600};">Purpose:</strong> Attorney-facing preservation and review package</div>
      <div><strong style="color:${COLORS.slate600};">Legal note:</strong> This document is not legal advice. It is a structured export of information recorded in the app.</div>
    </div>
  </div>
</body>
</html>`;

  return html;
}

export async function openEncounterEvidencePackage(log) {
  const html = await generateEncounterEvidencePackageHtml(log);
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(html);
  win.document.close();

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch (error) {
      console.error('Failed to print encounter evidence package:', error);
    }
  };

  const finalizeWhenReady = () => {
    try {
      const images = Array.from(win.document.images || []);
      if (!images.length) {
        setTimeout(triggerPrint, 150);
        return;
      }

      let remaining = images.filter((img) => !img.complete).length;
      if (remaining === 0) {
        setTimeout(triggerPrint, 150);
        return;
      }

      const handleDone = () => {
        remaining -= 1;
        if (remaining <= 0) {
          setTimeout(triggerPrint, 150);
        }
      };

      images.forEach((img) => {
        if (img.complete) return;
        img.addEventListener('load', handleDone, { once: true });
        img.addEventListener('error', handleDone, { once: true });
      });

      setTimeout(triggerPrint, 1800);
    } catch (error) {
      console.error('Failed while preparing encounter evidence package print:', error);
      setTimeout(triggerPrint, 300);
    }
  };

  if (win.document.readyState === 'complete') {
    finalizeWhenReady();
  } else {
    win.addEventListener('load', finalizeWhenReady, { once: true });
    setTimeout(finalizeWhenReady, 600);
  }
  return true;
}
