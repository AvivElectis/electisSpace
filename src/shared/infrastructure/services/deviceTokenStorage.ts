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
            if (!idbGet) return null;
            return (await idbGet(DEVICE_TOKEN_KEY)) ?? null;
        } catch (err) {
            logger.warn('DeviceTokenStorage', 'Failed to get device token', { error: String(err) });
            return null;
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
        } catch (err) {
            logger.warn('DeviceTokenStorage', 'Failed to set device token', { error: String(err) });
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
        } catch (err) {
            logger.warn('DeviceTokenStorage', 'Failed to remove device token', { error: String(err) });
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
                if (idbGet) deviceId = (await idbGet(DEVICE_ID_KEY)) ?? null;
            }
            if (!deviceId) {
                deviceId = crypto.randomUUID();
                if (isNative) {
                    const prefs = await getNativePreferences();
                    await prefs.set({ key: DEVICE_ID_KEY, value: deviceId });
                } else if (idbSet) {
                    await idbSet(DEVICE_ID_KEY, deviceId);
                }
            }
            return deviceId;
        } catch {
            return crypto.randomUUID();
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
        if (/iPhone/.test(ua)) return 'iPhone';
        if (/iPad/.test(ua)) return 'iPad';
        if (/Android/.test(ua)) return 'Android Device';
        if (/Mac/.test(ua)) return 'Mac';
        if (/Windows/.test(ua)) return 'Windows PC';
        if (/Linux/.test(ua)) return 'Linux';
        return 'Unknown Device';
    },
};
