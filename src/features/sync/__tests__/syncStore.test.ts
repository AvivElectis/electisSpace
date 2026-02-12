/**
 * Sync Store Tests
 * 
 * Tests for the sync state management store including:
 * - Working mode switching
 * - Sync state updates
 * - Auto-sync configuration
 * - Token management
 */

import { useSyncStore } from '../infrastructure/syncStore';

describe('SyncStore', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        useSyncStore.setState({
            workingMode: 'SOLUM_API',
            syncState: { status: 'idle', isConnected: false },
            autoSyncEnabled: false,
            autoSyncInterval: 300,
            solumTokens: null,
        });
    });

    describe('Initial State', () => {
        it('should have correct initial working mode', () => {
            const { workingMode } = useSyncStore.getState();
            expect(workingMode).toBe('SOLUM_API');
        });

        it('should have idle sync state initially', () => {
            const { syncState } = useSyncStore.getState();
            expect(syncState.status).toBe('idle');
            expect(syncState.isConnected).toBe(false);
        });

        it('should have auto-sync disabled by default', () => {
            const { autoSyncEnabled, autoSyncInterval } = useSyncStore.getState();
            expect(autoSyncEnabled).toBe(false);
            expect(autoSyncInterval).toBe(300);
        });

        it('should have no tokens initially', () => {
            const { solumTokens } = useSyncStore.getState();
            expect(solumTokens).toBeNull();
        });
    });

    describe('Working Mode', () => {
        it('should remain SOLUM_API mode (only mode available)', () => {
            const { setWorkingMode } = useSyncStore.getState();

            setWorkingMode('SOLUM_API');

            const { workingMode } = useSyncStore.getState();
            expect(workingMode).toBe('SOLUM_API');
        });
    });

    describe('Sync State', () => {
        it('should update sync status to syncing', () => {
            const { setSyncState } = useSyncStore.getState();

            setSyncState({ status: 'syncing' });

            const { syncState } = useSyncStore.getState();
            expect(syncState.status).toBe('syncing');
        });

        it('should update sync status to success with lastSync', () => {
            const { setSyncState } = useSyncStore.getState();
            const now = new Date();

            setSyncState({
                status: 'success',
                lastSync: now,
                isConnected: true
            });

            const { syncState } = useSyncStore.getState();
            expect(syncState.status).toBe('success');
            expect(syncState.lastSync).toEqual(now);
            expect(syncState.isConnected).toBe(true);
        });

        it('should update sync status to error with message', () => {
            const { setSyncState } = useSyncStore.getState();

            setSyncState({
                status: 'error',
                lastError: 'Connection failed'
            });

            const { syncState } = useSyncStore.getState();
            expect(syncState.status).toBe('error');
            expect(syncState.lastError).toBe('Connection failed');
        });

        it('should merge partial state updates', () => {
            const { setSyncState } = useSyncStore.getState();

            setSyncState({ isConnected: true });
            setSyncState({ status: 'syncing' });

            const { syncState } = useSyncStore.getState();
            expect(syncState.isConnected).toBe(true);
            expect(syncState.status).toBe('syncing');
        });

        it('should reset sync state', () => {
            const { setSyncState, resetSyncState } = useSyncStore.getState();

            setSyncState({ status: 'error', lastError: 'Test error', isConnected: true });
            resetSyncState();

            const { syncState } = useSyncStore.getState();
            expect(syncState.status).toBe('idle');
            expect(syncState.isConnected).toBe(false);
            expect(syncState.lastError).toBeUndefined();
        });
    });

    describe('Auto-Sync Configuration', () => {
        it('should enable auto-sync', () => {
            const { setAutoSyncEnabled } = useSyncStore.getState();

            setAutoSyncEnabled(true);

            const { autoSyncEnabled } = useSyncStore.getState();
            expect(autoSyncEnabled).toBe(true);
        });

        it('should disable auto-sync', () => {
            const store = useSyncStore.getState();
            store.setAutoSyncEnabled(true);
            store.setAutoSyncEnabled(false);

            const { autoSyncEnabled } = useSyncStore.getState();
            expect(autoSyncEnabled).toBe(false);
        });

        it('should update auto-sync interval', () => {
            const { setAutoSyncInterval } = useSyncStore.getState();

            setAutoSyncInterval(600); // 10 minutes

            const { autoSyncInterval } = useSyncStore.getState();
            expect(autoSyncInterval).toBe(600);
        });
    });

    describe('Token Management', () => {
        it('should set SoluM tokens', () => {
            const { setSolumTokens } = useSyncStore.getState();
            const tokens = {
                accessToken: 'test-access-token',
                refreshToken: 'test-refresh-token',
                expiresAt: Date.now() + 3600000,
            };

            setSolumTokens(tokens);

            const { solumTokens } = useSyncStore.getState();
            expect(solumTokens).toEqual(tokens);
        });

        it('should clear tokens on logout', () => {
            const { setSolumTokens } = useSyncStore.getState();

            setSolumTokens({
                accessToken: 'token',
                refreshToken: 'refresh',
                expiresAt: Date.now(),
            });
            setSolumTokens(null);

            const { solumTokens } = useSyncStore.getState();
            expect(solumTokens).toBeNull();
        });
    });
});
