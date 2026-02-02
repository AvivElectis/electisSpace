import { create } from 'zustand';
import type { SolumConfig } from '@shared/domain/types';
import type { LabelArticleLink, ScannerState, ScanInputType, LabelImagesDetail } from '../domain/types';
import { linkLabel, unlinkLabel, getAllLabels, getLabelImages, type AimsLabel, type AimsLabelImagesDetail } from '@shared/infrastructure/services/solum/labelsService';
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
    
    // Actions
    fetchLabels: (config: SolumConfig, storeId: string, token: string) => Promise<void>;
    fetchLabelImages: (config: SolumConfig, storeId: string, token: string, labelCode: string) => Promise<LabelImagesDetail | null>;
    clearLabelImages: () => void;
    linkLabelToArticle: (config: SolumConfig, storeId: string, token: string, labelCode: string, articleId: string, templateName?: string) => Promise<void>;
    unlinkLabelFromArticle: (config: SolumConfig, storeId: string, token: string, labelCode: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
    setFilterLinkedOnly: (linked: boolean) => void;
    setScannerState: (state: Partial<ScannerState>) => void;
    clearError: () => void;
}

/**
 * Transform AIMS labels to our display format
 */
function transformLabels(aimsLabels: AimsLabel[]): LabelArticleLink[] {
    const links: LabelArticleLink[] = [];
    
    for (const label of aimsLabels) {
        if (label.articleList && label.articleList.length > 0) {
            // Label has linked articles
            for (const article of label.articleList) {
                links.push({
                    labelCode: label.labelCode,
                    articleId: article.articleId,
                    articleName: article.articleName,
                    signal: label.signal,
                    battery: label.battery,
                    status: label.status,
                });
            }
        } else {
            // Label without articles (unlinked)
            links.push({
                labelCode: label.labelCode,
                articleId: '',
                signal: label.signal,
                battery: label.battery,
                status: label.status,
            });
        }
    }
    
    return links;
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
    
    // Fetch all labels from AIMS
    fetchLabels: async (config, storeId, token) => {
        set({ isLoading: true, error: null });
        
        try {
            logger.info('LabelsStore', 'Fetching labels from AIMS');
            const aimsLabels = await getAllLabels(config, storeId, token);
            const links = transformLabels(aimsLabels);
            
            set({ labels: links, isLoading: false });
            logger.info('LabelsStore', 'Labels fetched', { count: links.length });
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to fetch labels', { error: error.message });
            set({ error: error.message, isLoading: false });
        }
    },
    
    // Fetch label images from AIMS
    fetchLabelImages: async (config, storeId, token, labelCode) => {
        set({ isLoadingImages: true, imagesError: null });
        
        try {
            logger.info('LabelsStore', 'Fetching label images', { labelCode });
            const imagesData = await getLabelImages(config, storeId, token, labelCode);
            
            if (imagesData) {
                const labelImages: LabelImagesDetail = {
                    labelCode: imagesData.labelCode,
                    isDualSidedLabel: imagesData.isDualSidedLabel,
                    width: imagesData.width,
                    height: imagesData.height,
                    activePage: imagesData.activePage,
                    previousImage: imagesData.previousImage || [],
                    currentImage: imagesData.currentImage || [],
                    responseCode: imagesData.responseCode,
                    responseMessage: imagesData.responseMessage,
                    latestBatchInfo: imagesData.latestBatchInfo,
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
    
    // Link a label to an article
    linkLabelToArticle: async (config, storeId, token, labelCode, articleId, templateName) => {
        set({ isLoading: true, error: null });
        
        try {
            logger.info('LabelsStore', 'Linking label to article', { labelCode, articleId });
            await linkLabel(config, storeId, token, labelCode, articleId, templateName);
            
            // Refresh labels list
            await get().fetchLabels(config, storeId, token);
            logger.info('LabelsStore', 'Label linked successfully');
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to link label', { error: error.message });
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },
    
    // Unlink a label from its article
    unlinkLabelFromArticle: async (config, storeId, token, labelCode) => {
        set({ isLoading: true, error: null });
        
        try {
            logger.info('LabelsStore', 'Unlinking label', { labelCode });
            await unlinkLabel(config, storeId, token, labelCode);
            
            // Refresh labels list
            await get().fetchLabels(config, storeId, token);
            logger.info('LabelsStore', 'Label unlinked successfully');
        } catch (error: any) {
            logger.error('LabelsStore', 'Failed to unlink label', { error: error.message });
            set({ error: error.message, isLoading: false });
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
