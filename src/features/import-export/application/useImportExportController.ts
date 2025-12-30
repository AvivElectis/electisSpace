/**
 * Import/Export Controller Hook
 * Main orchestration for import/export operations
 */

import { useCallback } from 'react';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { validateSettings } from '@features/settings/domain/validation';
import { exportSettings, importSettings, generateImportPreview } from '../domain/businessRules';
import { validateExportedData } from '../domain/validation';
import { ImportExportFileAdapter } from '../infrastructure/fileAdapter';
import type { ExportOptions, ImportPreview } from '../domain/types';
import { logger } from '@shared/infrastructure/services/logger';

export function useImportExportController() {
    const { settings, setSettings } = useSettingsStore();
    const fileAdapter = new ImportExportFileAdapter();

    /**
     * Export settings to file
     */
    const exportToFile = useCallback(async (options: ExportOptions): Promise<boolean> => {
        logger.info('ImportExport', 'Exporting settings', {
            includeCredentials: options.includeCredentials,
            encrypted: !!options.password
        });

        try {
            const exported = exportSettings(settings, options);
            const filePath = await fileAdapter.saveExport(exported);

            if (filePath) {
                logger.info('ImportExport', 'Export successful', { filePath });
                return true;
            }
            return false;
        } catch (error) {
            logger.error('ImportExport', 'Export failed', { error });
            throw error;
        }
    }, [settings]);

    /**
     * Import settings from file
     */
    const importFromFile = useCallback(async (password?: string): Promise<boolean> => {
        logger.info('ImportExport', 'Importing settings');

        try {
            const exported = await fileAdapter.loadImport();
            if (!exported) {
                return false; // User canceled
            }

            // Validate file structure
            const validation = validateExportedData(exported);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Import and validate settings
            const importedSettings = importSettings(exported, password);
            const settingsValidation = validateSettings(importedSettings);
            if (!settingsValidation.valid) {
                throw new Error('Imported settings are invalid');
            }

            setSettings(importedSettings);
            logger.info('ImportExport', 'Import successful');
            return true;
        } catch (error) {
            logger.error('ImportExport', 'Import failed', { error });
            throw error;
        }
    }, [setSettings]);

    /**
     * Get preview of import data
     */
    const getImportPreview = useCallback(async (password?: string): Promise<ImportPreview | null> => {
        try {
            const exported = await fileAdapter.loadImport();
            if (!exported) {
                return null;
            }

            // Validate file structure
            const validation = validateExportedData(exported);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            return generateImportPreview(exported, password);
        } catch (error) {
            logger.error('ImportExport', 'Preview failed', { error });
            throw error;
        }
    }, []);

    return {
        exportToFile,
        importFromFile,
        getImportPreview,
    };
}
