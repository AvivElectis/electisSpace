import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SyncState } from '../domain/types';
import type { WorkingMode, SolumTokens } from '@shared/domain/types';

interface SyncStore {
    // State
    workingMode: WorkingMode;
    syncState: SyncState;
    autoSyncEnabled: boolean;
    autoSyncInterval: number;  // in seconds
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
            workingMode: 'SFTP',
            syncState: initialSyncState,
            autoSyncEnabled: false,
            autoSyncInterval: 300,  // 5 minutes default
            solumTokens: null,

            // Actions
            setWorkingMode: (mode) => set({ workingMode: mode }),

            setSyncState: (state) =>
                set((prev) => ({
                    syncState: { ...prev.syncState, ...state },
                })),

            setAutoSyncEnabled: (enabled) => set({ autoSyncEnabled: enabled }),

            setAutoSyncInterval: (interval) => set({ autoSyncInterval: interval }),

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
