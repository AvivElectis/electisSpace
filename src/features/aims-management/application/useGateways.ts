/**
 * Hook for gateway list and detail fetching
 */

import { useCallback } from 'react';
import { useAimsManagementStore } from '../infrastructure/aimsManagementStore';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

const STALE_TIME = 30_000; // 30 seconds

export function useGateways(storeId: string | null) {
    const {
        gateways, gatewaysLoading, gatewaysError, gatewaysLastFetched,
        setGateways, setGatewaysLoading, setGatewaysError,
        selectedGateway, selectedGatewayLoading,
        setSelectedGateway, setSelectedGatewayLoading,
        floatingGateways, floatingGatewaysLoading,
        setFloatingGateways, setFloatingGatewaysLoading,
        debugReport, debugReportLoading,
        setDebugReport, setDebugReportLoading,
    } = useAimsManagementStore();

    const fetchGateways = useCallback(async (force = false) => {
        if (!storeId) return;
        if (!force && gatewaysLastFetched && Date.now() - gatewaysLastFetched < STALE_TIME) return;
        
        setGatewaysLoading(true);
        setGatewaysError(null);
        try {
            const data = await aimsService.fetchGateways(storeId);
            setGateways(Array.isArray(data) ? data : []);
        } catch (error: any) {
            logger.error('useGateways', 'Failed to fetch gateways', { error: error.message });
            setGatewaysError(error.message || 'Failed to load gateways');
        } finally {
            setGatewaysLoading(false);
        }
    }, [storeId, gatewaysLastFetched, setGateways, setGatewaysLoading, setGatewaysError]);

    const fetchGatewayDetail = useCallback(async (mac: string) => {
        if (!storeId) return;
        setSelectedGatewayLoading(true);
        try {
            const data = await aimsService.fetchGatewayDetail(storeId, mac);
            setSelectedGateway(data);
        } catch (error: any) {
            logger.error('useGateways', 'Failed to fetch gateway detail', { error: error.message });
        } finally {
            setSelectedGatewayLoading(false);
        }
    }, [storeId, setSelectedGateway, setSelectedGatewayLoading]);

    const fetchFloating = useCallback(async () => {
        if (!storeId) return;
        setFloatingGatewaysLoading(true);
        try {
            const data = await aimsService.fetchFloatingGateways(storeId);
            setFloatingGateways(Array.isArray(data) ? data : []);
        } catch (error: any) {
            logger.error('useGateways', 'Failed to fetch floating gateways', { error: error.message });
        } finally {
            setFloatingGatewaysLoading(false);
        }
    }, [storeId, setFloatingGateways, setFloatingGatewaysLoading]);

    const fetchDebugReport = useCallback(async (mac: string) => {
        if (!storeId) return;
        setDebugReportLoading(true);
        setDebugReport(null);
        try {
            const data = await aimsService.fetchGatewayDebugReport(storeId, mac);
            setDebugReport(data);
        } catch (error: any) {
            logger.error('useGateways', 'Failed to fetch debug report', { error: error.message });
        } finally {
            setDebugReportLoading(false);
        }
    }, [storeId, setDebugReport, setDebugReportLoading]);

    return {
        gateways, gatewaysLoading, gatewaysError,
        selectedGateway, selectedGatewayLoading,
        floatingGateways, floatingGatewaysLoading,
        debugReport, debugReportLoading,
        fetchGateways, fetchGatewayDetail, fetchFloatingGateways: fetchFloating, fetchDebugReport,
    };
}
