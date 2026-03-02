/**
 * AIMS Management Feature - Controller
 * 
 * HTTP request/response handling for AIMS management endpoints.
 */

import type { Request, Response, NextFunction } from 'express';
import { aimsManagementService } from './service.js';
import { registerGatewaySchema, deregisterGatewaysSchema, batchHistoryQuerySchema, labelHistoryQuerySchema, articleHistoryQuerySchema, articleListQuerySchema, ledControlSchema, nfcConfigSchema, gatewayConfigUpdateSchema, templateListQuerySchema, whitelistQuerySchema, whitelistModifySchema, whitelistBoxSchema, whitelistSyncStorageSchema, whitelistSyncGatewaySchema } from './types.js';
import { badRequest } from '../../shared/middleware/errorHandler.js';

/**
 * Extract active store ID from request.
 * Looks at query param, header, or user's active store.
 */
function getStoreId(req: Request): string {
    const rawStoreId = req.query.storeId || req.headers['x-store-id'];
    const storeId = Array.isArray(rawStoreId) ? rawStoreId[0] as string : rawStoreId as string;
    if (!storeId) {
        throw badRequest('Store ID is required (pass as ?storeId= or X-Store-Id header)');
    }
    return storeId;
}

// ─── Gateway Read Operations ────────────────────────────────────────────────

async function listGateways(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const gateways = await aimsManagementService.listGateways(storeId);
        res.json({ data: gateways });
    } catch (error) { next(error); }
}

async function getGatewayDetail(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const detail = await aimsManagementService.getGatewayDetail(storeId, String(req.params.mac));
        res.json({ data: detail });
    } catch (error) { next(error); }
}

async function getGatewayDebugReport(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const report = await aimsManagementService.getGatewayDebugReport(storeId, String(req.params.mac));
        res.json({ data: report });
    } catch (error) { next(error); }
}

async function getFloatingGateways(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const gateways = await aimsManagementService.getFloatingGateways(storeId);
        res.json({ data: gateways });
    } catch (error) { next(error); }
}

// ─── Gateway Write Operations ───────────────────────────────────────────────

async function registerGateway(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { mac } = registerGatewaySchema.parse(req.body);
        const result = await aimsManagementService.registerGateway(storeId, mac, req.user!.id);
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function deregisterGateways(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { macs } = deregisterGatewaysSchema.parse(req.body);
        const result = await aimsManagementService.deregisterGateways(storeId, macs, req.user!.id);
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function rebootGateway(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const result = await aimsManagementService.rebootGateway(storeId, String(req.params.mac), req.user!.id);
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function getGatewayStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const status = await aimsManagementService.getGatewayStatus(storeId, String(req.params.mac));
        res.json({ data: status });
    } catch (error) { next(error); }
}

async function getGatewayOpcodes(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const opcodes = await aimsManagementService.getGatewayOpcodes(storeId, String(req.params.mac));
        res.json({ data: opcodes });
    } catch (error) { next(error); }
}

async function updateGatewayConfig(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const configData = gatewayConfigUpdateSchema.parse(req.body);
        const result = await aimsManagementService.updateGatewayConfig(storeId, String(req.params.mac), configData);
        res.json({ data: result });
    } catch (error) { next(error); }
}

// ─── Label Listing ─────────────────────────────────────────────────────────

async function listLabels(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const labels = await aimsManagementService.listLabels(storeId);
        res.json({ data: labels });
    } catch (error) { next(error); }
}

async function listUnassignedLabels(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const labels = await aimsManagementService.listUnassignedLabels(storeId);
        res.json({ data: labels });
    } catch (error) { next(error); }
}

// ─── Label History ──────────────────────────────────────────────────────────

async function getLabelStatusHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { page, size } = labelHistoryQuerySchema.parse(req.query);
        const history = await aimsManagementService.getLabelStatusHistory(storeId, String(req.params.code), page, size);
        res.json({ data: history });
    } catch (error) { next(error); }
}

// ─── Product / Batch History ────────────────────────────────────────────────

async function getBatchHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const params = batchHistoryQuerySchema.parse(req.query);
        const history = await aimsManagementService.getBatchHistory(storeId, params);
        res.json({ data: history });
    } catch (error) { next(error); }
}

async function getBatchDetail(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const detail = await aimsManagementService.getBatchDetail(storeId, String(req.params.name));
        res.json({ data: detail });
    } catch (error) { next(error); }
}

async function getBatchErrors(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const errors = await aimsManagementService.getBatchErrors(storeId, String(req.params.name));
        res.json({ data: errors });
    } catch (error) { next(error); }
}

async function getBatchErrorsById(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const errors = await aimsManagementService.getBatchErrors(storeId, String(req.params.batchId));
        res.json({ data: errors });
    } catch (error) { next(error); }
}

async function getArticleUpdateHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { page, size } = articleHistoryQuerySchema.parse(req.query);
        const history = await aimsManagementService.getArticleUpdateHistory(storeId, String(req.params.articleId), page, size);
        res.json({ data: history });
    } catch (error) { next(error); }
}

// ─── Article Browsing ──────────────────────────────────────────────────────

async function listArticles(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { page, size, sort } = articleListQuerySchema.parse(req.query);
        const articles = await aimsManagementService.listArticles(storeId, { page, size, sort });
        res.json({ data: articles });
    } catch (error) { next(error); }
}

async function getArticleById(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const article = await aimsManagementService.getArticleById(storeId, String(req.params.articleId));
        res.json({ data: article });
    } catch (error) { next(error); }
}

async function listLinkedArticles(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { page, size } = articleListQuerySchema.parse(req.query);
        const articles = await aimsManagementService.listLinkedArticles(storeId, { page, size });
        res.json({ data: articles });
    } catch (error) { next(error); }
}

async function getArticleUpdateHistoryAll(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { page, size } = articleHistoryQuerySchema.parse(req.query);
        const history = await aimsManagementService.getArticleUpdateHistoryAll(storeId, { page, size });
        res.json({ data: history });
    } catch (error) { next(error); }
}

async function getArticleUpdateHistoryDetail(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { page, size } = articleHistoryQuerySchema.parse(req.query);
        const history = await aimsManagementService.getArticleUpdateHistoryDetail(storeId, String(req.params.articleId), { page, size });
        res.json({ data: history });
    } catch (error) { next(error); }
}

// ─── Label Detail & Actions ────────────────────────────────────────────────

async function getLabelDetail(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const detail = await aimsManagementService.getLabelDetail(storeId, String(req.params.code));
        res.json({ data: detail });
    } catch (error) { next(error); }
}

async function getLabelArticle(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const article = await aimsManagementService.getLabelArticle(storeId, String(req.params.code));
        res.json({ data: article });
    } catch (error) { next(error); }
}

async function getLabelAliveHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { page, size } = labelHistoryQuerySchema.parse(req.query);
        const history = await aimsManagementService.getLabelAliveHistory(storeId, String(req.params.code), page, size);
        res.json({ data: history });
    } catch (error) { next(error); }
}

async function getLabelOperationHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { page, size } = labelHistoryQuerySchema.parse(req.query);
        const history = await aimsManagementService.getLabelOperationHistory(storeId, String(req.params.code), page, size);
        res.json({ data: history });
    } catch (error) { next(error); }
}

async function setLabelLed(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const led = ledControlSchema.parse(req.body);
        const result = await aimsManagementService.setLabelLed(storeId, String(req.params.code), led);
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function blinkLabel(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const result = await aimsManagementService.blinkLabel(storeId, String(req.params.code));
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function setLabelNfc(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { nfcUrl } = nfcConfigSchema.parse(req.body);
        const result = await aimsManagementService.setLabelNfc(storeId, String(req.params.code), nfcUrl);
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function forceLabelAlive(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const result = await aimsManagementService.forceLabelAlive(storeId, String(req.params.code));
        res.json({ data: result });
    } catch (error) { next(error); }
}

// ─── Templates ──────────────────────────────────────────────────────────────

async function listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { page, size } = templateListQuerySchema.parse(req.query);
        const templates = await aimsManagementService.listTemplates(storeId, { page, size });
        res.json({ data: templates });
    } catch (error) { next(error); }
}

async function listTemplateTypes(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const types = await aimsManagementService.listTemplateTypes(storeId);
        res.json({ data: types });
    } catch (error) { next(error); }
}

async function listTemplateMappings(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const mappings = await aimsManagementService.listTemplateMappingConditions(storeId);
        res.json({ data: mappings });
    } catch (error) { next(error); }
}

async function listTemplateGroups(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const groups = await aimsManagementService.listTemplateGroups(storeId);
        res.json({ data: groups });
    } catch (error) { next(error); }
}

async function getTemplateByName(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const template = await aimsManagementService.getTemplateByName(storeId, String(req.params.name));
        res.json({ data: template });
    } catch (error) { next(error); }
}

// ─── Summary / Overview ────────────────────────────────────────────────────

async function getStoreSummary(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const summary = await aimsManagementService.getStoreSummary(storeId);
        res.json({ data: summary });
    } catch (error) { next(error); }
}

async function getLabelStatusSummary(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const summary = await aimsManagementService.getLabelStatusSummary(storeId);
        res.json({ data: summary });
    } catch (error) { next(error); }
}

async function getGatewayStatusSummary(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const summary = await aimsManagementService.getGatewayStatusSummary(storeId);
        res.json({ data: summary });
    } catch (error) { next(error); }
}

async function getLabelModels(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const models = await aimsManagementService.getLabelModels(storeId);
        res.json({ data: models });
    } catch (error) { next(error); }
}

// ─── Whitelist ──────────────────────────────────────────────────────

async function listWhitelist(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const params = whitelistQuerySchema.parse(req.query);
        const whitelist = await aimsManagementService.listWhitelist(storeId, params);
        res.json({ data: whitelist });
    } catch (error) { next(error); }
}

async function addToWhitelist(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { labelList } = whitelistModifySchema.parse(req.body);
        const result = await aimsManagementService.addToWhitelist(storeId, labelList);
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function removeFromWhitelist(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { labelList } = whitelistModifySchema.parse(req.body);
        const result = await aimsManagementService.removeFromWhitelist(storeId, labelList);
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function whitelistBox(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { boxId } = whitelistBoxSchema.parse(req.body);
        const result = await aimsManagementService.whitelistBox(storeId, boxId);
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function syncWhitelistToStorage(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { fullUpdate } = whitelistSyncStorageSchema.parse(req.body);
        const result = await aimsManagementService.syncWhitelistToStorage(storeId, fullUpdate);
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function syncWhitelistToGateways(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const { partialDelete } = whitelistSyncGatewaySchema.parse(req.body);
        const result = await aimsManagementService.syncWhitelistToGateways(storeId, { store: storeId, partialDelete });
        res.json({ data: result });
    } catch (error) { next(error); }
}

async function listUnassignedWhitelist(req: Request, res: Response, next: NextFunction) {
    try {
        const storeId = getStoreId(req);
        const params = whitelistQuerySchema.parse(req.query);
        const whitelist = await aimsManagementService.listUnassignedWhitelist(storeId, params);
        res.json({ data: whitelist });
    } catch (error) { next(error); }
}

export const aimsManagementController = {
    listGateways,
    getGatewayDetail,
    getGatewayDebugReport,
    getFloatingGateways,
    registerGateway,
    deregisterGateways,
    rebootGateway,
    getGatewayStatus,
    getGatewayOpcodes,
    updateGatewayConfig,
    listLabels,
    listUnassignedLabels,
    getLabelStatusHistory,
    getLabelDetail,
    getLabelArticle,
    getLabelAliveHistory,
    getLabelOperationHistory,
    setLabelLed,
    blinkLabel,
    setLabelNfc,
    forceLabelAlive,
    listArticles,
    getArticleById,
    listLinkedArticles,
    getArticleUpdateHistoryAll,
    getArticleUpdateHistoryDetail,
    getBatchHistory,
    getBatchDetail,
    getBatchErrors,
    getBatchErrorsById,
    getArticleUpdateHistory,
    listTemplates,
    listTemplateTypes,
    listTemplateMappings,
    listTemplateGroups,
    getTemplateByName,
    getStoreSummary,
    getLabelStatusSummary,
    getGatewayStatusSummary,
    getLabelModels,
    listWhitelist,
    addToWhitelist,
    removeFromWhitelist,
    whitelistBox,
    syncWhitelistToStorage,
    syncWhitelistToGateways,
    listUnassignedWhitelist,
};
