/**
 * Hook for paginated article update history (all articles)
 */

import { useCallback, useState } from 'react';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

export function useArticleUpdatesHistory(storeId: string | null) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async (page = 0, size = 50) => {
        if (!storeId) return;
        setLoading(true);
        setError(null);
        try {
            const result = await aimsService.fetchArticleUpdateHistoryAll(storeId, { page, size });
            setData(result);
        } catch (err: any) {
            logger.error('useArticleUpdatesHistory', 'Failed to fetch article updates', { error: err.message });
            setError(err.message || 'Failed to load article update history');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    return { data, loading, error, fetchAll };
}
