import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Biometric auth is only available on native platforms
const isNative = Capacitor.isNativePlatform();

// Lazy-load biometric plugin only on native
let BiometricAuth: any = null;

async function getBiometricAuth() {
    if (!isNative) return null;
    if (!BiometricAuth) {
        try {
            const mod = await import('@aparajita/capacitor-biometric-auth');
            BiometricAuth = mod.BiometricAuth;
        } catch {
            return null;
        }
    }
    return BiometricAuth;
}

// ─── Secure Token Storage ───────────────────────────

const DEVICE_TOKEN_KEY = 'compass_device_token';
const BIOMETRIC_ENABLED_KEY = 'compass_biometric_enabled';

export async function storeDeviceToken(token: string): Promise<void> {
    await Preferences.set({ key: DEVICE_TOKEN_KEY, value: token });
}

export async function getStoredDeviceToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: DEVICE_TOKEN_KEY });
    return value;
}

export async function clearDeviceToken(): Promise<void> {
    await Preferences.remove({ key: DEVICE_TOKEN_KEY });
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
    await Preferences.set({ key: BIOMETRIC_ENABLED_KEY, value: String(enabled) });
}

export async function isBiometricEnabled(): Promise<boolean> {
    const { value } = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY });
    return value === 'true';
}

// ─── Biometric Auth ─────────────────────────────────

export async function isBiometricAvailable(): Promise<boolean> {
    if (!isNative) return false;
    try {
        const bio = await getBiometricAuth();
        if (!bio) return false;
        const result = await bio.checkBiometry();
        return result.isAvailable;
    } catch {
        return false;
    }
}

export async function promptBiometric(reason?: string): Promise<boolean> {
    if (!isNative) return false;
    try {
        const bio = await getBiometricAuth();
        if (!bio) return false;
        await bio.authenticate({
            reason: reason ?? 'Unlock electisCompass',
            cancelTitle: 'Cancel',
            allowDeviceCredential: true,
        });
        return true;
    } catch {
        return false;
    }
}

export { isNative };
