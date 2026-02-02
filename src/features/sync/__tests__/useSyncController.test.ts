/**
 * useSyncController Hook Tests
 * 
 * Tests for the sync controller hook including:
 * - Connection/disconnection
 * - Sync operations
 * - Auto-sync scheduling
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncController } from '../application/useSyncController';
import { useSyncStore } from '../infrastructure/syncStore';
import type { CSVConfig } from '@shared/domain/types';

// Mock the SoluM adapter
vi.mock('../infrastructure/SolumSyncAdapter', () => ({
    SolumSyncAdapter: vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        download: vi.fn().mockResolvedValue([]),
        upload: vi.fn().mockResolvedValue(undefined),
        safeUpload: vi.fn().mockResolvedValue(undefined),
        sync: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({ status: 'connected', isConnected: true }),
    })),
}));

// Mock logger
vi.mock('@shared/infrastructure/services/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        startTimer: vi.fn(),
        endTimer: vi.fn(),
    },
}));

describe('useSyncController', () => {
    const mockCsvConfig: CSVConfig = {
        delimiter: ',',
        columns: [],
        mapping: {},
        conferenceEnabled: false,
    };

    const mockOnSpaceUpdate = vi.fn();
    const mockOnConferenceUpdate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset sync store
        useSyncStore.setState({
            workingMode: 'SOLUM_API',
            syncState: { status: 'idle', isConnected: false },
            autoSyncEnabled: false,
            autoSyncInterval: 300,
            solumTokens: null,
        });
    });

    describe('SoluM Mode', () => {
        beforeEach(() => {
            useSyncStore.setState({
                workingMode: 'SOLUM_API',
                syncState: { status: 'idle', isConnected: false },
                autoSyncEnabled: false,
                autoSyncInterval: 60,
                solumTokens: {
                    accessToken: 'test-token',
                    refreshToken: 'test-refresh',
                    expiresAt: Date.now() + 3600000,
                },
            });
        });

        const solumProps = {
            solumConfig: {
                companyName: 'testcompany',
                username: 'user',
                password: 'pass',
                storeNumber: '001',
                cluster: 'common' as const,
                baseUrl: 'https://eu.common.solumesl.com',
                syncInterval: 60,
                isConnected: true,
                tokens: {
                    accessToken: 'test-token',
                    refreshToken: 'test-refresh',
                    expiresAt: Date.now() + 3600000,
                },
            },
            csvConfig: mockCsvConfig,
            autoSyncEnabled: false,
            onSpaceUpdate: mockOnSpaceUpdate,
            onConferenceUpdate: mockOnConferenceUpdate,
            isConnected: true,
        };

        it('should initialize with SoluM working mode', () => {
            const { result } = renderHook(() => useSyncController(solumProps));

            expect(result.current.workingMode).toBe('SOLUM_API');
        });

        it('should expose all required functions', () => {
            const { result } = renderHook(() => useSyncController(solumProps));

            expect(result.current.connect).toBeDefined();
            expect(result.current.disconnect).toBeDefined();
            expect(result.current.sync).toBeDefined();
            expect(result.current.upload).toBeDefined();
            expect(result.current.safeUpload).toBeDefined();
        });

        it('should have correct state structure', () => {
            const { result } = renderHook(() => useSyncController(solumProps));

            expect(result.current.workingMode).toBeDefined();
            expect(result.current.syncState).toBeDefined();
            expect(result.current.autoSyncEnabled).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should throw error when SoluM config missing', () => {
            useSyncStore.setState({ workingMode: 'SOLUM_API' });

            const propsWithoutConfig = {
                csvConfig: mockCsvConfig,
                autoSyncEnabled: false,
                onSpaceUpdate: mockOnSpaceUpdate,
            };

            const { result } = renderHook(() => useSyncController(propsWithoutConfig));

            // Calling connect without config should throw
            expect(async () => {
                await act(async () => {
                    await result.current.connect();
                });
            }).rejects.toThrow('SoluM configuration not configured');
        });
    });

    describe('Auto-Sync', () => {
        it('should reflect autoSyncEnabled from props', () => {
            const props = {
                solumConfig: {
                    companyName: 'testcompany',
                    username: 'user',
                    password: 'pass',
                    storeNumber: '001',
                    cluster: 'common' as const,
                    baseUrl: 'https://eu.common.solumesl.com',
                    syncInterval: 60,
                    isConnected: true,
                },
                csvConfig: mockCsvConfig,
                autoSyncEnabled: true,
                autoSyncInterval: 60,
                onSpaceUpdate: mockOnSpaceUpdate,
            };

            useSyncStore.setState({
                workingMode: 'SOLUM_API',
                solumTokens: {
                    accessToken: 'test-token',
                    refreshToken: 'test-refresh',
                    expiresAt: Date.now() + 3600000,
                },
            });

            const { result } = renderHook(() => useSyncController(props));

            // The hook syncs the prop to the store
            expect(result.current.autoSyncEnabled).toBe(true);
        });
    });
});
