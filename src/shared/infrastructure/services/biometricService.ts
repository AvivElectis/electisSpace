/**
 * Biometric Authentication Service
 *
 * Wraps @aparajita/capacitor-biometric-auth with a simple interface.
 * Only available on native platforms (Android/iOS).
 */

import { Capacitor } from '@capacitor/core';

export const biometricService = {
    async isAvailable(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
            const result = await BiometricAuth.checkBiometry();
            return result.isAvailable;
        } catch {
            return false;
        }
    },

    async authenticate(reason: string): Promise<boolean> {
        try {
            const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
            await BiometricAuth.authenticate({
                reason,
                cancelTitle: 'Cancel',
                allowDeviceCredential: true,
            });
            return true;
        } catch {
            return false;
        }
    },
};
