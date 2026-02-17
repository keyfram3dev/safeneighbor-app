import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES, LANGUAGE_STORAGE_KEY } from './languages';

// English always bundled (fallback, works offline immediately)
import en_common from './en/common.json';

// Re-export for consumers
export { SUPPORTED_LANGUAGES, RTL_LANGUAGES, LANGUAGE_STORAGE_KEY };

// Detect initial language: saved preference → browser language → English
const detectLanguage = () => {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) return saved;

  const browser = navigator.language?.slice(0, 2);
  if (browser && SUPPORTED_LANGUAGES.some(l => l.code === browser)) return browser;

  return 'en';
};

// Update HTML dir and lang attributes
const updateDocumentDirection = (lng) => {
  const isRTL = RTL_LANGUAGES.includes(lng);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
};

i18n
  .use(resourcesToBackend((lng, ns) => import(`./${lng}/${ns}.json`)))
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en_common },
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
  });

// Set initial direction
updateDocumentDirection(i18n.language);

// Update direction on language change
i18n.on('languageChanged', updateDocumentDirection);

// Helper to change language and persist
export const changeLanguage = (code) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  i18n.changeLanguage(code);
};

export const getLanguageStorageKey = () => LANGUAGE_STORAGE_KEY;

export default i18n;
