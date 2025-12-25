/**
 * Configuration Controller
 * 
 * Application layer controller for managing:
 * - SoluM Article Format (SoluM mode)
 * - CSV Structure (SFTP mode)
 */

import { useCallback } from 'react';
import { useNotifications } from '@shared/infrastructure/store/rootStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { SolumSchemaAdapter } from '../infrastructure/solumSchemaAdapter';
import { validateArticleFormat, validateCSVStructure } from '../domain/validation';
import type { ArticleFormat, CSVColumn, FieldMapping } from '../domain/types';

/**
 * Configuration management controller hook
 * 
 * Provides operations for fetching, validating, and saving:
 * - SoluM Article Format schemas
 * - SFTP CSV structure configurations
 */
export function useConfigurationController() {
    const { showSuccess, showError } = useNotifications();
    const settings = useSettingsStore((state) => state.settings);
    const updateSettings = useSettingsStore((state) => state.updateSettings);

    // ==========================================
    // SoluM Article Format Operations
    // ==========================================

    /**
     * Fetch article format schema from SoluM API
     * Updates settings.solumArticleFormat on success
     */
    const fetchArticleFormat = useCallback(async () => {
        if (!settings.solumConfig) {
            showError('SoluM configuration is required');
            return null;
        }

        try {
            const schema = await SolumSchemaAdapter.fetchSchema(settings.solumConfig);

            // Persist to settings and clear mappings (new schema, old mappings invalid)
            updateSettings({
                solumArticleFormat: schema,
                solumMappingConfig: undefined // Clear field mappings when schema changes
            });

            showSuccess('Article format fetched successfully');
            return schema;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            showError(`Failed to fetch schema: ${errorMessage}`);
            throw error;
        }
    }, [settings.solumConfig, updateSettings, showSuccess, showError]);

    /**
     * Save article format schema to SoluM API
     * Validates before saving
     */
    const saveArticleFormat = useCallback(async (schema: ArticleFormat) => {
        // Validate schema
        const validation = validateArticleFormat(schema);
        if (!validation.valid) {
            showError(`Validation failed: ${validation.errors.join(', ')}`);
            return false;
        }

        if (!settings.solumConfig) {
            showError('SoluM configuration is required');
            return false;
        }

        try {
            await SolumSchemaAdapter.updateSchema(settings.solumConfig, schema);

            // Update local settings and clear mapping config (schema changed, old mappings invalid)
            updateSettings({
                solumArticleFormat: schema,
                solumMappingConfig: undefined // Clear field mappings when schema changes
            });

            showSuccess('Article format saved successfully');
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            showError(`Failed to save schema: ${errorMessage}`);
            return false;
        }
    }, [settings.solumConfig, updateSettings, showSuccess, showError]);

    // ==========================================
    // CSV Structure Operations (SFTP Mode)
    // ==========================================

    /**
     * Save CSV structure configuration
     * Validates and updates sftpCsvConfig
     */
    const saveCSVStructure = useCallback((columns: CSVColumn[]) => {
        // Validate structure
        const validation = validateCSVStructure(columns);
        if (!validation.valid) {
            showError(`Validation failed: ${validation.errors.join(', ')}`);
            return false;
        }

        // Build field mapping from columns
        const mapping: FieldMapping = {};
        columns.forEach(col => {
            mapping[col.aimsValue] = col.index;
        });

        // Update SFTP CSV config
        updateSettings({
            sftpCsvConfig: {
                delimiter: settings.sftpCsvConfig?.delimiter || ',',
                columns,
                mapping,
                conferenceEnabled: settings.sftpCsvConfig?.conferenceEnabled || false,
            }
        });

        showSuccess('CSV structure saved successfully');
        return true;
    }, [settings.sftpCsvConfig, updateSettings, showSuccess, showError]);

    /**
     * Update CSV delimiter
     */
    const updateCSVDelimiter = useCallback((delimiter: string) => {
        if (!delimiter || delimiter.length === 0) {
            showError('Delimiter cannot be empty');
            return false;
        }

        updateSettings({
            sftpCsvConfig: {
                delimiter,
                columns: settings.sftpCsvConfig?.columns || [],
                mapping: settings.sftpCsvConfig?.mapping || {},
                conferenceEnabled: settings.sftpCsvConfig?.conferenceEnabled || false,
            }
        });

        showSuccess('Delimiter updated');
        return true;
    }, [settings.sftpCsvConfig, updateSettings, showSuccess, showError]);

    /**
     * Toggle conference enabled in CSV config
     */
    const toggleConferenceEnabled = useCallback((enabled: boolean) => {
        updateSettings({
            sftpCsvConfig: {
                delimiter: settings.sftpCsvConfig?.delimiter || ',',
                columns: settings.sftpCsvConfig?.columns || [],
                mapping: settings.sftpCsvConfig?.mapping || {},
                conferenceEnabled: enabled,
            }
        });

        showSuccess(enabled ? 'Conference mode enabled' : 'Conference mode disabled');
    }, [settings.sftpCsvConfig, updateSettings, showSuccess]);

    // ==========================================
    // Return API
    // ==========================================

    return {
        // SoluM Article Format
        articleFormat: settings.solumArticleFormat || null,
        fetchArticleFormat,
        saveArticleFormat,

        // CSV Structure
        csvColumns: settings.sftpCsvConfig?.columns || [],
        csvDelimiter: settings.sftpCsvConfig?.delimiter || ',',
        conferenceEnabled: settings.sftpCsvConfig?.conferenceEnabled || false,
        saveCSVStructure,
        updateCSVDelimiter,
        toggleConferenceEnabled,
    };
}
