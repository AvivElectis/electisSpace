import { renderHook, act } from '@testing-library/react';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import { useConferenceController } from '../application/useConferenceController';
import { useConferenceStore } from '../infrastructure/conferenceStore';
import { conferenceApi } from '../infrastructure/conferenceApi';

// Mock the adapters
vi.mock('@features/sync/infrastructure/SFTPSyncAdapter', () => ({
    SFTPSyncAdapter: vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        upload: vi.fn().mockResolvedValue(undefined),
        updateCredentials: vi.fn(),
        updateCSVConfig: vi.fn(),
    })),
}));

// Mock solumService
vi.mock('@shared/infrastructure/services/solumService', () => ({
    pushArticles: vi.fn().mockResolvedValue(undefined),
    putArticles: vi.fn().mockResolvedValue(undefined),
    deleteArticle: vi.fn().mockResolvedValue(undefined),
    fetchArticles: vi.fn().mockResolvedValue([]),
    flipLabelPage: vi.fn().mockResolvedValue(undefined),
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

// Mock spaces store
vi.mock('@features/space/infrastructure/spacesStore', () => ({
    useSpacesStore: {
        getState: () => ({ spaces: [] }),
    },
}));

// Mock auth store (provides activeStoreId for server API calls)
vi.mock('@features/auth/infrastructure/authStore', () => ({
    useAuthStore: {
        getState: () => ({ activeStoreId: 'test-store-id' }),
    },
}));

// Mock conferenceApi (used by conferenceStore for server operations)
vi.mock('../infrastructure/conferenceApi', () => {
    const api = {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        toggleMeeting: vi.fn(),
        getAll: vi.fn().mockResolvedValue({ rooms: [], stats: { total: 0, withLabels: 0, withMeetings: 0, available: 0 } }),
        getById: vi.fn(),
        flipPage: vi.fn(),
    };
    return { conferenceApi: api, default: api };
});

/**
 * Test the dynamic article building logic from mappingInfo
 * This mirrors the logic in useConferenceController
 */

interface ConferenceRoom {
    id: string;
    hasMeeting: boolean;
    meetingName?: string;
    startTime?: string;
    endTime?: string;
    participants?: string[];
    labelCode?: string;
    data?: Record<string, string>;
}

/**
 * Builds an AIMS article dynamically from mappingInfo
 * Extracted logic for testing - mirrors useConferenceController logic
 */
function buildAimsArticle(
    room: ConferenceRoom,
    articleData: Record<string, any>,
    solumMappingConfig: SolumMappingConfig
): any {
    const mappingInfo = solumMappingConfig.mappingInfo;

    // Step 1: Add articleId and articleName to articleData using their mapped field keys
    if (mappingInfo?.articleId && !articleData[mappingInfo.articleId]) {
        articleData[mappingInfo.articleId] = room.id;
    }
    if (mappingInfo?.articleName && !articleData[mappingInfo.articleName]) {
        articleData[mappingInfo.articleName] = room.data?.roomName || room.id;
    }

    // Step 2: Build AIMS article dynamically from mappingInfo
    const aimsArticle: any = {
        data: articleData
    };

    // Dynamically map all root-level fields from mappingInfo (articleId, articleName, nfcUrl, etc.)
    if (mappingInfo) {
        Object.entries(mappingInfo).forEach(([rootField, dataField]) => {
            if (!dataField) return;

            // Check articleData first
            if (articleData[dataField]) {
                aimsArticle[rootField] = String(articleData[dataField]);
            }
            // Then check globalFieldAssignments
            else if (solumMappingConfig.globalFieldAssignments?.[dataField]) {
                aimsArticle[rootField] = String(solumMappingConfig.globalFieldAssignments[dataField]);
            }
            // Finally check room properties directly (for id, roomName, etc.)
            else if (dataField === 'id' || dataField.toLowerCase() === 'article_id') {
                aimsArticle[rootField] = String(room.id);
            } else if (room.data?.[dataField]) {
                aimsArticle[rootField] = String(room.data[dataField]);
            } else if ((room as any)[dataField] !== undefined) {
                aimsArticle[rootField] = String((room as any)[dataField]);
            }
        });
    }

    // Step 3: Add defaults if not mapped
    if (!aimsArticle.articleId) {
        aimsArticle.articleId = room.id;
    }
    if (!aimsArticle.articleName) {
        aimsArticle.articleName = room.data?.roomName || room.id;
    }

    return aimsArticle;
}

describe('useConferenceController - Dynamic Article Building', () => {
    const baseMappingConfig: SolumMappingConfig = {
        uniqueIdField: 'article_id',
        fields: {
            article_id: { friendlyNameEn: 'ID', friendlyNameHe: 'מזהה', visible: true },
            name: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true },
            nfc_url: { friendlyNameEn: 'NFC URL', friendlyNameHe: 'כתובת NFC', visible: true },
        },
        conferenceMapping: {
            meetingName: 'meeting_name',
            meetingTime: 'meeting_time',
            participants: 'participants',
        },
        mappingInfo: {
            store: 'store_id',
            articleId: 'article_id',
            articleName: 'name',
            nfcUrl: 'nfc_url',
        },
        globalFieldAssignments: {},
    };

    describe('buildAimsArticle', () => {
        it('should map articleId from articleData when present', () => {
            const room: ConferenceRoom = {
                id: 'C001',
                hasMeeting: false,
                data: { roomName: 'Meeting Room 1' },
            };
            const articleData = {
                article_id: 'C001',
                name: 'Meeting Room 1',
            };

            const result = buildAimsArticle(room, articleData, baseMappingConfig);

            expect(result.articleId).toBe('C001');
            expect(result.articleName).toBe('Meeting Room 1');
            expect(result.data).toEqual(articleData);
        });

        it('should map nfcUrl from articleData when present', () => {
            const room: ConferenceRoom = {
                id: 'C002',
                hasMeeting: false,
            };
            const articleData = {
                article_id: 'C002',
                name: 'Room 2',
                nfc_url: 'https://example.com/nfc/C002',
            };

            const result = buildAimsArticle(room, articleData, baseMappingConfig);

            expect(result.nfcUrl).toBe('https://example.com/nfc/C002');
        });

        it('should fallback to globalFieldAssignments when not in articleData', () => {
            const room: ConferenceRoom = {
                id: 'C003',
                hasMeeting: false,
            };
            const articleData = {
                article_id: 'C003',
            };
            const configWithGlobals: SolumMappingConfig = {
                ...baseMappingConfig,
                globalFieldAssignments: {
                    nfc_url: 'https://global.nfc.url/default',
                },
            };

            const result = buildAimsArticle(room, articleData, configWithGlobals);

            expect(result.nfcUrl).toBe('https://global.nfc.url/default');
        });

        it('should fallback to room.id for articleId when not in articleData', () => {
            const room: ConferenceRoom = {
                id: 'C004',
                hasMeeting: true,
                meetingName: 'Sprint Planning',
            };
            const articleData = {}; // Empty articleData

            // Mapping where dataField is 'id' directly
            const configWithIdMapping: SolumMappingConfig = {
                ...baseMappingConfig,
                mappingInfo: {
                    store: 'store_id',
                    articleId: 'id',  // Maps to room.id directly
                    articleName: 'name',
                    nfcUrl: 'nfc_url',
                },
            };

            const result = buildAimsArticle(room, articleData, configWithIdMapping);

            expect(result.articleId).toBe('C004');
        });

        it('should map from room.data when dataField matches a data key', () => {
            const room: ConferenceRoom = {
                id: 'C005',
                hasMeeting: false,
                data: {
                    roomName: 'Board Room',
                    customField: 'custom value',
                },
            };
            const articleData = {
                article_id: 'C005',
            };
            const configWithCustomField: SolumMappingConfig = {
                ...baseMappingConfig,
                mappingInfo: {
                    store: 'store_id',
                    articleId: 'article_id',
                    articleName: 'name',
                    nfcUrl: 'nfc_url',
                    customRoot: 'customField',  // Should get from room.data
                },
            };

            const result = buildAimsArticle(room, articleData, configWithCustomField);

            expect(result.customRoot).toBe('custom value');
        });

        it('should handle all fields dynamically without hardcoding', () => {
            const room: ConferenceRoom = {
                id: 'C006',
                hasMeeting: true,
                meetingName: 'All Hands',
            };
            const articleData = {
                article_id: 'C006',
                name: 'Main Hall',
                nfc_url: 'https://nfc.example.com/C006',
                extra_field: 'extra value',
            };
            const configWithExtraMapping: SolumMappingConfig = {
                ...baseMappingConfig,
                mappingInfo: {
                    store: 'store_id',
                    articleId: 'article_id',
                    articleName: 'name',
                    nfcUrl: 'nfc_url',
                    extraRoot: 'extra_field',  // New field added dynamically
                },
            };

            const result = buildAimsArticle(room, articleData, configWithExtraMapping);

            expect(result.articleId).toBe('C006');
            expect(result.articleName).toBe('Main Hall');
            expect(result.nfcUrl).toBe('https://nfc.example.com/C006');
            expect(result.extraRoot).toBe('extra value');
        });

        it('should skip fields with empty dataField', () => {
            const room: ConferenceRoom = {
                id: 'C007',
                hasMeeting: false,
            };
            const articleData = {
                article_id: 'C007',
            };
            const configWithEmptyMapping: SolumMappingConfig = {
                ...baseMappingConfig,
                mappingInfo: {
                    store: 'store_id',
                    articleId: 'article_id',
                    articleName: '',  // Empty - should be skipped but fallback kicks in
                    nfcUrl: undefined as any,  // Undefined - should be skipped
                },
            };

            const result = buildAimsArticle(room, articleData, configWithEmptyMapping);

            expect(result.articleId).toBe('C007');
            // articleName fallback kicks in since mapping was empty
            expect(result.articleName).toBe('C007'); // Falls back to room.id
            expect(result.nfcUrl).toBeUndefined();
        });

        it('should preserve data object in result', () => {
            const room: ConferenceRoom = {
                id: 'C008',
                hasMeeting: false,
            };
            const articleData = {
                article_id: 'C008',
                name: 'Test Room',
                meeting_name: 'Team Sync',
                meeting_time: '10:00 - 11:00',
            };

            const result = buildAimsArticle(room, articleData, baseMappingConfig);

            expect(result.data).toBe(articleData);
            expect(result.data.meeting_name).toBe('Team Sync');
            expect(result.data.meeting_time).toBe('10:00 - 11:00');
        });
    });
});

/**
 * Hook-based tests for useConferenceController
 */
describe('useConferenceController - Hook Tests', () => {
    const mockSolumConfig = {
        companyName: 'TestCompany',
        username: 'test_user',
        password: 'test_password',
        storeNumber: 'STORE001',
        cluster: 'c1' as const,
        baseUrl: 'https://test.api.com',
        syncInterval: 300,
    };

    const mockMappingConfig: SolumMappingConfig = {
        uniqueIdField: 'article_id',
        fields: {
            article_id: { friendlyNameEn: 'ID', friendlyNameHe: 'מזהה', visible: true },
            name: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true },
        },
        conferenceMapping: {
            meetingName: 'meeting_name',
            meetingTime: 'meeting_time',
            participants: 'participants',
        },
        mappingInfo: {
            store: 'store_id',
            articleId: 'article_id',
            articleName: 'name',
        },
        globalFieldAssignments: {},
    };

    beforeEach(() => {
        // Reset store before each test
        useConferenceStore.getState().clearAllData();
        vi.clearAllMocks();

        // Configure conferenceApi mocks for server operations
        vi.mocked(conferenceApi.create).mockImplementation(async (data: any) => ({
            id: data.externalId,
            serverId: `server-${data.externalId}`,
            hasMeeting: data.hasMeeting || false,
            meetingName: data.meetingName || '',
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            participants: data.participants || [],
            labelCode: data.labelCode,
            data: { roomName: data.roomName },
        }));

        vi.mocked(conferenceApi.update).mockImplementation(async (id: string, data: any) => {
            const rooms = useConferenceStore.getState().conferenceRooms;
            const existing = rooms.find(r => r.serverId === id || r.id === id);
            return {
                id: existing?.id || id,
                serverId: existing?.serverId || id,
                hasMeeting: data.hasMeeting ?? existing?.hasMeeting ?? false,
                meetingName: data.meetingName ?? '',
                startTime: data.startTime ?? '',
                endTime: data.endTime ?? '',
                participants: data.participants ?? [],
                labelCode: data.labelCode,
                data: { roomName: data.roomName || existing?.data?.roomName || '' },
            };
        });

        vi.mocked(conferenceApi.delete).mockResolvedValue(undefined);

        vi.mocked(conferenceApi.toggleMeeting).mockImplementation(async (id: string) => {
            const rooms = useConferenceStore.getState().conferenceRooms;
            const room = rooms.find(r => r.serverId === id || r.id === id);
            if (!room) throw new Error('Room not found');
            return {
                ...room,
                hasMeeting: !room.hasMeeting,
                meetingName: room.hasMeeting ? '' : (room.meetingName || ''),
                startTime: room.hasMeeting ? '' : (room.startTime || ''),
                endTime: room.hasMeeting ? '' : (room.endTime || ''),
                participants: room.hasMeeting ? [] : (room.participants || []),
            };
        });
    });

    describe('Initialization', () => {
        it('should initialize with empty conference rooms', () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            expect(result.current.conferenceRooms).toEqual([]);
            expect(result.current.isFetching).toBe(false);
        });

        it('should expose all required functions', () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            expect(typeof result.current.addConferenceRoom).toBe('function');
            expect(typeof result.current.updateConferenceRoom).toBe('function');
            expect(typeof result.current.deleteConferenceRoom).toBe('function');
            expect(typeof result.current.toggleMeeting).toBe('function');
            expect(typeof result.current.fetchFromSolum).toBe('function');
            expect(typeof result.current.flipLabelPage).toBe('function');
        });

        it('should initialize in SoluM mode with config', () => {
            const { result } = renderHook(() =>
                useConferenceController({
                    workingMode: 'SOLUM_API',
                    solumConfig: mockSolumConfig,
                    solumToken: 'mock-token',
                    solumMappingConfig: mockMappingConfig,
                })
            );

            expect(result.current.conferenceRooms).toEqual([]);
        });

        it('should initialize in SFTP mode', () => {
            const { result } = renderHook(() =>
                useConferenceController({
                    workingMode: 'SFTP',
                    sftpCredentials: {
                        host: 'sftp.example.com',
                        port: 22,
                        username: 'test',
                        password: 'test',
                        remoteFilename: 'data.csv',
                    },
                })
            );

            expect(result.current.conferenceRooms).toEqual([]);
        });
    });

    describe('Add Conference Room', () => {
        it('should add a conference room to the store', async () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            await act(async () => {
                await result.current.addConferenceRoom({
                    id: '001',
                    hasMeeting: false,
                    data: { roomName: 'Conference Room A' },
                });
            });

            expect(result.current.conferenceRooms).toHaveLength(1);
            expect(result.current.conferenceRooms[0].id).toBe('001');
        });

        it('should generate ID if not provided', async () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            await act(async () => {
                await result.current.addConferenceRoom({
                    hasMeeting: false,
                    data: { roomName: 'New Room' },
                });
            });

            expect(result.current.conferenceRooms).toHaveLength(1);
            expect(result.current.conferenceRooms[0].id).toBeTruthy();
            // ID should be numeric
            expect(/^\d+$/.test(result.current.conferenceRooms[0].id)).toBe(true);
        });

        it('should throw error for duplicate ID', async () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            await act(async () => {
                await result.current.addConferenceRoom({
                    id: '001',
                    hasMeeting: false,
                    data: { roomName: 'Room A' },
                });
            });

            await expect(
                act(async () => {
                    await result.current.addConferenceRoom({
                        id: '001',
                        hasMeeting: false,
                        data: { roomName: 'Room B' },
                    });
                })
            ).rejects.toThrow('Conference room ID already exists');
        });
    });

    describe('Update Conference Room', () => {
        it('should update an existing room', async () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            await act(async () => {
                await result.current.addConferenceRoom({
                    id: '001',
                    hasMeeting: false,
                    data: { roomName: 'Original Name' },
                });
            });

            await act(async () => {
                await result.current.updateConferenceRoom('001', {
                    data: { roomName: 'Updated Name' },
                });
            });

            expect(result.current.conferenceRooms[0].data?.roomName).toBe('Updated Name');
        });

        it('should throw error for non-existent room', async () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            await expect(
                act(async () => {
                    await result.current.updateConferenceRoom('999', {
                        data: { roomName: 'Test' },
                    });
                })
            ).rejects.toThrow('Conference room not found');
        });
    });

    describe('Delete Conference Room', () => {
        it('should delete an existing room', async () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            await act(async () => {
                await result.current.addConferenceRoom({
                    id: '001',
                    hasMeeting: false,
                    data: { roomName: 'To Delete' },
                });
            });

            expect(result.current.conferenceRooms).toHaveLength(1);

            await act(async () => {
                await result.current.deleteConferenceRoom('001');
            });

            expect(result.current.conferenceRooms).toHaveLength(0);
        });

        it('should throw error for non-existent room', async () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            await expect(
                act(async () => {
                    await result.current.deleteConferenceRoom('999');
                })
            ).rejects.toThrow('Conference room not found');
        });
    });

    describe('Toggle Meeting', () => {
        it('should toggle meeting status', async () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            await act(async () => {
                await result.current.addConferenceRoom({
                    id: '001',
                    hasMeeting: false,
                    data: { roomName: 'Meeting Room' },
                });
            });

            expect(result.current.conferenceRooms[0].hasMeeting).toBe(false);

            await act(async () => {
                await result.current.toggleMeeting('001');
            });

            expect(result.current.conferenceRooms[0].hasMeeting).toBe(true);
        });

        it('should toggle back to false', async () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            await act(async () => {
                await result.current.addConferenceRoom({
                    id: '001',
                    hasMeeting: true,
                    meetingName: 'Team Standup',
                    startTime: '09:00',
                    endTime: '10:00',
                    data: { roomName: 'Meeting Room' },
                });
            });

            await act(async () => {
                await result.current.toggleMeeting('001');
            });

            expect(result.current.conferenceRooms[0].hasMeeting).toBe(false);
        });

        it('should throw error for non-existent room', async () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            await expect(
                act(async () => {
                    await result.current.toggleMeeting('999');
                })
            ).rejects.toThrow('Conference room not found');
        });
    });

    describe('Fetching State', () => {
        it('should have isFetching state', () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            expect(result.current.isFetching).toBe(false);
        });
    });

    describe('Import from Sync', () => {
        it('should import rooms from external data', () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            act(() => {
                result.current.importFromSync([
                    { id: 'C001', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: { roomName: 'Room 1' } },
                    { id: 'C002', hasMeeting: true, meetingName: 'Meeting', startTime: '09:00', endTime: '10:00', participants: [], data: { roomName: 'Room 2' } },
                ]);
            });

            expect(result.current.conferenceRooms).toHaveLength(2);
            expect(result.current.conferenceRooms[0].id).toBe('C001');
            expect(result.current.conferenceRooms[1].id).toBe('C002');
        });

        it('should replace existing rooms on import', () => {
            const { result } = renderHook(() =>
                useConferenceController({})
            );

            // Add initial room
            act(() => {
                result.current.importFromSync([
                    { id: 'C001', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: { roomName: 'Original' } },
                ]);
            });

            // Import new rooms
            act(() => {
                result.current.importFromSync([
                    { id: 'C002', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: { roomName: 'New Room' } },
                ]);
            });

            expect(result.current.conferenceRooms).toHaveLength(1);
            expect(result.current.conferenceRooms[0].id).toBe('C002');
        });
    });
});
