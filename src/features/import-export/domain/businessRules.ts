/**
 * Import/Export Feature Business Rules
 */

import type { SettingsData } from '@features/settings/domain/types';
import type { ExportOptions, ExportedData, ImportPreview } from './types';
import { encrypt, decrypt } from '@shared/infrastructure/services/encryptionService';

/**
 * Export settings with security sanitization
 * NEVER exports password hashes for security
 */
export function exportSettings(
    settings: SettingsData,
    options: ExportOptions
): ExportedData {
    // Create sanitized copy
    const sanitized: any = { ...settings };

    // SECURITY: Remove password hashes and sensitive timestamps
    delete sanitized.passwordHash;
    delete sanitized.lastSettingsAccess;

    // CRITICAL SECURITY: ALWAYS remove passwords from credentials
    // Even if includeCredentials is true, we sanitize passwords
    if (sanitized.solumConfig) {
        sanitized.solumConfig = {
            ...sanitized.solumConfig,
            password: '', // Always clear SoluM password
            tokens: undefined, // Always clear tokens
            isConnected: false,
            lastConnected: undefined,
            lastRefreshed: undefined,
        };
    }

    // Optionally exclude entire credential objects
    if (!options.includeCredentials) {
        sanitized.solumConfig = undefined;
    }

    const settingsJson = JSON.stringify(sanitized);
    const data = options.password
        ? encrypt(settingsJson, options.password)
        : settingsJson;

    return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data,
        encrypted: !!options.password,
    };
}

/**
 * Import settings from exported data
 */
export function importSettings(
    exported: ExportedData,
    password?: string
): SettingsData {
    try {
        let settingsJson: string;

        if (exported.encrypted) {
            if (!password) {
                throw new Error('Password required for encrypted settings');
            }
            settingsJson = decrypt(exported.data, password);
        } else {
            settingsJson = exported.data;
        }

        return JSON.parse(settingsJson) as SettingsData;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Password required')) {
            throw error;
        }
        throw new Error('Failed to import: Invalid password or corrupted data');
    }
}

/**
 * Generate preview of settings to be imported
 */
export function generateImportPreview(
    exported: ExportedData,
    password?: string
): ImportPreview {
    const settings = importSettings(exported, password);

    return {
        appName: settings.appName,
        workingMode: 'SoluM API',
        hasCredentials: !!settings.solumConfig?.password,
        hasLogos: !!(settings.logos?.logo1 || settings.logos?.logo2),
        timestamp: exported.timestamp,
    };
}
