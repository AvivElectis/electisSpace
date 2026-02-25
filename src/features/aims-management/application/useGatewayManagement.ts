/**
 * Hook for gateway management operations (register, deregister, reboot)
 */

import { useCallback, useState } from 'react';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

export function useGatewayManagement(storeId: string | null) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const registerGateway = useCallback(async (mac: string) => {
        if (!storeId) return;
        setLoading(true);
        setError(null);
        try {
            const result = await aimsService.registerGateway(storeId, mac);
            return result;
        } catch (err: any) {
            const msg = err.message || 'Failed to register gateway';
            logger.error('useGatewayManagement', 'Register failed', { error: msg });
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    const deregisterGateways = useCallback(async (macs: string[]) => {
        if (!storeId) return;
        setLoading(true);
        setError(null);
        try {
            const result = await aimsService.deregisterGateways(storeId, macs);
            return result;
        } catch (err: any) {
            const msg = err.message || 'Failed to deregister gateways';
            logger.error('useGatewayManagement', 'Deregister failed', { error: msg });
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    const rebootGateway = useCallback(async (mac: string) => {
        if (!storeId) return;
        setLoading(true);
        setError(null);
        try {
            const result = await aimsService.rebootGateway(storeId, mac);
            return result;
        } catch (err: any) {
            const msg = err.message || 'Failed to reboot gateway';
            logger.error('useGatewayManagement', 'Reboot failed', { error: msg });
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    return { loading, error, registerGateway, deregisterGateways, rebootGateway };
}
