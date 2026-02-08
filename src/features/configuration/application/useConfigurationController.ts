/**
 * Configuration Controller
 * 
 * Application layer controller for managing:
 * - SoluM Article Format (SoluM mode)
 * 
 * All article format operations go through the server API,
 * which stores the format in the Company DB record as the single source of truth.
 */

import { useCallback } from 'react';
import { useNotifications } from '@shared/infrastructure/store/rootStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { fieldMappingService } from '@shared/infrastructure/services/fieldMappingService';
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
    const activeCompanyId = useSettingsStore((state) => state.activeCompanyId);

    // ==========================================
    // SoluM Article Format Operations
    // ==========================================

    /**
     * Fetch article format via server API (server is the source of truth).
     * Server returns from DB if stored, or fetches from AIMS and saves first.
     * Updates settings.solumArticleFormat on success.
     */
    const fetchArticleFormat = useCallback(async () => {
        if (!activeCompanyId) {
            showError('No active company selected');
            return null;
        }

        try {
            const response = await fieldMappingService.getArticleFormat(activeCompanyId);
            const schema = response.articleFormat;

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
                uniqueIdField: schema.mappingInfo?.articleId || settings.solumMappingConfig?.uniqueIdField || schema.articleData?.[0] || 'articleId',
                fields: defaultFields,
                conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                    meetingName: '',
                    meetingTime: '',
                    participants: '',
                },
                globalFieldAssignments: settings.solumMappingConfig?.globalFieldAssignments,
            };

            updateSettings({
                solumArticleFormat: schema,
                solumMappingConfig: updatedMappingConfig as any
            });

            const sourceLabel = response.source === 'db' ? '(from server)' : '(fetched from AIMS)';
            showSuccess(`Article format loaded successfully ${sourceLabel}`);
            return schema;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            showError(`Failed to fetch schema: ${errorMessage}`);
            throw error;
        }
    }, [activeCompanyId, settings.solumMappingConfig, updateSettings, showSuccess, showError]);

    /**
     * Save article format via server API.
     * Server saves to DB (source of truth) and pushes to AIMS.
     */
    const saveArticleFormat = useCallback(async (schema: ArticleFormat) => {
        // Validate schema
        const validation = validateArticleFormat(schema);
        if (!validation.valid) {
            showError(`Validation failed: ${validation.errors.join(', ')}`);
            return false;
        }

        if (!activeCompanyId) {
            showError('No active company selected');
            return false;
        }

        try {
            await fieldMappingService.updateArticleFormat(activeCompanyId, schema);

            // Update local settings with schema and extracted mappingInfo
            updateSettings({
                solumArticleFormat: schema,
                solumMappingConfig: {
                    ...settings.solumMappingConfig,
                    mappingInfo: schema.mappingInfo,
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
    }, [activeCompanyId, settings.solumMappingConfig, updateSettings, showSuccess, showError]);

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
