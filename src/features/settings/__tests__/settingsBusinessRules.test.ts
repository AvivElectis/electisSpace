/**
 * Settings Business Rules Tests
 * Phase 10.16 - Deep Testing System
 * 
 * Tests business rule functions for settings management
 */

import { describe, it, expect, vi } from 'vitest';
import {
    fileToBase64,
    exportSettings,
    importSettings,
    createDefaultSettings,
    hashSettingsPassword,
    verifySettingsPassword,
    sanitizeSettings,
} from '../domain/businessRules';
import type { SettingsData, ExportedSettings } from '../domain/types';

// Mock encryption service
vi.mock('@shared/infrastructure/services/encryptionService', () => ({
    encrypt: vi.fn((data: string, password: string) => `encrypted:${password}:${data}`),
    decrypt: vi.fn((data: string, password: string) => {
        const prefix = `encrypted:${password}:`;
        if (data.startsWith(prefix)) {
            return data.substring(prefix.length);
        }
        throw new Error('Decryption failed');
    }),
    hashPassword: vi.fn((password: string) => `hash:${password}`),
    verifyPassword: vi.fn((password: string, hash: string) => hash === `hash:${password}`),
}));

describe('Settings Business Rules', () => {
    describe('fileToBase64', () => {
        it('should convert file to base64 string', async () => {
            const content = 'test content';
            const file = new File([content], 'test.txt', { type: 'text/plain' });

            const result = await fileToBase64(file);

            expect(result).toContain('data:');
            expect(result).toContain('base64');
        });

        it('should include correct MIME type', async () => {
            const file = new File(['test'], 'image.png', { type: 'image/png' });

            const result = await fileToBase64(file);

            expect(result).toContain('data:image/png');
        });
    });

    describe('exportSettings', () => {
        const mockSettings: SettingsData = {
            appName: 'Test App',
            appSubtitle: 'Test Subtitle',
            spaceType: 'office',
            workingMode: 'SFTP',
            csvConfig: {
                delimiter: ';',
                columns: [],
                mapping: {},
                conferenceEnabled: false,
            },
            solumConfig: {
                companyName: 'Test',
                username: 'user',
                password: 'pass',
                storeNumber: '001',
                cluster: 'common',
                baseUrl: 'https://test.com',
                syncInterval: 60,
            },
            logos: {},
            autoSyncEnabled: false,
            autoSyncInterval: 300,
        };

        it('should export settings without encryption', () => {
            const result = exportSettings(mockSettings);

            expect(result.version).toBe('1.0');
            expect(result.encrypted).toBe(false);
            expect(result.timestamp).toBeDefined();
            expect(result.data).toBe(JSON.stringify(mockSettings));
        });

        it('should export settings with encryption when password provided', () => {
            const result = exportSettings(mockSettings, 'secret');

            expect(result.encrypted).toBe(true);
            expect(result.data).toContain('encrypted:secret:');
        });

        it('should include valid timestamp', () => {
            const result = exportSettings(mockSettings);

            const timestamp = new Date(result.timestamp);
            expect(timestamp).toBeInstanceOf(Date);
            expect(timestamp.getTime()).not.toBeNaN();
        });
    });

    describe('importSettings', () => {
        const mockSettings: SettingsData = {
            appName: 'Imported App',
            appSubtitle: 'Imported Subtitle',
            spaceType: 'office',
            workingMode: 'SOLUM_API',
            csvConfig: {
                delimiter: ',',
                columns: [],
                mapping: {},
                conferenceEnabled: true,
            },
            solumConfig: {
                companyName: 'Import Co',
                username: 'import_user',
                password: 'import_pass',
                storeNumber: '002',
                cluster: 'common',
                baseUrl: 'https://import.com',
                syncInterval: 120,
            },
            logos: {},
            autoSyncEnabled: true,
            autoSyncInterval: 600,
        };

        it('should import unencrypted settings', () => {
            const exported: ExportedSettings = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: JSON.stringify(mockSettings),
                encrypted: false,
            };

            const result = importSettings(exported);

            expect(result.appName).toBe('Imported App');
            expect(result.workingMode).toBe('SOLUM_API');
        });

        it('should import encrypted settings with correct password', () => {
            const encryptedSettings = {
                ...mockSettings,
                solumConfig: { ...mockSettings.solumConfig, cluster: 'common' as const },
            };
            const exported: ExportedSettings = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: `encrypted:secret:${JSON.stringify(encryptedSettings)}`,
                encrypted: true,
            };

            const result = importSettings(exported, 'secret');

            expect(result.appName).toBe('Imported App');
        });

        it('should throw error when password missing for encrypted data', () => {
            const exported: ExportedSettings = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: 'encrypted:data',
                encrypted: true,
            };

            expect(() => importSettings(exported)).toThrow('Password is required');
        });

        it('should throw error on decryption failure', () => {
            const exported: ExportedSettings = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: 'encrypted:wrong:data',
                encrypted: true,
            };

            expect(() => importSettings(exported, 'different')).toThrow();
        });
    });

    describe('createDefaultSettings', () => {
        it('should return valid default settings', () => {
            const defaults = createDefaultSettings();

            expect(defaults.appName).toBe('electis Space');
            expect(defaults.workingMode).toBe('SFTP');
            expect(defaults.autoSyncEnabled).toBe(false);
        });

        it('should have proper CSV config defaults', () => {
            const defaults = createDefaultSettings();

            expect(defaults.csvConfig.delimiter).toBe(';');
            expect(defaults.csvConfig.columns).toEqual([]);
            expect(defaults.csvConfig.mapping).toEqual({});
            expect(defaults.csvConfig.conferenceEnabled).toBe(false);
        });

        it('should have proper SoluM config defaults', () => {
            const defaults = createDefaultSettings();

            expect(defaults.solumConfig?.cluster).toBe('common');
            expect(defaults.solumConfig?.baseUrl).toBe('https://eu.common.solumesl.com');
            expect(defaults.solumConfig?.syncInterval).toBe(60);
        });

        it('should have proper auto-sync defaults', () => {
            const defaults = createDefaultSettings();

            expect(defaults.autoSyncEnabled).toBe(false);
            expect(defaults.autoSyncInterval).toBe(300);
        });

        it('should have empty logos by default', () => {
            const defaults = createDefaultSettings();

            expect(defaults.logos).toEqual({});
        });
    });

    describe('hashSettingsPassword', () => {
        it('should return hashed password', () => {
            const result = hashSettingsPassword('mypassword');

            expect(result).toBe('hash:mypassword');
        });

        it('should produce consistent hashes', () => {
            const hash1 = hashSettingsPassword('test');
            const hash2 = hashSettingsPassword('test');

            expect(hash1).toBe(hash2);
        });
    });

    describe('verifySettingsPassword', () => {
        it('should return true for matching password', () => {
            const hash = hashSettingsPassword('correct');
            const result = verifySettingsPassword('correct', hash);

            expect(result).toBe(true);
        });

        it('should return false for non-matching password', () => {
            const hash = hashSettingsPassword('correct');
            const result = verifySettingsPassword('wrong', hash);

            expect(result).toBe(false);
        });
    });

    describe('sanitizeSettings', () => {
        const fullSettings: SettingsData = {
            appName: 'Test App',
            appSubtitle: 'Subtitle',
            spaceType: 'office',
            workingMode: 'SOLUM_API',
            csvConfig: {
                delimiter: ';',
                columns: [],
                mapping: {},
                conferenceEnabled: false,
            },
            solumConfig: {
                companyName: 'Secret Co',
                username: 'secret_user',
                password: 'secret_pass',
                storeNumber: '123',
                cluster: 'common',
                baseUrl: 'https://secret.com',
                syncInterval: 60,
            },
            logos: { logo1: 'data:image/png;base64,...' },
            autoSyncEnabled: true,
            autoSyncInterval: 120,
        };

        it('should preserve public settings', () => {
            const sanitized = sanitizeSettings(fullSettings);

            expect(sanitized.appName).toBe('Test App');
            expect(sanitized.appSubtitle).toBe('Subtitle');
            expect(sanitized.spaceType).toBe('office');
            expect(sanitized.workingMode).toBe('SOLUM_API');
        });

        it('should preserve CSV config', () => {
            const sanitized = sanitizeSettings(fullSettings);

            expect(sanitized.csvConfig).toEqual(fullSettings.csvConfig);
        });

        it('should preserve logos', () => {
            const sanitized = sanitizeSettings(fullSettings);

            expect(sanitized.logos).toEqual(fullSettings.logos);
        });

        it('should preserve auto-sync settings', () => {
            const sanitized = sanitizeSettings(fullSettings);

            expect(sanitized.autoSyncEnabled).toBe(true);
            expect(sanitized.autoSyncInterval).toBe(120);
        });

        it('should omit solumConfig credentials', () => {
            const sanitized = sanitizeSettings(fullSettings);

            expect(sanitized.solumConfig).toBeUndefined();
        });
    });
});
