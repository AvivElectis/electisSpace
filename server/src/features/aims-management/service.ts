/**
 * AIMS Management Feature - Service Layer
 * 
 * Business logic delegating to aimsGateway for all AIMS API operations.
 */

import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';

class AimsManagementService {
    // ─── Gateways ───────────────────────────────────────────────────────

    async listGateways(storeId: string) {
        appLogger.info('AimsManagement', 'Listing gateways', { storeId });
        return aimsGateway.fetchGateways(storeId);
    }

    async getGatewayDetail(storeId: string, mac: string) {
        appLogger.info('AimsManagement', 'Getting gateway detail', { storeId, mac });
        return aimsGateway.fetchGatewayDetail(storeId, mac);
    }

    async getFloatingGateways(storeId: string) {
        appLogger.info('AimsManagement', 'Listing floating gateways', { storeId });
        return aimsGateway.fetchFloatingGateways(storeId);
    }

    async registerGateway(storeId: string, mac: string, userId: string) {
        appLogger.info('AimsManagement', 'Registering gateway', { storeId, mac, userId });
        return aimsGateway.registerGateway(storeId, mac);
    }

    async deregisterGateways(storeId: string, macs: string[], userId: string) {
        appLogger.info('AimsManagement', 'Deregistering gateways', { storeId, macs, userId });
        return aimsGateway.deregisterGateways(storeId, macs);
    }

    async rebootGateway(storeId: string, mac: string, userId: string) {
        appLogger.info('AimsManagement', 'Rebooting gateway', { storeId, mac, userId });
        return aimsGateway.rebootGateway(storeId, mac);
    }

    async getGatewayDebugReport(storeId: string, mac: string) {
        appLogger.info('AimsManagement', 'Getting gateway debug report', { storeId, mac });
        return aimsGateway.fetchGatewayDebugReport(storeId, mac);
    }

    // ─── Labels ─────────────────────────────────────────────────────────

    async listLabels(storeId: string) {
        appLogger.info('AimsManagement', 'Listing labels', { storeId });
        return aimsGateway.fetchLabels(storeId);
    }

    async listUnassignedLabels(storeId: string) {
        appLogger.info('AimsManagement', 'Listing unassigned labels', { storeId });
        return aimsGateway.fetchUnassignedLabels(storeId);
    }

    async getLabelStatusHistory(storeId: string, labelCode: string, page = 0, size = 50) {
        return aimsGateway.fetchLabelStatusHistory(storeId, labelCode, page, size);
    }

    async getLabelDetail(storeId: string, labelCode: string) {
        appLogger.info('AimsManagement', 'Getting label detail', { storeId, labelCode });
        return aimsGateway.fetchLabelImages(storeId, labelCode);
    }

    async blinkLabel(storeId: string, labelCode: string) {
        appLogger.info('AimsManagement', 'Blinking label', { storeId, labelCode });
        return aimsGateway.blinkLabel(storeId, labelCode);
    }

    async setLabelLed(storeId: string, labelCode: string, led: { color?: string; mode?: string }) {
        appLogger.info('AimsManagement', 'Setting label LED', { storeId, labelCode, led });
        return aimsGateway.setLabelLed(storeId, labelCode, led);
    }

    async setLabelNfc(storeId: string, labelCode: string, nfcUrl: string) {
        appLogger.info('AimsManagement', 'Setting label NFC', { storeId, labelCode, nfcUrl });
        return aimsGateway.setLabelNfc(storeId, labelCode, nfcUrl);
    }

    async forceLabelAlive(storeId: string, labelCode: string) {
        appLogger.info('AimsManagement', 'Forcing label heartbeat', { storeId, labelCode });
        return aimsGateway.forceLabelAlive(storeId, labelCode);
    }

    async getLabelArticle(storeId: string, labelCode: string) {
        appLogger.info('AimsManagement', 'Getting label article', { storeId, labelCode });
        return aimsGateway.fetchLabelArticle(storeId, labelCode);
    }

    async getLabelAliveHistory(storeId: string, labelCode: string, page = 0, size = 50) {
        return aimsGateway.fetchLabelAliveHistory(storeId, labelCode, page, size);
    }

    async getLabelOperationHistory(storeId: string, labelCode: string, page = 0, size = 50) {
        return aimsGateway.fetchLabelHistory(storeId, labelCode, page, size);
    }

    // ─── Product / Batch History ────────────────────────────────────────

    async getBatchHistory(storeId: string, params?: { page?: number; size?: number; fromDate?: string; toDate?: string }) {
        return aimsGateway.fetchBatchHistory(storeId, params);
    }

    async getBatchDetail(storeId: string, batchName: string) {
        return aimsGateway.fetchBatchDetail(storeId, batchName);
    }

    async getBatchErrors(storeId: string, batchId: string) {
        return aimsGateway.fetchBatchErrors(storeId, batchId);
    }

    async getArticleUpdateHistory(storeId: string, articleId: string, page = 0, size = 50) {
        return aimsGateway.fetchArticleUpdateHistory(storeId, articleId, page, size);
    }

    // ─── Summary / Overview ────────────────────────────────────────────────

    async getStoreSummary(storeId: string) {
        appLogger.debug('AimsManagement', 'Getting store summary', { storeId });
        return aimsGateway.fetchStoreSummary(storeId);
    }

    async getLabelStatusSummary(storeId: string) {
        appLogger.debug('AimsManagement', 'Getting label status summary', { storeId });
        return aimsGateway.fetchLabelStatusSummary(storeId);
    }

    async getGatewayStatusSummary(storeId: string) {
        appLogger.debug('AimsManagement', 'Getting gateway status summary', { storeId });
        return aimsGateway.fetchGatewayStatusSummary(storeId);
    }

    async getLabelModels(storeId: string) {
        appLogger.debug('AimsManagement', 'Getting label models', { storeId });
        return aimsGateway.fetchLabelModels(storeId);
    }
}

export const aimsManagementService = new AimsManagementService();
