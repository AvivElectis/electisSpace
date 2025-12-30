import { useEffect } from 'react';
import { useSettingsStore } from '../infrastructure/settingsStore';

const AUTO_LOCK_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Auto-lock hook
 * Automatically locks settings after 30 minutes of inactivity
 * (30 minutes after closing the settings dialog)
 */
export function useAutoLock() {
    const { settings, isLocked, passwordHash, setLocked, updateSettings } = useSettingsStore();

    useEffect(() => {
        // Only run if auto-lock is enabled, password is set, and not already locked
        if (!settings.autoLockEnabled || !passwordHash || isLocked) {
            return;
        }

        // Check if we should auto-lock based on last access time
        const checkAutoLock = () => {
            const lastAccess = settings.lastSettingsAccess;

            if (!lastAccess) {
                // No last access recorded, set it to now
                updateSettings({ lastSettingsAccess: Date.now() });
                return;
            }

            const timeSinceLastAccess = Date.now() - lastAccess;

            if (timeSinceLastAccess >= AUTO_LOCK_TIMEOUT) {
                // Auto-lock triggered
                setLocked(true);
                // console.log('[AutoLock] Settings locked after 30 minutes of inactivity');
            }
        };

        // Check immediately on mount
        checkAutoLock();

        // Then check every minute
        const interval = setInterval(checkAutoLock, 60 * 1000);

        return () => clearInterval(interval);
    }, [settings.autoLockEnabled, settings.lastSettingsAccess, passwordHash, isLocked, setLocked, updateSettings]);
}
