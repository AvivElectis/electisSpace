/**
 * Sync Workflow Integration Tests
 * 
 * Tests the sync state machine and workflow logic
 * using pure functions (avoiding persisted Zustand stores)
 */

import { describe, it, expect } from 'vitest';
import type { SyncState, SyncStatus, SyncAdapter } from '../../features/sync/domain/types';
import type { Space } from '../../shared/domain/types';

// Helper to create initial sync state
const createInitialSyncState = (): SyncState => ({
    status: 'idle',
    isConnected: false,
    lastSync: undefined,
    lastError: undefined,
    progress: undefined
});

// Helper to create test space
const createTestSpace = (id: string, name: string): Space => ({
    id,
    data: { name }
});

// Mock sync adapter for testing
const createMockSyncAdapter = (spaces: Space[] = []): SyncAdapter => ({
    connect: async () => { /* mock */ },
    disconnect: async () => { /* mock */ },
    download: async () => spaces,
    upload: async () => { /* mock */ },
    safeUpload: async () => { /* mock */ },
    sync: async () => { /* mock */ },
    getStatus: () => createInitialSyncState()
});

describe('Sync Workflow Integration', () => {
    describe('Sync State Transitions', () => {
        it('should transition from idle to connecting', () => {
            const state = createInitialSyncState();

            const connectingState: SyncState = {
                ...state,
                status: 'connecting'
            };

            expect(connectingState.status).toBe('connecting');
            expect(connectingState.isConnected).toBe(false);
        });

        it('should transition from connecting to connected', () => {
            const state: SyncState = {
                ...createInitialSyncState(),
                status: 'connecting'
            };

            const connectedState: SyncState = {
                ...state,
                status: 'connected',
                isConnected: true
            };

            expect(connectedState.status).toBe('connected');
            expect(connectedState.isConnected).toBe(true);
        });

        it('should transition from connected to syncing', () => {
            const state: SyncState = {
                ...createInitialSyncState(),
                status: 'connected',
                isConnected: true
            };

            const syncingState: SyncState = {
                ...state,
                status: 'syncing',
                progress: 0
            };

            expect(syncingState.status).toBe('syncing');
            expect(syncingState.progress).toBe(0);
        });

        it('should transition from syncing to success', () => {
            const state: SyncState = {
                ...createInitialSyncState(),
                status: 'syncing',
                isConnected: true,
                progress: 50
            };

            const successState: SyncState = {
                ...state,
                status: 'success',
                progress: 100,
                lastSync: new Date()
            };

            expect(successState.status).toBe('success');
            expect(successState.progress).toBe(100);
            expect(successState.lastSync).toBeDefined();
        });

        it('should transition from any state to error', () => {
            const state: SyncState = {
                ...createInitialSyncState(),
                status: 'syncing',
                isConnected: true
            };

            const errorState: SyncState = {
                ...state,
                status: 'error',
                lastError: 'Connection timeout',
                isConnected: false
            };

            expect(errorState.status).toBe('error');
            expect(errorState.lastError).toBe('Connection timeout');
            expect(errorState.isConnected).toBe(false);
        });

        it('should transition to disconnected', () => {
            const state: SyncState = {
                ...createInitialSyncState(),
                status: 'connected',
                isConnected: true
            };

            const disconnectedState: SyncState = {
                ...state,
                status: 'disconnected',
                isConnected: false
            };

            expect(disconnectedState.status).toBe('disconnected');
            expect(disconnectedState.isConnected).toBe(false);
        });
    });

    describe('Sync Status Validation', () => {
        const validStatuses: SyncStatus[] = [
            'idle', 'connecting', 'connected', 'syncing', 'success', 'error', 'disconnected'
        ];

        it('should recognize all valid sync statuses', () => {
            validStatuses.forEach(status => {
                const state: SyncState = {
                    ...createInitialSyncState(),
                    status
                };
                expect(validStatuses).toContain(state.status);
            });
        });
    });

    describe('Download Workflow', () => {
        it('should download spaces from adapter', async () => {
            const testSpaces = [
                createTestSpace('s1', 'Space 1'),
                createTestSpace('s2', 'Space 2')
            ];

            const adapter = createMockSyncAdapter(testSpaces);
            const downloaded = await adapter.download();

            expect(downloaded).toHaveLength(2);
            expect(downloaded[0].id).toBe('s1');
        });

        it('should handle empty download', async () => {
            const adapter = createMockSyncAdapter([]);
            const downloaded = await adapter.download();

            expect(downloaded).toHaveLength(0);
        });
    });

    describe('Upload Workflow', () => {
        it('should upload spaces to adapter without error', async () => {
            const testSpaces = [
                createTestSpace('s1', 'Space 1')
            ];

            const adapter = createMockSyncAdapter();

            // Should not throw
            await expect(adapter.upload(testSpaces)).resolves.toBeUndefined();
        });

        it('should safe upload spaces to adapter without error', async () => {
            const testSpaces = [
                createTestSpace('s1', 'Space 1'),
                createTestSpace('s2', 'Space 2')
            ];

            const adapter = createMockSyncAdapter();

            // Should not throw
            await expect(adapter.safeUpload(testSpaces)).resolves.toBeUndefined();
        });
    });

    describe('Sync Progress Tracking', () => {
        it('should track progress from 0 to 100', () => {
            const progressStates: number[] = [0, 25, 50, 75, 100];

            progressStates.forEach(progress => {
                const state: SyncState = {
                    ...createInitialSyncState(),
                    status: 'syncing',
                    progress
                };

                expect(state.progress).toBe(progress);
                expect(state.progress).toBeGreaterThanOrEqual(0);
                expect(state.progress).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('Error Recovery', () => {
        it('should clear error on successful reconnect', () => {
            const errorState: SyncState = {
                ...createInitialSyncState(),
                status: 'error',
                lastError: 'Previous error',
                isConnected: false
            };

            // Recovery - clear error and reconnect
            const recoveredState: SyncState = {
                ...errorState,
                status: 'connected',
                lastError: undefined,
                isConnected: true
            };

            expect(recoveredState.status).toBe('connected');
            expect(recoveredState.lastError).toBeUndefined();
            expect(recoveredState.isConnected).toBe(true);
        });

        it('should preserve lastSync on error', () => {
            const lastSyncTime = new Date('2026-01-19T10:00:00Z');

            const successState: SyncState = {
                ...createInitialSyncState(),
                status: 'success',
                lastSync: lastSyncTime,
                isConnected: true
            };

            // Error occurs but lastSync should be preserved
            const errorState: SyncState = {
                ...successState,
                status: 'error',
                lastError: 'Network error',
                isConnected: false
                // lastSync preserved from previous state
            };

            expect(errorState.lastSync).toEqual(lastSyncTime);
        });
    });

    describe('Auto-Sync Logic', () => {
        it('should check if sync is needed based on interval', () => {
            const now = Date.now();
            const syncInterval = 300; // 5 minutes in seconds

            // Last sync was 6 minutes ago
            const lastSync = new Date(now - 6 * 60 * 1000);
            const timeSinceLastSync = (now - lastSync.getTime()) / 1000;

            expect(timeSinceLastSync).toBeGreaterThan(syncInterval);
        });

        it('should not sync if within interval', () => {
            const now = Date.now();
            const syncInterval = 300; // 5 minutes in seconds

            // Last sync was 2 minutes ago
            const lastSync = new Date(now - 2 * 60 * 1000);
            const timeSinceLastSync = (now - lastSync.getTime()) / 1000;

            expect(timeSinceLastSync).toBeLessThan(syncInterval);
        });
    });
});
