import { createContext, useContext } from 'react';
import type { useSyncController } from './useSyncController';
import type { useBackendSyncController } from './useBackendSyncController';

// Union type supporting both legacy and new controller
type SyncControllerReturn = ReturnType<typeof useSyncController> | ReturnType<typeof useBackendSyncController>;

// Backend controller type for pages that need the full API
export type BackendSyncController = ReturnType<typeof useBackendSyncController>;

const SyncContext = createContext<SyncControllerReturn | null>(null);

export function useSyncContext() {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSyncContext must be used within a SyncProvider');
    }
    return context;
}

/**
 * Type-safe hook that returns the backend sync controller.
 * Only use this in pages/components that know the context is a BackendSyncController.
 */
export function useBackendSyncContext(): BackendSyncController {
    const context = useSyncContext();
    // Return as BackendSyncController — works at runtime since MainLayout always provides it
    return context as BackendSyncController;
}

export const SyncProvider = SyncContext.Provider;
