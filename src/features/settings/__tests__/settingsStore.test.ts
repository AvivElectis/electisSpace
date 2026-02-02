/**
 * Settings Store Tests
 * 
 * Tests for the settings state management store including:
 * - Settings CRUD operations
 * - Password/security management
 * - Logo management
 * - Mode-specific credential cleanup
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../infrastructure/settingsStore';

describe('SettingsStore', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        const { resetSettings } = useSettingsStore.getState();
        resetSettings();
    });

    describe('Initial State', () => {
        it('should have default settings', () => {
            const { settings } = useSettingsStore.getState();

            expect(settings).toBeDefined();
            expect(settings.appName).toBe('electis Space');
            expect(settings.workingMode).toBe('SOLUM_API');
        });

        it('should have no password hash initially', () => {
            const { passwordHash } = useSettingsStore.getState();
            expect(passwordHash).toBeNull();
        });

        it('should be unlocked initially', () => {
            const { isLocked } = useSettingsStore.getState();
            expect(isLocked).toBe(false);
        });
    });

    describe('Settings Updates', () => {
        it('should set entire settings object', () => {
            const { setSettings, settings: originalSettings } = useSettingsStore.getState();

            const newSettings = {
                ...originalSettings,
                appName: 'Updated App',
                appSubtitle: 'New Subtitle',
            };

            setSettings(newSettings);

            const { settings } = useSettingsStore.getState();
            expect(settings.appName).toBe('Updated App');
            expect(settings.appSubtitle).toBe('New Subtitle');
        });

        it('should update partial settings', () => {
            const { updateSettings } = useSettingsStore.getState();

            updateSettings({ appName: 'Partial Update' });

            const { settings } = useSettingsStore.getState();
            expect(settings.appName).toBe('Partial Update');
            // Other settings should remain unchanged
            expect(settings.workingMode).toBe('SOLUM_API');
        });

        it('should update space type', () => {
            const { updateSettings } = useSettingsStore.getState();

            updateSettings({ spaceType: 'office' });

            const { settings } = useSettingsStore.getState();
            expect(settings.spaceType).toBe('office');
        });
    });

    describe('Password Management', () => {
        it('should set password hash', () => {
            const { setPasswordHash } = useSettingsStore.getState();

            setPasswordHash('hashed-password-123');

            const { passwordHash } = useSettingsStore.getState();
            expect(passwordHash).toBe('hashed-password-123');
        });

        it('should clear password hash', () => {
            const { setPasswordHash } = useSettingsStore.getState();

            setPasswordHash('some-hash');
            setPasswordHash(null);

            const { passwordHash } = useSettingsStore.getState();
            expect(passwordHash).toBeNull();
        });

        it('should lock the app', () => {
            const { setLocked } = useSettingsStore.getState();

            setLocked(true);

            const { isLocked } = useSettingsStore.getState();
            expect(isLocked).toBe(true);
        });

        it('should unlock the app', () => {
            const { setLocked } = useSettingsStore.getState();

            setLocked(true);
            setLocked(false);

            const { isLocked } = useSettingsStore.getState();
            expect(isLocked).toBe(false);
        });
    });

    describe('Logo Management', () => {
        it('should set logos', () => {
            const { setLogos } = useSettingsStore.getState();

            setLogos({
                logo1: 'data:image/png;base64,logo1data',
                logo2: 'data:image/png;base64,logo2data',
            });

            const { settings } = useSettingsStore.getState();
            expect(settings.logos?.logo1).toBe('data:image/png;base64,logo1data');
            expect(settings.logos?.logo2).toBe('data:image/png;base64,logo2data');
        });

        it('should update individual logo', () => {
            const { updateLogo } = useSettingsStore.getState();

            updateLogo(1, 'data:image/png;base64,newlogo1');

            const { settings } = useSettingsStore.getState();
            expect(settings.logos?.logo1).toBe('data:image/png;base64,newlogo1');
        });

        it('should delete individual logo', () => {
            const { setLogos, deleteLogo } = useSettingsStore.getState();

            setLogos({
                logo1: 'data:image/png;base64,logo1data',
                logo2: 'data:image/png;base64,logo2data',
            });

            deleteLogo(1);

            const { settings } = useSettingsStore.getState();
            expect(settings.logos?.logo1).toBeUndefined();
            expect(settings.logos?.logo2).toBe('data:image/png;base64,logo2data');
        });
    });

    describe('Reset Settings', () => {
        it('should reset all settings to defaults', () => {
            const { updateSettings, setPasswordHash, setLocked, resetSettings } = useSettingsStore.getState();

            // Make various changes
            updateSettings({ appName: 'Modified App' });
            setPasswordHash('some-hash');
            setLocked(true);

            // Reset
            resetSettings();

            const { settings, passwordHash, isLocked } = useSettingsStore.getState();
            expect(settings.appName).toBe('electis Space');
            expect(settings.workingMode).toBe('SOLUM_API');
            expect(passwordHash).toBeNull();
            expect(isLocked).toBe(false);
        });
    });

    describe('Credential Cleanup', () => {
        it('should clear SOLUM_API credentials', () => {
            const { updateSettings, clearModeCredentials } = useSettingsStore.getState();

            // Set SoluM config
            updateSettings({
                solumConfig: {
                    companyName: 'test',
                    username: 'user',
                    password: 'pass',
                    storeNumber: '01',
                    cluster: 'common',
                    baseUrl: 'https://eu.common.solumesl.com',
                    syncInterval: 60,
                    isConnected: true,
                },
            });

            // Clear SoluM mode credentials
            clearModeCredentials('SOLUM_API');

            const { settings } = useSettingsStore.getState();
            expect(settings.solumConfig).toBeUndefined();
            expect(settings.solumMappingConfig).toBeUndefined();
            expect(settings.solumArticleFormat).toBeUndefined();
        });

        it('should clear field mappings', () => {
            const { updateSettings, clearFieldMappings } = useSettingsStore.getState();

            // Set field mappings
            updateSettings({
                solumMappingConfig: {
                    uniqueIdField: 'ARTICLE_ID',
                    fields: {},
                    conferenceMapping: { meetingName: '', meetingTime: '', participants: '' },
                    mappingInfo: { articleId: 'ARTICLE_ID', store: '', articleName: '' },
                },
            });

            clearFieldMappings();

            const { settings } = useSettingsStore.getState();
            expect(settings.solumMappingConfig).toBeUndefined();
        });
    });
});
