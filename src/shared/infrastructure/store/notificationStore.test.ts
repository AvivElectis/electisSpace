/**
 * Notification Store Tests
 * Phase 10.34 - Deep Testing System
 * 
 * Tests notification management store
 */

import { renderHook, act } from '@testing-library/react';
import { useNotificationStore, useNotifications } from './notificationStore';

describe('Notification Store', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Reset store state
        const store = useNotificationStore.getState();
        store.clearAll();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('useNotificationStore', () => {
        it('should start with empty notifications', () => {
            const { result } = renderHook(() => useNotificationStore());
            expect(result.current.notifications).toHaveLength(0);
        });

        it('should add notification', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addNotification({
                    message: 'Test message',
                    type: 'success',
                });
            });

            expect(result.current.notifications).toHaveLength(1);
            expect(result.current.notifications[0].message).toBe('Test message');
            expect(result.current.notifications[0].type).toBe('success');
        });

        it('should generate unique IDs', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addNotification({ message: 'First', type: 'info' });
                result.current.addNotification({ message: 'Second', type: 'info' });
            });

            const [first, second] = result.current.notifications;
            expect(first.id).not.toBe(second.id);
        });

        it('should set default duration of 6000ms', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addNotification({
                    message: 'Test',
                    type: 'success',
                });
            });

            expect(result.current.notifications[0].duration).toBe(6000);
        });

        it('should use custom duration', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addNotification({
                    message: 'Test',
                    type: 'success',
                    duration: 3000,
                });
            });

            expect(result.current.notifications[0].duration).toBe(3000);
        });

        it('should auto-dismiss after duration', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addNotification({
                    message: 'Test',
                    type: 'success',
                    duration: 1000,
                });
            });

            expect(result.current.notifications).toHaveLength(1);

            act(() => {
                vi.advanceTimersByTime(1000);
            });

            expect(result.current.notifications).toHaveLength(0);
        });

        it('should remove notification by ID', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addNotification({ message: 'Test', type: 'info' });
            });

            const notificationId = result.current.notifications[0].id;

            act(() => {
                result.current.removeNotification(notificationId);
            });

            expect(result.current.notifications).toHaveLength(0);
        });

        it('should only remove specified notification', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addNotification({ message: 'First', type: 'info' });
                result.current.addNotification({ message: 'Second', type: 'info' });
            });

            const firstId = result.current.notifications[0].id;

            act(() => {
                result.current.removeNotification(firstId);
            });

            expect(result.current.notifications).toHaveLength(1);
            expect(result.current.notifications[0].message).toBe('Second');
        });

        it('should clear all notifications', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addNotification({ message: 'One', type: 'success' });
                result.current.addNotification({ message: 'Two', type: 'error' });
                result.current.addNotification({ message: 'Three', type: 'info' });
            });

            expect(result.current.notifications).toHaveLength(3);

            act(() => {
                result.current.clearAll();
            });

            expect(result.current.notifications).toHaveLength(0);
        });
    });

    describe('useNotifications convenience hook', () => {
        it('should show success notification', () => {
            const { result: storeResult } = renderHook(() => useNotificationStore());
            const { result: hookResult } = renderHook(() => useNotifications());

            act(() => {
                hookResult.current.showSuccess('Success!');
            });

            expect(storeResult.current.notifications[0].type).toBe('success');
            expect(storeResult.current.notifications[0].message).toBe('Success!');
        });

        it('should show error notification', () => {
            const { result: storeResult } = renderHook(() => useNotificationStore());
            const { result: hookResult } = renderHook(() => useNotifications());

            act(() => {
                hookResult.current.showError('Error occurred');
            });

            expect(storeResult.current.notifications[0].type).toBe('error');
        });

        it('should show info notification', () => {
            const { result: storeResult } = renderHook(() => useNotificationStore());
            const { result: hookResult } = renderHook(() => useNotifications());

            act(() => {
                hookResult.current.showInfo('Info message');
            });

            expect(storeResult.current.notifications[0].type).toBe('info');
        });

        it('should show warning notification', () => {
            const { result: storeResult } = renderHook(() => useNotificationStore());
            const { result: hookResult } = renderHook(() => useNotifications());

            act(() => {
                hookResult.current.showWarning('Warning!');
            });

            expect(storeResult.current.notifications[0].type).toBe('warning');
        });

        it('should accept custom duration', () => {
            const { result: storeResult } = renderHook(() => useNotificationStore());
            const { result: hookResult } = renderHook(() => useNotifications());

            act(() => {
                hookResult.current.showSuccess('Quick', 2000);
            });

            expect(storeResult.current.notifications[0].duration).toBe(2000);
        });

        it('should show custom notification', () => {
            const { result: storeResult } = renderHook(() => useNotificationStore());
            const { result: hookResult } = renderHook(() => useNotifications());

            act(() => {
                hookResult.current.showNotification({
                    message: 'Custom',
                    type: 'warning',
                    duration: 5000,
                });
            });

            const notification = storeResult.current.notifications[0];
            expect(notification.message).toBe('Custom');
            expect(notification.type).toBe('warning');
            expect(notification.duration).toBe(5000);
        });
    });
});
