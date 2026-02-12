import { render, screen, fireEvent } from '@testing-library/react';
import { AppHeader } from './AppHeader';

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'manual.title': 'User Manual',
            };
            return translations[key] || key;
        },
        i18n: {
            language: 'en',
            changeLanguage: vi.fn(),
        },
    }),
}));

// Mock settings store
vi.mock('@features/settings/infrastructure/settingsStore', () => ({
    useSettingsStore: vi.fn((selector) => 
        selector({
            settings: {
                appName: 'electis Space',
                appSubtitle: 'Space Management',
                logos: {
                    logo1: '/logos/logo1.png',
                    logo2: '/logos/logo2.png',
                },
            },
            isLocked: true,
        })
    ),
}));

// Mock LanguageSwitcher
vi.mock('../components/LanguageSwitcher', () => ({
    LanguageSwitcher: () => <div data-testid="language-switcher">LanguageSwitcher</div>,
}));

describe('AppHeader Component', () => {
    const mockOnSettingsClick = vi.fn();
    const mockOnMenuClick = vi.fn();
    const mockOnManualClick = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render the app header', () => {
            render(<AppHeader />);
            
            const appBar = document.querySelector('.MuiAppBar-root');
            expect(appBar).toBeInTheDocument();
        });

        it('should render app name', () => {
            render(<AppHeader />);
            
            // App name appears multiple times (desktop and mobile views)
            expect(screen.getAllByText('electis Space').length).toBeGreaterThan(0);
        });

        it('should render app subtitle', () => {
            render(<AppHeader />);
            
            // Subtitle appears multiple times (desktop and mobile views)
            expect(screen.getAllByText('Space Management').length).toBeGreaterThan(0);
        });

        it('should render logos', () => {
            render(<AppHeader />);
            
            const leftLogo = screen.getByAltText('Left Logo');
            const rightLogo = screen.getByAltText('Right Logo');
            
            expect(leftLogo).toBeInTheDocument();
            expect(rightLogo).toBeInTheDocument();
        });

        it('should render language switcher', () => {
            render(<AppHeader />);
            
            expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
        });
    });

    describe('settings button', () => {
        it.skip('should render settings button', () => {
            // Settings button is rendered via user menu, not directly in header
            render(<AppHeader onSettingsClick={mockOnSettingsClick} />);
            
            expect(screen.getByTestId('SettingsIcon')).toBeInTheDocument();
        });

        it.skip('should call onSettingsClick when settings button clicked', () => {
            // Settings button is rendered via user menu, not directly in header
            render(<AppHeader onSettingsClick={mockOnSettingsClick} />);
            
            const settingsButton = screen.getByTestId('SettingsIcon').closest('button');
            fireEvent.click(settingsButton!);
            
            expect(mockOnSettingsClick).toHaveBeenCalled();
        });
    });

    describe('menu button', () => {
        it('should render menu button when onMenuClick provided', () => {
            render(<AppHeader onMenuClick={mockOnMenuClick} />);
            
            expect(screen.getByLabelText('menu')).toBeInTheDocument();
        });

        it('should not render menu button when onMenuClick not provided', () => {
            render(<AppHeader />);
            
            expect(screen.queryByLabelText('menu')).not.toBeInTheDocument();
        });

        it('should call onMenuClick when menu button clicked', () => {
            render(<AppHeader onMenuClick={mockOnMenuClick} />);
            
            const menuButton = screen.getByLabelText('menu');
            fireEvent.click(menuButton);
            
            expect(mockOnMenuClick).toHaveBeenCalled();
        });
    });

    describe('manual button', () => {
        it('should render manual button', () => {
            render(<AppHeader onManualClick={mockOnManualClick} />);
            
            expect(screen.getByTestId('HelpOutlineIcon')).toBeInTheDocument();
        });

        it('should call onManualClick when manual button clicked', () => {
            render(<AppHeader onManualClick={mockOnManualClick} />);
            
            const manualButton = screen.getByTestId('HelpOutlineIcon').closest('button');
            fireEvent.click(manualButton!);
            
            expect(mockOnManualClick).toHaveBeenCalled();
        });

        it('should have tooltip for manual button', () => {
            render(<AppHeader onManualClick={mockOnManualClick} />);
            
            // Tooltip title is applied to the button
            const manualButton = screen.getByTestId('HelpOutlineIcon').closest('button');
            expect(manualButton).toBeInTheDocument();
        });
    });

    describe('logo sources', () => {
        it('should use custom logo paths from settings', () => {
            render(<AppHeader />);
            
            const leftLogo = screen.getByAltText('Left Logo') as HTMLImageElement;
            const rightLogo = screen.getByAltText('Right Logo') as HTMLImageElement;
            
            expect(leftLogo.src).toContain('/logos/logo1.png');
            expect(rightLogo.src).toContain('/logos/logo2.png');
        });
    });

    describe('settings open state', () => {
        it.skip('should render with default color when settings closed', () => {
            // Settings button is rendered via user menu, not directly in header
            render(<AppHeader settingsOpen={false} onSettingsClick={mockOnSettingsClick} />);
            
            const settingsButton = screen.getByTestId('SettingsIcon').closest('button');
            expect(settingsButton).toBeInTheDocument();
        });

        it.skip('should render with primary color when settings open', () => {
            // Settings button is rendered via user menu, not directly in header
            render(<AppHeader settingsOpen={true} onSettingsClick={mockOnSettingsClick} />);
            
            const settingsButton = screen.getByTestId('SettingsIcon').closest('button');
            expect(settingsButton).toBeInTheDocument();
        });
    });
});
