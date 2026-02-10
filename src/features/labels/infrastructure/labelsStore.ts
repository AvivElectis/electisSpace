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
}

/**
 * Transform AIMS labels to our display format
 */
function transformLabels(aimsLabels: AIMSLabel[]): LabelArticleLink[] {
    return aimsLabels.map(label => ({
        labelCode: label.labelCode,
        articleId: (label as any).articleList?.[0]?.articleId || label.articleId || '',
        articleName: (label as any).articleList?.[0]?.articleName || label.articleName,
        signal: (label as any).signal || label.signalQuality,
        battery: label.battery,
        status: label.status,
    }));
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
    
    // Check AIMS configuration status
    checkAimsStatus: async (storeId) => {
        try {
            const status = await labelsApi.getStatus(storeId);
            set({ 
                aimsConfigured: status.configured, 
                aimsConnected: status.connected 
            });
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to check AIMS status', { error: error.message });
            set({ aimsConfigured: false, aimsConnected: false });
        }
    },
    
    // Fetch all labels via server API
    fetchLabels: async (storeId) => {
        set({ isLoading: true, error: null });
        
        try {
            logger.info('LabelsStore', 'Fetching labels via server', { storeId });
            const response = await labelsApi.list(storeId);
            const links = transformLabels(response.data);
            
            set({ labels: links, isLoading: false, aimsConfigured: true, aimsConnected: true });
            logger.info('LabelsStore', 'Labels fetched', { count: links.length });
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to fetch labels', { error: error.message });
            const errorMsg = error.response?.data?.error?.message || error.message;
            set({ error: errorMsg, isLoading: false });
        }
    },
    
    // Fetch label images via server API
    fetchLabelImages: async (storeId, labelCode) => {
        set({ isLoadingImages: true, imagesError: null });
        
        try {
            logger.info('LabelsStore', 'Fetching label images', { storeId, labelCode });
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
            const errorMsg = error.response?.data?.error?.message || error.message;
            set({ imagesError: errorMsg, isLoadingImages: false });
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
            logger.info('LabelsStore', 'Linking label to article', { storeId, labelCode, articleId });
            await labelsApi.link(storeId, labelCode, articleId, templateName);
            
            // Refresh labels list
            await get().fetchLabels(storeId);
            logger.info('LabelsStore', 'Label linked successfully');
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to link label', { error: error.message });
            const errorMsg = error.response?.data?.error?.message || error.message;
            set({ error: errorMsg, isLoading: false });
            throw error;
        }
    },
    
    // Unlink a label from its article via server API
    unlinkLabelFromArticle: async (storeId, labelCode) => {
        set({ isLoading: true, error: null });
        
        try {
            logger.info('LabelsStore', 'Unlinking label', { storeId, labelCode });
            await labelsApi.unlink(storeId, labelCode);
            
            // Refresh labels list
            await get().fetchLabels(storeId);
            logger.info('LabelsStore', 'Label unlinked successfully');
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to unlink label', { error: error.message });
            const errorMsg = error.response?.data?.error?.message || error.message;
            set({ error: errorMsg, isLoading: false });
            throw error;
        }
    },
    
    // Blink a label for identification via server API
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
