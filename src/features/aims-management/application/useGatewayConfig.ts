/**
 * Hook for gateway configuration read/write
 */

import { useCallback, useState } from 'react';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

export function useGatewayConfig(storeId: string | null) {
    const [configLoading, setConfigLoading] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const fetchStatus = useCallback(async (mac: string) => {
        if (!storeId) return null;
        setConfigLoading(true);
        setConfigError(null);
        try {
            const data = await aimsService.fetchGatewayStatus(storeId, mac);
            return data;
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch gateway status';
            logger.error('useGatewayConfig', 'fetchStatus failed', { error: msg });
            setConfigError(msg);
            return null;
        } finally {
            setConfigLoading(false);
        }
    }, [storeId]);

    const saveConfig = useCallback(async (mac: string, configData: Record<string, any>) => {
        if (!storeId) return;
        setSaveLoading(true);
        setSaveError(null);
        setSaveSuccess(false);
        try {
            await aimsService.updateGatewayConfig(storeId, mac, configData);
            setSaveSuccess(true);
        } catch (err: any) {
            const msg = err.message || 'Failed to save configuration';
            logger.error('useGatewayConfig', 'saveConfig failed', { error: msg });
            setSaveError(msg);
        } finally {
            setSaveLoading(false);
        }
    }, [storeId]);

    return {
        configLoading, configError,
        saveConfig, saveLoading, saveError, saveSuccess, setSaveSuccess,
        fetchStatus,
    };
}
