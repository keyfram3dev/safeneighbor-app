// src/utils/familyKitDocument.js
// Generates a formatted plain-text family preparedness plan from form data

export function generateFamilyPlan(data) {
  const lines = [];
  const divider = '─'.repeat(56);
  const heavyDivider = '═'.repeat(56);

  lines.push(heavyDivider);
  lines.push('        FAMILY PREPAREDNESS PLAN');
  lines.push('        SafeNeighbor — Know Your Rights');
  lines.push(heavyDivider);
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push('');

  // 1. Trusted Contacts
  lines.push(divider);
  lines.push('1. TRUSTED CONTACTS');
  lines.push(divider);
  if (data.contacts && data.contacts.length > 0) {
    data.contacts.forEach((c, i) => {
      lines.push(`  ${i + 1}. ${c.name || '(no name)'}`);
      if (c.phone) lines.push(`     Phone: ${c.phone}`);
      if (c.email) lines.push(`     Email: ${c.email}`);
      if (c.relationship) lines.push(`     Relationship: ${c.relationship}`);
      lines.push('');
    });
  } else {
    lines.push('  (No contacts entered)');
    lines.push('');
  }

  // 2. Power of Attorney
  lines.push(divider);
  lines.push('2. POWER OF ATTORNEY');
  lines.push(divider);
  if (data.poa) {
    if (data.poa.name) lines.push(`  Designee: ${data.poa.name}`);
    if (data.poa.phone) lines.push(`  Phone: ${data.poa.phone}`);
    if (data.poa.relationship) lines.push(`  Relationship: ${data.poa.relationship}`);
    if (data.poa.documentLocation) lines.push(`  Document Location: ${data.poa.documentLocation}`);
    lines.push(`  Notarized: ${data.poa.notarized ? 'Yes' : 'No'}`);
  } else {
    lines.push('  (Not completed)');
  }
  lines.push('');

  // 3. Important Documents
  lines.push(divider);
  lines.push('3. IMPORTANT DOCUMENTS');
  lines.push(divider);
  if (data.documents) {
    const docs = data.documents;
    if (docs.checklist && docs.checklist.length > 0) {
      lines.push('  Documents gathered:');
      docs.checklist.forEach(item => {
        lines.push(`    [x] ${item}`);
      });
    }
    const allDocs = ['Government ID', 'Birth Certificates', 'Immigration Documents', 'Medical Records', 'Insurance Cards', 'Social Security Cards', 'Bank Statements', 'Lease / Deed', 'Vehicle Title', 'School Records'];
    const missing = allDocs.filter(d => !docs.checklist || !docs.checklist.includes(d));
    if (missing.length > 0) {
      lines.push('  Still needed:');
      missing.forEach(item => {
        lines.push(`    [ ] ${item}`);
      });
    }
    if (docs.originalsLocation) lines.push(`  Originals stored at: ${docs.originalsLocation}`);
    if (docs.copiesLocation) lines.push(`  Copies stored at: ${docs.copiesLocation}`);
    if (docs.whoHoldsCopies) lines.push(`  Who holds copies: ${docs.whoHoldsCopies}`);
  } else {
    lines.push('  (Not completed)');
  }
  lines.push('');

  // 4. School Plan
  lines.push(divider);
  lines.push('4. SCHOOL PLAN');
  lines.push(divider);
  if (data.school) {
    if (data.school.notApplicable) {
      lines.push('  N/A — No children / not applicable');
    } else {
      if (data.school.children && data.school.children.length > 0) {
        lines.push('  Children:');
        data.school.children.forEach((child, i) => {
          lines.push(`    ${i + 1}. ${child.name || '(no name)'}`);
          if (child.school) lines.push(`       School: ${child.school}`);
          if (child.grade) lines.push(`       Grade: ${child.grade}`);
          if (child.schoolPhone) lines.push(`       School Phone: ${child.schoolPhone}`);
        });
        lines.push('');
      }
      if (data.school.pickupContacts && data.school.pickupContacts.length > 0) {
        lines.push('  Authorized Pickup Contacts:');
        data.school.pickupContacts.forEach((p, i) => {
          lines.push(`    ${i + 1}. ${p.name || '(no name)'} — ${p.phone || 'no phone'} (${p.relationship || 'n/a'})`);
        });
        lines.push('');
      }
      lines.push(`  School notified: ${data.school.schoolNotified ? 'Yes' : 'No'}${data.school.notifiedDate ? ` (${data.school.notifiedDate})` : ''}`);
    }
  } else {
    lines.push('  (Not completed)');
  }
  lines.push('');

  // 5. Go Bag
  lines.push(divider);
  lines.push('5. GO BAG');
  lines.push(divider);
  if (data.goBag) {
    const bag = data.goBag;
    const allItems = ['Phone Charger', 'Cash', 'Prescription Medications', 'Document Copies', 'Attorney\'s Card', 'Change of Clothes', 'Water & Snacks', 'Child Essentials'];
    if (bag.checklist && bag.checklist.length > 0) {
      lines.push('  Packed:');
      bag.checklist.forEach(item => lines.push(`    [x] ${item}`));
      const unpacked = allItems.filter(i => !bag.checklist.includes(i));
      if (unpacked.length > 0) {
        lines.push('  Still needed:');
        unpacked.forEach(item => lines.push(`    [ ] ${item}`));
      }
    } else {
      lines.push('  Items to pack:');
      allItems.forEach(item => lines.push(`    [ ] ${item}`));
    }
    if (bag.location) lines.push(`  Bag location: ${bag.location}`);
    if (bag.whoKnows) lines.push(`  Who else knows: ${bag.whoKnows}`);
    if (bag.notes) lines.push(`  Notes: ${bag.notes}`);
  } else {
    lines.push('  (Not completed)');
  }
  lines.push('');

  // 6. Key Numbers
  lines.push(divider);
  lines.push('6. KEY NUMBERS TO MEMORIZE');
  lines.push(divider);
  if (data.keyNumbers) {
    const kn = data.keyNumbers;
    if (kn.attorneyName || kn.attorneyPhone) {
      lines.push(`  Attorney: ${kn.attorneyName || '(name)'}  ${kn.attorneyPhone || '(phone)'}`);
    }
    if (kn.familyContactName || kn.familyContactPhone) {
      lines.push(`  Family Contact: ${kn.familyContactName || '(name)'}  ${kn.familyContactPhone || '(phone)'}`);
    }
    lines.push(`  Detention Hotline: 1-833-560-0927`);
    if (kn.additionalNumbers && kn.additionalNumbers.length > 0) {
      kn.additionalNumbers.forEach(n => {
        if (n.name || n.phone) {
          lines.push(`  ${n.name || '(name)'}: ${n.phone || '(phone)'}`);
        }
      });
    }
  } else {
    lines.push('  Detention Hotline: 1-833-560-0927');
    lines.push('  (Other numbers not entered)');
  }
  lines.push('');

  // 7. Family Communication
  lines.push(divider);
  lines.push('7. FAMILY COMMUNICATION PLAN');
  lines.push(divider);
  if (data.communication) {
    const comm = data.communication;
    if (comm.codeWord) lines.push(`  Code word/phrase: ${comm.codeWord}`);
    if (comm.meetingPlace) lines.push(`  Meeting place: ${comm.meetingPlace}`);
    if (comm.familyBriefed && comm.familyBriefed.length > 0) {
      lines.push('  Family members briefed:');
      comm.familyBriefed.forEach(m => {
        lines.push(`    ${m.briefed ? '[x]' : '[ ]'} ${m.name || '(unnamed)'}`);
      });
    }
    if (comm.lastDiscussionDate) lines.push(`  Last discussed: ${comm.lastDiscussionDate}`);
    if (comm.notes) lines.push(`  Notes: ${comm.notes}`);
  } else {
    lines.push('  (Not completed)');
  }
  lines.push('');

  // Footer
  lines.push(heavyDivider);
  lines.push('IMPORTANT REMINDERS');
  lines.push(heavyDivider);
  lines.push('');
  lines.push('• You have the RIGHT to remain silent.');
  lines.push('• You do NOT have to open your door without a judicial warrant.');
  lines.push('• Memorize the National Immigration Detention Hotline:');
  lines.push('  1-833-560-0927');
  lines.push('');
  lines.push('• Review and update this plan every 3-6 months.');
  lines.push('• Make sure your trusted contacts have a copy.');
  lines.push('');
  lines.push(divider);
  lines.push('Generated by SafeNeighbor — safeneighbor-33bb0.web.app');
  lines.push('This is not legal advice. Consult a licensed attorney.');
  lines.push(divider);

  return lines.join('\n');
}
