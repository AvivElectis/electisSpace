/**
 * Update Store
 * 
 * Zustand store for managing update state and settings.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UpdateState, UpdateSettings, UpdateInfo, DownloadProgress } from '../domain/types';

interface UpdateStore extends UpdateState {
    settings: UpdateSettings;
    currentVersion?: string;

    // Actions
    setChecking: (checking: boolean) => void;
    setUpdateAvailable: (updateInfo: UpdateInfo) => void;
    setDownloading: (downloading: boolean) => void;
    setProgress: (progress: DownloadProgress) => void;
    setInstalling: (installing: boolean) => void;
    setError: (error: string | null) => void;
    skipVersion: (version: string) => void;
    clearUpdate: () => void;
    updateSettings: (settings: Partial<UpdateSettings>) => void;
    markCheckTime: () => void;
    setCurrentVersion: (version: string) => void;
}

const initialState: UpdateState = {
    available: false,
    checking: false,
    downloading: false,
    installing: false,
    progress: 0,
    error: null,
    updateInfo: null,
    skippedVersion: null,
};

const defaultSettings: UpdateSettings = {
    enabled: true,
    policy: 'notify', // Default to notify mode
    checkInterval: 24, // Check every 24 hours
    lastCheckTime: 0,
};

export const useUpdateStore = create<UpdateStore>()(
    persist(
        (set) => ({
            ...initialState,
            settings: defaultSettings,

            setChecking: (checking) => set({ checking, error: null }),

            setUpdateAvailable: (updateInfo) => set({
                available: true,
                checking: false,
                updateInfo,
                error: null,
            }),

            setDownloading: (downloading) => set({
                downloading,
                progress: downloading ? 0 : 100,
            }),

            setProgress: (downloadProgress) => set({
                progress: downloadProgress.percent,
            }),

            setInstalling: (installing) => set({ installing }),

            setError: (error) => set({
                error,
                checking: false,
                downloading: false,
            }),

            skipVersion: (version) => set({
                skippedVersion: version,
                available: false,
                updateInfo: null,
            }),

            clearUpdate: () => set({
                ...initialState,
                skippedVersion: null,
            }),

            updateSettings: (newSettings) => set((state) => ({
                settings: { ...state.settings, ...newSettings },
            })),

            markCheckTime: () => set((state) => ({
                settings: {
                    ...state.settings,
                    lastCheckTime: Date.now(),
                },
            })),

            setCurrentVersion: (version) => set({ currentVersion: version }),
        }),
        {
            name: 'update-store',
            partialize: (state) => ({
                settings: state.settings,
                skippedVersion: state.skippedVersion,
                // Don't persist runtime state
            }),
        }
    )
);
