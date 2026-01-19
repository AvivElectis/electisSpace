import { useCallback } from 'react';
import { useSettingsStore } from '../infrastructure/settingsStore';
import { validatePassword, validateLogoFile, validateSettings } from '../domain/validation';
import {
    exportSettings,
    importSettings,
    fileToBase64,
    hashSettingsPassword,
    verifySettingsPassword,
    sanitizeSettings
} from '../domain/businessRules';
import { login, refreshToken as refreshSolumToken, getStoreSummary } from '@shared/infrastructure/services/solumService';
import type { SettingsData, ExportedSettings } from '../domain/types';
import { logger } from '@shared/infrastructure/services/logger';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { usePeopleStore } from '@features/people/infrastructure/peopleStore';
import { useConferenceStore } from '@features/conference/infrastructure/conferenceStore';

/**
 * Admin password for emergency access to settings
 * This password always works to unlock settings, even if user forgets their password
 * Loaded from environment variable for security
 */
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

/**
 * Helper function to clear all data stores
 * Called on disconnect or mode switch
 */
function clearAllDataStores(): void {
    try {
        logger.info('Settings', 'Clearing all data stores...');

        useSpacesStore.getState().clearAllData();
        logger.info('Settings', 'Spaces store cleared');

        usePeopleStore.getState().clearAllData();
        logger.info('Settings', 'People store cleared');

        useConferenceStore.getState().clearAllData();
        logger.info('Settings', 'Conference store cleared');

        logger.info('Settings', 'All data stores cleared successfully');
    } catch (error) {
        logger.error('Settings', 'Failed to clear data stores', { error });
        throw error;
    }
}

/**
 * Settings Controller Hook
 * Main orchestration for settings management
 */

export function useSettingsController() {
    const {
        settings,
        passwordHash,
        isLocked,
        setSettings,
        updateSettings: updateInStore,
        setPasswordHash,
        setLocked,
        updateLogo,
        deleteLogo,
        resetSettings,
    } = useSettingsStore();

    /**
     * Check if password protection is enabled
     */
    const isPasswordProtected = useCallback((): boolean => {
        return passwordHash !== null;
    }, [passwordHash]);

    /**
     * Set settings password
     */
    const setPassword = useCallback(
        (password: string): void => {
            logger.info('SettingsController', 'Setting password');

            // Validate password
            const validation = validatePassword(password);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                logger.error('SettingsController', 'Password validation failed', { errors: validation.errors });
                throw new Error(`Validation failed: ${errorMsg}`);
            }

            // Hash and store
            const hash = hashSettingsPassword(password);
            setPasswordHash(hash);
            setLocked(false);

            logger.info('SettingsController', 'Password set successfully');
        },
        [setPasswordHash, setLocked]
    );

    /**
     * Remove settings password
     */
    const removePassword = useCallback(
        (currentPassword: string): void => {
            logger.info('SettingsController', 'Removing password');

            if (!passwordHash) {
                throw new Error('No password is set');
            }

            // Verify current password
            if (!verifySettingsPassword(currentPassword, passwordHash)) {
                throw new Error('Incorrect password');
            }

            setPasswordHash(null);
            setLocked(false);

            logger.info('SettingsController', 'Password removed successfully');
        },
        [passwordHash, setPasswordHash, setLocked]
    );

    /**
     * Unlock settings with password
     * Checks admin password first for emergency access, then user password
     */
    const unlock = useCallback(
        (password: string): boolean => {
            logger.info('SettingsController', 'Attempting to unlock settings');

            // Check admin password first (emergency access)
            if (password === ADMIN_PASSWORD) {
                setLocked(false);
                logger.info('SettingsController', 'Settings unlocked with admin password (emergency access)');
                return true;
            }

            // If no user password is set, unlock by default
            if (!passwordHash) {
                logger.warn('SettingsController', 'No password set, unlocking by default');
                setLocked(false);
                return true;
            }

            // Check user password
            const isValid = verifySettingsPassword(password, passwordHash);
            if (isValid) {
                setLocked(false);
                logger.info('SettingsController', 'Settings unlocked successfully');
            } else {
                logger.warn('SettingsController', 'Incorrect password');
            }

            return isValid;
        },
        [passwordHash, setLocked]
    );

    /**
     * Lock settings
     */
    const lock = useCallback((): void => {
        logger.info('SettingsController', 'Locking settings');
        setLocked(true);
    }, [setLocked]);

    /**
     * Update settings
     */
    const updateSettings = useCallback(
        (updates: Partial<SettingsData>): void => {
            logger.info('SettingsController', 'Updating settings');

            // Merge with current settings for validation
            const updatedSettings = { ...settings, ...updates };

            // Validate
            const validation = validateSettings(updatedSettings);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                logger.error('SettingsController', 'Settings validation failed', { errors: validation.errors });
                throw new Error(`Validation failed: ${errorMsg}`);
            }

            updateInStore(updates);
            logger.info('SettingsController', 'Settings updated successfully');
        },
        [settings, updateInStore]
    );

    /**
     * Upload logo
     */
    const uploadLogo = useCallback(
        async (file: File, logoIndex: 1 | 2): Promise<void> => {
            logger.info('SettingsController', 'Uploading logo', { logoIndex });

            // Validate file
            const validation = validateLogoFile(file, logoIndex);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                logger.error('SettingsController', 'Logo validation failed', { errors: validation.errors });
                throw new Error(`Validation failed: ${errorMsg}`);
            }

            // Convert to base64
            const base64 = await fileToBase64(file);
            updateLogo(logoIndex, base64);

            logger.info('SettingsController', 'Logo uploaded successfully', { logoIndex });
        },
        [updateLogo]
    );

    /**
     * Remove logo
     */
    const removeLogo = useCallback(
        (logoIndex: 1 | 2): void => {
            logger.info('SettingsController', 'Removing logo', { logoIndex });
            deleteLogo(logoIndex);
        },
        [deleteLogo]
    );

    /**
     * Export settings to file
     */
    const exportSettingsToFile = useCallback(
        (password?: string): ExportedSettings => {
            logger.info('SettingsController', 'Exporting settings');

            // Validate password if provided
            if (password) {
                const validation = validatePassword(password);
                if (!validation.valid) {
                    const errorMsg = validation.errors.map(e => e.message).join(', ');
                    throw new Error(`Validation failed: ${errorMsg}`);
                }
            }

            const exported = exportSettings(settings, password);
            logger.info('SettingsController', 'Settings exported successfully');

            return exported;
        },
        [settings]
    );

    /**
     * Import settings from file
     */
    const importSettingsFromFile = useCallback(
        (exported: ExportedSettings, password?: string): void => {
            logger.info('SettingsController', 'Importing settings');

            try {
                const importedSettings = importSettings(exported, password);

                // Validate imported settings
                const validation = validateSettings(importedSettings);
                if (!validation.valid) {
                    throw new Error('Imported settings are invalid');
                }

                setSettings(importedSettings);
                logger.info('SettingsController', 'Settings imported successfully');
            } catch (error) {
                logger.error('SettingsController', 'Import failed', { error });
                throw error;
            }
        },
        [setSettings]
    );

    /**
     * Get sanitized settings (without credentials)
     */
    const getSanitizedSettings = useCallback((): Partial<SettingsData> => {
        return sanitizeSettings(settings);
    }, [settings]);

    /**
     * Reset to default settings
     */
    const resetToDefaults = useCallback((): void => {
        logger.info('SettingsController', 'Resetting to defaults');
        resetSettings();
    }, [resetSettings]);

    /**
     * Connect to SoluM API
     * Authenticates and stores tokens
     */
    const connectToSolum = useCallback(async (): Promise<boolean> => {
        logger.info('SettingsController', 'Connecting to SoluM API');

        if (!settings.solumConfig) {
            throw new Error('SoluM configuration is required');
        }

        try {
            // Step 1: Authenticate with SoluM API
            const tokens = await login(settings.solumConfig);

            // Step 2: Verify connection and get store data
            const storeSummary = await getStoreSummary(
                settings.solumConfig,
                settings.solumConfig.storeNumber,
                tokens.accessToken
            );

            // Step 3: Store tokens and connection state with store data
            updateInStore({
                solumConfig: {
                    ...settings.solumConfig,
                    tokens,
                    isConnected: true,
                    lastConnected: Date.now(),
                    lastRefreshed: Date.now(),
                    storeSummary, // Store the summary data
                },
            });

            logger.info('SettingsController', 'Connected to SoluM API successfully', {
                store: settings.solumConfig.storeNumber,
                labelCount: storeSummary.labelCount,
                articleCount: storeSummary.articleCount
            });
            return true;
        } catch (error: any) {
            // console.error('[Connection Error]', {
            //     message: error.message,
            //     response: error.response?.data,
            //     status: error.response?.status
            // });
            logger.error('SettingsController', 'Failed to connect to SoluM API', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                stack: error.stack
            });
            throw error;
        }
    }, [settings.solumConfig, updateInStore]);

    /**
     * Disconnect from SoluM API
     * Clears tokens, connection state, and all data stores
     */
    const disconnectFromSolum = useCallback(async (): Promise<void> => {
        logger.info('Settings', 'Disconnecting from SoluM API');

        if (!settings.solumConfig) {
            return;
        }

        // Clear all data stores using async helper to avoid circular dependencies
        await clearAllDataStores();

        updateInStore({
            solumConfig: {
                ...settings.solumConfig,
                tokens: undefined,
                isConnected: false,
                lastConnected: undefined,
                lastRefreshed: undefined,
            },
        });

        logger.info('Settings', 'Disconnected from SoluM API');
    }, [settings.solumConfig, updateInStore]);

    /**
     * Refresh SoluM tokens manually
     */
    const refreshSolumTokens = useCallback(async (): Promise<void> => {
        logger.info('SettingsController', 'Manually refreshing SoluM tokens');

        if (!settings.solumConfig?.tokens) {
            throw new Error('No active tokens to refresh');
        }

        try {
            const newTokens = await refreshSolumToken(
                settings.solumConfig,
                settings.solumConfig.tokens.refreshToken
            );

            updateInStore({
                solumConfig: {
                    ...settings.solumConfig,
                    tokens: newTokens,
                    lastRefreshed: Date.now(),
                },
            });

            logger.info('SettingsController', 'Tokens refreshed successfully');
        } catch (error) {
            logger.error('SettingsController', 'Failed to refresh tokens', error);

            // Disconnect on refresh failure
            disconnectFromSolum();
            throw error;
        }
    }, [settings.solumConfig, updateInStore, disconnectFromSolum]);

    return {
        // State
        settings,
        isLocked,
        isPasswordProtected: isPasswordProtected(),

        // Password management
        setPassword,
        removePassword,
        unlock,
        lock,

        // Settings management
        updateSettings,
        getSanitizedSettings,
        resetToDefaults,

        // Logo management
        uploadLogo,
        removeLogo,

        // Import/Export
        exportSettingsToFile,
        importSettingsFromFile,

        // SoluM API Connection
        connectToSolum,
        disconnectFromSolum,
        refreshSolumTokens,
    };
}
