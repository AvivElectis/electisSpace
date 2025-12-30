import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number; // milliseconds, default 6000
}

interface NotificationStore {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

let notificationIdCounter = 0;

export const useNotificationStore = create<NotificationStore>((set) => ({
    notifications: [],

    addNotification: (notification) => {
        const id = `notification-${Date.now()}-${notificationIdCounter++}`;
        const newNotification: Notification = {
            id,
            duration: 6000, // default 6 seconds
            ...notification,
        };

        set((state) => ({
            notifications: [...state.notifications, newNotification],
        }));

        // Auto-dismiss after duration
        if (newNotification.duration && newNotification.duration > 0) {
            setTimeout(() => {
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                }));
            }, newNotification.duration);
        }
    },

    removeNotification: (id) =>
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        })),

    clearAll: () => set({ notifications: [] }),
}));

/**
 * Convenience hook for showing notifications
 * 
 * @example
 * const { showSuccess, showError } = useNotifications();
 * showSuccess('Settings saved successfully!');
 * showError('Failed to connect to server');
 */
export function useNotifications() {
    const addNotification = useNotificationStore((state) => state.addNotification);

    return {
        showSuccess: (message: string, duration?: number) =>
            addNotification({ message, type: 'success', duration }),
        showError: (message: string, duration?: number) =>
            addNotification({ message, type: 'error', duration }),
        showInfo: (message: string, duration?: number) =>
            addNotification({ message, type: 'info', duration }),
        showWarning: (message: string, duration?: number) =>
            addNotification({ message, type: 'warning', duration }),
        showNotification: (notification: Omit<Notification, 'id'>) =>
            addNotification(notification),
    };
}
