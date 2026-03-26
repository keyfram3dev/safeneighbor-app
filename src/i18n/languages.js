// Supported languages with metadata
// dir: text direction, tier: priority level, quality: translation confidence
// symbol: 1-2 native characters shown in Windows 11-style colored tile
// color: hex accent color for the tile icon

export const SUPPORTED_LANGUAGES = [
  // Tier 1 — Highest impact, strong translation quality
  { code: 'en', name: 'English',        nativeName: 'English',          symbol: 'En', color: '#1D6FE8', dir: 'ltr', tier: 1, quality: 'verified' },
  { code: 'es', name: 'Spanish',        nativeName: 'Español',          symbol: 'Es', color: '#E84B1D', dir: 'ltr', tier: 1, quality: 'verified' },
  { code: 'zh', name: 'Chinese',        nativeName: '简体中文',           symbol: '中',  color: '#DC2626', dir: 'ltr', tier: 1, quality: 'verified' },
  { code: 'vi', name: 'Vietnamese',     nativeName: 'Tiếng Việt',       symbol: 'Vi', color: '#059669', dir: 'ltr', tier: 1, quality: 'machine'  },
  { code: 'ko', name: 'Korean',         nativeName: '한국어',             symbol: '한',  color: '#7C3AED', dir: 'ltr', tier: 1, quality: 'machine'  },

  // Tier 2 — High impact, good translation quality
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen',   symbol: 'Ht', color: '#0284C7', dir: 'ltr', tier: 2, quality: 'verified' },
  { code: 'pt', name: 'Portuguese',     nativeName: 'Português',         symbol: 'Pt', color: '#16A34A', dir: 'ltr', tier: 2, quality: 'machine'  },
  { code: 'ar', name: 'Arabic',         nativeName: 'العربية',           symbol: 'ع',  color: '#0D9488', dir: 'rtl', tier: 2, quality: 'machine'  },
  { code: 'tl', name: 'Tagalog',        nativeName: 'Tagalog',           symbol: 'Tl', color: '#0EA5E9', dir: 'ltr', tier: 2, quality: 'machine'  },

  // Tier 3 — Underserved & high-vulnerability communities
  { code: 'fr', name: 'French',         nativeName: 'Français',          symbol: 'Fr', color: '#1E40AF', dir: 'ltr', tier: 3, quality: 'machine'  },
  { code: 'so', name: 'Somali',         nativeName: 'Soomaali',          symbol: 'So', color: '#0891B2', dir: 'ltr', tier: 3, quality: 'machine'  },
  { code: 'am', name: 'Amharic',        nativeName: 'አማርኛ',              symbol: 'አ',  color: '#B45309', dir: 'ltr', tier: 3, quality: 'machine'  },
  { code: 'fa', name: 'Persian',        nativeName: 'فارسی',             symbol: 'ف',  color: '#7E22CE', dir: 'rtl', tier: 3, quality: 'machine'  },
  { code: 'ne', name: 'Nepali',         nativeName: 'नेपाली',             symbol: 'न',  color: '#B91C1C', dir: 'ltr', tier: 3, quality: 'machine'  },
  { code: 'pa', name: 'Punjabi',        nativeName: 'ਪੰਜਾਬੀ',            symbol: 'ਪ',  color: '#D97706', dir: 'ltr', tier: 3, quality: 'machine'  },
  { code: 'hi', name: 'Hindi',          nativeName: 'हिन्दी',             symbol: 'ह',  color: '#EA580C', dir: 'ltr', tier: 3, quality: 'machine'  },
  { code: 'my', name: 'Burmese',        nativeName: 'မြန်မာဘာသာ',        symbol: 'မ',  color: '#BE185D', dir: 'ltr', tier: 3, quality: 'machine'  },

  // Tier 4 — Hardest to reach, most underserved
  { code: 'ru',  name: 'Russian',       nativeName: 'Русский',           symbol: 'Ру', color: '#1E3A8A', dir: 'ltr', tier: 4, quality: 'machine'  },
  { code: 'quc', name: "K'iche'",       nativeName: "K'iche'",           symbol: 'Qu', color: '#065F46', dir: 'ltr', tier: 4, quality: 'limited'  },
  { code: 'mh',  name: 'Marshallese',   nativeName: 'Kajin M̧ajeļ',      symbol: 'Mj', color: '#0E7490', dir: 'ltr', tier: 4, quality: 'limited'  },
];

export const RTL_LANGUAGES = SUPPORTED_LANGUAGES.filter(l => l.dir === 'rtl').map(l => l.code);

export const LANGUAGE_STORAGE_KEY = 'safeneighbor_language';
