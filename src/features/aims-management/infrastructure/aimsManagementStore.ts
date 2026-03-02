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
    setStoreSummary: (data: any | null) => void;
    setLabelStatusSummary: (data: any | null) => void;
    setGatewayStatusSummary: (data: any | null) => void;
    setLabelModels: (data: any[]) => void;
    setOverviewLoading: (loading: boolean) => void;
    setOverviewError: (error: string | null) => void;
    setOverviewLastFetched: (ts: number | null) => void;
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
    setStoreSummary: (storeSummary) => set({ storeSummary }),
    setLabelStatusSummary: (labelStatusSummary) => set({ labelStatusSummary }),
    setGatewayStatusSummary: (gatewayStatusSummary) => set({ gatewayStatusSummary }),
    setLabelModels: (labelModels) => set({ labelModels }),
    setOverviewLoading: (overviewLoading) => set({ overviewLoading }),
    setOverviewError: (overviewError) => set({ overviewError }),
    setOverviewLastFetched: (overviewLastFetched) => set({ overviewLastFetched }),
    setActiveTab: (activeTab) => set({ activeTab }),
    reset: () => set(initialState),
}));
