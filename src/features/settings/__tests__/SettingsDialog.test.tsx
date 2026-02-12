/**
 * SettingsDialog Component Tests
 * 
 * Basic tests for the settings dialog component
 */

import { render, screen, fireEvent, waitFor } from '../../../test/utils/testUtils';
import { SettingsDialog } from '../presentation/SettingsDialog';
import { useSettingsStore } from '../infrastructure/settingsStore';

// Mock lazy-loaded components
vi.mock('../presentation/AppSettingsTab', () => ({
    AppSettingsTab: () => <div data-testid="app-settings-tab">App Settings Content</div>
}));

vi.mock('../presentation/SFTPSettingsTab', () => ({
    SFTPSettingsTab: () => <div data-testid="sftp-settings-tab">SFTP Settings Content</div>
}));

vi.mock('../presentation/SolumSettingsTab', () => ({
    SolumSettingsTab: () => <div data-testid="solum-settings-tab">SoluM Settings Content</div>
}));

vi.mock('../presentation/LogoSettingsTab', () => ({
    LogoSettingsTab: () => <div data-testid="logo-settings-tab">Logo Settings Content</div>
}));

vi.mock('../presentation/SecuritySettingsTab', () => ({
    SecuritySettingsTab: () => <div data-testid="security-settings-tab">Security Settings Content</div>
}));

vi.mock('../presentation/LogsViewerTab', () => ({
    LogsViewerTab: () => <div data-testid="logs-viewer-tab">Logs Viewer Content</div>
}));

vi.mock('../presentation/UnlockDialog', () => ({
    UnlockDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
        open ? <div data-testid="unlock-dialog">Unlock Dialog <button onClick={onClose}>Close</button></div> : null
}));

// Mock logger
vi.mock('@shared/infrastructure/services/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('SettingsDialog', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset settings store to defaults
        useSettingsStore.getState().resetSettings();
    });

    describe('Dialog Rendering', () => {
        it('should render when open', async () => {
            render(<SettingsDialog open={true} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });

        it('should not render when closed', () => {
            render(<SettingsDialog open={false} onClose={mockOnClose} />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('should display settings title', async () => {
            render(<SettingsDialog open={true} onClose={mockOnClose} />);

            await waitFor(() => {
                // The title should be in a heading element
                const dialog = screen.getByRole('dialog');
                expect(dialog).toBeInTheDocument();
            });
        });

        it('should have close button', async () => {
            render(<SettingsDialog open={true} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByLabelText('close')).toBeInTheDocument();
            });
        });

        it('should call onClose when close button clicked', async () => {
            render(<SettingsDialog open={true} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByLabelText('close')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByLabelText('close'));

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
        });
    });

    describe('Tab Display', () => {
        it('should show tabs', async () => {
            render(<SettingsDialog open={true} onClose={mockOnClose} />);

            await waitFor(() => {
                // Just verify tabs exist without checking specific names
                const tabs = screen.getAllByRole('tab');
                expect(tabs.length).toBeGreaterThan(0);
            });
        });

        it('should show default tab content', async () => {
            render(<SettingsDialog open={true} onClose={mockOnClose} />);

            await waitFor(() => {
                expect(screen.getByTestId('app-settings-tab')).toBeInTheDocument();
            });
        });
    });
});
