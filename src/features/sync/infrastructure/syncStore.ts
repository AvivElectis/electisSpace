import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SyncState } from '../domain/types';
import type { WorkingMode, SolumTokens } from '@shared/domain/types';

// Auto-sync interval constraints
export const AUTO_SYNC_MIN_INTERVAL = 10;   // Minimum 10 seconds
export const AUTO_SYNC_MAX_INTERVAL = 3600; // Maximum 1 hour
export const AUTO_SYNC_DEFAULT_INTERVAL = 30; // Default 30 seconds

interface SyncStore {
    // State
    workingMode: WorkingMode;
    syncState: SyncState;
    autoSyncEnabled: boolean;
    autoSyncInterval: number;  // in seconds (min: 10, default: 30)
    solumTokens: SolumTokens | null;

    // Actions
    setWorkingMode: (mode: WorkingMode) => void;
    setSyncState: (state: Partial<SyncState>) => void;
    setAutoSyncEnabled: (enabled: boolean) => void;
    setAutoSyncInterval: (interval: number) => void;
    setSolumTokens: (tokens: SolumTokens | null) => void;
    resetSyncState: () => void;
}

const initialSyncState: SyncState = {
    status: 'idle',
    isConnected: false,
};

export const useSyncStore = create<SyncStore>()(
    persist(
        (set) => ({
            // Initial state
            workingMode: 'SOLUM_API',
            syncState: initialSyncState,
            autoSyncEnabled: false,
            autoSyncInterval: AUTO_SYNC_DEFAULT_INTERVAL,  // 30 seconds default
            solumTokens: null,

            // Actions
            setWorkingMode: (mode) => set({ workingMode: mode }),

            setSyncState: (state) =>
                set((prev) => ({
                    syncState: { ...prev.syncState, ...state },
                })),

            setAutoSyncEnabled: (enabled) => set({ autoSyncEnabled: enabled }),

            // Validate interval: minimum 10 seconds, maximum 3600 seconds
            setAutoSyncInterval: (interval) => set({ 
                autoSyncInterval: Math.max(AUTO_SYNC_MIN_INTERVAL, Math.min(AUTO_SYNC_MAX_INTERVAL, interval)) 
            }),

            setSolumTokens: (tokens) => set({ solumTokens: tokens }),

            resetSyncState: () => set({ syncState: initialSyncState }),
        }),
        {
            name: 'sync-store',
            partialize: (state) => ({
                workingMode: state.workingMode,
                autoSyncEnabled: state.autoSyncEnabled,
                autoSyncInterval: state.autoSyncInterval,
                solumTokens: state.solumTokens,
                // Don't persist syncState - it's runtime only
            }),
        }
    )
);
