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

// ─── Label Listing ─────────────────────────────────────────────────────────

export async function fetchLabels(storeId: string) {
    const { data } = await api.get('/aims/labels', { params: { storeId } });
    return data.data;
}

export async function fetchUnassignedLabels(storeId: string) {
    const { data } = await api.get('/aims/labels/unassigned', { params: { storeId } });
    return data.data;
}

// ─── Label History ──────────────────────────────────────────────────────────

export async function fetchLabelStatusHistory(storeId: string, labelCode: string, page = 0, size = 50) {
    const { data } = await api.get(`/aims/labels/${labelCode}/history`, { params: { storeId, page, size } });
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

export async function fetchBatchErrors(storeId: string, batchName: string) {
    const { data } = await api.get(`/aims/products/history/${encodeURIComponent(batchName)}/errors`, { params: { storeId } });
    return data.data;
}

export async function fetchArticleUpdateHistory(storeId: string, articleId: string, page = 0, size = 50) {
    const { data } = await api.get(`/aims/products/${encodeURIComponent(articleId)}/history`, { params: { storeId, page, size } });
    return data.data;
}
