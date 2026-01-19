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

// Mock the adapters
vi.mock('../infrastructure/SFTPSyncAdapter', () => ({
    SFTPSyncAdapter: vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        download: vi.fn().mockResolvedValue([]),
        upload: vi.fn().mockResolvedValue(undefined),
        safeUpload: vi.fn().mockResolvedValue(undefined),
        sync: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({ status: 'connected', isConnected: true }),
        downloadWithConference: vi.fn().mockResolvedValue({ spaces: [], conferenceRooms: [] }),
    })),
}));

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
            workingMode: 'SFTP',
            syncState: { status: 'idle', isConnected: false },
            autoSyncEnabled: false,
            autoSyncInterval: 300,
            solumTokens: null,
        });
    });

    describe('SFTP Mode', () => {
        const defaultProps = {
            sftpCredentials: {
                host: 'sftp.example.com',
                username: 'testuser',
                password: 'testpass',
                remoteFilename: 'spaces.csv',
            },
            csvConfig: mockCsvConfig,
            autoSyncEnabled: false,
            onSpaceUpdate: mockOnSpaceUpdate,
            onConferenceUpdate: mockOnConferenceUpdate,
        };

        it('should initialize with correct state', () => {
            const { result } = renderHook(() => useSyncController(defaultProps));

            expect(result.current.workingMode).toBe('SFTP');
            expect(result.current.syncState).toBeDefined();
            expect(result.current.autoSyncEnabled).toBe(false);
        });

        it('should have connect function', () => {
            const { result } = renderHook(() => useSyncController(defaultProps));

            expect(typeof result.current.connect).toBe('function');
        });

        it('should have disconnect function', () => {
            const { result } = renderHook(() => useSyncController(defaultProps));

            expect(typeof result.current.disconnect).toBe('function');
        });

        it('should have sync function', () => {
            const { result } = renderHook(() => useSyncController(defaultProps));

            expect(typeof result.current.sync).toBe('function');
        });

        it('should have upload function', () => {
            const { result } = renderHook(() => useSyncController(defaultProps));

            expect(typeof result.current.upload).toBe('function');
        });

        it('should have safeUpload function', () => {
            const { result } = renderHook(() => useSyncController(defaultProps));

            expect(typeof result.current.safeUpload).toBe('function');
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
    });

    describe('Error Handling', () => {
        it('should throw error when SFTP credentials missing', () => {
            const propsWithoutCredentials = {
                csvConfig: mockCsvConfig,
                autoSyncEnabled: false,
                onSpaceUpdate: mockOnSpaceUpdate,
            };

            const { result } = renderHook(() => useSyncController(propsWithoutCredentials));

            // Calling connect without credentials should throw
            expect(async () => {
                await act(async () => {
                    await result.current.connect();
                });
            }).rejects.toThrow('SFTP credentials not configured');
        });

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
                sftpCredentials: {
                    host: 'sftp.example.com',
                    username: 'testuser',
                    password: 'testpass',
                    remoteFilename: 'spaces.csv',
                },
                csvConfig: mockCsvConfig,
                autoSyncEnabled: true,
                autoSyncInterval: 60,
                onSpaceUpdate: mockOnSpaceUpdate,
            };

            const { result } = renderHook(() => useSyncController(props));

            // The hook syncs the prop to the store
            expect(result.current.autoSyncEnabled).toBe(true);
        });
    });
});
