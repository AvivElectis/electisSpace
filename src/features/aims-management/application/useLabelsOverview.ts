/**
 * Hook for labels overview — fetches all labels + unassigned, computes stats
 */

import { useCallback, useMemo } from 'react';
import { useAimsManagementStore } from '../infrastructure/aimsManagementStore';
import * as aimsService from '../infrastructure/aimsManagementService';
import { logger } from '@shared/infrastructure/services/logger';

const STALE_TIME = 30_000; // 30 seconds

export function useLabelsOverview(storeId: string | null) {
    const {
        labels, labelsLoading, labelsError, labelsLastFetched,
        setLabels, setLabelsLoading, setLabelsError,
        unassignedLabels, unassignedLabelsLoading,
        setUnassignedLabels, setUnassignedLabelsLoading,
    } = useAimsManagementStore();

    const fetchLabels = useCallback(async (force = false) => {
        if (!storeId) return;
        if (!force && labelsLastFetched && Date.now() - labelsLastFetched < STALE_TIME) return;

        setLabelsLoading(true);
        setLabelsError(null);
        try {
            const data = await aimsService.fetchLabels(storeId);
            setLabels(Array.isArray(data) ? data : []);
        } catch (error: any) {
            logger.error('useLabelsOverview', 'Failed to fetch labels', { error: error.message });
            setLabelsError(error.message || 'Failed to load labels');
        } finally {
            setLabelsLoading(false);
        }
    }, [storeId, labelsLastFetched, setLabels, setLabelsLoading, setLabelsError]);

    const fetchUnassignedLabels = useCallback(async () => {
        if (!storeId) return;
        setUnassignedLabelsLoading(true);
        try {
            const data = await aimsService.fetchUnassignedLabels(storeId);
            setUnassignedLabels(Array.isArray(data) ? data : []);
        } catch (error: any) {
            logger.error('useLabelsOverview', 'Failed to fetch unassigned labels', { error: error.message });
        } finally {
            setUnassignedLabelsLoading(false);
        }
    }, [storeId, setUnassignedLabels, setUnassignedLabelsLoading]);

    const stats = useMemo(() => {
        const total = labels.length;
        const online = labels.filter((l: any) => l.status === 'ONLINE' || l.status === 'online').length;
        const offline = labels.filter((l: any) => l.status === 'OFFLINE' || l.status === 'offline').length;
        const errorCount = labels.filter((l: any) => {
            const s = (l.status || '').toUpperCase();
            return s === 'ERROR' || s === 'TIMEOUT' || s === 'FAILED';
        }).length;
        const unassignedCount = unassignedLabels.length;

        // Battery distribution
        const batteryGood = labels.filter((l: any) => {
            const b = (l.batteryStatus || l.battery || '').toUpperCase();
            return b === 'GOOD' || b === 'NORMAL';
        }).length;
        const batteryLow = labels.filter((l: any) => {
            const b = (l.batteryStatus || l.battery || '').toUpperCase();
            return b === 'LOW';
        }).length;
        const batteryCritical = labels.filter((l: any) => {
            const b = (l.batteryStatus || l.battery || '').toUpperCase();
            return b === 'CRITICAL' || b === 'EMPTY';
        }).length;

        // Signal distribution
        const signalExcellent = labels.filter((l: any) => {
            const s = (l.signalStrength || l.signal || '').toUpperCase();
            return s === 'EXCELLENT';
        }).length;
        const signalGood = labels.filter((l: any) => {
            const s = (l.signalStrength || l.signal || '').toUpperCase();
            return s === 'GOOD';
        }).length;
        const signalNormal = labels.filter((l: any) => {
            const s = (l.signalStrength || l.signal || '').toUpperCase();
            return s === 'NORMAL';
        }).length;
        const signalBad = labels.filter((l: any) => {
            const s = (l.signalStrength || l.signal || '').toUpperCase();
            return s === 'BAD' || s === 'WEAK' || s === 'POOR';
        }).length;

        return {
            total, online, offline, errorCount, unassignedCount,
            battery: { good: batteryGood, low: batteryLow, critical: batteryCritical },
            signal: { excellent: signalExcellent, good: signalGood, normal: signalNormal, bad: signalBad },
        };
    }, [labels, unassignedLabels]);

    return {
        labels, labelsLoading, labelsError,
        unassignedLabels, unassignedLabelsLoading,
        stats,
        fetchLabels, fetchUnassignedLabels,
    };
}
