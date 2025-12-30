import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import actual translation files
import enTranslations from '../../locales/en/common.json';
import heTranslations from '../../locales/he/common.json';

i18n
    .use(initReactI18next)
    .init({
        lng: 'en',
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        resources: {
            en: {
                translation: enTranslations,
            },
            he: {
                translation: heTranslations,
            },
        },
    });

export default i18n;
