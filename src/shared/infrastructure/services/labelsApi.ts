/**
 * Labels API Service
 *
 * Frontend service for label operations via backend.
 * Backend handles AIMS communication with company credentials.
 */

import { api } from './apiClient';
import type { LabelImagesDetail } from '@features/labels/domain/types';
import type { LabelTypeInfo } from '@features/labels/domain/imageTypes';

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

export interface LabelsResponse {
    data: AIMSLabel[];
    total: number;
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

    /**
     * Get label type/hardware info (dimensions, color type, etc.)
     */
    async getLabelTypeInfo(storeId: string, labelCode: string): Promise<{ data: LabelTypeInfo }> {
        const response = await api.get<{ data: LabelTypeInfo }>('/labels/type-info', {
            params: { storeId, labelCode },
        });
        return response.data;
    },

    /**
     * Get dithered preview of an image from AIMS
     */
    async getDitherPreview(
        storeId: string,
        labelCode: string,
        image: string,
        optAlgType?: number,
    ): Promise<{ data: any }> {
        const response = await api.post<{ data: any }>('/labels/dither-preview', {
            storeId,
            labelCode,
            image,
            optAlgType,
        });
        return response.data;
    },

    /**
     * Push an image to a label
     */
    async pushImage(
        storeId: string,
        labelCode: string,
        image: string,
        page = 1,
        frontPage = 1,
        dithering = true,
        optAlgType?: number,
    ): Promise<{ success: boolean; data: any }> {
        const response = await api.post<{ success: boolean; data: any }>('/labels/image-push', {
            storeId,
            labelCode,
            image,
            page,
            frontPage,
            dithering,
            optAlgType,
        });
        return response.data;
    },
};
