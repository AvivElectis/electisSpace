/**
 * Hook for label status history
 */

import { useCallback, useState } from 'react';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

export function useLabelHistory(storeId: string | null) {
    const [history, setHistory] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async (labelCode: string, page = 0, size = 50) => {
        if (!storeId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await aimsService.fetchLabelStatusHistory(storeId, labelCode, page, size);
            setHistory(data);
        } catch (err: any) {
            logger.error('useLabelHistory', 'Failed to fetch label history', { error: err.message });
            setError(err.message || 'Failed to load label history');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    return { history, loading, error, fetchHistory };
}
