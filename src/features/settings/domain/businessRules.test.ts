/**
 * Settings Domain Business Rules Tests
 * Phase 10.34 - Deep Testing System
 * 
 * Tests settings export/import, defaults, and password handling
 */

import { describe, it, expect, vi } from 'vitest';
import {
    exportSettings,
    importSettings,
    createDefaultSettings,
    sanitizeSettings,
} from './businessRules';
import type { SettingsData, ExportedSettings } from './types';

// Mock encryption service
vi.mock('@shared/infrastructure/services/encryptionService', () => ({
    encrypt: vi.fn((data: string, password: string) => `encrypted:${password}:${data}`),
    decrypt: vi.fn((data: string, password: string) => {
        if (data.startsWith(`encrypted:${password}:`)) {
            return data.replace(`encrypted:${password}:`, '');
        }
        throw new Error('Invalid password');
    }),
    hashPassword: vi.fn((password: string) => `hashed:${password}`),
    verifyPassword: vi.fn((password: string, hash: string) => hash === `hashed:${password}`),
}));

describe('Settings Business Rules', () => {
    const mockSettings: SettingsData = {
        appName: 'Test App',
        appSubtitle: 'Test Subtitle',
        spaceType: 'office',
        workingMode: 'SOLUM_API',
        csvConfig: {
            delimiter: ';',
            columns: [],
            mapping: {},
            conferenceEnabled: false,
        },
        solumConfig: {
            companyName: 'TestCo',
            username: 'user@test.com',
            password: 'secret123',
            storeNumber: '01',
            cluster: 'common',
            baseUrl: 'https://test.com',
            syncInterval: 60,
        },
        logos: {},
        autoSyncEnabled: true,
        autoSyncInterval: 300,
    };

    describe('createDefaultSettings', () => {
        it('should create settings with default app name', () => {
            const defaults = createDefaultSettings();
            expect(defaults.appName).toBe('electis Space');
        });

        it('should create settings with default subtitle', () => {
            const defaults = createDefaultSettings();
            expect(defaults.appSubtitle).toBe('ESL Management System');
        });

        it('should default to office space type', () => {
            const defaults = createDefaultSettings();
            expect(defaults.spaceType).toBe('office');
        });

        it('should default to SOLUM_API working mode', () => {
            const defaults = createDefaultSettings();
            expect(defaults.workingMode).toBe('SOLUM_API');
        });

        it('should create empty CSV config', () => {
            const defaults = createDefaultSettings();
            expect(defaults.csvConfig.delimiter).toBe(';');
            expect(defaults.csvConfig.columns).toEqual([]);
            expect(defaults.csvConfig.conferenceEnabled).toBe(false);
        });

        it('should create empty SoluM config', () => {
            const defaults = createDefaultSettings();
            expect(defaults.solumConfig?.companyName).toBe('');
            expect(defaults.solumConfig?.username).toBe('');
        });

        it('should disable auto-sync by default', () => {
            const defaults = createDefaultSettings();
            expect(defaults.autoSyncEnabled).toBe(false);
        });

        it('should set default auto-sync interval to 5 minutes', () => {
            const defaults = createDefaultSettings();
            expect(defaults.autoSyncInterval).toBe(300);
        });
    });

    describe('exportSettings', () => {
        it('should export settings with version', () => {
            const exported = exportSettings(mockSettings);
            expect(exported.version).toBe('1.0');
        });

        it('should include timestamp', () => {
            const before = new Date().toISOString();
            const exported = exportSettings(mockSettings);
            const after = new Date().toISOString();
            
            expect(exported.timestamp >= before).toBe(true);
            expect(exported.timestamp <= after).toBe(true);
        });

        it('should export unencrypted by default', () => {
            const exported = exportSettings(mockSettings);
            expect(exported.encrypted).toBe(false);
        });

        it('should contain serialized settings data', () => {
            const exported = exportSettings(mockSettings);
            const parsed = JSON.parse(exported.data);
            expect(parsed.appName).toBe('Test App');
        });

        it('should encrypt when password provided', () => {
            const exported = exportSettings(mockSettings, 'mypassword');
            expect(exported.encrypted).toBe(true);
            expect(exported.data).toContain('encrypted:mypassword:');
        });
    });

    describe('importSettings', () => {
        it('should import unencrypted settings', () => {
            const exported: ExportedSettings = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                data: JSON.stringify(mockSettings),
                encrypted: false,
            };

            const imported = importSettings(exported);
            expect(imported.appName).toBe('Test App');
        });

        it('should import encrypted settings with correct password', () => {
            const exported = exportSettings(mockSettings, 'correct');
            const imported = importSettings(exported, 'correct');
            expect(imported.appName).toBe('Test App');
        });

        it('should throw error for encrypted without password', () => {
            const exported: ExportedSettings = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                data: 'encrypted:pass:data',
                encrypted: true,
            };

            expect(() => importSettings(exported)).toThrow('Password is required');
        });

        it('should throw error for wrong password', () => {
            const exported = exportSettings(mockSettings, 'correct');
            expect(() => importSettings(exported, 'wrong')).toThrow();
        });

        it('should preserve all settings fields', () => {
            const exported = exportSettings(mockSettings);
            const imported = importSettings(exported);
            
            expect(imported.appName).toBe(mockSettings.appName);
            expect(imported.spaceType).toBe(mockSettings.spaceType);
            expect(imported.workingMode).toBe(mockSettings.workingMode);
            expect(imported.autoSyncEnabled).toBe(mockSettings.autoSyncEnabled);
        });
    });

    describe('sanitizeSettings', () => {
        it('should include app name', () => {
            const sanitized = sanitizeSettings(mockSettings);
            expect(sanitized.appName).toBe('Test App');
        });

        it('should include app subtitle', () => {
            const sanitized = sanitizeSettings(mockSettings);
            expect(sanitized.appSubtitle).toBe('Test Subtitle');
        });

        it('should include space type', () => {
            const sanitized = sanitizeSettings(mockSettings);
            expect(sanitized.spaceType).toBe('office');
        });

        it('should include working mode', () => {
            const sanitized = sanitizeSettings(mockSettings);
            expect(sanitized.workingMode).toBe('SOLUM_API');
        });

        it('should include CSV config', () => {
            const sanitized = sanitizeSettings(mockSettings);
            expect(sanitized.csvConfig).toEqual(mockSettings.csvConfig);
        });

        it('should include logos', () => {
            const sanitized = sanitizeSettings(mockSettings);
            expect(sanitized.logos).toEqual({});
        });

        it('should include auto-sync settings', () => {
            const sanitized = sanitizeSettings(mockSettings);
            expect(sanitized.autoSyncEnabled).toBe(true);
            expect(sanitized.autoSyncInterval).toBe(300);
        });

        it('should omit solumConfig credentials', () => {
            const sanitized = sanitizeSettings(mockSettings);
            expect(sanitized.solumConfig).toBeUndefined();
        });
    });
});
