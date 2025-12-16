/**
 * Root Store - Unified State Management
 * 
 * Combines all feature stores into a single global store with:
 * - Persistence middleware for selective data
 * - DevTools integration for debugging
 * - Type-safe access to all store slices
 */

import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { useSyncStore } from '@features/sync/infrastructure/syncStore';
import { useConferenceStore } from '@features/conference/infrastructure/conferenceStore';

// Re-export all feature stores for centralized access
export { useSettingsStore, useSpacesStore, useSyncStore, useConferenceStore };

/**
 * Root Store Hook
 * 
 * This is a convenience hook that provides access to commonly used
 * state from multiple stores in a single call.
 * 
 * @example
 * const { appName, workingMode, isConnected } = useRootStore();
 */
export function useRootStore() {
    const settings = useSettingsStore((state) => state.settings);
    const workingMode = useSyncStore((state) => state.workingMode);
    const syncState = useSyncStore((state) => state.syncState);
    const spaces = useSpacesStore((state) => state.spaces);
    const conferenceRooms = useConferenceStore((state) => state.conferenceRooms);

    return {
        // Settings
        appName: settings.appName,
        appSubtitle: settings.appSubtitle,
        spaceType: settings.spaceType,

        // Sync
        workingMode,
        isConnected: syncState.isConnected,
        syncStatus: syncState.status,

        // Data counts (useful for dashboard)
        spacesCount: spaces.length,
        conferenceRoomCount: conferenceRooms.length,
    };
}

/**
 * Store Hydration Check
 * 
 * Checks if the stores have been hydrated from localStorage.
 * Useful for preventing hydration mismatches in SSR scenarios.
 */
export function useStoreHydration() {
    const settingsHydrated = useSettingsStore.persist?.hasHydrated();
    const spacesHydrated = useSpacesStore.persist?.hasHydrated();
    const syncHydrated = useSyncStore.persist?.hasHydrated();

    return {
        isHydrated: settingsHydrated && spacesHydrated && syncHydrated,
        settingsHydrated,
        spacesHydrated,
        syncHydrated,
    };
}

/**
 * Clear All Stores
 * 
 * Utility to reset all stores to their initial state.
 * Useful for logout or data reset scenarios.
 */
export function clearAllStores() {
    useSettingsStore.getState().resetSettings();
    useSpacesStore.persist?.clearStorage();
    useSyncStore.persist?.clearStorage();
    useConferenceStore.persist?.clearStorage();
}
