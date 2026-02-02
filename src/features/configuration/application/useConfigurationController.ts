/**
 * Configuration Controller
 * 
 * Application layer controller for managing:
 * - SoluM Article Format (SoluM mode)
 */

import { useCallback } from 'react';
import { useNotifications } from '@shared/infrastructure/store/rootStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { SolumSchemaAdapter } from '../infrastructure/solumSchemaAdapter';
import { validateArticleFormat } from '../domain/validation';
import type { ArticleFormat } from '../domain/types';

/**
 * Configuration management controller hook
 * 
 * Provides operations for fetching, validating, and saving:
 * - SoluM Article Format schemas
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

            // Build default fields mapping from schema fields
            // All fields are visible by default with their key as the friendly name
            const defaultFields: { [key: string]: { friendlyNameEn: string; friendlyNameHe: string; visible: boolean } } = {};
            const allFields = schema.articleData || [];
            
            allFields.forEach(fieldKey => {
                // Use existing mapping if available, otherwise create default
                const existingMapping = settings.solumMappingConfig?.fields?.[fieldKey];
                defaultFields[fieldKey] = existingMapping || {
                    friendlyNameEn: fieldKey,
                    friendlyNameHe: fieldKey,
                    visible: true,
                };
            });

            // Persist schema and extract mappingInfo to solumMappingConfig
            const updatedMappingConfig = {
                mappingInfo: schema.mappingInfo,
                // Automatically sync uniqueIdField with articleId from mappingInfo if it exists
                uniqueIdField: schema.mappingInfo?.articleId || settings.solumMappingConfig?.uniqueIdField || schema.articleData?.[0] || 'articleId',
                // Populate fields with defaults
                fields: defaultFields,
                // Preserve conference mapping if exists
                conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                    meetingName: '',
                    meetingTime: '',
                    participants: '',
                },
                // Preserve global field assignments if exists
                globalFieldAssignments: settings.solumMappingConfig?.globalFieldAssignments,
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
    }, [settings.solumConfig, settings.solumMappingConfig, updateSettings, showSuccess, showError]);

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
    // ==========================================
    // Return API
    // ==========================================

    return {
        // SoluM Article Format
        articleFormat: settings.solumArticleFormat || null,
        fetchArticleFormat,
        saveArticleFormat,
    };
}
