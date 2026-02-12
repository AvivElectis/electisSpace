/**
 * Settings Domain Validation Tests
 * Phase 10.34 - Deep Testing System
 * 
 * Tests settings validation functions
 */

import {
    validatePassword,
    validateLogoFile,
    validateAppName,
    validateSettings,
    validateSolumMappingConfig,
} from './validation';
import type { SolumMappingConfig } from './types';

describe('Settings Validation', () => {
    describe('validatePassword', () => {
        it('should pass for valid password', () => {
            const result = validatePassword('password123');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail for empty password', () => {
            const result = validatePassword('');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'password')).toBe(true);
        });

        it('should fail for whitespace-only password', () => {
            const result = validatePassword('   ');
            expect(result.valid).toBe(false);
        });

        it('should fail for password less than 4 characters', () => {
            const result = validatePassword('abc');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('4 characters'))).toBe(true);
        });

        it('should pass for exactly 4 characters', () => {
            const result = validatePassword('abcd');
            expect(result.valid).toBe(true);
        });
    });

    describe('validateLogoFile', () => {
        const createMockFile = (name: string, size: number, type: string): File => {
            const blob = new Blob(['x'.repeat(size)], { type });
            return new File([blob], name, { type });
        };

        it('should pass for valid PNG file', () => {
            const file = createMockFile('logo.png', 100000, 'image/png');
            const result = validateLogoFile(file, 1);
            expect(result.valid).toBe(true);
        });

        it('should pass for valid JPEG file', () => {
            const file = createMockFile('logo.jpg', 100000, 'image/jpeg');
            const result = validateLogoFile(file, 2);
            expect(result.valid).toBe(true);
        });

        it('should fail for file larger than 2MB', () => {
            const file = createMockFile('large.png', 3 * 1024 * 1024, 'image/png');
            const result = validateLogoFile(file, 1);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('2MB'))).toBe(true);
        });

        it('should fail for invalid format', () => {
            const file = createMockFile('doc.pdf', 1000, 'application/pdf');
            const result = validateLogoFile(file, 1);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('PNG or JPEG'))).toBe(true);
        });

        it('should include logo index in error field', () => {
            const file = createMockFile('doc.pdf', 1000, 'application/pdf');
            const result = validateLogoFile(file, 2);
            expect(result.errors.some(e => e.field === 'logo2')).toBe(true);
        });
    });

    describe('validateAppName', () => {
        it('should pass for valid name', () => {
            const result = validateAppName('My App');
            expect(result.valid).toBe(true);
        });

        it('should fail for empty name', () => {
            const result = validateAppName('');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'appName')).toBe(true);
        });

        it('should fail for whitespace-only name', () => {
            const result = validateAppName('   ');
            expect(result.valid).toBe(false);
        });

        it('should fail for name over 50 characters', () => {
            const longName = 'A'.repeat(51);
            const result = validateAppName(longName);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('50 characters'))).toBe(true);
        });

        it('should pass for exactly 50 characters', () => {
            const maxName = 'A'.repeat(50);
            const result = validateAppName(maxName);
            expect(result.valid).toBe(true);
        });

        it('should allow Hebrew characters', () => {
            const result = validateAppName('אפליקציה');
            expect(result.valid).toBe(true);
        });
    });

    describe('validateSettings', () => {
        it('should pass for valid settings', () => {
            const result = validateSettings({
                appName: 'Valid App',
                autoSyncEnabled: true,
                autoSyncInterval: 60,
            });
            expect(result.valid).toBe(true);
        });

        it('should fail for invalid app name', () => {
            const result = validateSettings({ appName: '' });
            expect(result.valid).toBe(false);
        });

        it('should fail for auto-sync interval less than 10 seconds', () => {
            const result = validateSettings({
                appName: 'Valid',
                autoSyncEnabled: true,
                autoSyncInterval: 5,
            });
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'autoSyncInterval')).toBe(true);
        });

        it('should allow short interval when auto-sync disabled', () => {
            const result = validateSettings({
                appName: 'Valid',
                autoSyncEnabled: false,
                autoSyncInterval: 5,
            });
            expect(result.valid).toBe(true);
        });

        it('should pass for exactly 10 seconds interval', () => {
            const result = validateSettings({
                appName: 'Valid',
                autoSyncEnabled: true,
                autoSyncInterval: 10,
            });
            expect(result.valid).toBe(true);
        });
    });

    describe('validateSolumMappingConfig', () => {
        const availableFields = ['ITEM_NAME', 'DEPARTMENT', 'TITLE', 'MEETING_NAME', 'MEETING_TIME', 'PARTICIPANTS'];

        const validConfig: Partial<SolumMappingConfig> = {
            uniqueIdField: 'ITEM_NAME',
            fields: {
                ITEM_NAME: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true },
                DEPARTMENT: { friendlyNameEn: 'Dept', friendlyNameHe: 'מחלקה', visible: true },
            },
            conferenceMapping: {
                meetingName: 'MEETING_NAME',
                meetingTime: 'MEETING_TIME',
                participants: 'PARTICIPANTS',
            },
        };

        it('should pass for valid config', () => {
            const result = validateSolumMappingConfig(validConfig, availableFields);
            expect(result.valid).toBe(true);
        });

        it('should fail when config is undefined', () => {
            const result = validateSolumMappingConfig(undefined, availableFields);
            expect(result.valid).toBe(false);
        });

        it('should fail when uniqueIdField is missing', () => {
            const result = validateSolumMappingConfig(
                { ...validConfig, uniqueIdField: '' },
                availableFields
            );
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'uniqueIdField')).toBe(true);
        });

        it('should fail when uniqueIdField not in available fields', () => {
            const result = validateSolumMappingConfig(
                { ...validConfig, uniqueIdField: 'INVALID_FIELD' },
                availableFields
            );
            expect(result.valid).toBe(false);
        });

        it('should fail when no fields mapping', () => {
            const result = validateSolumMappingConfig(
                { ...validConfig, fields: {} },
                availableFields
            );
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'fields')).toBe(true);
        });

        it('should fail when field not in available fields', () => {
            const result = validateSolumMappingConfig(
                {
                    ...validConfig,
                    fields: {
                        INVALID: { friendlyNameEn: 'Test', friendlyNameHe: 'טסט', visible: true },
                    },
                },
                availableFields
            );
            expect(result.valid).toBe(false);
        });

        it('should fail when English name is missing', () => {
            const result = validateSolumMappingConfig(
                {
                    ...validConfig,
                    fields: {
                        ITEM_NAME: { friendlyNameEn: '', friendlyNameHe: 'שם', visible: true },
                    },
                },
                availableFields
            );
            expect(result.valid).toBe(false);
        });

        it('should fail when Hebrew name is missing', () => {
            const result = validateSolumMappingConfig(
                {
                    ...validConfig,
                    fields: {
                        ITEM_NAME: { friendlyNameEn: 'Name', friendlyNameHe: '', visible: true },
                    },
                },
                availableFields
            );
            expect(result.valid).toBe(false);
        });

        it('should fail when conference meetingName field invalid', () => {
            const result = validateSolumMappingConfig(
                {
                    ...validConfig,
                    conferenceMapping: {
                        meetingName: 'INVALID',
                        meetingTime: 'MEETING_TIME',
                        participants: 'PARTICIPANTS',
                    },
                },
                availableFields
            );
            expect(result.valid).toBe(false);
        });

        it('should fail when conference meetingTime field invalid', () => {
            const result = validateSolumMappingConfig(
                {
                    ...validConfig,
                    conferenceMapping: {
                        meetingName: 'MEETING_NAME',
                        meetingTime: '',
                        participants: 'PARTICIPANTS',
                    },
                },
                availableFields
            );
            expect(result.valid).toBe(false);
        });
    });
});
