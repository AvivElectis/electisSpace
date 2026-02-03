/**
 * Settings Domain Validation Tests
 * Phase 10.15 - Deep Testing System
 * 
 * Tests validation functions for settings configuration
 */

import { describe, it, expect } from 'vitest';
import {
    validatePassword,
    validateLogoFile,
    validateAppName,
    validateSettings,
    validateSolumMappingConfig,
} from '../domain/validation';
import type { SolumMappingConfig } from '../domain/types';

describe('Settings Domain Validation', () => {
    describe('validatePassword', () => {
        it('should reject empty password', () => {
            const result = validatePassword('');
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'password', message: expect.stringContaining('required') })
            );
        });

        it('should reject password with only spaces', () => {
            const result = validatePassword('   ');
            expect(result.valid).toBe(false);
        });

        it('should reject password shorter than 4 characters', () => {
            const result = validatePassword('abc');
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('4 characters') })
            );
        });

        it('should accept password with exactly 4 characters', () => {
            const result = validatePassword('abcd');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should accept valid password', () => {
            const result = validatePassword('securepassword123');
            expect(result.valid).toBe(true);
        });
    });

    describe('validateLogoFile', () => {
        it('should reject file larger than 2MB', () => {
            const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.png', { type: 'image/png' });
            const result = validateLogoFile(largeFile, 1);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('2MB') })
            );
        });

        it('should reject non-image file type', () => {
            const textFile = new File(['test'], 'file.txt', { type: 'text/plain' });
            const result = validateLogoFile(textFile, 1);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('PNG or JPEG') })
            );
        });

        it('should accept valid PNG file', () => {
            const pngFile = new File(['test'], 'logo.png', { type: 'image/png' });
            const result = validateLogoFile(pngFile, 1);
            expect(result.valid).toBe(true);
        });

        it('should accept valid JPEG file', () => {
            const jpegFile = new File(['test'], 'logo.jpg', { type: 'image/jpeg' });
            const result = validateLogoFile(jpegFile, 2);
            expect(result.valid).toBe(true);
        });

        it('should include correct logo index in error message', () => {
            const textFile = new File(['test'], 'file.txt', { type: 'text/plain' });
            const result = validateLogoFile(textFile, 2);
            expect(result.errors[0].field).toBe('logo2');
        });
    });

    describe('validateAppName', () => {
        it('should reject empty app name', () => {
            const result = validateAppName('');
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('required') })
            );
        });

        it('should reject app name with only spaces', () => {
            const result = validateAppName('   ');
            expect(result.valid).toBe(false);
        });

        it('should reject app name longer than 50 characters', () => {
            const longName = 'a'.repeat(51);
            const result = validateAppName(longName);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('50 characters') })
            );
        });

        it('should accept app name with exactly 50 characters', () => {
            const exactName = 'a'.repeat(50);
            const result = validateAppName(exactName);
            expect(result.valid).toBe(true);
        });

        it('should accept valid app name', () => {
            const result = validateAppName('My App');
            expect(result.valid).toBe(true);
        });
    });

    describe('validateSettings', () => {
        it('should validate app name in settings', () => {
            const result = validateSettings({ appName: '' });
            expect(result.valid).toBe(false);
        });

        it('should reject auto-sync interval less than 10 seconds', () => {
            const result = validateSettings({
                appName: 'Test App',
                autoSyncEnabled: true,
                autoSyncInterval: 5,
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'autoSyncInterval' })
            );
        });

        it('should accept auto-sync interval of 10 seconds', () => {
            const result = validateSettings({
                appName: 'Test App',
                autoSyncEnabled: true,
                autoSyncInterval: 10,
            });
            expect(result.valid).toBe(true);
        });

        it('should not validate interval if auto-sync is disabled', () => {
            const result = validateSettings({
                appName: 'Test App',
                autoSyncEnabled: false,
                autoSyncInterval: 10,
            });
            expect(result.valid).toBe(true);
        });

        it('should accept valid settings', () => {
            const result = validateSettings({
                appName: 'Valid App',
                autoSyncEnabled: true,
                autoSyncInterval: 60,
            });
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('validateSolumMappingConfig', () => {
        const availableFields = ['ITEM_NAME', 'ENGLISH_NAME', 'RANK', 'TITLE', 'MEETING_NAME', 'MEETING_TIME', 'PARTICIPANTS'];

        it('should reject undefined config', () => {
            const result = validateSolumMappingConfig(undefined, availableFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('required') })
            );
        });

        it('should reject empty uniqueIdField', () => {
            const config: Partial<SolumMappingConfig> = {
                uniqueIdField: '',
                fields: { ITEM_NAME: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true } },
                conferenceMapping: { meetingName: 'MEETING_NAME', meetingTime: 'MEETING_TIME', participants: 'PARTICIPANTS' },
            };
            const result = validateSolumMappingConfig(config, availableFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'uniqueIdField' })
            );
        });

        it('should reject uniqueIdField not in available fields', () => {
            const config: Partial<SolumMappingConfig> = {
                uniqueIdField: 'INVALID_FIELD',
                fields: { ITEM_NAME: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true } },
                conferenceMapping: { meetingName: 'MEETING_NAME', meetingTime: 'MEETING_TIME', participants: 'PARTICIPANTS' },
            };
            const result = validateSolumMappingConfig(config, availableFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('does not exist') })
            );
        });

        it('should reject empty fields mapping', () => {
            const config: Partial<SolumMappingConfig> = {
                uniqueIdField: 'ITEM_NAME',
                fields: {},
                conferenceMapping: { meetingName: 'MEETING_NAME', meetingTime: 'MEETING_TIME', participants: 'PARTICIPANTS' },
            };
            const result = validateSolumMappingConfig(config, availableFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('At least one field') })
            );
        });

        it('should reject field with missing English name', () => {
            const config: Partial<SolumMappingConfig> = {
                uniqueIdField: 'ITEM_NAME',
                fields: { ITEM_NAME: { friendlyNameEn: '', friendlyNameHe: 'שם', visible: true } },
                conferenceMapping: { meetingName: 'MEETING_NAME', meetingTime: 'MEETING_TIME', participants: 'PARTICIPANTS' },
            };
            const result = validateSolumMappingConfig(config, availableFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('English name') })
            );
        });

        it('should reject field with missing Hebrew name', () => {
            const config: Partial<SolumMappingConfig> = {
                uniqueIdField: 'ITEM_NAME',
                fields: { ITEM_NAME: { friendlyNameEn: 'Name', friendlyNameHe: '', visible: true } },
                conferenceMapping: { meetingName: 'MEETING_NAME', meetingTime: 'MEETING_TIME', participants: 'PARTICIPANTS' },
            };
            const result = validateSolumMappingConfig(config, availableFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('Hebrew name') })
            );
        });

        it('should validate conference mapping fields', () => {
            const config: Partial<SolumMappingConfig> = {
                uniqueIdField: 'ITEM_NAME',
                fields: { ITEM_NAME: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true } },
                conferenceMapping: { meetingName: '', meetingTime: 'MEETING_TIME', participants: 'PARTICIPANTS' },
            };
            const result = validateSolumMappingConfig(config, availableFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'conferenceMapping.meetingName' })
            );
        });

        it('should reject invalid conference field references', () => {
            const config: Partial<SolumMappingConfig> = {
                uniqueIdField: 'ITEM_NAME',
                fields: { ITEM_NAME: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true } },
                conferenceMapping: { meetingName: 'INVALID', meetingTime: 'MEETING_TIME', participants: 'PARTICIPANTS' },
            };
            const result = validateSolumMappingConfig(config, availableFields);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('does not exist') })
            );
        });

        it('should accept valid config without conference mapping', () => {
            const config: Partial<SolumMappingConfig> = {
                uniqueIdField: 'ITEM_NAME',
                fields: { ITEM_NAME: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true } },
            };
            const result = validateSolumMappingConfig(config, availableFields);
            expect(result.valid).toBe(true);
        });

        it('should accept valid complete config', () => {
            const config: Partial<SolumMappingConfig> = {
                uniqueIdField: 'ITEM_NAME',
                fields: {
                    ITEM_NAME: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true },
                    RANK: { friendlyNameEn: 'Rank', friendlyNameHe: 'דרגה', visible: true },
                },
                conferenceMapping: { meetingName: 'MEETING_NAME', meetingTime: 'MEETING_TIME', participants: 'PARTICIPANTS' },
            };
            const result = validateSolumMappingConfig(config, availableFields);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});
