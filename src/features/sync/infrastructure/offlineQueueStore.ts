/**
 * Offline Queue Store
 * 
 * Zustand store for managing operations queued while offline.
 * Operations are persisted to localStorage and synced when back online.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OfflineOperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type OfflineEntityType = 'space' | 'person' | 'conferenceRoom' | 'peopleList';

export interface OfflineQueueItem {
    id: string;
    entityType: OfflineEntityType;
    entityId?: string;  // undefined for CREATE operations
    operation: OfflineOperationType;
    payload: Record<string, unknown>;
    storeId: string;
    timestamp: number;
    retryCount: number;
    lastError?: string;
}

interface OfflineQueueState {
    // State
    items: OfflineQueueItem[];
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncAttempt: number | null;
    
    // Actions
    addItem: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => string;
    removeItem: (id: string) => void;
    updateItem: (id: string, updates: Partial<OfflineQueueItem>) => void;
    clearItems: (storeId?: string) => void;
    markError: (id: string, error: string) => void;
    incrementRetry: (id: string) => void;
    setOnline: (isOnline: boolean) => void;
    setSyncing: (isSyncing: boolean) => void;
    setLastSyncAttempt: (timestamp: number) => void;
    getItemsByStore: (storeId: string) => OfflineQueueItem[];
    getPendingCount: (storeId?: string) => number;
}

// Generate unique ID for queue items
const generateId = (): string => {
    return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const useOfflineQueueStore = create<OfflineQueueState>()(
    persist(
        (set, get) => ({
            // Initial state
            items: [],
            isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
            isSyncing: false,
            lastSyncAttempt: null,

            // Actions
            addItem: (item) => {
                const id = generateId();
                const newItem: OfflineQueueItem = {
                    ...item,
                    id,
                    timestamp: Date.now(),
                    retryCount: 0,
                };
                set((state) => ({
                    items: [...state.items, newItem],
                }));
                return id;
            },

            removeItem: (id) => {
                set((state) => ({
                    items: state.items.filter((item) => item.id !== id),
                }));
            },

            updateItem: (id, updates) => {
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, ...updates } : item
                    ),
                }));
            },

            clearItems: (storeId) => {
                set((state) => ({
                    items: storeId
                        ? state.items.filter((item) => item.storeId !== storeId)
                        : [],
                }));
            },

            markError: (id, error) => {
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, lastError: error } : item
                    ),
                }));
            },

            incrementRetry: (id) => {
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item
                    ),
                }));
            },

            setOnline: (isOnline) => {
                set({ isOnline });
            },

            setSyncing: (isSyncing) => {
                set({ isSyncing });
            },

            setLastSyncAttempt: (timestamp) => {
                set({ lastSyncAttempt: timestamp });
            },

            getItemsByStore: (storeId) => {
                return get().items.filter((item) => item.storeId === storeId);
            },

            getPendingCount: (storeId) => {
                const items = get().items;
                return storeId
                    ? items.filter((item) => item.storeId === storeId).length
                    : items.length;
            },
        }),
        {
            name: 'offline-queue-store',
            partialize: (state) => ({
                items: state.items,
                lastSyncAttempt: state.lastSyncAttempt,
            }),
        }
    )
);
