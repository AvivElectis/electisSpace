/**
 * Hook for product batch update history
 */

import { useCallback, useState } from 'react';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

export function useProductHistory(storeId: string | null) {
    const [batchHistory, setBatchHistory] = useState<any>(null);
    const [batchDetail, setBatchDetail] = useState<any>(null);
    const [batchErrors, setBatchErrors] = useState<any>(null);
    const [batchErrorsLoading, setBatchErrorsLoading] = useState(false);
    const [articleHistory, setArticleHistory] = useState<any>(null);
    const [articleHistoryLoading, setArticleHistoryLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBatchHistory = useCallback(async (params?: { page?: number; size?: number; fromDate?: string; toDate?: string }) => {
        if (!storeId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await aimsService.fetchBatchHistory(storeId, params);
            setBatchHistory(data);
        } catch (err: any) {
            logger.error('useProductHistory', 'Failed to fetch batch history', { error: err.message });
            setError(err.message || 'Failed to load batch history');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    const fetchBatchDetail = useCallback(async (batchName: string) => {
        if (!storeId) return;
        setLoading(true);
        try {
            const data = await aimsService.fetchBatchDetail(storeId, batchName);
            setBatchDetail(data);
        } catch (err: any) {
            logger.error('useProductHistory', 'Failed to fetch batch detail', { error: err.message });
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    const fetchBatchErrors = useCallback(async (batchId: string) => {
        if (!storeId) return;
        setBatchErrorsLoading(true);
        setBatchErrors(null);
        try {
            const data = await aimsService.fetchBatchErrors(storeId, batchId);
            setBatchErrors(data);
        } catch (err: any) {
            logger.error('useProductHistory', 'Failed to fetch batch errors', { error: err.message });
        } finally {
            setBatchErrorsLoading(false);
        }
    }, [storeId]);

    const fetchArticleHistory = useCallback(async (articleId: string, page = 0, size = 50) => {
        if (!storeId) return;
        setArticleHistoryLoading(true);
        setArticleHistory(null);
        try {
            const data = await aimsService.fetchArticleUpdateHistory(storeId, articleId, page, size);
            setArticleHistory(data);
        } catch (err: any) {
            logger.error('useProductHistory', 'Failed to fetch article history', { error: err.message });
        } finally {
            setArticleHistoryLoading(false);
        }
    }, [storeId]);

    return {
        batchHistory, batchDetail, loading, error,
        batchErrors, batchErrorsLoading,
        articleHistory, articleHistoryLoading,
        fetchBatchHistory, fetchBatchDetail, fetchBatchErrors, fetchArticleHistory,
    };
}
