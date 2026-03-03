/**
 * Hook for AIMS Overview — fetches store summary, label/gateway status, and label models
 */

import { useCallback } from 'react';
import { useAimsManagementStore } from '../infrastructure/aimsManagementStore';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

const STALE_TIME = 60_000; // 60 seconds

export function useAimsOverview(storeId: string | null) {
    const {
        storeSummary, labelModels,
        overviewLoading, overviewError,
        setStoreSummary, setLabelModels,
        setOverviewLoading, setOverviewError, setOverviewLastFetched,
    } = useAimsManagementStore();

    const fetchOverview = useCallback(async (force = false) => {
        if (!storeId) return;
        const { overviewLastFetched } = useAimsManagementStore.getState();
        if (!force && overviewLastFetched && Date.now() - overviewLastFetched < STALE_TIME) return;

        setOverviewLoading(true);
        setOverviewError(null);
        try {
            // Store summary is the primary data source — it contains gateway counts,
            // label counts, battery health, signal distribution, and update progress.
            // Gateway status summary is NOT a store-level endpoint (requires per-gateway MAC).
            const [storeSummaryResult, labelModelsResult] = await Promise.allSettled([
                aimsService.fetchStoreSummary(storeId),
                aimsService.fetchLabelModels(storeId),
            ]);
            if (storeSummaryResult.status === 'fulfilled') setStoreSummary(storeSummaryResult.value);
            if (labelModelsResult.status === 'fulfilled') setLabelModels(Array.isArray(labelModelsResult.value) ? labelModelsResult.value : []);
            setOverviewLastFetched(Date.now());

            // Report partial failures as warnings, not blocking errors
            const failures = [storeSummaryResult, labelModelsResult]
                .filter((r): r is PromiseRejectedResult => r.status === 'rejected');
            if (failures.length > 0 && failures.length < 2) {
                failures.forEach(f => logger.warn('useAimsOverview', 'Partial overview fetch failed', { error: f.reason?.message }));
            } else if (failures.length === 2) {
                setOverviewError(failures[0].reason?.message || 'Failed to load overview');
            }
        } catch (error: any) {
            logger.error('useAimsOverview', 'Failed to fetch overview', { error: error.message });
            setOverviewError(error.message || 'Failed to load overview');
        } finally {
            setOverviewLoading(false);
        }
    }, [storeId, setStoreSummary, setLabelModels, setOverviewLoading, setOverviewError, setOverviewLastFetched]);

    return {
        storeSummary, labelModels,
        overviewLoading, overviewError, fetchOverview,
    };
}
