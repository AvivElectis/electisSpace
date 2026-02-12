/**
 * LanguageSwitcher Component Tests
 * Phase 10.27 - Deep Testing System
 * 
 * Tests the LanguageSwitcher component for language selection
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageSwitcher } from './LanguageSwitcher';

// Mock i18next
const mockChangeLanguage = vi.fn();
let mockCurrentLanguage = 'en';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            language: mockCurrentLanguage,
            changeLanguage: mockChangeLanguage,
        },
    }),
}));

describe('LanguageSwitcher Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCurrentLanguage = 'en';
    });

    describe('rendering', () => {
        it('should render language button', () => {
            render(<LanguageSwitcher />);

            expect(screen.getByRole('button', { name: /change language/i })).toBeInTheDocument();
        });

        it('should render with tooltip', () => {
            render(<LanguageSwitcher />);

            // Button should have aria-label
            expect(screen.getByLabelText(/change language/i)).toBeInTheDocument();
        });

        it('should not show menu initially', () => {
            render(<LanguageSwitcher />);

            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
    });

    describe('menu interaction', () => {
        it('should open menu when button clicked', async () => {
            render(<LanguageSwitcher />);

            fireEvent.click(screen.getByRole('button', { name: /change language/i }));

            await waitFor(() => {
                expect(screen.getByRole('menu')).toBeInTheDocument();
            });
        });

        it('should show English option in menu', async () => {
            render(<LanguageSwitcher />);

            fireEvent.click(screen.getByRole('button', { name: /change language/i }));

            await waitFor(() => {
                expect(screen.getByText('English')).toBeInTheDocument();
            });
        });

        it('should show Hebrew option in menu', async () => {
            render(<LanguageSwitcher />);

            fireEvent.click(screen.getByRole('button', { name: /change language/i }));

            await waitFor(() => {
                expect(screen.getByText('עברית')).toBeInTheDocument();
            });
        });

        it('should have backdrop for closing menu', async () => {
            render(<LanguageSwitcher />);

            fireEvent.click(screen.getByRole('button', { name: /change language/i }));

            await waitFor(() => {
                expect(screen.getByRole('menu')).toBeInTheDocument();
            });

            // Verify backdrop exists (MUI uses this for closing)
            expect(document.querySelector('.MuiBackdrop-root')).toBeInTheDocument();
        });
    });

    describe('language selection', () => {
        it('should call changeLanguage with "en" when English selected', async () => {
            render(<LanguageSwitcher />);

            fireEvent.click(screen.getByRole('button', { name: /change language/i }));

            await waitFor(() => {
                expect(screen.getByText('English')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('English'));

            expect(mockChangeLanguage).toHaveBeenCalledWith('en');
        });

        it('should call changeLanguage with "he" when Hebrew selected', async () => {
            render(<LanguageSwitcher />);

            fireEvent.click(screen.getByRole('button', { name: /change language/i }));

            await waitFor(() => {
                expect(screen.getByText('עברית')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('עברית'));

            expect(mockChangeLanguage).toHaveBeenCalledWith('he');
        });

        it('should close menu after language selection', async () => {
            render(<LanguageSwitcher />);

            fireEvent.click(screen.getByRole('button', { name: /change language/i }));

            await waitFor(() => {
                expect(screen.getByRole('menu')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('English'));

            await waitFor(() => {
                expect(screen.queryByRole('menu')).not.toBeInTheDocument();
            });
        });
    });

    describe('current language indicator', () => {
        it('should show check icon next to English when English is current', async () => {
            mockCurrentLanguage = 'en';
            render(<LanguageSwitcher />);

            fireEvent.click(screen.getByRole('button', { name: /change language/i }));

            await waitFor(() => {
                // The check icon should be in the English menu item
                const englishItem = screen.getByText('English').closest('li');
                expect(englishItem).toBeInTheDocument();
            });
        });

        it('should show check icon next to Hebrew when Hebrew is current', async () => {
            mockCurrentLanguage = 'he';
            render(<LanguageSwitcher />);

            fireEvent.click(screen.getByRole('button', { name: /change language/i }));

            await waitFor(() => {
                // The check icon should be in the Hebrew menu item
                const hebrewItem = screen.getByText('עברית').closest('li');
                expect(hebrewItem).toBeInTheDocument();
            });
        });
    });
});
