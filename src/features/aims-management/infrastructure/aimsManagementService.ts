/**
 * AIMS Management API Service
 * 
 * API calls to server /aims/* endpoints.
 */

import api from '@shared/infrastructure/services/apiClient';

// ─── Gateway Operations ─────────────────────────────────────────────────────

export async function fetchGateways(storeId: string) {
    const { data } = await api.get('/aims/gateways', { params: { storeId } });
    return data.data;
}

export async function fetchGatewayDetail(storeId: string, mac: string) {
    const { data } = await api.get(`/aims/gateways/${mac}`, { params: { storeId } });
    return data.data;
}

export async function fetchFloatingGateways(storeId: string) {
    const { data } = await api.get('/aims/gateways/floating', { params: { storeId } });
    return data.data;
}

export async function registerGateway(storeId: string, mac: string) {
    const { data } = await api.post('/aims/gateways', { mac }, { params: { storeId } });
    return data.data;
}

export async function deregisterGateways(storeId: string, macs: string[]) {
    const { data } = await api.delete('/aims/gateways', { data: { macs }, params: { storeId } });
    return data.data;
}

export async function rebootGateway(storeId: string, mac: string) {
    const { data } = await api.patch(`/aims/gateways/${mac}/reboot`, {}, { params: { storeId } });
    return data.data;
}

export async function fetchGatewayDebugReport(storeId: string, mac: string) {
    const { data } = await api.get(`/aims/gateways/${mac}/debug`, { params: { storeId } });
    return data.data;
}

export async function fetchGatewayStatus(storeId: string, mac: string) {
    const { data } = await api.get(`/aims/gateways/${encodeURIComponent(mac)}/status`, { params: { storeId } });
    return data.data;
}

export async function fetchGatewayOpcodes(storeId: string, mac: string) {
    const { data } = await api.get(`/aims/gateways/${encodeURIComponent(mac)}/opcodes`, { params: { storeId } });
    return data.data;
}

export async function updateGatewayConfig(storeId: string, mac: string, configData: Record<string, any>) {
    const { data } = await api.put(`/aims/gateways/${encodeURIComponent(mac)}/config`, configData, { params: { storeId } });
    return data.data;
}

// ─── Label Listing ─────────────────────────────────────────────────────────

export async function fetchLabels(storeId: string) {
    const { data } = await api.get('/aims/labels', { params: { storeId } });
    return data.data;
}

export async function fetchUnassignedLabels(storeId: string) {
    const { data } = await api.get('/aims/labels/unassigned', { params: { storeId } });
    return data.data;
}

// ─── Label Detail & Actions ────────────────────────────────────────────────

export async function fetchLabelDetail(storeId: string, labelCode: string) {
    const { data } = await api.get(`/aims/labels/${encodeURIComponent(labelCode)}/detail`, { params: { storeId } });
    return data.data;
}

export async function fetchLabelArticle(storeId: string, labelCode: string) {
    const { data } = await api.get(`/aims/labels/${encodeURIComponent(labelCode)}/article`, { params: { storeId } });
    return data.data;
}

export async function fetchLabelAliveHistory(storeId: string, labelCode: string, page = 0, size = 50) {
    const { data } = await api.get(`/aims/labels/${encodeURIComponent(labelCode)}/alive-history`, { params: { storeId, page, size } });
    return data.data;
}

export async function fetchLabelOperationHistory(storeId: string, labelCode: string, page = 0, size = 50) {
    const { data } = await api.get(`/aims/labels/${encodeURIComponent(labelCode)}/operation-history`, { params: { storeId, page, size } });
    return data.data;
}

export async function setLabelLed(storeId: string, labelCode: string, led: { color?: string; mode?: string }) {
    const { data } = await api.put(`/aims/labels/${encodeURIComponent(labelCode)}/led`, led, { params: { storeId } });
    return data.data;
}

export async function blinkLabel(storeId: string, labelCode: string) {
    const { data } = await api.post(`/aims/labels/${encodeURIComponent(labelCode)}/blink`, {}, { params: { storeId } });
    return data.data;
}

export async function setLabelNfc(storeId: string, labelCode: string, nfcUrl: string) {
    const { data } = await api.put(`/aims/labels/${encodeURIComponent(labelCode)}/nfc`, { nfcUrl }, { params: { storeId } });
    return data.data;
}

export async function forceLabelAlive(storeId: string, labelCode: string) {
    const { data } = await api.post(`/aims/labels/${encodeURIComponent(labelCode)}/heartbeat`, {}, { params: { storeId } });
    return data.data;
}

// ─── Label History ──────────────────────────────────────────────────────────

export async function fetchLabelStatusHistory(storeId: string, labelCode: string, page = 0, size = 50) {
    const { data } = await api.get(`/aims/labels/${encodeURIComponent(labelCode)}/history`, { params: { storeId, page, size } });
    return data.data;
}

// ─── Product / Batch History ────────────────────────────────────────────────

export async function fetchBatchHistory(storeId: string, params?: { page?: number; size?: number; fromDate?: string; toDate?: string }) {
    const { data } = await api.get('/aims/products/history', { params: { storeId, ...params } });
    return data.data;
}

export async function fetchBatchDetail(storeId: string, batchName: string) {
    const { data } = await api.get(`/aims/products/history/${encodeURIComponent(batchName)}`, { params: { storeId } });
    return data.data;
}

export async function fetchBatchErrors(storeId: string, batchId: string) {
    const { data } = await api.get(`/aims/products/errors/${encodeURIComponent(batchId)}`, { params: { storeId } });
    return data.data;
}

export async function fetchArticleUpdateHistory(storeId: string, articleId: string, page = 0, size = 50) {
    const { data } = await api.get(`/aims/products/${encodeURIComponent(articleId)}/history`, { params: { storeId, page, size } });
    return data.data;
}

// ─── Article Operations ───────────────────────────────────────────────────

export async function fetchArticleList(storeId: string, params: { page?: number; size?: number; sort?: string } = {}) {
    const { data } = await api.get('/aims/articles', { params: { storeId, ...params } });
    return data.data;
}

export async function fetchArticleById(storeId: string, articleId: string) {
    const { data } = await api.get(`/aims/articles/${encodeURIComponent(articleId)}`, { params: { storeId } });
    return data.data;
}

export async function fetchLinkedArticles(storeId: string, params: { page?: number; size?: number } = {}) {
    const { data } = await api.get('/aims/articles/linked', { params: { storeId, ...params } });
    return data.data;
}

export async function fetchArticleUpdateHistoryAll(storeId: string, params: { page?: number; size?: number } = {}) {
    const { data } = await api.get('/aims/articles/update-history', { params: { storeId, ...params } });
    return data.data;
}

export async function fetchArticleUpdateHistoryDetail(storeId: string, articleId: string, params: { page?: number; size?: number } = {}) {
    const { data } = await api.get(`/aims/articles/${encodeURIComponent(articleId)}/update-history`, { params: { storeId, ...params } });
    return data.data;
}

// ─── Overview / Summary ────────────────────────────────────────────────────

export async function fetchStoreSummary(storeId: string) {
    const { data } = await api.get('/aims/store/summary', { params: { storeId } });
    return data.data;
}

export async function fetchLabelStatusSummary(storeId: string) {
    const { data } = await api.get('/aims/labels/summary/status', { params: { storeId } });
    return data.data;
}

export async function fetchGatewayStatusSummary(storeId: string) {
    const { data } = await api.get('/aims/gateways/summary/status', { params: { storeId } });
    return data.data;
}

export async function fetchLabelModels(storeId: string) {
    const { data } = await api.get('/aims/labels/models', { params: { storeId } });
    return data.data;
}

// ─── Template Operations ─────────────────────────────────────────────────────

export async function fetchTemplates(storeId: string, params: { page?: number; size?: number } = {}) {
    const { data } = await api.get('/aims/templates', { params: { storeId, ...params } });
    return data.data;
}

export async function fetchTemplateByName(storeId: string, templateName: string) {
    const { data } = await api.get(`/aims/templates/${encodeURIComponent(templateName)}`, { params: { storeId } });
    return data.data;
}

export async function fetchTemplateTypes(storeId: string) {
    const { data } = await api.get('/aims/templates/types', { params: { storeId } });
    return data.data;
}

export async function fetchTemplateMappings(storeId: string) {
    const { data } = await api.get('/aims/templates/mappings', { params: { storeId } });
    return data.data;
}

export async function fetchTemplateGroups(storeId: string) {
    const { data } = await api.get('/aims/templates/groups', { params: { storeId } });
    return data.data;
}

// ─── Whitelist Operations ───────────────────────────────────────────────────

export async function fetchWhitelist(storeId: string, params: { page?: number; size?: number; labelCode?: string; labelModel?: string; sort?: string } = {}) {
    const { data } = await api.get('/aims/whitelist', { params: { storeId, ...params } });
    return data.data;
}

export async function addToWhitelist(storeId: string, labelList: string[]) {
    const { data } = await api.post('/aims/whitelist', { labelList }, { params: { storeId } });
    return data.data;
}

export async function removeFromWhitelist(storeId: string, labelList: string[]) {
    const { data } = await api.delete('/aims/whitelist', { data: { labelList }, params: { storeId } });
    return data.data;
}

export async function whitelistBox(storeId: string, boxId: string) {
    const { data } = await api.post('/aims/whitelist/box', { boxId }, { params: { storeId } });
    return data.data;
}

export async function syncWhitelistToStorage(storeId: string, fullUpdate = false) {
    const { data } = await api.put('/aims/whitelist/sync/storage', { fullUpdate }, { params: { storeId } });
    return data.data;
}

export async function syncWhitelistToGateways(storeId: string, partialDelete = false) {
    const { data } = await api.put('/aims/whitelist/sync/gateway', { partialDelete }, { params: { storeId } });
    return data.data;
}

export async function fetchUnassignedWhitelist(storeId: string, params: { page?: number; size?: number; labelCode?: string; labelModel?: string; sort?: string } = {}) {
    const { data } = await api.get('/aims/whitelist/unassigned', { params: { storeId, ...params } });
    return data.data;
}
