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
        storeSummary, labelStatusSummary, gatewayStatusSummary, labelModels,
        overviewLoading, overviewError,
        setStoreSummary, setLabelStatusSummary, setGatewayStatusSummary, setLabelModels,
        setOverviewLoading, setOverviewError, setOverviewLastFetched,
    } = useAimsManagementStore();

    const fetchOverview = useCallback(async (force = false) => {
        if (!storeId) return;
        const { overviewLastFetched } = useAimsManagementStore.getState();
        if (!force && overviewLastFetched && Date.now() - overviewLastFetched < STALE_TIME) return;

        setOverviewLoading(true);
        setOverviewError(null);
        try {
            // Use allSettled so one failing endpoint doesn't block the rest
            const [storeSummaryResult, labelStatusResult, gatewayStatusResult, labelModelsResult] = await Promise.allSettled([
                aimsService.fetchStoreSummary(storeId),
                aimsService.fetchLabelStatusSummary(storeId),
                aimsService.fetchGatewayStatusSummary(storeId),
                aimsService.fetchLabelModels(storeId),
            ]);
            if (storeSummaryResult.status === 'fulfilled') setStoreSummary(storeSummaryResult.value);
            if (labelStatusResult.status === 'fulfilled') setLabelStatusSummary(labelStatusResult.value);
            if (gatewayStatusResult.status === 'fulfilled') setGatewayStatusSummary(gatewayStatusResult.value);
            if (labelModelsResult.status === 'fulfilled') setLabelModels(Array.isArray(labelModelsResult.value) ? labelModelsResult.value : []);
            setOverviewLastFetched(Date.now());

            // Report partial failures as warnings, not blocking errors
            const failures = [storeSummaryResult, labelStatusResult, gatewayStatusResult, labelModelsResult]
                .filter((r): r is PromiseRejectedResult => r.status === 'rejected');
            if (failures.length > 0 && failures.length < 4) {
                failures.forEach(f => logger.warn('useAimsOverview', 'Partial overview fetch failed', { error: f.reason?.message }));
            } else if (failures.length === 4) {
                setOverviewError(failures[0].reason?.message || 'Failed to load overview');
            }
        } catch (error: any) {
            logger.error('useAimsOverview', 'Failed to fetch overview', { error: error.message });
            setOverviewError(error.message || 'Failed to load overview');
        } finally {
            setOverviewLoading(false);
        }
    }, [storeId, setStoreSummary, setLabelStatusSummary, setGatewayStatusSummary, setLabelModels, setOverviewLoading, setOverviewError, setOverviewLastFetched]);

    return {
        storeSummary, labelStatusSummary, gatewayStatusSummary, labelModels,
        overviewLoading, overviewError, fetchOverview,
    };
}
