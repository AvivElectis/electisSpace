/**
 * Device Lock Preference — Android only
 *
 * Stores whether the user has opted into device lock (fingerprint/face/PIN/pattern)
 * for quick re-authentication after session timeout.
 * Uses Capacitor Preferences (survives app restarts and WebView recreations).
 */

const DEVICE_LOCK_KEY = 'device_lock_enabled';

export const deviceLockPreference = {
    async isEnabled(): Promise<boolean> {
        try {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key: DEVICE_LOCK_KEY });
            return value === 'true';
        } catch {
            return false;
        }
    },

    async setEnabled(enabled: boolean): Promise<void> {
        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.set({ key: DEVICE_LOCK_KEY, value: String(enabled) });
        } catch {
            // ignore — non-critical
        }
    },

    async clear(): Promise<void> {
        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.remove({ key: DEVICE_LOCK_KEY });
        } catch {
            // ignore
        }
    },
};
