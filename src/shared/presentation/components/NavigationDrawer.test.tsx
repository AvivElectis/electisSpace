import { render, screen, fireEvent } from '@testing-library/react';
import { NavigationDrawer, DRAWER_WIDTH } from './NavigationDrawer';
import { MemoryRouter } from 'react-router-dom';

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'navigation.dashboard': 'Dashboard',
                'navigation.spaces': 'Spaces',
                'navigation.people': 'People',
                'navigation.conference': 'Conference',
                'navigation.sync': 'Sync',
            };
            return translations[key] || key;
        },
    }),
}));

// Mock settings store
vi.mock('@features/settings/infrastructure/settingsStore', () => ({
    useSettingsStore: vi.fn((selector) => 
        selector({
            settings: {
                peopleManagerEnabled: false,
                workingMode: 'SOLUM_API',
            },
        })
    ),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('NavigationDrawer Component', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (ui: React.ReactElement, initialEntries = ['/']) => {
        return render(
            <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
        );
    };

    describe('rendering', () => {
        it('should render when open', () => {
            renderWithRouter(
                <NavigationDrawer open={true} onClose={mockOnClose} />
            );
            
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
        });

        it('should render all navigation items', () => {
            renderWithRouter(
                <NavigationDrawer open={true} onClose={mockOnClose} />
            );
            
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.getByText('Spaces')).toBeInTheDocument();
            expect(screen.getByText('Conference')).toBeInTheDocument();
            expect(screen.getByText('Sync')).toBeInTheDocument();
        });

        it('should render navigation icons', () => {
            renderWithRouter(
                <NavigationDrawer open={true} onClose={mockOnClose} />
            );
            
            // Check for icon elements
            expect(screen.getByTestId('DashboardIcon')).toBeInTheDocument();
            expect(screen.getByTestId('SyncIcon')).toBeInTheDocument();
        });

        it('should have correct drawer width', () => {
            expect(DRAWER_WIDTH).toBe(240);
        });
    });

    describe('navigation', () => {
        it('should navigate when item clicked', () => {
            renderWithRouter(
                <NavigationDrawer open={true} onClose={mockOnClose} />
            );
            
            fireEvent.click(screen.getByText('Spaces'));
            expect(mockNavigate).toHaveBeenCalledWith('/spaces');
        });

        it('should navigate to dashboard', () => {
            renderWithRouter(
                <NavigationDrawer open={true} onClose={mockOnClose} />
            );
            
            fireEvent.click(screen.getByText('Dashboard'));
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });

        it('should navigate to sync', () => {
            renderWithRouter(
                <NavigationDrawer open={true} onClose={mockOnClose} />
            );
            
            fireEvent.click(screen.getByText('Sync'));
            expect(mockNavigate).toHaveBeenCalledWith('/sync');
        });

        it('should navigate to conference', () => {
            renderWithRouter(
                <NavigationDrawer open={true} onClose={mockOnClose} />
            );
            
            fireEvent.click(screen.getByText('Conference'));
            expect(mockNavigate).toHaveBeenCalledWith('/conference');
        });
    });

    describe('variant behavior', () => {
        it('should render as permanent by default', () => {
            renderWithRouter(
                <NavigationDrawer open={true} onClose={mockOnClose} />
            );
            
            const drawer = document.querySelector('.MuiDrawer-root');
            expect(drawer).toHaveClass('MuiDrawer-docked');
        });

        it('should render as temporary when specified', () => {
            renderWithRouter(
                <NavigationDrawer 
                    open={true} 
                    onClose={mockOnClose} 
                    variant="temporary"
                />
            );
            
            const drawer = document.querySelector('.MuiDrawer-root');
            expect(drawer).toHaveClass('MuiDrawer-modal');
        });

        it('should call onClose on navigate when temporary', () => {
            renderWithRouter(
                <NavigationDrawer 
                    open={true} 
                    onClose={mockOnClose} 
                    variant="temporary"
                />
            );
            
            fireEvent.click(screen.getByText('Spaces'));
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should not call onClose on navigate when permanent', () => {
            renderWithRouter(
                <NavigationDrawer 
                    open={true} 
                    onClose={mockOnClose} 
                    variant="permanent"
                />
            );
            
            fireEvent.click(screen.getByText('Spaces'));
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('selection state', () => {
        it('should highlight current route', () => {
            renderWithRouter(
                <NavigationDrawer open={true} onClose={mockOnClose} />,
                ['/']
            );
            
            const dashboardButton = screen.getByText('Dashboard').closest('[role="button"]');
            expect(dashboardButton).toHaveClass('Mui-selected');
        });

        it('should highlight spaces when on /spaces', () => {
            renderWithRouter(
                <NavigationDrawer open={true} onClose={mockOnClose} />,
                ['/spaces']
            );
            
            const spacesButton = screen.getByText('Spaces').closest('[role="button"]');
            expect(spacesButton).toHaveClass('Mui-selected');
        });
    });
});
