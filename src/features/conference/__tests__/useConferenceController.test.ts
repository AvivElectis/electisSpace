import { describe, it, expect } from 'vitest';
import type { SolumMappingConfig } from '@features/settings/domain/types';

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
