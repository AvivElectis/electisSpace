import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../infrastructure/settingsStore';

const AUTO_LOCK_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Auto-lock hook
 * Automatically locks settings after 30 minutes of inactivity
 * (30 minutes after closing the settings dialog)
 */
export function useAutoLock() {
    const { settings, isLocked, passwordHash, setLocked, updateSettings } = useSettingsStore();
    const hasInitialized = useRef(false);

    // Initialize lastSettingsAccess once if not set (separate from interval)
    useEffect(() => {
        if (!settings.autoLockEnabled || !passwordHash || isLocked) return;
        if (!settings.lastSettingsAccess && !hasInitialized.current) {
            hasInitialized.current = true;
            updateSettings({ lastSettingsAccess: Date.now() });
        }
    }, [settings.autoLockEnabled, settings.lastSettingsAccess, passwordHash, isLocked, updateSettings]);

    // Check for auto-lock every minute — reads lastSettingsAccess from store snapshot
    // to avoid the interval restarting when lastSettingsAccess changes
    useEffect(() => {
        if (!settings.autoLockEnabled || !passwordHash || isLocked) {
            return;
        }

        const checkAutoLock = () => {
            const lastAccess = useSettingsStore.getState().settings.lastSettingsAccess;
            if (!lastAccess) return;

            const timeSinceLastAccess = Date.now() - lastAccess;
            if (timeSinceLastAccess >= AUTO_LOCK_TIMEOUT) {
                setLocked(true);
            }
        };

        checkAutoLock();
        const interval = setInterval(checkAutoLock, 60 * 1000);

        return () => clearInterval(interval);
    }, [settings.autoLockEnabled, passwordHash, isLocked, setLocked]);
}
