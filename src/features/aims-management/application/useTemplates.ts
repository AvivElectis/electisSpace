/**
 * Hook for template list, types, mappings, groups, and detail fetching
 */

import { useCallback } from 'react';
import { useAimsManagementStore } from '../infrastructure/aimsManagementStore';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

const STALE_TIME = 30_000; // 30 seconds

export function useTemplates(storeId: string | null) {
    const {
        templates, templatesLoading, templatesError,
        templatesTotalElements, templatesTotalPages,
        templateTypes, templateMappings, templateGroups,
        selectedTemplate,
        setTemplates, setTemplatesLoading, setTemplatesError,
        setTemplatesLastFetched, setTemplatesTotalElements, setTemplatesTotalPages,
        setTemplateTypes, setTemplateMappings, setTemplateGroups,
        setSelectedTemplate,
    } = useAimsManagementStore();

    const fetchTemplates = useCallback(async (params: { page?: number; size?: number } = {}, force = false) => {
        if (!storeId) return;
        const { templatesLastFetched } = useAimsManagementStore.getState();
        if (!force && templatesLastFetched && Date.now() - templatesLastFetched < STALE_TIME) return;

        setTemplatesLoading(true);
        setTemplatesError(null);
        try {
            const result = await aimsService.fetchTemplates(storeId, params);
            // AIMS may return array directly or paginated object
            if (Array.isArray(result)) {
                setTemplates(result);
                setTemplatesTotalElements(result.length);
                setTemplatesTotalPages(1);
            } else {
                setTemplates(result?.content || result?.templateList || []);
                setTemplatesTotalElements(result?.totalElements ?? 0);
                setTemplatesTotalPages(result?.totalPages ?? 0);
            }
            setTemplatesLastFetched(Date.now());
        } catch (error: any) {
            logger.error('useTemplates', 'Failed to fetch templates', { error: error.message });
            setTemplatesError(error.message || 'Failed to load templates');
        } finally {
            setTemplatesLoading(false);
        }
    }, [storeId, setTemplates, setTemplatesLoading, setTemplatesError, setTemplatesLastFetched, setTemplatesTotalElements, setTemplatesTotalPages]);

    const fetchTemplateDetail = useCallback(async (templateName: string) => {
        if (!storeId) return;
        try {
            const detail = await aimsService.fetchTemplateByName(storeId, templateName);
            setSelectedTemplate(detail);
        } catch (error: any) {
            logger.error('useTemplates', 'Failed to fetch template detail', { error: error.message });
        }
    }, [storeId, setSelectedTemplate]);

    const fetchTemplateTypes = useCallback(async () => {
        if (!storeId) return;
        try {
            const types = await aimsService.fetchTemplateTypes(storeId);
            setTemplateTypes(Array.isArray(types) ? types : types?.content || []);
        } catch (error: any) {
            logger.error('useTemplates', 'Failed to fetch template types', { error: error.message });
        }
    }, [storeId, setTemplateTypes]);

    const fetchTemplateMappings = useCallback(async () => {
        if (!storeId) return;
        try {
            const mappings = await aimsService.fetchTemplateMappings(storeId);
            setTemplateMappings(Array.isArray(mappings) ? mappings : mappings?.content || []);
        } catch (error: any) {
            logger.error('useTemplates', 'Failed to fetch template mappings', { error: error.message });
        }
    }, [storeId, setTemplateMappings]);

    const fetchTemplateGroups = useCallback(async () => {
        if (!storeId) return;
        try {
            const groups = await aimsService.fetchTemplateGroups(storeId);
            setTemplateGroups(Array.isArray(groups) ? groups : groups?.content || []);
        } catch (error: any) {
            logger.error('useTemplates', 'Failed to fetch template groups', { error: error.message });
        }
    }, [storeId, setTemplateGroups]);

    return {
        templates,
        templatesLoading,
        templatesError,
        templatesTotalElements,
        templatesTotalPages,
        templateTypes,
        templateMappings,
        templateGroups,
        selectedTemplate,
        fetchTemplates,
        fetchTemplateDetail,
        fetchTemplateTypes,
        fetchTemplateMappings,
        fetchTemplateGroups,
    };
}
