/**
 * Device Token Storage
 * 
 * Persistent storage for device auth tokens.
 * - Web: uses idb-keyval (IndexedDB) — survives cookie clears
 * - Native (Capacitor): uses @capacitor/preferences
 */

import { Capacitor } from '@capacitor/core';
import { logger } from './logger';

const DEVICE_TOKEN_KEY = 'electis_device_token';
const DEVICE_ID_KEY = 'electis_device_id';

const isNative = Capacitor.isNativePlatform();

// Lazy-loaded idb-keyval references
let idbGet: ((key: string) => Promise<string | undefined>) | null = null;
let idbSet: ((key: string, value: string) => Promise<void>) | null = null;
let idbDel: ((key: string) => Promise<void>) | null = null;

async function initIdb() {
    if (idbGet) return;
    try {
        const { get, set, del } = await import('idb-keyval');
        idbGet = get;
        idbSet = set;
        idbDel = del;
    } catch (err) {
        logger.warn('DeviceTokenStorage', 'idb-keyval not available', { error: String(err) });
    }
}

async function getNativePreferences() {
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences;
}

export const deviceTokenStorage = {
    async getDeviceToken(): Promise<string | null> {
        try {
            if (isNative) {
                const prefs = await getNativePreferences();
                const { value } = await prefs.get({ key: DEVICE_TOKEN_KEY });
                return value;
            }
            await initIdb();
            let token: string | null = null;
            if (idbGet) token = (await idbGet(DEVICE_TOKEN_KEY)) ?? null;
            if (!token) token = localStorage.getItem(DEVICE_TOKEN_KEY);
            return token;
        } catch (err) {
            logger.warn('DeviceTokenStorage', 'Failed to get device token', { error: String(err) });
            return localStorage.getItem(DEVICE_TOKEN_KEY);
        }
    },

    async setDeviceToken(token: string): Promise<void> {
        try {
            if (isNative) {
                const prefs = await getNativePreferences();
                await prefs.set({ key: DEVICE_TOKEN_KEY, value: token });
                return;
            }
            await initIdb();
            if (idbSet) await idbSet(DEVICE_TOKEN_KEY, token);
            localStorage.setItem(DEVICE_TOKEN_KEY, token);
        } catch (err) {
            logger.warn('DeviceTokenStorage', 'Failed to set device token', { error: String(err) });
            localStorage.setItem(DEVICE_TOKEN_KEY, token);
        }
    },

    async removeDeviceToken(): Promise<void> {
        try {
            if (isNative) {
                const prefs = await getNativePreferences();
                await prefs.remove({ key: DEVICE_TOKEN_KEY });
                return;
            }
            await initIdb();
            if (idbDel) await idbDel(DEVICE_TOKEN_KEY);
            localStorage.removeItem(DEVICE_TOKEN_KEY);
        } catch (err) {
            logger.warn('DeviceTokenStorage', 'Failed to remove device token', { error: String(err) });
            localStorage.removeItem(DEVICE_TOKEN_KEY);
        }
    },

    async getDeviceId(): Promise<string> {
        try {
            let deviceId: string | null = null;
            if (isNative) {
                const prefs = await getNativePreferences();
                const { value } = await prefs.get({ key: DEVICE_ID_KEY });
                deviceId = value;
            } else {
                await initIdb();
                if (idbGet) {
                    deviceId = (await idbGet(DEVICE_ID_KEY)) ?? null;
                }
                // Fallback: check localStorage if IDB didn't have it
                if (!deviceId) {
                    deviceId = localStorage.getItem(DEVICE_ID_KEY);
                }
            }
            if (!deviceId) {
                deviceId = crypto.randomUUID();
                if (isNative) {
                    const prefs = await getNativePreferences();
                    await prefs.set({ key: DEVICE_ID_KEY, value: deviceId });
                } else {
                    // Store in both IDB and localStorage for reliability
                    if (idbSet) await idbSet(DEVICE_ID_KEY, deviceId);
                    localStorage.setItem(DEVICE_ID_KEY, deviceId);
                }
            }
            return deviceId;
        } catch {
            // Last resort: use localStorage only
            let deviceId = localStorage.getItem(DEVICE_ID_KEY);
            if (!deviceId) {
                deviceId = crypto.randomUUID();
                localStorage.setItem(DEVICE_ID_KEY, deviceId);
            }
            return deviceId;
        }
    },

    getPlatform(): string {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') return 'ios';
        if (platform === 'android') return 'android';
        return 'web';
    },

    getDeviceName(): string {
        const ua = navigator.userAgent;
        const browser = /Edg\//.test(ua) ? 'Edge'
            : /Chrome\//.test(ua) ? 'Chrome'
            : /Firefox\//.test(ua) ? 'Firefox'
            : /Safari\//.test(ua) ? 'Safari'
            : '';

        let os = 'Unknown Device';
        if (/iPhone/.test(ua)) os = 'iPhone';
        else if (/iPad/.test(ua)) os = 'iPad';
        else if (/Android/.test(ua)) os = 'Android';
        else if (/Mac/.test(ua)) os = 'Mac';
        else if (/Windows/.test(ua)) os = 'Windows PC';
        else if (/Linux/.test(ua)) os = 'Linux';

        // The server will try reverse DNS to resolve the real hostname.
        // Client sends OS + browser as a fallback name.
        return [os, browser].filter(Boolean).join(' — ');
    },

    /** Get the real OS hostname (Electron only) */
    async getHostname(): Promise<string | null> {
        try {
            const electronAPI = (window as any).electronAPI;
            if (electronAPI?.getHostname) {
                return await electronAPI.getHostname();
            }
        } catch { /* not in Electron */ }
        return null;
    },
};
