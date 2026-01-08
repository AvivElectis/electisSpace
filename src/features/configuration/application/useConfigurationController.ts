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

            // console.log('[DEBUG fetchArticleFormat] schema.mappingInfo:', schema.mappingInfo);
            // console.log('[DEBUG fetchArticleFormat] Current solumMappingConfig:', settings.solumMappingConfig);

            // Clear existing mapping config when fetching new schema
            // This ensures users reconfigure field mappings after schema changes
            // settingsController.updateSettings({ solumMappingConfig: undefined }); // This line refers to settingsController which is not defined in this scope. Assuming it should be `updateSettings`
            updateSettings({ solumMappingConfig: undefined });


            // Persist schema and extract mappingInfo to solumMappingConfig
            const updatedMappingConfig = {
                ...(settings.solumMappingConfig || {}),
                mappingInfo: schema.mappingInfo,
                // Automatically sync uniqueIdField with articleId from mappingInfo if it exists
                uniqueIdField: schema.mappingInfo?.articleId || settings.solumMappingConfig?.uniqueIdField || schema.articleData?.[0] || 'articleId'
            };

            updateSettings({
                solumArticleFormat: schema,
                solumMappingConfig: updatedMappingConfig as any
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

            // Update local settings with schema and extracted mappingInfo
            updateSettings({
                solumArticleFormat: schema,
                solumMappingConfig: {
                    ...settings.solumMappingConfig,
                    mappingInfo: schema.mappingInfo, // Extract mappingInfo from schema
                    // Keep uniqueIdField in sync if it was mapped
                    uniqueIdField: schema.mappingInfo?.articleId || settings.solumMappingConfig?.uniqueIdField || 'articleId'
                } as any
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

        // Update SFTP CSV config
        updateSettings({
            sftpCsvConfig: {
                hasHeader: settings.sftpCsvConfig?.hasHeader ?? true,
                delimiter: settings.sftpCsvConfig?.delimiter || ',',
                columns: columns.map((col, idx) => ({
                    fieldName: col.aimsValue,
                    csvColumn: col.index,
                    friendlyName: col.headerEn || col.aimsValue,
                    required: col.mandatory ?? false,
                })),
                idColumn: settings.sftpCsvConfig?.idColumn || 'id',
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
                hasHeader: settings.sftpCsvConfig?.hasHeader ?? true,
                delimiter,
                columns: settings.sftpCsvConfig?.columns || [],
                idColumn: settings.sftpCsvConfig?.idColumn || 'id',
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
                hasHeader: settings.sftpCsvConfig?.hasHeader ?? true,
                delimiter: settings.sftpCsvConfig?.delimiter || ',',
                columns: settings.sftpCsvConfig?.columns || [],
                idColumn: settings.sftpCsvConfig?.idColumn || 'id',
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
