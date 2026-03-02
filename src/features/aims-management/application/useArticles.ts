/**
 * Hook for article list, detail, and update history fetching
 */

import { useCallback } from 'react';
import { useAimsManagementStore } from '../infrastructure/aimsManagementStore';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

const STALE_TIME = 30_000; // 30 seconds

export function useArticles(storeId: string | null) {
    const {
        articles, articlesLoading, articlesError,
        articlesTotalElements, articlesTotalPages,
        selectedArticle, articleHistory,
        setArticles, setArticlesLoading, setArticlesError,
        setArticlesLastFetched, setArticlesTotalElements, setArticlesTotalPages,
        setSelectedArticle, setArticleHistory,
    } = useAimsManagementStore();

    const fetchArticles = useCallback(async (params: { page?: number; size?: number } = {}, force = false) => {
        if (!storeId) return;
        const { articlesLastFetched } = useAimsManagementStore.getState();
        if (!force && articlesLastFetched && Date.now() - articlesLastFetched < STALE_TIME) return;

        setArticlesLoading(true);
        setArticlesError(null);
        try {
            const result = await aimsService.fetchArticleList(storeId, params);
            // AIMS may return array directly or paginated object
            if (Array.isArray(result)) {
                setArticles(result);
                setArticlesTotalElements(result.length);
                setArticlesTotalPages(1);
            } else {
                setArticles(result?.content || result?.articleList || []);
                setArticlesTotalElements(result?.totalElements ?? 0);
                setArticlesTotalPages(result?.totalPages ?? 0);
            }
            setArticlesLastFetched(Date.now());
        } catch (error: any) {
            logger.error('useArticles', 'Failed to fetch articles', { error: error.message });
            setArticlesError(error.message || 'Failed to load articles');
        } finally {
            setArticlesLoading(false);
        }
    }, [storeId, setArticles, setArticlesLoading, setArticlesError, setArticlesLastFetched, setArticlesTotalElements, setArticlesTotalPages]);

    const fetchArticleDetail = useCallback(async (articleId: string) => {
        if (!storeId) return;
        try {
            const detail = await aimsService.fetchArticleById(storeId, articleId);
            setSelectedArticle(detail);
        } catch (error: any) {
            logger.error('useArticles', 'Failed to fetch article detail', { error: error.message });
        }
    }, [storeId, setSelectedArticle]);

    const fetchArticleHistory = useCallback(async (articleId: string, page = 0) => {
        if (!storeId) return;
        try {
            const history = await aimsService.fetchArticleUpdateHistoryDetail(storeId, articleId, { page, size: 50 });
            setArticleHistory(history);
        } catch (error: any) {
            logger.error('useArticles', 'Failed to fetch article history', { error: error.message });
        }
    }, [storeId, setArticleHistory]);

    return {
        articles,
        articlesLoading,
        articlesError,
        articlesTotalElements,
        articlesTotalPages,
        selectedArticle,
        articleHistory,
        fetchArticles,
        fetchArticleDetail,
        fetchArticleHistory,
    };
}
