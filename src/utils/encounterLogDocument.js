// src/utils/encounterLogDocument.js
// Generates a formatted plain-text encounter log report for attorneys

const CATEGORY_LABELS = {
  door: 'AT THE DOOR',
  response: 'YOUR RESPONSE',
  escalation: 'ESCALATION',
  details: 'DETAILS',
};

const WITNESS_CATEGORY_LABELS = {
  observation: 'OBSERVATION',
  detained: 'DETAINED PERSON',
  scene: 'SCENE',
  documentation: 'DOCUMENTATION',
};

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDuration(startISO, endISO) {
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return 'Less than 1 minute';
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function generateEncounterReport(log) {
  const lines = [];
  const divider = '\u2500'.repeat(56);
  const heavyDivider = '\u2550'.repeat(56);

  const labels = log.witnessLog ? WITNESS_CATEGORY_LABELS : CATEGORY_LABELS;

  lines.push(heavyDivider);
  if (log.witnessLog) {
    lines.push('        WITNESS LOG \u2014 BYSTANDER DOCUMENTATION');
  } else {
    lines.push('        ENCOUNTER LOG \u2014 TIMESTAMPED RECORD');
  }
  lines.push('        SafeNeighbor \u2014 Know Your Rights');
  lines.push(heavyDivider);
  lines.push('');

  const now = new Date().toISOString();
  lines.push(`Report Created: ${formatDate(now)} at ${formatTime(now)}`);
  lines.push('');

  if (log.afterTheFact) {
    lines.push('NOTE: This encounter was logged after the fact.');
    lines.push(`Events were recorded from memory on ${formatDate(log.updatedAt)}.`);
    lines.push('');
  }

  lines.push(`Encounter ID: ${log.id}`);
  lines.push(`Encounter Date: ${formatDate(log.startedAt)} at ${formatTime(log.startedAt)}`);
  if (log.endedAt) {
    lines.push(`Ended: ${formatDate(log.endedAt)} at ${formatTime(log.endedAt)}`);
    if (!log.afterTheFact) {
      lines.push(`Duration: ${formatDuration(log.startedAt, log.endedAt)}`);
    }
  } else {
    lines.push('Ended: (still in progress)');
  }
  if (log.location) {
    if (log.location.address) lines.push(`Location: ${log.location.address}`);
    lines.push(`Coordinates: ${log.location.lat.toFixed(6)}, ${log.location.lng.toFixed(6)}`);
  }
  lines.push('');

  // Timeline
  lines.push(divider);
  lines.push('TIMELINE OF EVENTS');
  lines.push(divider);
  lines.push('');

  // Start marker
  lines.push(`  ${formatTime(log.startedAt)}  [ENCOUNTER STARTED]`);
  if (log.location?.address) {
    lines.push(`              Location: ${log.location.address}`);
  }
  lines.push('');

  // Events in chronological order
  const sortedEvents = [...(log.events || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const event of sortedEvents) {
    const categoryLabel = labels[event.category] || event.category.toUpperCase();
    lines.push(`  ${formatTime(event.timestamp)}  [${categoryLabel}] ${event.label}`);
    if (event.note) {
      lines.push(`              Note: ${event.note}`);
    }
    lines.push('');
  }

  // End marker
  if (log.endedAt) {
    lines.push(`  ${formatTime(log.endedAt)}  [ENCOUNTER ENDED]`);
    lines.push('');
  }

  // Notes
  if (log.notes && log.notes.trim()) {
    lines.push(divider);
    lines.push('NOTES');
    lines.push(divider);
    lines.push(`  ${log.notes.trim()}`);
    lines.push('');
  }

  const evidenceDetails = log.evidenceDetails || {};
  const hasEvidenceDetails = Object.values(evidenceDetails).some((value) => String(value || '').trim());
  if (hasEvidenceDetails) {
    lines.push(divider);
    lines.push('EVIDENCE DETAILS');
    lines.push(divider);
    if (evidenceDetails.agency) lines.push(`Agency or unit: ${evidenceDetails.agency}`);
    if (evidenceDetails.agentIdentifiers) lines.push(`Agent identifiers: ${evidenceDetails.agentIdentifiers}`);
    if (evidenceDetails.vehicleDetails) lines.push(`Vehicle details: ${evidenceDetails.vehicleDetails}`);
    if (evidenceDetails.witnessDetails) lines.push(`Witness details: ${evidenceDetails.witnessDetails}`);
    if (evidenceDetails.injuries) lines.push(`Injuries or medical concerns: ${evidenceDetails.injuries}`);
    if (evidenceDetails.propertyDamage) lines.push(`Property damage or seized items: ${evidenceDetails.propertyDamage}`);
    if (evidenceDetails.attachmentNotes) lines.push(`Attachment notes: ${evidenceDetails.attachmentNotes}`);
    if (evidenceDetails.chainOfCustody) lines.push(`Preservation / chain of custody: ${evidenceDetails.chainOfCustody}`);
    lines.push('');
  }

  const attachments = Array.isArray(log.attachments) ? log.attachments : [];
  if (attachments.length > 0) {
    lines.push(divider);
    lines.push('ATTACHMENT MANIFEST');
    lines.push(divider);
    attachments.forEach((attachment, index) => {
      lines.push(`${index + 1}. ${attachment.label || 'Attachment'}`);
      lines.push(`   Type: ${attachment.attachmentType || 'attachment'}`);
      lines.push(`   Source: ${attachment.sourceType || 'reference'}`);
      if (attachment.storage) lines.push(`   Storage: ${attachment.storage}`);
      if (attachment.backupStatus) lines.push(`   Preservation: ${attachment.backupStatus}`);
      if (attachment.createdAt) lines.push(`   Created: ${formatDate(attachment.createdAt)} at ${formatTime(attachment.createdAt)}`);
      if (attachment.notes) lines.push(`   Notes: ${attachment.notes}`);
      lines.push('');
    });
  }

  // Footer
  lines.push(heavyDivider);
  if (log.witnessLog) {
    lines.push('This log was created by a community witness documenting');
    lines.push('from a public space. First Amendment protected activity.');
  } else if (log.afterTheFact) {
    lines.push('IMPORTANT: This log was reconstructed after the encounter.');
    lines.push('Times and dates were entered from memory by the user.');
  } else {
    lines.push('IMPORTANT: This log was created in real-time during an');
    lines.push('encounter. Timestamps are from the device clock.');
  }
  lines.push('Share this document with your attorney immediately.');
  lines.push(heavyDivider);
  lines.push('Generated by SafeNeighbor \u2014 safeneighbor-33bb0.web.app');
  lines.push('This is not legal advice. Consult a licensed attorney.');
  lines.push(divider);

  return lines.join('\n');
}

// Generate a short SMS-friendly summary of the encounter
export function generateEncounterSummary(log) {
  const eventCount = (log.events || []).length;
  const start = formatTime(log.startedAt);
  const location = log.location?.address || 'Unknown location';
  const duration = log.endedAt ? formatDuration(log.startedAt, log.endedAt) : 'ongoing';

  const labels = log.witnessLog ? WITNESS_CATEGORY_LABELS : CATEGORY_LABELS;
  const categories = {};
  for (const event of log.events || []) {
    const label = labels[event.category] || event.category;
    categories[label] = (categories[label] || 0) + 1;
  }
  const summary = Object.entries(categories)
    .map(([cat, count]) => `${count} ${cat.toLowerCase()}`)
    .join(', ');

  return (
    `${log.witnessLog ? 'WITNESS LOG' : 'ENCOUNTER LOG'} from SafeNeighbor:\n` +
    `Started: ${start} | Duration: ${duration}\n` +
    `Location: ${location}\n` +
    `${eventCount} events logged${summary ? ` (${summary})` : ''}\n` +
    `\nFull timestamped report available in the SafeNeighbor app.`
  );
}
