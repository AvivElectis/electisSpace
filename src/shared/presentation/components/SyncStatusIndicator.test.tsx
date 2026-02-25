/**
 * SyncStatusIndicator Component Tests
 * Phase 10.27 - Deep Testing System
 *
 * Tests sync/connection status indicator with popover
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncStatusIndicator, type ConnectionStatus } from './SyncStatusIndicator';

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'sync.connected': 'Connected',
                'sync.disconnected': 'Disconnected',
                'sync.syncing': 'Syncing',
                'sync.error': 'Error',
                'sync.systemOperational': 'System operational',
                'sync.checkConnection': 'Check connection',
                'sync.processingData': 'Processing data',
                'sync.attentionRequired': 'Attention required',
                'sync.now': 'Sync Now',
                'sync.lastSync': 'Last sync',
                'sync.mode': 'Mode',
                'sync.solumMode': 'SoluM Mode',
                'sync.manualSync': 'Manual Sync',
            };
            return translations[key] || key;
        },
    }),
}));

// Helper to click the status badge (the Paper element)
function clickBadge(container: HTMLElement) {
    const badge = container.querySelector('.MuiPaper-root');
    if (badge) fireEvent.click(badge);
}

describe('SyncStatusIndicator Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('status display', () => {
        it('should render connected status', async () => {
            const { container } = render(<SyncStatusIndicator status="connected" />);

            expect(screen.getByTestId('CheckCircleRoundedIcon')).toBeInTheDocument();
            clickBadge(container);
            await waitFor(() => {
                expect(screen.getByText('Connected')).toBeInTheDocument();
            });
        });

        it('should render disconnected status', async () => {
            const { container } = render(<SyncStatusIndicator status="disconnected" />);

            expect(screen.getByTestId('CloudOffRoundedIcon')).toBeInTheDocument();
            clickBadge(container);
            await waitFor(() => {
                expect(screen.getByText('Disconnected')).toBeInTheDocument();
            });
        });

        it('should render syncing status', async () => {
            const { container } = render(<SyncStatusIndicator status="syncing" />);

            expect(screen.getByRole('progressbar')).toBeInTheDocument();
            clickBadge(container);
            await waitFor(() => {
                expect(screen.getAllByText('Syncing').length).toBeGreaterThanOrEqual(1);
            });
        });

        it('should render error status', async () => {
            const { container } = render(<SyncStatusIndicator status="error" />);

            expect(screen.getByTestId('ErrorRoundedIcon')).toBeInTheDocument();
            clickBadge(container);
            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
            });
        });
    });

    describe('icons', () => {
        it('should show check icon for connected status', () => {
            render(<SyncStatusIndicator status="connected" />);

            expect(screen.getByTestId('CheckCircleRoundedIcon')).toBeInTheDocument();
        });

        it('should show cloud off icon for disconnected status', () => {
            render(<SyncStatusIndicator status="disconnected" />);

            expect(screen.getByTestId('CloudOffRoundedIcon')).toBeInTheDocument();
        });

        it('should show progress indicator for syncing status', () => {
            render(<SyncStatusIndicator status="syncing" />);

            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        it('should show error icon for error status', () => {
            render(<SyncStatusIndicator status="error" />);

            expect(screen.getByTestId('ErrorRoundedIcon')).toBeInTheDocument();
        });
    });

    describe('popover interaction', () => {
        it('should open popover when clicked', async () => {
            const { container } = render(
                <SyncStatusIndicator
                    status="connected"
                    lastSyncTime="2024-01-15 10:30"
                />
            );

            clickBadge(container);

            await waitFor(() => {
                expect(screen.getByRole('presentation')).toBeInTheDocument();
            });
        });

        it('should show sync time in popover', async () => {
            const { container } = render(
                <SyncStatusIndicator
                    status="connected"
                    lastSyncTime="2024-01-15 10:30"
                />
            );

            clickBadge(container);

            await waitFor(() => {
                expect(screen.getByText('2024-01-15 10:30')).toBeInTheDocument();
            });
        });

        it('should show error message in popover when status is error', async () => {
            const { container } = render(
                <SyncStatusIndicator
                    status="error"
                    errorMessage="Connection timeout"
                />
            );

            clickBadge(container);

            await waitFor(() => {
                expect(screen.getByText('Connection timeout')).toBeInTheDocument();
            });
        });
    });

    describe('sync button', () => {
        it('should show sync button in popover', async () => {
            const { container } = render(
                <SyncStatusIndicator
                    status="connected"
                    onSyncClick={() => {}}
                />
            );

            clickBadge(container);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
            });
        });

        it('should call onSyncClick when sync button clicked', async () => {
            const onSyncClick = vi.fn();
            const { container } = render(
                <SyncStatusIndicator
                    status="connected"
                    onSyncClick={onSyncClick}
                />
            );

            clickBadge(container);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /sync/i }));

            expect(onSyncClick).toHaveBeenCalled();
        });

        it('should not show sync button if onSyncClick not provided', async () => {
            const { container } = render(<SyncStatusIndicator status="connected" />);

            clickBadge(container);

            await waitFor(() => {
                expect(screen.getByRole('presentation')).toBeInTheDocument();
            });

            expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument();
        });
    });

    describe('status descriptions', () => {
        const statusDescriptions: Array<{
            status: ConnectionStatus;
            description: string;
        }> = [
            { status: 'connected', description: 'System operational' },
            { status: 'disconnected', description: 'Check connection' },
            { status: 'syncing', description: 'Processing data' },
            { status: 'error', description: 'Attention required' },
        ];

        statusDescriptions.forEach(({ status, description }) => {
            it(`should show "${description}" for ${status} status`, async () => {
                const { container } = render(<SyncStatusIndicator status={status} />);

                clickBadge(container);

                await waitFor(() => {
                    expect(screen.getByText(description)).toBeInTheDocument();
                });
            });
        });
    });
});
