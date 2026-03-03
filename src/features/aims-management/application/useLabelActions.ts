/**
 * Hook for label actions — detail view, LED, blink, NFC, heartbeat, history
 */

import { useCallback, useState } from 'react';
import { useAimsManagementStore } from '../infrastructure/aimsManagementStore';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

export function useLabelActions(storeId: string | null) {
    const {
        labelDetailData, labelArticleData,
        labelAliveHistory, labelOperationHistory,
        selectedLabelLoading,
        setSelectedLabelLoading,
        setLabelDetailData, setLabelArticleData,
        setLabelAliveHistory, setLabelOperationHistory,
    } = useAimsManagementStore();

    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const clearActionStatus = useCallback(() => {
        setActionError(null);
        setActionSuccess(null);
    }, []);

    const fetchLabelDetail = useCallback(async (labelCode: string) => {
        if (!storeId) return;
        setSelectedLabelLoading(true);
        try {
            const [detail, article] = await Promise.all([
                aimsService.fetchLabelDetail(storeId, labelCode),
                aimsService.fetchLabelArticle(storeId, labelCode).catch(() => null),
            ]);
            setLabelDetailData(detail);
            setLabelArticleData(article);
        } catch (err: any) {
            logger.error('useLabelActions', 'Failed to fetch label detail', { error: err.message });
        } finally {
            setSelectedLabelLoading(false);
        }
    }, [storeId, setSelectedLabelLoading, setLabelDetailData, setLabelArticleData]);

    const fetchLabelAliveHistory = useCallback(async (labelCode: string, page = 0) => {
        if (!storeId) return;
        try {
            const history = await aimsService.fetchLabelAliveHistory(storeId, labelCode, page, 50);
            setLabelAliveHistory(history);
        } catch (err: any) {
            logger.error('useLabelActions', 'Failed to fetch alive history', { error: err.message });
        }
    }, [storeId, setLabelAliveHistory]);

    const fetchLabelOperationHistory = useCallback(async (labelCode: string, page = 0) => {
        if (!storeId) return;
        try {
            const history = await aimsService.fetchLabelOperationHistory(storeId, labelCode, page, 50);
            setLabelOperationHistory(history);
        } catch (err: any) {
            logger.error('useLabelActions', 'Failed to fetch operation history', { error: err.message });
        }
    }, [storeId, setLabelOperationHistory]);

    // Actions
    const handleBlink = useCallback(async (labelCode: string) => {
        if (!storeId) return;
        setActionLoading(true);
        clearActionStatus();
        try {
            await aimsService.blinkLabel(storeId, labelCode);
            setActionSuccess('Blink command sent');
        } catch (err: any) {
            logger.error('useLabelActions', 'Blink failed', { error: err.message });
            setActionError(err.message || 'Blink failed');
        } finally {
            setActionLoading(false);
        }
    }, [storeId, clearActionStatus]);

    const handleLed = useCallback(async (labelCode: string, led: { color?: string; mode?: string }) => {
        if (!storeId) return;
        setActionLoading(true);
        clearActionStatus();
        try {
            await aimsService.setLabelLed(storeId, labelCode, led);
            setActionSuccess('LED updated');
        } catch (err: any) {
            logger.error('useLabelActions', 'LED control failed', { error: err.message });
            setActionError(err.message || 'LED control failed');
        } finally {
            setActionLoading(false);
        }
    }, [storeId, clearActionStatus]);

    const handleNfc = useCallback(async (labelCode: string, nfcUrl: string) => {
        if (!storeId) return;
        setActionLoading(true);
        clearActionStatus();
        try {
            await aimsService.setLabelNfc(storeId, labelCode, nfcUrl);
            setActionSuccess('NFC configured');
        } catch (err: any) {
            logger.error('useLabelActions', 'NFC config failed', { error: err.message });
            setActionError(err.message || 'NFC configuration failed');
        } finally {
            setActionLoading(false);
        }
    }, [storeId, clearActionStatus]);

    const handleHeartbeat = useCallback(async (labelCode: string) => {
        if (!storeId) return;
        setActionLoading(true);
        clearActionStatus();
        try {
            await aimsService.forceLabelAlive(storeId, labelCode);
            setActionSuccess('Heartbeat command sent');
        } catch (err: any) {
            logger.error('useLabelActions', 'Force heartbeat failed', { error: err.message });
            setActionError(err.message || 'Force heartbeat failed');
        } finally {
            setActionLoading(false);
        }
    }, [storeId, clearActionStatus]);

    return {
        // Detail data
        labelDetailData,
        labelArticleData,
        labelAliveHistory,
        labelOperationHistory,
        selectedLabelLoading,
        // Fetch methods
        fetchLabelDetail,
        fetchLabelAliveHistory,
        fetchLabelOperationHistory,
        // Actions
        handleBlink,
        handleLed,
        handleNfc,
        handleHeartbeat,
        actionLoading,
        actionError,
        actionSuccess,
        clearActionStatus,
    };
}
