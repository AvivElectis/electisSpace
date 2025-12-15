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
import type { SettingsData, ExportedSettings } from '../domain/types';
import { logger } from '@shared/infrastructure/services/logger';

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
     */
    const unlock = useCallback(
        (password: string): boolean => {
            logger.info('SettingsController', 'Attempting to unlock settings');

            if (!passwordHash) {
                logger.warn('SettingsController', 'No password set, unlocking by default');
                setLocked(false);
                return true;
            }

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
        (password: string): ExportedSettings => {
            logger.info('SettingsController', 'Exporting settings');

            // Validate password
            const validation = validatePassword(password);
            if (!validation.valid) {
                const errorMsg = validation.errors.map(e => e.message).join(', ');
                throw new Error(`Validation failed: ${errorMsg}`);
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
        (exported: ExportedSettings, password: string): void => {
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
    };
}
