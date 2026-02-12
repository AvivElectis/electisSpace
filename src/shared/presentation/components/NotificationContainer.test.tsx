/**
 * NotificationContainer Component Tests
 * Phase 10.25 - Deep Testing System
 * 
 * Tests the NotificationContainer component for displaying toast notifications
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationContainer } from './NotificationContainer';
import { useNotificationStore } from '@shared/infrastructure/store/notificationStore';

describe('NotificationContainer Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Reset notification store
        useNotificationStore.setState({ notifications: [] });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('rendering', () => {
        it('should render nothing when no notifications', () => {
            const { container } = render(<NotificationContainer />);

            expect(container.querySelector('.MuiSnackbar-root')).toBeNull();
        });

        it('should render notification message', () => {
            useNotificationStore.setState({
                notifications: [
                    { id: '1', message: 'Success message', type: 'success', duration: 6000 },
                ],
            });

            render(<NotificationContainer />);

            expect(screen.getByText('Success message')).toBeInTheDocument();
        });

        it('should render multiple notifications', () => {
            useNotificationStore.setState({
                notifications: [
                    { id: '1', message: 'First notification', type: 'info', duration: 6000 },
                    { id: '2', message: 'Second notification', type: 'warning', duration: 6000 },
                ],
            });

            render(<NotificationContainer />);

            expect(screen.getByText('First notification')).toBeInTheDocument();
            expect(screen.getByText('Second notification')).toBeInTheDocument();
        });
    });

    describe('notification types', () => {
        it('should render success notification with correct severity', () => {
            useNotificationStore.setState({
                notifications: [
                    { id: '1', message: 'Success!', type: 'success', duration: 6000 },
                ],
            });

            render(<NotificationContainer />);

            const alert = screen.getByRole('alert');
            expect(alert).toHaveClass('MuiAlert-filledSuccess');
        });

        it('should render error notification with correct severity', () => {
            useNotificationStore.setState({
                notifications: [
                    { id: '1', message: 'Error!', type: 'error', duration: 6000 },
                ],
            });

            render(<NotificationContainer />);

            const alert = screen.getByRole('alert');
            expect(alert).toHaveClass('MuiAlert-filledError');
        });

        it('should render info notification with correct severity', () => {
            useNotificationStore.setState({
                notifications: [
                    { id: '1', message: 'Info', type: 'info', duration: 6000 },
                ],
            });

            render(<NotificationContainer />);

            const alert = screen.getByRole('alert');
            expect(alert).toHaveClass('MuiAlert-filledInfo');
        });

        it('should render warning notification with correct severity', () => {
            useNotificationStore.setState({
                notifications: [
                    { id: '1', message: 'Warning', type: 'warning', duration: 6000 },
                ],
            });

            render(<NotificationContainer />);

            const alert = screen.getByRole('alert');
            expect(alert).toHaveClass('MuiAlert-filledWarning');
        });
    });

    describe('dismissal', () => {
        it('should remove notification when close button clicked', () => {
            useNotificationStore.setState({
                notifications: [
                    { id: '1', message: 'Dismissable', type: 'info', duration: 6000 },
                ],
            });

            render(<NotificationContainer />);

            expect(screen.getByText('Dismissable')).toBeInTheDocument();

            // Find and click the close button
            const closeButton = screen.getByRole('button', { name: /close/i });
            fireEvent.click(closeButton);

            // Notification should be removed from store
            expect(useNotificationStore.getState().notifications).toHaveLength(0);
        });

        it('should keep other notifications when one is dismissed', () => {
            useNotificationStore.setState({
                notifications: [
                    { id: '1', message: 'First', type: 'info', duration: 6000 },
                    { id: '2', message: 'Second', type: 'success', duration: 6000 },
                ],
            });

            render(<NotificationContainer />);

            // Find the close button for the first notification
            const closeButtons = screen.getAllByRole('button', { name: /close/i });
            fireEvent.click(closeButtons[0]);

            // Only one notification should remain
            expect(useNotificationStore.getState().notifications).toHaveLength(1);
        });
    });

    describe('stacking', () => {
        it('should render notifications stacked vertically', () => {
            useNotificationStore.setState({
                notifications: [
                    { id: '1', message: 'First', type: 'info', duration: 6000 },
                    { id: '2', message: 'Second', type: 'info', duration: 6000 },
                    { id: '3', message: 'Third', type: 'info', duration: 6000 },
                ],
            });

            render(<NotificationContainer />);

            // All three should be rendered
            expect(screen.getByText('First')).toBeInTheDocument();
            expect(screen.getByText('Second')).toBeInTheDocument();
            expect(screen.getByText('Third')).toBeInTheDocument();
        });
    });
});
