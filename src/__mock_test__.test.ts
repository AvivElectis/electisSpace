// Test vi.mock approach for react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: ((key: string) => `MOCKED:${key}`) as any,
        i18n: { language: 'en' } as any,
        ready: true,
    }),
}));

import { useTranslation } from 'react-i18next';

describe('vi.mock test', () => {
    it('should mock useTranslation with vi.mock', () => {
        const { t } = useTranslation();
        const result = t('hello');
        expect(result).toBe('MOCKED:hello');
    });
});
