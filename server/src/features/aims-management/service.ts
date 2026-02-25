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

    async getLabelStatusHistory(storeId: string, labelCode: string, page = 0, size = 50) {
        return aimsGateway.fetchLabelStatusHistory(storeId, labelCode, page, size);
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
}

export const aimsManagementService = new AimsManagementService();
