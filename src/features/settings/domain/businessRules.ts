import type { SettingsData, ExportedSettings } from './types';
import { encrypt, decrypt, hashPassword, verifyPassword } from '@shared/infrastructure/services/encryptionService';

/**
 * Settings Domain Business Rules
 */

/**
 * Convert image file to base64 string
 * @param file - Image file
 * @returns Promise resolving to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Export settings to JSON (optionally encrypted)
 * @param settings - Settings to export
 * @param password - Optional encryption password
 * @returns Exported settings object
 */
export function exportSettings(settings: SettingsData, password?: string): ExportedSettings {
    const settingsJson = JSON.stringify(settings);
    const data = password ? encrypt(settingsJson, password) : settingsJson;

    return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data,
        encrypted: !!password,
    };
}

/**
 * Import settings from JSON (optionally encrypted)
 * @param exported - Exported settings object
 * @param password - Optional decryption password
 * @returns Decrypted settings data
 */
export function importSettings(exported: ExportedSettings, password?: string): SettingsData {
    try {
        let settingsJson: string;

        if (exported.encrypted) {
            if (!password) {
                throw new Error('Password is required to import encrypted settings.');
            }
            settingsJson = decrypt(exported.data, password);
        } else {
            settingsJson = exported.data;
        }

        const settings = JSON.parse(settingsJson) as SettingsData;
        return settings;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to import settings. Invalid password or corrupted data.');
    }
}

/**
 * Create default settings
 * @returns Default settings data
 */
export function createDefaultSettings(): SettingsData {
    return {
        appName: 'electis Space',
        appSubtitle: 'ESL Management System',
        spaceType: 'office',
        workingMode: 'SFTP',
        csvConfig: {
            delimiter: ',',
            columns: [],
            mapping: {},
            conferenceEnabled: false,
        },
        solumConfig: {
            companyName: '',
            username: '',
            password: '',
            storeNumber: '',
            cluster: 'common',
            baseUrl: 'https://eu.common.solumesl.com',
            syncInterval: 60,
        },
        logos: {},
        autoSyncEnabled: false,
        autoSyncInterval: 300,  // 5 minutes
    };
}


/**
 * Hash settings password for storage
 * @param password - Plain text password
 * @returns Hashed password
 */
export function hashSettingsPassword(password: string): string {
    return hashPassword(password);
}

/**
 * Verify settings password
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns true if password matches
 */
export function verifySettingsPassword(password: string, hash: string): boolean {
    return verifyPassword(password, hash);
}

/**
 * Sanitize settings for display (remove sensitive data)
 * @param settings - Settings data
 * @returns Sanitized settings
 */
export function sanitizeSettings(settings: SettingsData): Partial<SettingsData> {
    return {
        appName: settings.appName,
        appSubtitle: settings.appSubtitle,
        spaceType: settings.spaceType,
        workingMode: settings.workingMode,
        csvConfig: settings.csvConfig,
        logos: settings.logos,
        autoSyncEnabled: settings.autoSyncEnabled,
        autoSyncInterval: settings.autoSyncInterval,
        // Omit credentials
    };
}
