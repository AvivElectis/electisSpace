import { create } from 'zustand';
import type { LabelArticleLink, ScannerState, ScanInputType, LabelImagesDetail } from '../domain/types';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { withAimsTokenRefresh } from '@shared/infrastructure/services/aimsTokenManager';
import {
    getAllLabels,
    getLabelImages as getAimsLabelImages,
    linkLabel as aimsLinkLabel,
    unlinkLabel as aimsUnlinkLabel,
    type AimsLabel,
} from '@shared/infrastructure/services/solum/labelsService';
import { labelsApi } from '@shared/infrastructure/services/labelsApi';
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
}

/**
 * Transform AIMS labels to our display format
 */
function transformLabels(aimsLabels: AimsLabel[]): LabelArticleLink[] {
    return aimsLabels.map(label => ({
        labelCode: label.labelCode,
        articleId: label.articleList?.[0]?.articleId || '',
        articleName: label.articleList?.[0]?.articleName,
        signal: label.signal,
        battery: label.battery,
        status: label.status,
        labelType: label.labelType,
    }));
}

/**
 * Check if two label arrays have meaningful differences.
 * Compares by labelCode, articleId, signal, battery, status.
 */
function labelsChanged(prev: LabelArticleLink[], next: LabelArticleLink[]): boolean {
    if (prev.length !== next.length) return true;
    for (let i = 0; i < prev.length; i++) {
        const a = prev[i], b = next[i];
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

/**
 * Get the SoluM config and store number from settingsStore
 */
function getSolumContext() {
    const settings = useSettingsStore.getState().settings;
    const solumConfig = settings.solumConfig;
    if (!solumConfig || !solumConfig.isConnected) {
        return null;
    }
    return { config: solumConfig, storeNumber: solumConfig.storeNumber };
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

    // Check AIMS configuration status from settings store
    checkAimsStatus: async (_storeId) => {
        const ctx = getSolumContext();
        if (ctx) {
            set({ aimsConfigured: true, aimsConnected: true });
        } else {
            // Check if config exists but just not connected yet
            const settings = useSettingsStore.getState().settings;
            const hasConfig = !!settings.solumConfig?.baseUrl;
            set({ aimsConfigured: hasConfig, aimsConnected: false });
        }
    },

    // Fetch all labels directly from AIMS
    // First load shows spinner; subsequent fetches run in background and only update if data changed
    fetchLabels: async (_storeId) => {
        const currentLabels = get().labels;
        const isFirstLoad = currentLabels.length === 0;

        if (isFirstLoad) {
            set({ isLoading: true, error: null });
        }

        try {
            const ctx = getSolumContext();
            if (!ctx) {
                // On first load, don't show error — AIMS connection may still be initializing.
                // The page will re-trigger fetch when solumConfig.isConnected changes.
                if (isFirstLoad) {
                    logger.info('LabelsStore', 'AIMS not connected yet, waiting for connection');
                    set({ isLoading: false });
                } else {
                    set({ error: 'Not connected to AIMS', isLoading: false });
                }
                return;
            }

            logger.info('LabelsStore', 'Fetching labels directly from AIMS', {
                storeNumber: ctx.storeNumber,
                background: !isFirstLoad,
            });

            const aimsLabels = await withAimsTokenRefresh(async (token) => {
                return getAllLabels(ctx.config, ctx.storeNumber, token);
            });

            const links = transformLabels(aimsLabels);

            // Only update state if data actually changed
            if (isFirstLoad || labelsChanged(currentLabels, links)) {
                set({ labels: links, isLoading: false, aimsConfigured: true, aimsConnected: true });
                logger.info('LabelsStore', 'Labels updated from AIMS', { count: links.length, changed: true });
            } else {
                set({ isLoading: false, aimsConfigured: true, aimsConnected: true });
                logger.info('LabelsStore', 'Labels unchanged, skipping update', { count: links.length });
            }
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to fetch labels from AIMS', { error: error.message });
            // On background refresh, don't overwrite existing data with error
            if (isFirstLoad) {
                set({ error: error.message, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        }
    },

    // Fetch label images directly from AIMS
    fetchLabelImages: async (_storeId, labelCode) => {
        set({ isLoadingImages: true, imagesError: null });

        try {
            const ctx = getSolumContext();
            if (!ctx) {
                set({ imagesError: 'Not connected to AIMS', isLoadingImages: false });
                return null;
            }

            logger.info('LabelsStore', 'Fetching label images from AIMS', { labelCode });

            const data = await withAimsTokenRefresh(async (token) => {
                return getAimsLabelImages(ctx.config, ctx.storeNumber, token, labelCode);
            });

            if (data) {
                const labelImages: LabelImagesDetail = {
                    labelCode: data.labelCode,
                    isDualSidedLabel: data.isDualSidedLabel ?? false,
                    width: data.width ?? 0,
                    height: data.height ?? 0,
                    activePage: data.activePage ?? 0,
                    previousImage: data.previousImage || [],
                    currentImage: data.currentImage || [],
                    responseCode: data.responseCode,
                    responseMessage: data.responseMessage,
                    latestBatchInfo: data.latestBatchInfo,
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

    // Link a label to an article directly via AIMS
    linkLabelToArticle: async (storeId, labelCode, articleId, templateName) => {
        set({ isLoading: true, error: null });

        try {
            const ctx = getSolumContext();
            if (!ctx) {
                set({ error: 'Not connected to AIMS', isLoading: false });
                throw new Error('Not connected to AIMS');
            }

            logger.info('LabelsStore', 'Linking label to article via AIMS', { labelCode, articleId });

            await withAimsTokenRefresh(async (token) => {
                await aimsLinkLabel(ctx.config, ctx.storeNumber, token, labelCode, articleId, templateName);
            });

            // Refresh labels list
            await get().fetchLabels(storeId);
            logger.info('LabelsStore', 'Label linked successfully');
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to link label', { error: error.message });
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // Unlink a label from its article directly via AIMS
    unlinkLabelFromArticle: async (storeId, labelCode) => {
        set({ isLoading: true, error: null });

        try {
            const ctx = getSolumContext();
            if (!ctx) {
                set({ error: 'Not connected to AIMS', isLoading: false });
                throw new Error('Not connected to AIMS');
            }

            logger.info('LabelsStore', 'Unlinking label via AIMS', { labelCode });

            await withAimsTokenRefresh(async (token) => {
                await aimsUnlinkLabel(ctx.config, ctx.storeNumber, token, labelCode);
            });

            // Refresh labels list
            await get().fetchLabels(storeId);
            logger.info('LabelsStore', 'Label unlinked successfully');
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to unlink label', { error: error.message });
            set({ error: error.message, isLoading: false });
            throw error;
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
}));
