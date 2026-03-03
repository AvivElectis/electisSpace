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

    async updateGatewayConfig(storeId: string, gatewayMac: string, configData: Record<string, any>) {
        appLogger.info('AimsManagement', 'Updating gateway config', { storeId, gatewayMac });
        return aimsGateway.updateGatewayConfig(storeId, gatewayMac, configData);
    }

    async getGatewayOpcodes(storeId: string, gatewayMac: string) {
        appLogger.debug('AimsManagement', 'Getting gateway opcodes', { storeId, gatewayMac });
        return aimsGateway.fetchGatewayOpcodes(storeId, gatewayMac);
    }

    async getGatewayStatus(storeId: string, gatewayMac: string) {
        appLogger.debug('AimsManagement', 'Getting gateway status', { storeId, gatewayMac });
        return aimsGateway.fetchGatewayStatus(storeId, gatewayMac);
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

    // ─── Articles ─────────────────────────────────────────────────────

    async listArticles(storeId: string, params?: { page?: number; size?: number; sort?: string }) {
        appLogger.info('AimsManagement', 'Listing articles', { storeId, ...params });
        return aimsGateway.fetchArticleList(storeId, params);
    }

    async getArticleById(storeId: string, articleId: string) {
        appLogger.info('AimsManagement', 'Getting article by ID', { storeId, articleId });
        return aimsGateway.fetchArticleById(storeId, articleId);
    }

    async listLinkedArticles(storeId: string, params?: { page?: number; size?: number }) {
        appLogger.info('AimsManagement', 'Listing linked articles', { storeId, ...params });
        return aimsGateway.fetchLinkedArticles(storeId, params);
    }

    async getArticleUpdateHistoryAll(storeId: string, params?: { page?: number; size?: number }) {
        appLogger.info('AimsManagement', 'Getting all article update history', { storeId, ...params });
        return aimsGateway.fetchArticleUpdateHistoryAll(storeId, params);
    }

    async getArticleUpdateHistoryDetail(storeId: string, articleId: string, params?: { page?: number; size?: number }) {
        appLogger.info('AimsManagement', 'Getting article update history detail', { storeId, articleId, ...params });
        return aimsGateway.fetchArticleUpdateHistoryDetail(storeId, articleId, params);
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

    // ─── Templates ────────────────────────────────────────────────────

    async listTemplates(storeId: string, params?: { page?: number; size?: number }) {
        appLogger.info('AimsManagement', 'Listing templates', { storeId, ...params });
        return aimsGateway.fetchTemplates(storeId, params);
    }

    async getTemplateByName(storeId: string, templateName: string) {
        appLogger.info('AimsManagement', 'Getting template by name', { storeId, templateName });
        return aimsGateway.fetchTemplateByName(storeId, templateName);
    }

    async listTemplateTypes(storeId: string) {
        appLogger.info('AimsManagement', 'Listing template types', { storeId });
        return aimsGateway.fetchTemplateTypes(storeId);
    }

    async listTemplateMappingConditions(storeId: string) {
        appLogger.info('AimsManagement', 'Listing template mapping conditions', { storeId });
        return aimsGateway.fetchTemplateMappingConditions(storeId);
    }

    async listTemplateGroups(storeId: string) {
        appLogger.info('AimsManagement', 'Listing template groups', { storeId });
        return aimsGateway.fetchTemplateGroups(storeId);
    }

    async downloadTemplate(storeId: string, templateName: string, version: number, fileType: 'XSL' | 'JSON') {
        appLogger.info('AimsManagement', 'Downloading template', { storeId, templateName, version, fileType });
        return aimsGateway.downloadTemplate(storeId, templateName, version, fileType);
    }

    async uploadTemplate(storeId: string, templateData: Record<string, any>) {
        appLogger.info('AimsManagement', 'Uploading template', { storeId, templateName: templateData.templateName });
        return aimsGateway.uploadTemplate(storeId, templateData);
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

    // ─── Whitelist ─────────────────────────────────────────────────────

    async listWhitelist(storeId: string, params?: { page?: number; size?: number; labelCode?: string; labelModel?: string; sort?: string }) {
        appLogger.info('AimsManagement', 'Listing whitelist', { storeId, ...params });
        return aimsGateway.fetchWhitelist(storeId, params);
    }

    async addToWhitelist(storeId: string, labelCodes: string[]) {
        appLogger.info('AimsManagement', 'Adding to whitelist', { storeId, count: labelCodes.length });
        return aimsGateway.addToWhitelist(storeId, labelCodes);
    }

    async removeFromWhitelist(storeId: string, labelCodes: string[]) {
        appLogger.info('AimsManagement', 'Removing from whitelist', { storeId, count: labelCodes.length });
        return aimsGateway.removeFromWhitelist(storeId, labelCodes);
    }

    async whitelistBox(storeId: string, boxId: string) {
        appLogger.info('AimsManagement', 'Whitelisting box', { storeId, boxId });
        return aimsGateway.whitelistBox(storeId, boxId);
    }

    async syncWhitelistToStorage(storeId: string, fullUpdate?: boolean) {
        appLogger.info('AimsManagement', 'Syncing whitelist to storage', { storeId, fullUpdate });
        return aimsGateway.syncWhitelistToStorage(storeId, fullUpdate);
    }

    async syncWhitelistToGateways(storeId: string, params?: { store?: string; partialDelete?: boolean }) {
        appLogger.info('AimsManagement', 'Syncing whitelist to gateways', { storeId, ...params });
        return aimsGateway.syncWhitelistToGateways(storeId, params);
    }

    async listUnassignedWhitelist(storeId: string, params?: { page?: number; size?: number; labelCode?: string; labelModel?: string; sort?: string }) {
        appLogger.info('AimsManagement', 'Listing unassigned whitelist', { storeId, ...params });
        return aimsGateway.fetchUnassignedWhitelist(storeId, params);
    }
}

export const aimsManagementService = new AimsManagementService();
