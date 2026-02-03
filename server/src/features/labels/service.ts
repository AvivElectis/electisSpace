import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';
import type {
    LabelsUserContext,
    LinkLabelDTO,
    UnlinkLabelDTO,
} from './types.js';

// ============================================================================
// Authorization Helpers
// ============================================================================

function validateStoreAccess(storeId: string, storeIds: string[]): void {
    if (!storeIds.includes(storeId)) {
        throw 'FORBIDDEN';
    }
}

async function ensureAimsConfigured(storeId: string): Promise<void> {
    const storeConfig = await aimsGateway.getStoreConfig(storeId);
    if (!storeConfig) {
        throw 'AIMS_NOT_CONFIGURED';
    }
}

// ============================================================================
// Labels Service - Business Logic
// ============================================================================

export const labelsService = {
    /**
     * Fetch all labels for a store
     */
    async list(userContext: LabelsUserContext, storeId: string) {
        validateStoreAccess(storeId, userContext.storeIds);
        await ensureAimsConfigured(storeId);

        const labels = await aimsGateway.fetchLabels(storeId);
        return { labels, total: labels.length };
    },

    /**
     * Fetch unassigned (available) labels for a store
     */
    async listUnassigned(userContext: LabelsUserContext, storeId: string) {
        validateStoreAccess(storeId, userContext.storeIds);
        await ensureAimsConfigured(storeId);

        const labels = await aimsGateway.fetchUnassignedLabels(storeId);
        return { labels, total: labels.length };
    },

    /**
     * Fetch images for a specific label
     */
    async getLabelImages(userContext: LabelsUserContext, storeId: string, labelCode: string) {
        validateStoreAccess(storeId, userContext.storeIds);
        await ensureAimsConfigured(storeId);

        return aimsGateway.fetchLabelImages(storeId, labelCode);
    },

    /**
     * Link a label to an article
     */
    async linkLabel(userContext: LabelsUserContext, data: LinkLabelDTO) {
        validateStoreAccess(data.storeId, userContext.storeIds);
        await ensureAimsConfigured(data.storeId);

        return aimsGateway.linkLabel(data.storeId, data.labelCode, data.articleId, data.templateName);
    },

    /**
     * Unlink a label from its article
     */
    async unlinkLabel(userContext: LabelsUserContext, data: UnlinkLabelDTO) {
        validateStoreAccess(data.storeId, userContext.storeIds);
        await ensureAimsConfigured(data.storeId);

        return aimsGateway.unlinkLabel(data.storeId, data.labelCode);
    },

    /**
     * Make a label flash for identification
     */
    async blinkLabel(userContext: LabelsUserContext, storeId: string, labelCode: string) {
        validateStoreAccess(storeId, userContext.storeIds);
        await ensureAimsConfigured(storeId);

        return aimsGateway.blinkLabel(storeId, labelCode);
    },

    /**
     * Check if AIMS is configured and connected for a store
     */
    async getStatus(userContext: LabelsUserContext, storeId: string) {
        validateStoreAccess(storeId, userContext.storeIds);

        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        const isConnected = storeConfig ? await aimsGateway.checkHealth(storeId) : false;

        return {
            configured: !!storeConfig,
            connected: isConnected,
        };
    },

    /**
     * Fetch articles for linking labels
     */
    async getArticles(userContext: LabelsUserContext, storeId: string) {
        validateStoreAccess(storeId, userContext.storeIds);
        await ensureAimsConfigured(storeId);

        const articles = await aimsGateway.pullArticles(storeId);
        return { articles, total: articles.length };
    },
};
