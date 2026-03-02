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
            const [storeSummaryData, labelStatusData, gatewayStatusData, labelModelsData] = await Promise.all([
                aimsService.fetchStoreSummary(storeId),
                aimsService.fetchLabelStatusSummary(storeId),
                aimsService.fetchGatewayStatusSummary(storeId),
                aimsService.fetchLabelModels(storeId),
            ]);
            setStoreSummary(storeSummaryData);
            setLabelStatusSummary(labelStatusData);
            setGatewayStatusSummary(gatewayStatusData);
            setLabelModels(Array.isArray(labelModelsData) ? labelModelsData : []);
            setOverviewLastFetched(Date.now());
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
