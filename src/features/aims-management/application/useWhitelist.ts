/**
 * Hook for whitelist operations: list, add, remove, box whitelist, sync
 */

import { useCallback } from 'react';
import { useAimsManagementStore } from '../infrastructure/aimsManagementStore';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

const STALE_TIME = 30_000;

export function useWhitelist(storeId: string | null) {
    const {
        whitelist, whitelistLoading, whitelistError,
        whitelistTotalElements, whitelistTotalPages,
        unassignedWhitelist,
        setWhitelist, setWhitelistLoading, setWhitelistError,
        setWhitelistLastFetched, setWhitelistTotalElements, setWhitelistTotalPages,
        setUnassignedWhitelist,
    } = useAimsManagementStore();

    const fetchWhitelist = useCallback(async (params: { page?: number; size?: number; labelCode?: string; labelModel?: string; sort?: string } = {}, force = false) => {
        if (!storeId) return;
        const { whitelistLastFetched } = useAimsManagementStore.getState();
        if (!force && whitelistLastFetched && Date.now() - whitelistLastFetched < STALE_TIME) return;

        setWhitelistLoading(true);
        setWhitelistError(null);
        try {
            const result = await aimsService.fetchWhitelist(storeId, params);
            if (Array.isArray(result)) {
                setWhitelist(result);
                setWhitelistTotalElements(result.length);
                setWhitelistTotalPages(1);
            } else {
                setWhitelist(result?.content || result?.whiteList || result?.labelList || []);
                setWhitelistTotalElements(result?.totalElements ?? 0);
                setWhitelistTotalPages(result?.totalPages ?? 0);
            }
            setWhitelistLastFetched(Date.now());
        } catch (error: any) {
            logger.error('useWhitelist', 'Failed to fetch whitelist', { error: error.message });
            setWhitelistError(error.message || 'Failed to load whitelist');
        } finally {
            setWhitelistLoading(false);
        }
    }, [storeId, setWhitelist, setWhitelistLoading, setWhitelistError, setWhitelistLastFetched, setWhitelistTotalElements, setWhitelistTotalPages]);

    const addToWhitelist = useCallback(async (labelCodes: string[]) => {
        if (!storeId) return;
        try {
            await aimsService.addToWhitelist(storeId, labelCodes);
            await fetchWhitelist({}, true);
        } catch (error: any) {
            logger.error('useWhitelist', 'Failed to add to whitelist', { error: error.message });
            throw error;
        }
    }, [storeId, fetchWhitelist]);

    const removeFromWhitelist = useCallback(async (labelCodes: string[]) => {
        if (!storeId) return;
        try {
            await aimsService.removeFromWhitelist(storeId, labelCodes);
            await fetchWhitelist({}, true);
        } catch (error: any) {
            logger.error('useWhitelist', 'Failed to remove from whitelist', { error: error.message });
            throw error;
        }
    }, [storeId, fetchWhitelist]);

    const whitelistBox = useCallback(async (boxId: string) => {
        if (!storeId) return;
        try {
            await aimsService.whitelistBox(storeId, boxId);
            await fetchWhitelist({}, true);
        } catch (error: any) {
            logger.error('useWhitelist', 'Failed to whitelist box', { error: error.message });
            throw error;
        }
    }, [storeId, fetchWhitelist]);

    const syncToStorage = useCallback(async (fullUpdate = false) => {
        if (!storeId) return;
        try {
            return await aimsService.syncWhitelistToStorage(storeId, fullUpdate);
        } catch (error: any) {
            logger.error('useWhitelist', 'Failed to sync whitelist to storage', { error: error.message });
            throw error;
        }
    }, [storeId]);

    const syncToGateways = useCallback(async (partialDelete = false) => {
        if (!storeId) return;
        try {
            return await aimsService.syncWhitelistToGateways(storeId, partialDelete);
        } catch (error: any) {
            logger.error('useWhitelist', 'Failed to sync whitelist to gateways', { error: error.message });
            throw error;
        }
    }, [storeId]);

    const fetchUnassignedWhitelist = useCallback(async (params: { page?: number; size?: number } = {}) => {
        if (!storeId) return;
        try {
            const result = await aimsService.fetchUnassignedWhitelist(storeId, params);
            if (Array.isArray(result)) {
                setUnassignedWhitelist(result);
            } else {
                setUnassignedWhitelist(result?.content || result?.whiteList || result?.labelList || []);
            }
        } catch (error: any) {
            logger.error('useWhitelist', 'Failed to fetch unassigned whitelist', { error: error.message });
        }
    }, [storeId, setUnassignedWhitelist]);

    return {
        whitelist,
        whitelistLoading,
        whitelistError,
        whitelistTotalElements,
        whitelistTotalPages,
        unassignedWhitelist,
        fetchWhitelist,
        addToWhitelist,
        removeFromWhitelist,
        whitelistBox,
        syncToStorage,
        syncToGateways,
        fetchUnassignedWhitelist,
    };
}
