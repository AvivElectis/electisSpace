import { create } from 'zustand';
import type { LabelArticleLink, ScannerState, ScanInputType, LabelImagesDetail } from '../domain/types';
import { labelsApi, type AIMSLabel } from '@shared/infrastructure/services/labelsApi';
import { logger } from '@shared/infrastructure/services/logger';

interface LabelsState {
    // Data
    labels: LabelArticleLink[];
    isLoading: boolean;
    error: string | null;

    // Label images
    selectedLabelImages: LabelImagesDetail | null;
    isLoadingImages: boolean;
    imagesError: string | null;

    // Filters
    searchQuery: string;
    filterLinkedOnly: boolean;

    // Scanner
    scanner: ScannerState;

    // AIMS status
    aimsConfigured: boolean;
    aimsConnected: boolean;

    // Actions
    fetchLabels: (storeId: string) => Promise<void>;
    fetchLabelImages: (storeId: string, labelCode: string) => Promise<LabelImagesDetail | null>;
    clearLabelImages: () => void;
    linkLabelToArticle: (storeId: string, labelCode: string, articleId: string, templateName?: string) => Promise<void>;
    unlinkLabelFromArticle: (storeId: string, labelCode: string) => Promise<void>;
    blinkLabel: (storeId: string, labelCode: string) => Promise<void>;
    checkAimsStatus: (storeId: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
    setFilterLinkedOnly: (linked: boolean) => void;
    setScannerState: (state: Partial<ScannerState>) => void;
    clearError: () => void;
    clearAllData: () => void;
}

/**
 * Transform AIMS labels (from server API) to our display format
 */
function transformLabels(aimsLabels: AIMSLabel[]): LabelArticleLink[] {
    return aimsLabels.map(label => ({
        labelCode: label.labelCode,
        articleId: label.articleList?.[0]?.articleId || label.articleId || '',
        articleName: label.articleList?.[0]?.articleName || label.articleName,
        signal: label.signal != null ? String(label.signal) : undefined,
        battery: label.battery != null ? String(label.battery) : undefined,
        status: label.status,
        labelType: label.type || label.labelType,
    }));
}

/**
 * Check if two label arrays have meaningful differences.
 * Sorts both arrays by labelCode before comparing to avoid false positives
 * from order changes (M7 fix).
 */
function labelsChanged(prev: LabelArticleLink[], next: LabelArticleLink[]): boolean {
    if (prev.length !== next.length) return true;

    const sortedPrev = [...prev].sort((a, b) => a.labelCode.localeCompare(b.labelCode));
    const sortedNext = [...next].sort((a, b) => a.labelCode.localeCompare(b.labelCode));

    for (let i = 0; i < sortedPrev.length; i++) {
        const a = sortedPrev[i], b = sortedNext[i];
        if (
            a.labelCode !== b.labelCode ||
            a.articleId !== b.articleId ||
            a.articleName !== b.articleName ||
            a.signal !== b.signal ||
            a.battery !== b.battery ||
            a.status !== b.status ||
            a.labelType !== b.labelType
        ) return true;
    }
    return false;
}

export const useLabelsStore = create<LabelsState>((set, get) => ({
    // Initial state
    labels: [],
    isLoading: false,
    error: null,
    selectedLabelImages: null,
    isLoadingImages: false,
    imagesError: null,
    searchQuery: '',
    filterLinkedOnly: false,
    scanner: {
        isScanning: false,
        inputType: 'manual' as ScanInputType,
    },
    aimsConfigured: false,
    aimsConnected: false,

    // Check AIMS configuration status via server API
    checkAimsStatus: async (storeId) => {
        try {
            const status = await labelsApi.getStatus(storeId);
            set({ aimsConfigured: status.configured, aimsConnected: status.connected });
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to check AIMS status', { error: error.message });
            set({ aimsConfigured: false, aimsConnected: false });
        }
    },

    // Fetch all labels via server API
    // First load shows spinner; subsequent fetches run in background and only update if data changed
    fetchLabels: async (storeId) => {
        const currentLabels = get().labels;
        const isFirstLoad = currentLabels.length === 0;

        if (isFirstLoad) {
            set({ isLoading: true, error: null });
        }

        try {
            logger.info('LabelsStore', 'Fetching labels via server API', {
                storeId,
                background: !isFirstLoad,
            });

            const response = await labelsApi.list(storeId);
            const links = transformLabels(response.data);

            // Only update state if data actually changed
            if (isFirstLoad || labelsChanged(currentLabels, links)) {
                set({ labels: links, isLoading: false, aimsConfigured: true, aimsConnected: true });
                logger.info('LabelsStore', 'Labels updated from server', { count: links.length, changed: true });
            } else {
                set({ isLoading: false, aimsConfigured: true, aimsConnected: true });
                logger.info('LabelsStore', 'Labels unchanged, skipping update', { count: links.length });
            }
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to fetch labels', { error: error.message });
            // On background refresh, don't overwrite existing data with error
            if (isFirstLoad) {
                set({ error: error.message, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        }
    },

    // Fetch label images via server API
    fetchLabelImages: async (storeId, labelCode) => {
        set({ isLoadingImages: true, imagesError: null });

        try {
            logger.info('LabelsStore', 'Fetching label images via server API', { labelCode });

            const response = await labelsApi.getImages(storeId, labelCode);

            if (response.data) {
                const labelImages: LabelImagesDetail = {
                    labelCode: response.data.labelCode,
                    isDualSidedLabel: response.data.isDualSidedLabel ?? false,
                    width: response.data.width ?? 0,
                    height: response.data.height ?? 0,
                    activePage: response.data.activePage ?? 0,
                    previousImage: response.data.previousImage || [],
                    currentImage: response.data.currentImage || [],
                    responseCode: response.data.responseCode,
                    responseMessage: response.data.responseMessage,
                    latestBatchInfo: response.data.latestBatchInfo,
                };
                set({ selectedLabelImages: labelImages, isLoadingImages: false });
                logger.info('LabelsStore', 'Label images fetched', { labelCode });
                return labelImages;
            } else {
                set({ selectedLabelImages: null, isLoadingImages: false });
                return null;
            }
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to fetch label images', { error: error.message });
            set({ imagesError: error.message, isLoadingImages: false });
            return null;
        }
    },

    // Clear selected label images
    clearLabelImages: () => {
        set({ selectedLabelImages: null, imagesError: null });
    },

    // Link a label to an article via server API
    linkLabelToArticle: async (storeId, labelCode, articleId, templateName) => {
        set({ isLoading: true, error: null });

        try {
            logger.info('LabelsStore', 'Linking label to article via server API', { labelCode, articleId });
            await labelsApi.link(storeId, labelCode, articleId, templateName);
            logger.info('LabelsStore', 'Label linked successfully');
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to link label', { error: error.message });
            set({ error: error.message, isLoading: false });
            throw error;
        }

        // Refresh labels list — separate try/catch so a refresh failure
        // doesn't show as a "link failed" error when the link actually succeeded
        try {
            await get().fetchLabels(storeId);
        } catch {
            // Refresh failed but the link succeeded — don't overwrite success
            set({ isLoading: false });
            logger.warn('LabelsStore', 'Label linked but failed to refresh labels list');
        }
    },

    // Unlink a label from its article via server API
    unlinkLabelFromArticle: async (storeId, labelCode) => {
        set({ isLoading: true, error: null });

        try {
            logger.info('LabelsStore', 'Unlinking label via server API', { labelCode });
            await labelsApi.unlink(storeId, labelCode);
            logger.info('LabelsStore', 'Label unlinked successfully');
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to unlink label', { error: error.message });
            set({ error: error.message, isLoading: false });
            throw error;
        }

        // Refresh labels list — separate try/catch so a refresh failure
        // doesn't show as an "unlink failed" error when the unlink succeeded
        try {
            await get().fetchLabels(storeId);
        } catch {
            set({ isLoading: false });
            logger.warn('LabelsStore', 'Label unlinked but failed to refresh labels list');
        }
    },

    // Blink a label for identification (via server API — no client-side equivalent)
    blinkLabel: async (storeId, labelCode) => {
        try {
            logger.info('LabelsStore', 'Blinking label', { storeId, labelCode });
            await labelsApi.blink(storeId, labelCode);
            logger.info('LabelsStore', 'Label blink sent successfully');
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to blink label', { error: error.message });
            throw error;
        }
    },

    setSearchQuery: (query) => set({ searchQuery: query }),
    setFilterLinkedOnly: (linked) => set({ filterLinkedOnly: linked }),
    setScannerState: (state) => set((prev) => ({
        scanner: { ...prev.scanner, ...state }
    })),
    clearError: () => set({ error: null }),
    clearAllData: () => set({
        labels: [],
        isLoading: false,
        error: null,
        selectedLabelImages: null,
        isLoadingImages: false,
        imagesError: null,
        searchQuery: '',
        filterLinkedOnly: false,
        scanner: { isScanning: false, inputType: 'manual' as ScanInputType },
        aimsConfigured: false,
        aimsConnected: false,
    }),
}));
