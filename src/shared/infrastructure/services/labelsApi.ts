/**
 * Labels API Service
 *
 * Frontend service for label operations via backend.
 * Backend handles AIMS communication with company credentials.
 */

import { api } from './apiClient';
import type { LabelImagesDetail } from '@features/labels/domain/types';

// Label types from AIMS
export interface AIMSLabel {
    labelCode: string;
    articleId: string;
    articleName?: string;
    linkType?: string;
    status?: string;
    signalQuality?: string;
    battery?: string;
    lastUpdated?: string;
    model?: string;
    width?: number;
    height?: number;
}

export interface Label {
    id: string;
    storeId: string;
    code: string;
    macAddress?: string;
    type: string;
    width: number;
    height: number;
    status: 'AVAILABLE' | 'ASSIGNED' | 'OFFLINE';
    battery?: number;
    signal?: number;
    assignedToId?: string;
    assignedToType?: 'SPACE' | 'PERSON' | 'CONFERENCE_ROOM';
    lastSeen?: string;
    createdAt: string;
    updatedAt: string;
}

export interface LabelsResponse {
    data: AIMSLabel[];
    total: number;
}

export interface LabelResponse {
    data: Label;
}

export interface LabelImage {
    imageUrl?: string;
    base64?: string;
    page?: number;
    width?: number;
    height?: number;
}

// Query parameters
export interface ListLabelsParams {
    storeId: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: 'AVAILABLE' | 'ASSIGNED' | 'OFFLINE';
    type?: string;
}

// API functions
export const labelsApi = {
    /**
     * List labels from AIMS via server
     */
    async list(storeId: string): Promise<LabelsResponse> {
        const response = await api.get<LabelsResponse>('/labels', {
            params: { storeId },
        });
        return response.data;
    },

    /**
     * Get unassigned (available) labels
     */
    async getUnassigned(storeId: string): Promise<LabelsResponse> {
        const response = await api.get<LabelsResponse>('/labels/unassigned', {
            params: { storeId },
        });
        return response.data;
    },

    /**
     * Get label images
     */
    async getImages(storeId: string, labelCode: string): Promise<{ data: LabelImagesDetail }> {
        const response = await api.get<{ data: LabelImagesDetail }>(`/labels/${encodeURIComponent(labelCode)}/images`, {
            params: { storeId },
        });
        return response.data;
    },

    /**
     * Link a label to an article
     */
    async link(storeId: string, labelCode: string, articleId: string, templateName?: string): Promise<{ success: boolean; data: any }> {
        const response = await api.post<{ success: boolean; data: any }>('/labels/link', {
            storeId,
            labelCode,
            articleId,
            templateName,
        });
        return response.data;
    },

    /**
     * Unlink a label from its article
     */
    async unlink(storeId: string, labelCode: string): Promise<{ success: boolean; data: any }> {
        const response = await api.post<{ success: boolean; data: any }>('/labels/unlink', {
            storeId,
            labelCode,
        });
        return response.data;
    },

    /**
     * Blink/flash a label for identification
     */
    async blink(storeId: string, labelCode: string): Promise<{ success: boolean }> {
        const response = await api.post<{ success: boolean }>(`/labels/${encodeURIComponent(labelCode)}/blink`, {
            storeId,
        });
        return response.data;
    },

    /**
     * Check AIMS configuration status for a store
     */
    async getStatus(storeId: string): Promise<{ configured: boolean; connected: boolean }> {
        const response = await api.get<{ configured: boolean; connected: boolean }>('/labels/status', {
            params: { storeId },
        });
        return response.data;
    },

    /**
     * Get articles for linking labels
     */
    async getArticles(storeId: string): Promise<{ data: any[]; total: number }> {
        const response = await api.get<{ data: any[]; total: number }>('/labels/articles', {
            params: { storeId },
        });
        return response.data;
    },
};

export default labelsApi;
