// src/utils/quoteRotation.js
// Rotating quote hook — shows original on first visit, then weighted random rotation.

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

// 18 alternate quotes referenced by i18n keys
const ALTERNATE_QUOTES = [
  // Stoic
  { quoteKey: 'sharedQuotes.seneca1',    authorKey: 'sharedQuotes.seneca1Author' },
  { quoteKey: 'sharedQuotes.epictetus1', authorKey: 'sharedQuotes.epictetus1Author' },
  { quoteKey: 'sharedQuotes.aurelius1',  authorKey: 'sharedQuotes.aurelius1Author' },
  { quoteKey: 'sharedQuotes.aurelius2',  authorKey: 'sharedQuotes.aurelius2Author' },
  { quoteKey: 'sharedQuotes.epictetus2', authorKey: 'sharedQuotes.epictetus2Author' },
  { quoteKey: 'sharedQuotes.seneca2',    authorKey: 'sharedQuotes.seneca2Author' },
  { quoteKey: 'sharedQuotes.aurelius3',  authorKey: 'sharedQuotes.aurelius3Author' },
  { quoteKey: 'sharedQuotes.seneca3',    authorKey: 'sharedQuotes.seneca3Author' },
  // Viktor Frankl
  { quoteKey: 'sharedQuotes.frankl1',    authorKey: 'sharedQuotes.frankl1Author' },
  { quoteKey: 'sharedQuotes.frankl2',    authorKey: 'sharedQuotes.frankl2Author' },
  { quoteKey: 'sharedQuotes.frankl3',    authorKey: 'sharedQuotes.frankl3Author' },
  { quoteKey: 'sharedQuotes.frankl4',    authorKey: 'sharedQuotes.frankl4Author' },
  // Existentialist
  { quoteKey: 'sharedQuotes.sartre1',    authorKey: 'sharedQuotes.sartre1Author' },
  { quoteKey: 'sharedQuotes.camus1',     authorKey: 'sharedQuotes.camus1Author' },
  { quoteKey: 'sharedQuotes.camus2',     authorKey: 'sharedQuotes.camus2Author' },
  { quoteKey: 'sharedQuotes.sartre2',    authorKey: 'sharedQuotes.sartre2Author' },
  { quoteKey: 'sharedQuotes.camus3',     authorKey: 'sharedQuotes.camus3Author' },
  { quoteKey: 'sharedQuotes.camus4',     authorKey: 'sharedQuotes.camus4Author' },
];

/**
 * Returns a quote for the current page visit.
 * First visit in session → original quote. Subsequent → weighted random.
 *
 * @param {string} defaultQuoteKey  - i18n key for page's original quote
 * @param {string} defaultAuthorKey - i18n key for page's original author
 * @param {string} pageId           - unique id for sessionStorage tracking
 * @param {number} [defaultWeight=3] - how many times more likely the original is vs each alternate
 */
export function useRotatingQuote(defaultQuoteKey, defaultAuthorKey, pageId, defaultWeight = 3) {
  const { t } = useTranslation();
  const selectedRef = useRef(null);

  if (selectedRef.current === null) {
    const storageKey = `sn_quote_visit_${pageId}`;
    const visitCount = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
    sessionStorage.setItem(storageKey, String(visitCount + 1));

    if (visitCount === 0) {
      selectedRef.current = { quoteKey: defaultQuoteKey, authorKey: defaultAuthorKey };
    } else {
      // Weighted pool: original x defaultWeight, each alternate x1
      const pool = [];
      for (let i = 0; i < defaultWeight; i++) {
        pool.push({ quoteKey: defaultQuoteKey, authorKey: defaultAuthorKey });
      }
      ALTERNATE_QUOTES.forEach(alt => pool.push(alt));
      selectedRef.current = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  return {
    quote: t(selectedRef.current.quoteKey),
    author: t(selectedRef.current.authorKey),
  };
}
