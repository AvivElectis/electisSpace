/**
 * useSpaceController Hook Tests
 * 
 * Tests for the space controller hook including:
 * - Space CRUD operations (add, update, delete)
 * - SFTP and SoluM mode handling
 * - Validation
 * - Spaces list management
 * - Fetch from AIMS
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSpaceController } from '../application/useSpaceController';
import { useSpacesStore } from '../infrastructure/spacesStore';
import type { CSVConfig } from '@shared/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';

// Mock the SFTP adapter
vi.mock('../../sync/infrastructure/SFTPSyncAdapter', () => ({
    SFTPSyncAdapter: vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        download: vi.fn().mockResolvedValue([]),
        upload: vi.fn().mockResolvedValue(undefined),
        downloadWithConference: vi.fn().mockResolvedValue({ spaces: [], conferenceRooms: [] }),
    })),
}));

// Mock the SoluM adapter
vi.mock('../../sync/infrastructure/SolumSyncAdapter', () => ({
    SolumSyncAdapter: vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        download: vi.fn().mockResolvedValue([]),
        upload: vi.fn().mockResolvedValue(undefined),
    })),
}));

// Mock solumService
vi.mock('@shared/infrastructure/services/solumService', () => ({
    pushArticles: vi.fn().mockResolvedValue(undefined),
    putArticles: vi.fn().mockResolvedValue(undefined),
    deleteArticle: vi.fn().mockResolvedValue(undefined),
    fetchArticles: vi.fn().mockResolvedValue([]),
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

// Mock conference store
vi.mock('@features/conference/infrastructure/conferenceStore', () => ({
    useConferenceStore: {
        getState: () => ({ conferenceRooms: [] }),
    },
}));

// Helper to reset the spaces store
const resetSpacesStore = () => {
    const store = useSpacesStore.getState();
    store.setSpaces([]);
    store.setActiveListName(undefined);
    store.setActiveListId(undefined);
    // Clear lists by deleting each one
    store.spacesLists.forEach(list => store.deleteSpacesList(list.id));
};

describe('useSpaceController', () => {
    // CSV config without required 'id' in columns - ID is handled separately by the controller
    const mockCsvConfig: CSVConfig = {
        delimiter: ',',
        columns: [
            { name: 'roomName', type: 'string', required: false },
            { name: 'floor', type: 'string', required: false },
        ],
        mapping: {
            roomName: 'roomName',
            floor: 'floor',
        },
        conferenceEnabled: false,
    };

    const mockSolumConfig = {
        companyCode: 'TEST',
        storeNumber: 'STORE001',
        apiCluster: 'C1' as const,
        baseUrl: 'https://test.api.com',
    };

    const mockSolumMappingConfig: SolumMappingConfig = {
        fields: {
            id: { label: 'ID', visible: true, editable: true, type: 'string' },
            roomName: { label: 'Room Name', visible: true, editable: true, type: 'string' },
        },
        globalFieldAssignments: {},
        mappingInfo: {
            articleId: 'id',
            articleName: 'roomName',
        },
    };

    beforeEach(() => {
        // Reset stores before each test
        resetSpacesStore();
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with empty spaces', () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            expect(result.current.spaces).toEqual([]);
            expect(result.current.isFetching).toBe(false);
        });

        it('should expose all required functions', () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            expect(typeof result.current.addSpace).toBe('function');
            expect(typeof result.current.updateSpace).toBe('function');
            expect(typeof result.current.deleteSpace).toBe('function');
            expect(typeof result.current.fetchFromSolum).toBe('function');
            expect(typeof result.current.getAllSpaces).toBe('function');
        });

        it('should expose list management functions', () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            expect(typeof result.current.saveSpacesList).toBe('function');
            expect(typeof result.current.loadSpacesList).toBe('function');
            expect(typeof result.current.deleteSpacesList).toBe('function');
            expect(result.current.spacesLists).toEqual([]);
        });
    });

    describe('Add Space', () => {
        it('should add a space to the store', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            await act(async () => {
                await result.current.addSpace({
                    id: 'SPACE-001',
                    data: { roomName: 'Conference Room A' },
                });
            });

            expect(result.current.spaces).toHaveLength(1);
            expect(result.current.spaces[0].id).toBe('SPACE-001');
        });

        it('should generate ID if not provided', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            await act(async () => {
                await result.current.addSpace({
                    data: { roomName: 'Test Room' },
                });
            });

            expect(result.current.spaces).toHaveLength(1);
            expect(result.current.spaces[0].id).toBeTruthy();
        });

        it('should throw error for duplicate ID', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            await act(async () => {
                await result.current.addSpace({
                    id: 'SPACE-001',
                    data: { roomName: 'Room A' },
                });
            });

            await expect(
                act(async () => {
                    await result.current.addSpace({
                        id: 'SPACE-001',
                        data: { roomName: 'Room B' },
                    });
                })
            ).rejects.toThrow('Space ID already exists');
        });
    });

    describe('Update Space', () => {
        it('should update an existing space', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            // Add space first
            await act(async () => {
                await result.current.addSpace({
                    id: 'SPACE-001',
                    data: { roomName: 'Original Name' },
                });
            });

            // Update space
            await act(async () => {
                await result.current.updateSpace('SPACE-001', {
                    data: { roomName: 'Updated Name' },
                });
            });

            expect(result.current.spaces[0].data?.roomName).toBe('Updated Name');
        });

        it('should throw error for non-existent space', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            await expect(
                act(async () => {
                    await result.current.updateSpace('NON-EXISTENT', {
                        data: { roomName: 'Test' },
                    });
                })
            ).rejects.toThrow('Space not found');
        });
    });

    describe('Delete Space', () => {
        it('should delete an existing space', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            // Add space first
            await act(async () => {
                await result.current.addSpace({
                    id: 'SPACE-001',
                    data: { roomName: 'To Delete' },
                });
            });

            expect(result.current.spaces).toHaveLength(1);

            // Delete space
            await act(async () => {
                await result.current.deleteSpace('SPACE-001');
            });

            expect(result.current.spaces).toHaveLength(0);
        });

        it('should throw error for non-existent space', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            await expect(
                act(async () => {
                    await result.current.deleteSpace('NON-EXISTENT');
                })
            ).rejects.toThrow('Space not found');
        });
    });

    describe('Clear Spaces', () => {
        it('should clear all spaces using store directly', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            // Add multiple spaces
            await act(async () => {
                await result.current.addSpace({ id: 'SPACE-001', data: {} });
                await result.current.addSpace({ id: 'SPACE-002', data: {} });
                await result.current.addSpace({ id: 'SPACE-003', data: {} });
            });

            expect(result.current.spaces).toHaveLength(3);

            // Clear all using store
            act(() => {
                useSpacesStore.getState().setSpaces([]);
            });

            expect(result.current.spaces).toHaveLength(0);
        });
    });

    describe('Spaces List Management', () => {
        it('should save a spaces list', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            // Add some spaces
            await act(async () => {
                await result.current.addSpace({ id: 'SPACE-001', data: { roomName: 'Room 1' } });
                await result.current.addSpace({ id: 'SPACE-002', data: { roomName: 'Room 2' } });
            });

            // Save as list
            act(() => {
                result.current.saveSpacesList('Test List');
            });

            expect(result.current.spacesLists).toHaveLength(1);
            expect(result.current.spacesLists[0].name).toBe('Test List');
            expect(result.current.spacesLists[0].spaces).toHaveLength(2);
        });

        it('should load a saved spaces list', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            // Add spaces and save
            await act(async () => {
                await result.current.addSpace({ id: 'SPACE-001', data: { roomName: 'Room 1' } });
            });

            act(() => {
                result.current.saveSpacesList('Saved List');
            });

            // Clear spaces using store
            act(() => {
                useSpacesStore.getState().setSpaces([]);
            });

            expect(result.current.spaces).toHaveLength(0);

            // Load the saved list
            const savedList = result.current.spacesLists[0];
            act(() => {
                result.current.loadSpacesList(savedList.id);
            });

            expect(result.current.spaces).toHaveLength(1);
            expect(result.current.spaces[0].id).toBe('SPACE-001');
        });

        it('should delete a spaces list', async () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            // Add spaces and save
            await act(async () => {
                await result.current.addSpace({ id: 'SPACE-001', data: {} });
            });

            act(() => {
                result.current.saveSpacesList('To Delete');
            });

            expect(result.current.spacesLists).toHaveLength(1);

            // Delete the list
            const listId = result.current.spacesLists[0].id;
            act(() => {
                result.current.deleteSpacesList(listId);
            });

            expect(result.current.spacesLists).toHaveLength(0);
        });
    });

    describe('SFTP Mode', () => {
        const sftpCredentials = {
            host: 'sftp.example.com',
            port: 22,
            username: 'testuser',
            password: 'testpass',
            remotePath: '/data',
        };

        it('should initialize in SFTP mode', () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                    workingMode: 'SFTP',
                    sftpCredentials,
                })
            );

            expect(result.current.spaces).toEqual([]);
        });
    });

    describe('SoluM Mode', () => {
        it('should initialize in SoluM mode with config', () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                    workingMode: 'SOLUM_API',
                    solumConfig: mockSolumConfig,
                    solumToken: 'mock-token',
                    solumMappingConfig: mockSolumMappingConfig,
                })
            );

            expect(result.current.spaces).toEqual([]);
            expect(typeof result.current.fetchFromSolum).toBe('function');
        });
    });

    describe('Fetching State', () => {
        it('should have isFetching state', () => {
            const { result } = renderHook(() =>
                useSpaceController({
                    csvConfig: mockCsvConfig,
                })
            );

            expect(result.current.isFetching).toBe(false);
        });
    });
});
