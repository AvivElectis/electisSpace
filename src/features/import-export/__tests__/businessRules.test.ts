/**
 * Import/Export Business Rules Tests
 * Phase 10.17 - Deep Testing System
 * 
 * Tests business rule functions for import/export operations
 */

import { describe, it, expect, vi } from 'vitest';
import {
    exportSettings,
    importSettings,
    generateImportPreview,
} from '../domain/businessRules';
import type { SettingsData } from '@features/settings/domain/types';
import type { ExportedData } from '../domain/types';

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
}));

describe('Import/Export Business Rules', () => {
    const createMockSettings = (): SettingsData => ({
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
            companyName: 'Test Co',
            username: 'user',
            password: 'secret_password',
            storeNumber: '001',
            cluster: 'common',
            baseUrl: 'https://test.com',
            syncInterval: 60,
        },
        sftpCredentials: {
            host: 'sftp.example.com',
            port: 22,
            username: 'sftp_user',
            password: 'sftp_secret',
            remoteFilename: '/data/file.csv',
        },
        logos: {
            logo1: 'data:image/png;base64,abc123',
        },
        autoSyncEnabled: true,
        autoSyncInterval: 300,
    });

    describe('exportSettings', () => {
        it('should export settings without encryption', () => {
            const settings = createMockSettings();
            const result = exportSettings(settings, { includeCredentials: false });

            expect(result.version).toBe('1.0');
            expect(result.encrypted).toBe(false);
            expect(result.timestamp).toBeDefined();
        });

        it('should encrypt data when password provided', () => {
            const settings = createMockSettings();
            const result = exportSettings(settings, { includeCredentials: false, password: 'secret' });

            expect(result.encrypted).toBe(true);
            expect(result.data).toContain('encrypted:secret:');
        });

        it('should never export passwordHash', () => {
            const settings = createMockSettings();
            const result = exportSettings(settings, { includeCredentials: true });

            const data = JSON.parse(result.data);
            expect(data.passwordHash).toBeUndefined();
        });

        it('should clear SoluM password even with includeCredentials', () => {
            const settings = createMockSettings();
            const result = exportSettings(settings, { includeCredentials: true });

            const data = JSON.parse(result.data);
            expect(data.solumConfig.password).toBe('');
        });

        it('should clear SFTP password even with includeCredentials', () => {
            const settings = createMockSettings();
            const result = exportSettings(settings, { includeCredentials: true });

            const data = JSON.parse(result.data);
            expect(data.sftpCredentials.password).toBe('');
        });

        it('should exclude credentials entirely when includeCredentials is false', () => {
            const settings = createMockSettings();
            const result = exportSettings(settings, { includeCredentials: false });

            const data = JSON.parse(result.data);
            expect(data.sftpCredentials).toBeUndefined();
            expect(data.solumConfig).toBeUndefined();
        });

        it('should preserve non-sensitive settings', () => {
            const settings = createMockSettings();
            const result = exportSettings(settings, { includeCredentials: false });

            const data = JSON.parse(result.data);
            expect(data.appName).toBe('Test App');
            expect(data.workingMode).toBe('SFTP');
            expect(data.logos.logo1).toBe('data:image/png;base64,abc123');
        });

        it('should clear SoluM connection state', () => {
            const settings = createMockSettings();
            (settings.solumConfig as any).isConnected = true;
            (settings.solumConfig as any).tokens = { access: 'token' };

            const result = exportSettings(settings, { includeCredentials: true });

            const data = JSON.parse(result.data);
            expect(data.solumConfig.isConnected).toBe(false);
            expect(data.solumConfig.tokens).toBeUndefined();
        });
    });

    describe('importSettings', () => {
        it('should import unencrypted settings', () => {
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: JSON.stringify({ appName: 'Imported', workingMode: 'SFTP' }),
                encrypted: false,
            };

            const result = importSettings(exported);

            expect(result.appName).toBe('Imported');
            expect(result.workingMode).toBe('SFTP');
        });

        it('should import encrypted settings with correct password', () => {
            const settingsJson = JSON.stringify({ appName: 'Secret App', workingMode: 'SOLUM_API' });
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: `encrypted:mypass:${settingsJson}`,
                encrypted: true,
            };

            const result = importSettings(exported, 'mypass');

            expect(result.appName).toBe('Secret App');
        });

        it('should throw error when password missing for encrypted data', () => {
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: 'encrypted:data',
                encrypted: true,
            };

            expect(() => importSettings(exported)).toThrow('Password required');
        });

        it('should throw error on wrong password', () => {
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: 'encrypted:correct:{"appName":"Test"}',
                encrypted: true,
            };

            expect(() => importSettings(exported, 'wrong')).toThrow('Invalid password or corrupted');
        });
    });

    describe('generateImportPreview', () => {
        it('should generate preview from unencrypted data', () => {
            const settings = { appName: 'Preview App', workingMode: 'SFTP', logos: {} };
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: JSON.stringify(settings),
                encrypted: false,
            };

            const preview = generateImportPreview(exported);

            expect(preview.appName).toBe('Preview App');
            expect(preview.workingMode).toBe('SFTP');
            expect(preview.timestamp).toBe('2025-01-01T00:00:00.000Z');
        });

        it('should format SOLUM_API as SoluM API', () => {
            const settings = { appName: 'Test', workingMode: 'SOLUM_API', logos: {} };
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: JSON.stringify(settings),
                encrypted: false,
            };

            const preview = generateImportPreview(exported);

            expect(preview.workingMode).toBe('SoluM API');
        });

        it('should detect credentials from sftpCredentials', () => {
            const settings = { 
                appName: 'Test', 
                workingMode: 'SFTP', 
                sftpCredentials: { host: 'test' },
                logos: {},
            };
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: JSON.stringify(settings),
                encrypted: false,
            };

            const preview = generateImportPreview(exported);

            expect(preview.hasCredentials).toBe(true);
        });

        it('should detect credentials from solumConfig password', () => {
            const settings = { 
                appName: 'Test', 
                workingMode: 'SOLUM_API', 
                solumConfig: { password: 'secret' },
                logos: {},
            };
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: JSON.stringify(settings),
                encrypted: false,
            };

            const preview = generateImportPreview(exported);

            expect(preview.hasCredentials).toBe(true);
        });

        it('should detect no credentials when empty', () => {
            const settings = { 
                appName: 'Test', 
                workingMode: 'SFTP', 
                solumConfig: { password: '' },
                logos: {},
            };
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: JSON.stringify(settings),
                encrypted: false,
            };

            const preview = generateImportPreview(exported);

            expect(preview.hasCredentials).toBe(false);
        });

        it('should detect logos from logo1', () => {
            const settings = { 
                appName: 'Test', 
                workingMode: 'SFTP', 
                logos: { logo1: 'data:image/png;base64,abc' },
            };
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: JSON.stringify(settings),
                encrypted: false,
            };

            const preview = generateImportPreview(exported);

            expect(preview.hasLogos).toBe(true);
        });

        it('should detect logos from logo2', () => {
            const settings = { 
                appName: 'Test', 
                workingMode: 'SFTP', 
                logos: { logo2: 'data:image/jpeg;base64,xyz' },
            };
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: JSON.stringify(settings),
                encrypted: false,
            };

            const preview = generateImportPreview(exported);

            expect(preview.hasLogos).toBe(true);
        });

        it('should detect no logos when empty', () => {
            const settings = { 
                appName: 'Test', 
                workingMode: 'SFTP', 
                logos: {},
            };
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: JSON.stringify(settings),
                encrypted: false,
            };

            const preview = generateImportPreview(exported);

            expect(preview.hasLogos).toBe(false);
        });

        it('should generate preview from encrypted data with password', () => {
            const settings = { appName: 'Encrypted Preview', workingMode: 'SFTP', logos: {} };
            const exported: ExportedData = {
                version: '1.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: `encrypted:pass:${JSON.stringify(settings)}`,
                encrypted: true,
            };

            const preview = generateImportPreview(exported, 'pass');

            expect(preview.appName).toBe('Encrypted Preview');
        });
    });
});
