/**
 * Client-side PII detection for community report descriptions.
 * Warns users before submission — does not hard-block.
 */

/**
 * Detect potential PII patterns in text
 * @param {string} text - The text to scan
 * @returns {Array<{type: string, match: string, suggestion: string}>}
 */
export const detectPII = (text) => {
  if (!text) return [];

  const findings = [];

  // Phone numbers (US formats: 555-1234, (555) 123-4567, 5551234567, +1 555 123 4567)
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phoneRegex);
  if (phones) {
    findings.push({
      type: 'Phone Number',
      match: phones[0],
      suggestion: 'Remove phone numbers to protect privacy'
    });
  }

  // Email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex);
  if (emails) {
    findings.push({
      type: 'Email Address',
      match: emails[0],
      suggestion: 'Remove email addresses to protect privacy'
    });
  }

  // Street addresses (number + street name pattern)
  // Matches: "123 Main St", "4567 Oak Avenue", "89 N. 1st Street"
  const addressRegex = /\b\d{1,5}\s+(?:[NSEW]\.?\s+)?(?:[A-Z][a-z]+\s*){1,3}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Ln|Lane|Rd|Road|Way|Ct|Court|Pl(?:ace)?|Cir(?:cle)?|Pkwy|Parkway)\b/gi;
  const addresses = text.match(addressRegex);
  if (addresses) {
    findings.push({
      type: 'Street Address',
      match: addresses[0],
      suggestion: 'Use a neighborhood name instead (e.g., "near downtown" instead of "123 Main St")'
    });
  }

  // Names preceded by common identifiers
  // Matches: "named John", "name is Maria", "called Jose"
  const namePatterns = /\b(?:named?|called|name\s+is)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/gi;
  const names = text.match(namePatterns);
  if (names) {
    findings.push({
      type: 'Personal Name',
      match: names[0],
      suggestion: 'Avoid using personal names in reports'
    });
  }

  return findings;
};
