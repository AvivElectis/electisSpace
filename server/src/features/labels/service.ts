import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';
import type { AimsLabel } from '../../shared/infrastructure/services/aims.types.js';
import type {
    LabelsUserContext,
    LinkLabelDTO,
    UnlinkLabelDTO,
    ImagePushDTO,
    DitherPreviewDTO,
} from './types.js';

// ============================================================================
// Authorization Helpers
// ============================================================================

function validateStoreAccess(storeId: string, ctx: LabelsUserContext): void {
    if (ctx.globalRole === 'PLATFORM_ADMIN') return;
    if (!ctx.storeIds.includes(storeId)) {
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
     * Fetch all labels for a store.
     * Merges basic labels (has articleList) with unassigned labels (has signal/battery details)
     * to produce a unified list with both assignment info and hardware details.
     */
    async list(userContext: LabelsUserContext, storeId: string) {
        validateStoreAccess(storeId, userContext);
        await ensureAimsConfigured(storeId);

        // Fetch both endpoints in parallel
        const [basicLabels, unassignedLabels] = await Promise.all([
            aimsGateway.fetchLabels(storeId),
            aimsGateway.fetchUnassignedLabels(storeId).catch(() => [] as AimsLabel[]),
        ]);

        // Build lookup of unassigned labels
        const unassignedMap = new Map<string, AimsLabel>();
        for (const label of unassignedLabels) {
            unassignedMap.set(label.labelCode, label);
        }

        // Merge: unassigned labels get richer details; assigned labels keep articleList
        const mergedLabels: AimsLabel[] = [];
        const seenLabels = new Set<string>();

        for (const basic of basicLabels) {
            seenLabels.add(basic.labelCode);
            const unassigned = unassignedMap.get(basic.labelCode);
            if (unassigned) {
                // Unassigned — use detailed data but preserve articleList from basic
                mergedLabels.push({ ...unassigned, articleList: basic.articleList });
            } else {
                // Assigned — keep basic info (has articleList/articleId)
                mergedLabels.push(basic);
            }
        }

        // Add any unassigned labels not in basic list
        for (const label of unassignedLabels) {
            if (!seenLabels.has(label.labelCode)) {
                mergedLabels.push(label);
            }
        }

        return { labels: mergedLabels, total: mergedLabels.length };
    },

    /**
     * Fetch unassigned (available) labels for a store
     */
    async listUnassigned(userContext: LabelsUserContext, storeId: string) {
        validateStoreAccess(storeId, userContext);
        await ensureAimsConfigured(storeId);

        const labels = await aimsGateway.fetchUnassignedLabels(storeId);
        return { labels, total: labels.length };
    },

    /**
     * Fetch images for a specific label
     */
    async getLabelImages(userContext: LabelsUserContext, storeId: string, labelCode: string) {
        validateStoreAccess(storeId, userContext);
        await ensureAimsConfigured(storeId);

        return aimsGateway.fetchLabelImages(storeId, labelCode);
    },

    /**
     * Link a label to an article
     */
    async linkLabel(userContext: LabelsUserContext, data: LinkLabelDTO) {
        validateStoreAccess(data.storeId, userContext);
        await ensureAimsConfigured(data.storeId);

        return aimsGateway.linkLabel(data.storeId, data.labelCode, data.articleId, data.templateName);
    },

    /**
     * Unlink a label from its article
     */
    async unlinkLabel(userContext: LabelsUserContext, data: UnlinkLabelDTO) {
        validateStoreAccess(data.storeId, userContext);
        await ensureAimsConfigured(data.storeId);

        return aimsGateway.unlinkLabel(data.storeId, data.labelCode);
    },

    /**
     * Make a label flash for identification
     */
    async blinkLabel(userContext: LabelsUserContext, storeId: string, labelCode: string) {
        validateStoreAccess(storeId, userContext);
        await ensureAimsConfigured(storeId);

        return aimsGateway.blinkLabel(storeId, labelCode);
    },

    /**
     * Fetch label type/hardware info
     */
    async getLabelTypeInfo(userContext: LabelsUserContext, storeId: string, labelCode: string) {
        validateStoreAccess(storeId, userContext);
        await ensureAimsConfigured(storeId);

        return aimsGateway.fetchLabelTypeInfo(storeId, labelCode);
    },

    /**
     * Get dithered preview of an image from AIMS
     */
    async getDitherPreview(userContext: LabelsUserContext, data: DitherPreviewDTO) {
        validateStoreAccess(data.storeId, userContext);
        await ensureAimsConfigured(data.storeId);

        return aimsGateway.fetchDitherPreview(data.storeId, data.labelCode, {
            image: data.image,
            optAlgType: data.optAlgType,
        });
    },

    /**
     * Push an image to a label
     */
    async pushImage(userContext: LabelsUserContext, data: ImagePushDTO) {
        validateStoreAccess(data.storeId, userContext);
        await ensureAimsConfigured(data.storeId);

        return aimsGateway.pushLabelImage(data.storeId, {
            labelCode: data.labelCode,
            page: data.page,
            frontPage: data.frontPage,
            image: data.image,
            dithering: data.dithering,
            optAlgType: data.optAlgType,
        });
    },

    /**
     * Check if AIMS is configured and connected for a store
     */
    async getStatus(userContext: LabelsUserContext, storeId: string) {
        validateStoreAccess(storeId, userContext);

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
        validateStoreAccess(storeId, userContext);
        await ensureAimsConfigured(storeId);

        const articles = await aimsGateway.pullArticles(storeId);
        return { articles, total: articles.length };
    },
};
