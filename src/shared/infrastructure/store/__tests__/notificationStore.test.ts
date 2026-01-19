/**
 * Notification Store Tests
 * Phase 10.20 - Deep Testing System
 * 
 * Tests the notification store for managing app notifications
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useNotificationStore, useNotifications } from '../notificationStore';
import { renderHook, act } from '@testing-library/react';

describe('Notification Store', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Reset store
        useNotificationStore.setState({ notifications: [] });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('addNotification', () => {
        it('should add a notification to the store', () => {
            const { addNotification } = useNotificationStore.getState();

            addNotification({ message: 'Test message', type: 'success' });

            const { notifications } = useNotificationStore.getState();
            expect(notifications).toHaveLength(1);
            expect(notifications[0].message).toBe('Test message');
            expect(notifications[0].type).toBe('success');
        });

        it('should generate unique IDs for notifications', () => {
            const { addNotification } = useNotificationStore.getState();

            addNotification({ message: 'First', type: 'info' });
            addNotification({ message: 'Second', type: 'info' });

            const { notifications } = useNotificationStore.getState();
            expect(notifications[0].id).not.toBe(notifications[1].id);
        });

        it('should set default duration of 6000ms', () => {
            const { addNotification } = useNotificationStore.getState();

            addNotification({ message: 'Test', type: 'info' });

            const { notifications } = useNotificationStore.getState();
            expect(notifications[0].duration).toBe(6000);
        });

        it('should allow custom duration', () => {
            const { addNotification } = useNotificationStore.getState();

            addNotification({ message: 'Test', type: 'warning', duration: 10000 });

            const { notifications } = useNotificationStore.getState();
            expect(notifications[0].duration).toBe(10000);
        });

        it('should auto-dismiss after duration', () => {
            const { addNotification } = useNotificationStore.getState();

            addNotification({ message: 'Auto dismiss', type: 'success', duration: 3000 });

            expect(useNotificationStore.getState().notifications).toHaveLength(1);

            vi.advanceTimersByTime(3000);

            expect(useNotificationStore.getState().notifications).toHaveLength(0);
        });

        it('should not auto-dismiss if duration is 0', () => {
            const { addNotification } = useNotificationStore.getState();

            addNotification({ message: 'Persistent', type: 'error', duration: 0 });

            vi.advanceTimersByTime(10000);

            expect(useNotificationStore.getState().notifications).toHaveLength(1);
        });

        it('should support all notification types', () => {
            const { addNotification } = useNotificationStore.getState();

            addNotification({ message: 'Success', type: 'success' });
            addNotification({ message: 'Error', type: 'error' });
            addNotification({ message: 'Info', type: 'info' });
            addNotification({ message: 'Warning', type: 'warning' });

            const { notifications } = useNotificationStore.getState();
            expect(notifications.map(n => n.type)).toEqual(['success', 'error', 'info', 'warning']);
        });
    });

    describe('removeNotification', () => {
        it('should remove a specific notification by ID', () => {
            const { addNotification, removeNotification } = useNotificationStore.getState();

            addNotification({ message: 'First', type: 'info', duration: 0 });
            addNotification({ message: 'Second', type: 'info', duration: 0 });

            const { notifications } = useNotificationStore.getState();
            const idToRemove = notifications[0].id;

            removeNotification(idToRemove);

            const updated = useNotificationStore.getState().notifications;
            expect(updated).toHaveLength(1);
            expect(updated[0].message).toBe('Second');
        });

        it('should do nothing if ID not found', () => {
            const { addNotification, removeNotification } = useNotificationStore.getState();

            addNotification({ message: 'Test', type: 'info', duration: 0 });

            removeNotification('non-existent-id');

            expect(useNotificationStore.getState().notifications).toHaveLength(1);
        });
    });

    describe('clearAll', () => {
        it('should remove all notifications', () => {
            const { addNotification, clearAll } = useNotificationStore.getState();

            addNotification({ message: 'First', type: 'info', duration: 0 });
            addNotification({ message: 'Second', type: 'error', duration: 0 });
            addNotification({ message: 'Third', type: 'warning', duration: 0 });

            expect(useNotificationStore.getState().notifications).toHaveLength(3);

            clearAll();

            expect(useNotificationStore.getState().notifications).toHaveLength(0);
        });

        it('should work on empty notifications', () => {
            const { clearAll } = useNotificationStore.getState();

            clearAll();

            expect(useNotificationStore.getState().notifications).toHaveLength(0);
        });
    });

    describe('concurrent notifications', () => {
        it('should handle multiple notifications with different durations', () => {
            const { addNotification } = useNotificationStore.getState();

            addNotification({ message: 'Short', type: 'info', duration: 1000 });
            addNotification({ message: 'Medium', type: 'info', duration: 3000 });
            addNotification({ message: 'Long', type: 'info', duration: 5000 });

            expect(useNotificationStore.getState().notifications).toHaveLength(3);

            vi.advanceTimersByTime(1000);
            expect(useNotificationStore.getState().notifications).toHaveLength(2);

            vi.advanceTimersByTime(2000);
            expect(useNotificationStore.getState().notifications).toHaveLength(1);

            vi.advanceTimersByTime(2000);
            expect(useNotificationStore.getState().notifications).toHaveLength(0);
        });
    });
});

describe('useNotifications Hook', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useNotificationStore.setState({ notifications: [] });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should expose showSuccess function', () => {
        const { result } = renderHook(() => useNotifications());

        act(() => {
            result.current.showSuccess('Success message');
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe('success');
        expect(notifications[0].message).toBe('Success message');
    });

    it('should expose showError function', () => {
        const { result } = renderHook(() => useNotifications());

        act(() => {
            result.current.showError('Error message');
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications[0].type).toBe('error');
    });

    it('should expose showInfo function', () => {
        const { result } = renderHook(() => useNotifications());

        act(() => {
            result.current.showInfo('Info message');
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications[0].type).toBe('info');
    });

    it('should expose showWarning function', () => {
        const { result } = renderHook(() => useNotifications());

        act(() => {
            result.current.showWarning('Warning message');
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications[0].type).toBe('warning');
    });

    it('should allow custom duration in convenience methods', () => {
        const { result } = renderHook(() => useNotifications());

        act(() => {
            result.current.showSuccess('Custom duration', 10000);
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications[0].duration).toBe(10000);
    });

    it('should expose showNotification for custom notifications', () => {
        const { result } = renderHook(() => useNotifications());

        act(() => {
            result.current.showNotification({
                message: 'Custom notification',
                type: 'warning',
                duration: 5000,
            });
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications[0].message).toBe('Custom notification');
        expect(notifications[0].type).toBe('warning');
        expect(notifications[0].duration).toBe(5000);
    });
});
