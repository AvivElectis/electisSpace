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

    // Label history
    labelHistory: any | null;
    labelHistoryLoading: boolean;

    // Batch history
    batchHistory: any | null;
    batchHistoryLoading: boolean;

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
    setLabelHistory: (history: any | null) => void;
    setLabelHistoryLoading: (loading: boolean) => void;
    setBatchHistory: (history: any | null) => void;
    setBatchHistoryLoading: (loading: boolean) => void;
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
    labelHistory: null,
    labelHistoryLoading: false,
    batchHistory: null,
    batchHistoryLoading: false,
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
    setLabelHistory: (labelHistory) => set({ labelHistory }),
    setLabelHistoryLoading: (labelHistoryLoading) => set({ labelHistoryLoading }),
    setBatchHistory: (batchHistory) => set({ batchHistory }),
    setBatchHistoryLoading: (batchHistoryLoading) => set({ batchHistoryLoading }),
    setActiveTab: (activeTab) => set({ activeTab }),
    reset: () => set(initialState),
}));
