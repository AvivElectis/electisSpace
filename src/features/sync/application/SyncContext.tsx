import { createContext, useContext } from 'react';
import type { useSyncController } from './useSyncController';
import type { useBackendSyncController } from './useBackendSyncController';

// Union type supporting both legacy and new controller
type SyncControllerReturn = ReturnType<typeof useSyncController> | ReturnType<typeof useBackendSyncController>;

const SyncContext = createContext<SyncControllerReturn | null>(null);

export function useSyncContext() {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSyncContext must be used within a SyncProvider');
    }
    return context;
}

export const SyncProvider = SyncContext.Provider;
