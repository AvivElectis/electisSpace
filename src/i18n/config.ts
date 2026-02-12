import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Dynamically import a locale JSON by language code.
 * Only the active language is loaded at startup; the other is loaded on demand.
 */
const loadLocale = (lng: string) => {
    switch (lng) {
        case 'he':
            return import('../locales/he/common.json').then(m => m.default);
        default:
            return import('../locales/en/common.json').then(m => m.default);
    }
};

/**
 * Detect the initial language before i18n init so we can load only that bundle.
 */
function detectInitialLanguage(): string {
    const stored = localStorage.getItem('i18nextLng');
    if (stored && ['en', 'he'].includes(stored)) return stored;

    const nav = navigator.language?.split('-')[0];
    if (nav && ['en', 'he'].includes(nav)) return nav;

    return 'en';
}

const initialLng = detectInitialLanguage();

// Load the initial language synchronously-ish (before init resolves)
const initPromise = loadLocale(initialLng).then((resources) => {
    return i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources: {
                [initialLng]: { common: resources },
            },
            lng: initialLng,
            fallbackLng: 'en',
            defaultNS: 'common',
            ns: ['common'],

            interpolation: {
                escapeValue: false, // React already escapes
            },

            detection: {
                order: ['localStorage', 'navigator'],
                caches: ['localStorage'],
                lookupLocalStorage: 'i18nextLng',
            },

            react: {
                useSuspense: false,
            },
        });
});

// When language changes, lazy-load the new bundle if not already loaded
i18n.on('languageChanged', async (lng) => {
    if (!i18n.hasResourceBundle(lng, 'common')) {
        const resources = await loadLocale(lng);
        i18n.addResourceBundle(lng, 'common', resources);
    }
});

// Export the init promise so the app can await it if needed
export const i18nReady = initPromise;

export default i18n;
