// Supported languages with metadata
// dir: text direction, tier: priority level, quality: translation confidence

export const SUPPORTED_LANGUAGES = [
  // Tier 1 — Highest impact, strong translation quality
  { code: 'en', name: 'English', nativeName: 'English', flag: '\u{1F1FA}\u{1F1F8}', dir: 'ltr', tier: 1, quality: 'verified' },
  { code: 'es', name: 'Spanish', nativeName: 'Espa\u00f1ol', flag: '\u{1F1EA}\u{1F1F8}', dir: 'ltr', tier: 1, quality: 'verified' },
  { code: 'zh', name: 'Chinese', nativeName: '\u7b80\u4f53\u4e2d\u6587', flag: '\u{1F1E8}\u{1F1F3}', dir: 'ltr', tier: 1, quality: 'verified' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Ti\u1ebfng Vi\u1ec7t', flag: '\u{1F1FB}\u{1F1F3}', dir: 'ltr', tier: 1, quality: 'machine' },
  { code: 'ko', name: 'Korean', nativeName: '\ud55c\uad6d\uc5b4', flag: '\u{1F1F0}\u{1F1F7}', dir: 'ltr', tier: 1, quality: 'machine' },

  // Tier 2 — High impact, good translation quality
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Krey\u00f2l Ayisyen', flag: '\u{1F1ED}\u{1F1F9}', dir: 'ltr', tier: 2, quality: 'verified' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugu\u00eas', flag: '\u{1F1E7}\u{1F1F7}', dir: 'ltr', tier: 2, quality: 'machine' },
  { code: 'ar', name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', flag: '\u{1F1F8}\u{1F1E6}', dir: 'rtl', tier: 2, quality: 'machine' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', flag: '\u{1F1F5}\u{1F1ED}', dir: 'ltr', tier: 2, quality: 'machine' },

  // Tier 3 — Underserved & high-vulnerability communities
  { code: 'fr', name: 'French', nativeName: 'Fran\u00e7ais', flag: '\u{1F1EB}\u{1F1F7}', dir: 'ltr', tier: 3, quality: 'machine' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', flag: '\u{1F1F8}\u{1F1F4}', dir: 'ltr', tier: 3, quality: 'machine' },
  { code: 'am', name: 'Amharic', nativeName: '\u12a0\u121b\u122d\u129b', flag: '\u{1F1EA}\u{1F1F9}', dir: 'ltr', tier: 3, quality: 'machine' },
  { code: 'fa', name: 'Dari/Farsi', nativeName: '\u0641\u0627\u0631\u0633\u06cc/\u062f\u0631\u06cc', flag: '\u{1F1E6}\u{1F1EB}', dir: 'rtl', tier: 3, quality: 'machine' },
  { code: 'ne', name: 'Nepali', nativeName: '\u0928\u0947\u092a\u093e\u0932\u0940', flag: '\u{1F1F3}\u{1F1F5}', dir: 'ltr', tier: 3, quality: 'machine' },
  { code: 'pa', name: 'Punjabi', nativeName: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40', flag: '\u{1F1EE}\u{1F1F3}', dir: 'ltr', tier: 3, quality: 'machine' },
  { code: 'hi', name: 'Hindi', nativeName: '\u0939\u093f\u0928\u094d\u0926\u0940', flag: '\u{1F1EE}\u{1F1F3}', dir: 'ltr', tier: 3, quality: 'machine' },
  { code: 'my', name: 'Burmese', nativeName: '\u1019\u103c\u1014\u103a\u1019\u102c\u1018\u102c\u101e\u102c', flag: '\u{1F1F2}\u{1F1F2}', dir: 'ltr', tier: 3, quality: 'machine' },

  // Tier 4 — Hardest to reach, most underserved
  { code: 'ru', name: 'Russian', nativeName: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', flag: '\u{1F1F7}\u{1F1FA}', dir: 'ltr', tier: 4, quality: 'machine' },
  { code: 'quc', name: "K'iche'", nativeName: "K'iche'", flag: '\u{1F1EC}\u{1F1F9}', dir: 'ltr', tier: 4, quality: 'limited' },
  { code: 'mh', name: 'Marshallese', nativeName: 'Kajin M\u0327aje\u013c', flag: '\u{1F1F2}\u{1F1ED}', dir: 'ltr', tier: 4, quality: 'limited' },
];

export const RTL_LANGUAGES = SUPPORTED_LANGUAGES.filter(l => l.dir === 'rtl').map(l => l.code);

export const LANGUAGE_STORAGE_KEY = 'safeneighbor_language';
