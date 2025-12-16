import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import heCommon from '../locales/he/common.json';

// Configure i18next
i18n
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Pass i18n to react-i18next
    .init({
        resources: {
            en: {
                common: enCommon,
            },
            he: {
                common: heCommon,
            },
        },
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

export default i18n;
