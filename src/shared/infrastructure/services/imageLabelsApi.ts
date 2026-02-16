/**
 * Image Labels API Service
 *
 * Frontend service for image label operations (type info, dither preview, image push).
 * Existing labels list + images endpoints are reused from labelsApi.
 */

import { api } from './apiClient';
import type { LabelTypeInfo } from '@features/imageLabels/domain/types';

export const imageLabelsApi = {
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
