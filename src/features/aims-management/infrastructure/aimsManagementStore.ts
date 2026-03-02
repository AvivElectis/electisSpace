/**
 * AIMS Management Zustand Store
 */

import { create } from 'zustand';

interface AimsManagementState {
    // Gateways
    gateways: any[];
    gatewaysLoading: boolean;
    gatewaysError: string | null;
    gatewaysLastFetched: number | null;

    // Selected gateway detail
    selectedGateway: any | null;
    selectedGatewayLoading: boolean;

    // Floating gateways
    floatingGateways: any[];
    floatingGatewaysLoading: boolean;

    // Labels
    labels: any[];
    labelsLoading: boolean;
    labelsError: string | null;
    labelsLastFetched: number | null;

    // Unassigned labels
    unassignedLabels: any[];
    unassignedLabelsLoading: boolean;

    // Debug report
    debugReport: any | null;
    debugReportLoading: boolean;

    // Batch errors
    batchErrors: any | null;
    batchErrorsLoading: boolean;

    // Label history
    labelHistory: any | null;
    labelHistoryLoading: boolean;

    // Batch history
    batchHistory: any | null;
    batchHistoryLoading: boolean;

    // Label detail
    selectedLabel: any | null;
    selectedLabelLoading: boolean;
    labelDetailData: any | null;
    labelArticleData: any | null;
    labelAliveHistory: any | null;
    labelOperationHistory: any | null;

    // Articles
    articles: any[];
    articlesLoading: boolean;
    articlesError: string | null;
    articlesLastFetched: number | null;
    articlesTotalElements: number;
    articlesTotalPages: number;
    selectedArticle: any | null;
    articleHistory: any | null;

    // Templates
    templates: any[];
    templatesLoading: boolean;
    templatesError: string | null;
    templatesLastFetched: number | null;
    templatesTotalElements: number;
    templatesTotalPages: number;
    templateTypes: any[];
    templateMappings: any[];
    templateGroups: any[];
    selectedTemplate: any | null;

    // Whitelist
    whitelist: any[];
    whitelistLoading: boolean;
    whitelistError: string | null;
    whitelistLastFetched: number | null;
    whitelistTotalElements: number;
    whitelistTotalPages: number;
    unassignedWhitelist: any[];

    // Overview
    storeSummary: any | null;
    labelStatusSummary: any | null;
    gatewayStatusSummary: any | null;
    labelModels: any[];
    overviewLoading: boolean;
    overviewError: string | null;
    overviewLastFetched: number | null;

    // Active tab
    activeTab: number;

    // Actions
    setGateways: (gateways: any[]) => void;
    setGatewaysLoading: (loading: boolean) => void;
    setGatewaysError: (error: string | null) => void;
    setSelectedGateway: (gateway: any | null) => void;
    setSelectedGatewayLoading: (loading: boolean) => void;
    setFloatingGateways: (gateways: any[]) => void;
    setFloatingGatewaysLoading: (loading: boolean) => void;
    setLabels: (labels: any[]) => void;
    setLabelsLoading: (loading: boolean) => void;
    setLabelsError: (error: string | null) => void;
    setUnassignedLabels: (labels: any[]) => void;
    setUnassignedLabelsLoading: (loading: boolean) => void;
    setDebugReport: (report: any | null) => void;
    setDebugReportLoading: (loading: boolean) => void;
    setBatchErrors: (errors: any | null) => void;
    setBatchErrorsLoading: (loading: boolean) => void;
    setLabelHistory: (history: any | null) => void;
    setLabelHistoryLoading: (loading: boolean) => void;
    setBatchHistory: (history: any | null) => void;
    setBatchHistoryLoading: (loading: boolean) => void;
    setSelectedLabel: (label: any | null) => void;
    setSelectedLabelLoading: (loading: boolean) => void;
    setLabelDetailData: (data: any | null) => void;
    setLabelArticleData: (data: any | null) => void;
    setLabelAliveHistory: (data: any | null) => void;
    setLabelOperationHistory: (data: any | null) => void;
    setStoreSummary: (data: any | null) => void;
    setLabelStatusSummary: (data: any | null) => void;
    setGatewayStatusSummary: (data: any | null) => void;
    setLabelModels: (data: any[]) => void;
    setOverviewLoading: (loading: boolean) => void;
    setOverviewError: (error: string | null) => void;
    setOverviewLastFetched: (ts: number | null) => void;
    setArticles: (articles: any[]) => void;
    setArticlesLoading: (loading: boolean) => void;
    setArticlesError: (error: string | null) => void;
    setArticlesLastFetched: (ts: number | null) => void;
    setArticlesTotalElements: (total: number) => void;
    setArticlesTotalPages: (pages: number) => void;
    setSelectedArticle: (article: any | null) => void;
    setArticleHistory: (history: any | null) => void;
    setTemplates: (templates: any[]) => void;
    setTemplatesLoading: (loading: boolean) => void;
    setTemplatesError: (error: string | null) => void;
    setTemplatesLastFetched: (ts: number | null) => void;
    setTemplatesTotalElements: (total: number) => void;
    setTemplatesTotalPages: (pages: number) => void;
    setTemplateTypes: (types: any[]) => void;
    setTemplateMappings: (mappings: any[]) => void;
    setTemplateGroups: (groups: any[]) => void;
    setSelectedTemplate: (template: any | null) => void;
    setWhitelist: (items: any[]) => void;
    setWhitelistLoading: (loading: boolean) => void;
    setWhitelistError: (error: string | null) => void;
    setWhitelistLastFetched: (ts: number | null) => void;
    setWhitelistTotalElements: (total: number) => void;
    setWhitelistTotalPages: (pages: number) => void;
    setUnassignedWhitelist: (items: any[]) => void;
    setActiveTab: (tab: number) => void;
    reset: () => void;
}

const initialState = {
    gateways: [],
    gatewaysLoading: false,
    gatewaysError: null,
    gatewaysLastFetched: null,
    selectedGateway: null,
    selectedGatewayLoading: false,
    floatingGateways: [],
    floatingGatewaysLoading: false,
    labels: [],
    labelsLoading: false,
    labelsError: null,
    labelsLastFetched: null,
    unassignedLabels: [],
    unassignedLabelsLoading: false,
    debugReport: null,
    debugReportLoading: false,
    batchErrors: null,
    batchErrorsLoading: false,
    labelHistory: null,
    labelHistoryLoading: false,
    batchHistory: null,
    batchHistoryLoading: false,
    selectedLabel: null,
    selectedLabelLoading: false,
    labelDetailData: null,
    labelArticleData: null,
    labelAliveHistory: null,
    labelOperationHistory: null,
    articles: [],
    articlesLoading: false,
    articlesError: null,
    articlesLastFetched: null,
    articlesTotalElements: 0,
    articlesTotalPages: 0,
    selectedArticle: null,
    articleHistory: null,
    templates: [],
    templatesLoading: false,
    templatesError: null,
    templatesLastFetched: null,
    templatesTotalElements: 0,
    templatesTotalPages: 0,
    templateTypes: [],
    templateMappings: [],
    templateGroups: [],
    selectedTemplate: null,
    whitelist: [],
    whitelistLoading: false,
    whitelistError: null,
    whitelistLastFetched: null,
    whitelistTotalElements: 0,
    whitelistTotalPages: 0,
    unassignedWhitelist: [],
    storeSummary: null,
    labelStatusSummary: null,
    gatewayStatusSummary: null,
    labelModels: [],
    overviewLoading: false,
    overviewError: null,
    overviewLastFetched: null,
    activeTab: 0,
};

export const useAimsManagementStore = create<AimsManagementState>((set) => ({
    ...initialState,
    setGateways: (gateways) => set({ gateways, gatewaysLastFetched: Date.now() }),
    setGatewaysLoading: (gatewaysLoading) => set({ gatewaysLoading }),
    setGatewaysError: (gatewaysError) => set({ gatewaysError }),
    setSelectedGateway: (selectedGateway) => set({ selectedGateway }),
    setSelectedGatewayLoading: (selectedGatewayLoading) => set({ selectedGatewayLoading }),
    setFloatingGateways: (floatingGateways) => set({ floatingGateways }),
    setFloatingGatewaysLoading: (floatingGatewaysLoading) => set({ floatingGatewaysLoading }),
    setLabels: (labels) => set({ labels, labelsLastFetched: Date.now() }),
    setLabelsLoading: (labelsLoading) => set({ labelsLoading }),
    setLabelsError: (labelsError) => set({ labelsError }),
    setUnassignedLabels: (unassignedLabels) => set({ unassignedLabels }),
    setUnassignedLabelsLoading: (unassignedLabelsLoading) => set({ unassignedLabelsLoading }),
    setDebugReport: (debugReport) => set({ debugReport }),
    setDebugReportLoading: (debugReportLoading) => set({ debugReportLoading }),
    setBatchErrors: (batchErrors) => set({ batchErrors }),
    setBatchErrorsLoading: (batchErrorsLoading) => set({ batchErrorsLoading }),
    setLabelHistory: (labelHistory) => set({ labelHistory }),
    setLabelHistoryLoading: (labelHistoryLoading) => set({ labelHistoryLoading }),
    setBatchHistory: (batchHistory) => set({ batchHistory }),
    setBatchHistoryLoading: (batchHistoryLoading) => set({ batchHistoryLoading }),
    setSelectedLabel: (selectedLabel) => set({ selectedLabel }),
    setSelectedLabelLoading: (selectedLabelLoading) => set({ selectedLabelLoading }),
    setLabelDetailData: (labelDetailData) => set({ labelDetailData }),
    setLabelArticleData: (labelArticleData) => set({ labelArticleData }),
    setLabelAliveHistory: (labelAliveHistory) => set({ labelAliveHistory }),
    setLabelOperationHistory: (labelOperationHistory) => set({ labelOperationHistory }),
    setStoreSummary: (storeSummary) => set({ storeSummary }),
    setLabelStatusSummary: (labelStatusSummary) => set({ labelStatusSummary }),
    setGatewayStatusSummary: (gatewayStatusSummary) => set({ gatewayStatusSummary }),
    setLabelModels: (labelModels) => set({ labelModels }),
    setOverviewLoading: (overviewLoading) => set({ overviewLoading }),
    setOverviewError: (overviewError) => set({ overviewError }),
    setOverviewLastFetched: (overviewLastFetched) => set({ overviewLastFetched }),
    setArticles: (articles) => set({ articles }),
    setArticlesLoading: (articlesLoading) => set({ articlesLoading }),
    setArticlesError: (articlesError) => set({ articlesError }),
    setArticlesLastFetched: (articlesLastFetched) => set({ articlesLastFetched }),
    setArticlesTotalElements: (articlesTotalElements) => set({ articlesTotalElements }),
    setArticlesTotalPages: (articlesTotalPages) => set({ articlesTotalPages }),
    setSelectedArticle: (selectedArticle) => set({ selectedArticle }),
    setArticleHistory: (articleHistory) => set({ articleHistory }),
    setTemplates: (templates) => set({ templates, templatesLastFetched: Date.now() }),
    setTemplatesLoading: (templatesLoading) => set({ templatesLoading }),
    setTemplatesError: (templatesError) => set({ templatesError }),
    setTemplatesLastFetched: (templatesLastFetched) => set({ templatesLastFetched }),
    setTemplatesTotalElements: (templatesTotalElements) => set({ templatesTotalElements }),
    setTemplatesTotalPages: (templatesTotalPages) => set({ templatesTotalPages }),
    setTemplateTypes: (templateTypes) => set({ templateTypes }),
    setTemplateMappings: (templateMappings) => set({ templateMappings }),
    setTemplateGroups: (templateGroups) => set({ templateGroups }),
    setSelectedTemplate: (selectedTemplate) => set({ selectedTemplate }),
    setWhitelist: (whitelist) => set({ whitelist, whitelistLastFetched: Date.now() }),
    setWhitelistLoading: (whitelistLoading) => set({ whitelistLoading }),
    setWhitelistError: (whitelistError) => set({ whitelistError }),
    setWhitelistLastFetched: (whitelistLastFetched) => set({ whitelistLastFetched }),
    setWhitelistTotalElements: (whitelistTotalElements) => set({ whitelistTotalElements }),
    setWhitelistTotalPages: (whitelistTotalPages) => set({ whitelistTotalPages }),
    setUnassignedWhitelist: (unassignedWhitelist) => set({ unassignedWhitelist }),
    setActiveTab: (activeTab) => set({ activeTab }),
    reset: () => set(initialState),
}));
