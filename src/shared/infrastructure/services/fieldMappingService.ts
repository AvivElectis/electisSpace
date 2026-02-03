/**
 * Field Mapping Service
 * 
 * API service for managing field mappings stored on the server.
 * Field mappings define how AIMS article fields are displayed in the app.
 * All AIMS configuration including field mappings are stored at the Company level.
 */

import { api } from './apiClient';
import type { SolumMappingConfig, SolumFieldMapping } from '@features/settings/domain/types';

export interface FieldMappingResponse {
    companyId: string;
    fieldMappings: SolumMappingConfig;
}

export interface AimsConfigResponse {
    companyId: string;
    aimsConfig: {
        configured: boolean;
        baseUrl: string | null;
        cluster: string | null;
        username: string | null;
        hasPassword: boolean;
    };
}

export interface AimsTestResponse {
    success: boolean;
    message: string;
    configured: boolean;
}

export const fieldMappingService = {
    /**
     * Get field mappings for a company
     */
    async getFieldMappings(companyId: string): Promise<FieldMappingResponse> {
        const response = await api.get<FieldMappingResponse>(
            `/settings/company/${companyId}/field-mappings`
        );
        return response.data;
    },

    /**
     * Update field mappings for a company
     */
    async updateFieldMappings(
        companyId: string, 
        fieldMappings: SolumMappingConfig
    ): Promise<FieldMappingResponse> {
        const response = await api.put<FieldMappingResponse>(
            `/settings/company/${companyId}/field-mappings`,
            fieldMappings
        );
        return response.data;
    },

    /**
     * Update a single field's mapping
     */
    async updateSingleFieldMapping(
        companyId: string,
        fieldKey: string,
        mapping: SolumFieldMapping
    ): Promise<void> {
        // Get current mappings
        const current = await this.getFieldMappings(companyId);
        
        // Update the specific field
        const updated: SolumMappingConfig = {
            ...current.fieldMappings,
            fields: {
                ...current.fieldMappings.fields,
                [fieldKey]: mapping,
            },
        };
        
        await this.updateFieldMappings(companyId, updated);
    },

    /**
     * Get AIMS configuration status for a company
     */
    async getAimsConfig(companyId: string): Promise<AimsConfigResponse> {
        const response = await api.get<AimsConfigResponse>(
            `/settings/company/${companyId}/aims-config`
        );
        return response.data;
    },

    /**
     * Test AIMS connection for a company
     */
    async testAimsConnection(companyId: string): Promise<AimsTestResponse> {
        const response = await api.post<AimsTestResponse>(
            `/settings/company/${companyId}/aims-test`
        );
        return response.data;
    },
};

export default fieldMappingService;
