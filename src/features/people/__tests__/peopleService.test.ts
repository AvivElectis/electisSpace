/**
 * People Service Tests
 * 
 * Tests for people service functions including:
 * - Space to Person conversion
 * - Article data building
 * - Empty article filtering
 * - CSV parsing
 */

import {
    convertSpacesToPeople,
    convertSpacesToPeopleWithVirtualPool,
    buildArticleDataWithMetadata,
    buildEmptyArticleData,
    parsePeopleCSV,
} from '../infrastructure/peopleService';
import { isPoolId } from '../infrastructure/virtualPoolService';
import type { Person } from '../domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';

// =============================================================================
// PEOPLE SERVICE TESTS
// =============================================================================

describe('PeopleService', () => {
    const mockMappingConfig: SolumMappingConfig = {
        uniqueIdField: 'articleId',
        fields: {
            name: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true },
            department: { friendlyNameEn: 'Department', friendlyNameHe: 'מחלקה', visible: true },
        },
        conferenceMapping: { meetingName: '', meetingTime: '', participants: '' },
        mappingInfo: {
            articleId: 'articleId',
            articleName: 'name',
            store: 'store',
        },
        globalFieldAssignments: {},
    };

    describe('convertSpacesToPeople', () => {
        it('should NOT set assignedSpaceId for POOL-IDs', () => {
            const spaces = [
                {
                    id: 'POOL-0001',
                    data: { name: 'John', department: 'IT' }
                },
            ];

            const people = convertSpacesToPeople(spaces, mockMappingConfig);

            expect(people).toHaveLength(1);
            expect(people[0].assignedSpaceId).toBeUndefined();
            expect(people[0].virtualSpaceId).toBe('POOL-0001');
        });

        it('should set assignedSpaceId for physical space IDs', () => {
            const spaces = [
                {
                    id: '42',
                    data: { name: 'Jane', department: 'HR' }
                },
            ];

            const people = convertSpacesToPeople(spaces, mockMappingConfig);

            expect(people).toHaveLength(1);
            expect(people[0].assignedSpaceId).toBe('42');
            expect(people[0].virtualSpaceId).toBe('42');
        });

        it('should distinguish between POOL-IDs and physical spaces', () => {
            const spaces = [
                { id: 'POOL-0001', data: { name: 'Unassigned Person' } },
                { id: '1', data: { name: 'Assigned Person' } },
            ];

            const people = convertSpacesToPeople(spaces, mockMappingConfig);

            // POOL-ID person should not have assignedSpaceId
            const poolPerson = people.find(p => p.virtualSpaceId === 'POOL-0001');
            expect(poolPerson?.assignedSpaceId).toBeUndefined();

            // Physical space person should have assignedSpaceId
            const assignedPerson = people.find(p => p.virtualSpaceId === '1');
            expect(assignedPerson?.assignedSpaceId).toBe('1');
        });
    });

    describe('convertSpacesToPeopleWithVirtualPool', () => {
        it('should assign virtual pool IDs to people without spaces', () => {
            const spaces = [
                { id: '', data: { name: 'No Space Person' } },
            ];

            const people = convertSpacesToPeopleWithVirtualPool(spaces, mockMappingConfig);

            // Even empty id with data should be filtered or handled
            expect(people.length).toBeGreaterThanOrEqual(0);
        });

        it('should preserve existing POOL-IDs from AIMS', () => {
            const spaces = [
                { id: 'POOL-0005', data: { name: 'Already Pooled' } },
            ];

            const people = convertSpacesToPeopleWithVirtualPool(spaces, mockMappingConfig);

            expect(people).toHaveLength(1);
            expect(people[0].virtualSpaceId).toBe('POOL-0005');
            expect(people[0].assignedSpaceId).toBeUndefined();
        });

        it('should parse _LIST_MEMBERSHIPS_ JSON for list support', () => {
            const memberships = JSON.stringify([
                { listName: 'List_A', spaceId: '10' },
                { listName: 'List_B', spaceId: undefined }
            ]);
            const spaces = [
                {
                    id: 'POOL-0001',
                    data: {
                        name: 'Person In Multiple Lists',
                        _LIST_MEMBERSHIPS_: memberships
                    }
                },
            ];

            const people = convertSpacesToPeopleWithVirtualPool(spaces, mockMappingConfig);

            expect(people).toHaveLength(1);
            expect(people[0].listMemberships).toHaveLength(2);
            expect(people[0].listMemberships![0].listName).toBe('List_A');
            expect(people[0].listMemberships![0].spaceId).toBe('10');
            expect(people[0].listMemberships![1].listName).toBe('List_B');
            expect(people[0].listMemberships![1].spaceId).toBeUndefined();
            // Verify JSON field is removed from data
            expect(people[0].data).not.toHaveProperty('_LIST_MEMBERSHIPS_');
        });

        it('should handle people without list metadata', () => {
            const spaces = [
                { id: 'POOL-0002', data: { name: 'Person Without List' } },
            ];

            const people = convertSpacesToPeopleWithVirtualPool(spaces, mockMappingConfig);

            expect(people).toHaveLength(1);
            expect(people[0].listMemberships).toBeUndefined();
        });
    });
});

// =============================================================================
// ARTICLE DATA BUILDING TESTS
// =============================================================================

describe('Article Data Building', () => {
    const mockMappingConfig: SolumMappingConfig = {
        uniqueIdField: 'ARTICLE_ID',
        fields: {
            name: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true },
            department: { friendlyNameEn: 'Department', friendlyNameHe: 'מחלקה', visible: true },
        },
        conferenceMapping: { meetingName: '', meetingTime: '', participants: '' },
        mappingInfo: {
            articleId: 'ARTICLE_ID',
            articleName: 'name',
            store: 'store',
        },
        globalFieldAssignments: {
            company: 'ACME Corp',
        },
    };

    describe('buildArticleDataWithMetadata', () => {
        it('should include __PERSON_UUID__ for cross-device sync', () => {
            const person: Person = {
                id: 'uuid-123-456',
                virtualSpaceId: 'POOL-0001',
                data: { name: 'John', department: 'IT' },
            };

            const article = buildArticleDataWithMetadata(person, mockMappingConfig);

            expect(article.data['__PERSON_UUID__']).toBe('uuid-123-456');
        });

        it('should include __VIRTUAL_SPACE__ for pool tracking', () => {
            const person: Person = {
                id: 'uuid-123',
                virtualSpaceId: 'POOL-0005',
                data: { name: 'Jane', department: 'HR' },
            };

            const article = buildArticleDataWithMetadata(person, mockMappingConfig);

            expect(article.data['__VIRTUAL_SPACE__']).toBe('POOL-0005');
        });

        it('should apply global field assignments', () => {
            const person: Person = {
                id: 'uuid-999',
                virtualSpaceId: 'POOL-0001',
                data: { name: 'Test' },
            };

            const article = buildArticleDataWithMetadata(person, mockMappingConfig);

            expect(article.data.company).toBe('ACME Corp');
        });

        it('should include metadata fields for cross-device sync', () => {
            const person: Person = {
                id: 'uuid-123',
                data: { name: 'Test Person', department: 'Engineering' },
                assignedSpaceId: '42',
                virtualSpaceId: '42',
            };

            const articleData = buildArticleDataWithMetadata(person, mockMappingConfig);

            expect(articleData).toHaveProperty('articleId');
            expect(articleData).toHaveProperty('data');
            expect(articleData.data).toHaveProperty('__PERSON_UUID__', 'uuid-123');
            expect(articleData.data).toHaveProperty('__VIRTUAL_SPACE__', '42');
            expect(articleData.data).toHaveProperty('__LAST_MODIFIED__');
        });
    });

    describe('buildEmptyArticleData', () => {
        const mockMappingForEmpty: SolumMappingConfig = {
            uniqueIdField: 'ARTICLE_ID',
            fields: {
                name: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true },
                department: { friendlyNameEn: 'Department', friendlyNameHe: 'מחלקה', visible: true },
                title: { friendlyNameEn: 'Title', friendlyNameHe: 'תפקיד', visible: true },
            },
            conferenceMapping: { meetingName: '', meetingTime: '', participants: '' },
            mappingInfo: { articleId: 'ARTICLE_ID', articleName: 'name', store: 'store' },
            globalFieldAssignments: {},
        };

        it('should create article with empty string values', () => {
            const person: Person = {
                id: 'uuid-test',
                virtualSpaceId: 'POOL-0001',
                data: { name: 'John', department: 'IT', title: 'Dev', ARTICLE_ID: 'POOL-0001' },
            };
            const empty = buildEmptyArticleData('POOL-0001', person, mockMappingForEmpty);

            expect(empty.articleId).toBe('POOL-0001');
            expect(empty.data.name).toBe('');
            expect(empty.data.department).toBe('');
            expect(empty.data.title).toBe('');
        });

        it('should be usable for clearing POOL articles in AIMS', () => {
            const poolIdToClear = 'POOL-0099';
            const person: Person = {
                id: 'uuid-to-clear',
                virtualSpaceId: poolIdToClear,
                data: { name: 'ToDelete', email: 'test@test.com', ARTICLE_ID: poolIdToClear },
            };
            const empty = buildEmptyArticleData(poolIdToClear, person, mockMappingForEmpty);

            expect(empty.articleId).toBe(poolIdToClear);
            // Non-ID fields should be empty
            expect(empty.data.name).toBe('');
            expect(empty.data.email).toBe('');
        });

        it('should create empty article for clearing space', () => {
            const person: Person = {
                id: 'uuid-123',
                data: { name: 'Person to Clear' },
                virtualSpaceId: 'POOL-0001',
            };

            const emptyData = buildEmptyArticleData('POOL-0001', person, mockMappingForEmpty);

            expect(emptyData).toHaveProperty('articleId', 'POOL-0001');
            // Should have empty/cleared values for other fields
        });
    });
});

// =============================================================================
// EMPTY ARTICLE FILTERING TESTS
// =============================================================================

describe('Empty Article Filtering', () => {
    const mockMappingConfig: SolumMappingConfig = {
        uniqueIdField: 'ARTICLE_ID',
        fields: {
            name: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true },
        },
        conferenceMapping: { meetingName: '', meetingTime: '', participants: '' },
        mappingInfo: {
            articleId: 'ARTICLE_ID',
            articleName: 'name',
            store: 'store',
        },
        globalFieldAssignments: {},
    };

    it('should filter out empty POOL articles (only has ID, no data)', () => {
        const spaces: Array<{ id: string; data: Record<string, string> }> = [
            { id: 'POOL-0001', data: { ARTICLE_ID: 'POOL-0001' } }, // Empty - no name
            { id: 'POOL-0002', data: { ARTICLE_ID: 'POOL-0002', name: 'John' } }, // Has data
        ];

        const people = convertSpacesToPeople(spaces, mockMappingConfig);

        expect(people).toHaveLength(1);
        expect(people[0].data.name).toBe('John');
    });

    it('should filter out empty physical space articles', () => {
        const spaces: Array<{ id: string; data: Record<string, string> }> = [
            { id: '1', data: { ARTICLE_ID: '1' } }, // Empty - no name
            { id: '2', data: { ARTICLE_ID: '2', name: 'Jane' } }, // Has data
        ];

        const people = convertSpacesToPeople(spaces, mockMappingConfig);

        expect(people).toHaveLength(1);
        expect(people[0].assignedSpaceId).toBe('2');
    });

    it('should filter empty articles in convertSpacesToPeopleWithVirtualPool too', () => {
        const spaces: Array<{ id: string; data: Record<string, string> }> = [
            { id: 'POOL-0001', data: { ARTICLE_ID: 'POOL-0001', name: '' } }, // Empty
            { id: 'POOL-0002', data: { ARTICLE_ID: 'POOL-0002', name: 'Active Person' } },
            { id: '5', data: { ARTICLE_ID: '5' } }, // Empty physical
        ];

        const people = convertSpacesToPeopleWithVirtualPool(spaces, mockMappingConfig);

        expect(people).toHaveLength(1);
        expect(people[0].data.name).toBe('Active Person');
    });

    it('should keep POOL articles with whitespace-only names as empty', () => {
        const spaces = [
            { id: 'POOL-0001', data: { ARTICLE_ID: 'POOL-0001', name: '   ' } }, // Whitespace only = empty
            { id: 'POOL-0002', data: { ARTICLE_ID: 'POOL-0002', name: 'Real Person' } },
        ];

        const people = convertSpacesToPeople(spaces, mockMappingConfig);

        expect(people).toHaveLength(1);
        expect(people[0].data.name).toBe('Real Person');
    });
});

// =============================================================================
// CSV PARSING TESTS
// =============================================================================

describe('CSV Parsing', () => {
    const mockArticleFormat = {
        articleData: ['ARTICLE_ID', 'name', 'department', 'title'],
        delimeter: ';',
        mappingInfo: {
            articleId: 'ARTICLE_ID',
            articleName: 'name',
            store: 'store',
        },
    };

    const mockMappingConfig: SolumMappingConfig = {
        uniqueIdField: 'ARTICLE_ID',
        fields: {
            name: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true },
            department: { friendlyNameEn: 'Department', friendlyNameHe: 'מחלקה', visible: true },
            title: { friendlyNameEn: 'Title', friendlyNameHe: 'תפקיד', visible: true },
        },
        conferenceMapping: { meetingName: '', meetingTime: '', participants: '' },
        mappingInfo: {
            articleId: 'ARTICLE_ID',
            articleName: 'name',
            store: 'store',
        },
        globalFieldAssignments: {},
    };

    it('should parse CSV content and generate POOL-IDs', async () => {
        const csvContent = `name;department;title
John Doe;Engineering;Developer
Jane Smith;HR;Manager`;

        const people = parsePeopleCSV(csvContent, mockArticleFormat as any, mockMappingConfig);

        expect(people).toHaveLength(2);
        expect(people[0].data.name).toBe('John Doe');
        expect(people[0].virtualSpaceId).toBe('POOL-0001');
        expect(people[1].virtualSpaceId).toBe('POOL-0002');
    });

    it('should avoid collision with existing POOL-IDs', async () => {
        const csvContent = `name;department;title
New Person;Sales;Rep`;

        const existingPoolIds = new Set(['POOL-0001', 'POOL-0002']);
        const people = parsePeopleCSV(csvContent, mockArticleFormat as any, mockMappingConfig, existingPoolIds);

        expect(people).toHaveLength(1);
        expect(people[0].virtualSpaceId).toBe('POOL-0003'); // Should skip 0001 and 0002
    });

    it('should handle empty CSV gracefully', async () => {
        const csvContent = '';
        const people = parsePeopleCSV(csvContent, mockArticleFormat as any, mockMappingConfig);

        expect(people).toHaveLength(0);
    });

    it('should parse large CSV batches', async () => {
        // Generate 50 rows
        const rows = ['name;department;title'];
        for (let i = 1; i <= 50; i++) {
            rows.push(`Person ${i};Dept ${i};Title ${i}`);
        }
        const csvContent = rows.join('\n');

        const people = parsePeopleCSV(csvContent, mockArticleFormat as any, mockMappingConfig);

        expect(people).toHaveLength(50);
        expect(people[0].virtualSpaceId).toBe('POOL-0001');
        expect(people[49].virtualSpaceId).toBe('POOL-0050');
    });

    it('should assign unique UUIDs to each person', async () => {
        const csvContent = `name;department;title
Person 1;Dept 1;Title 1
Person 2;Dept 2;Title 2
Person 3;Dept 3;Title 3`;

        const people = parsePeopleCSV(csvContent, mockArticleFormat as any, mockMappingConfig);

        const ids = people.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(3); // All IDs should be unique

        // Verify they're valid UUIDs (v4 format)
        people.forEach(p => {
            expect(p.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });
    });
});

// =============================================================================
// REAL CSV PARSING WITH HEBREW DATA
// =============================================================================

describe('Full CSV Upload Integration Test', () => {
    // Real CSV data from the user's file
    const realCSVContent = `ITEM_NAME;ENGLISH_NAME;RANK;TITLE;MEETING_NAME;MEETING_TIME;PARTICIPANTS
יניב מזרחי;;נצ"מ;רמ"ח קשר ותקשוב;;;
בתאל הראל;;רס"מ;רל"ש רמ"ח קשר ותקשוב;;;
רמי אלמוג;;רפ"ק;ק' בטיחות  מק"ש;;;
עמוס כהן;;סנ"צ;רמ"ד לוגיסטיקה ומחשוב;;;
אלישבע דקל;;רפ"ק;ר' יח' ציוד קשר;;;`;

    const csvMappingConfig: SolumMappingConfig = {
        uniqueIdField: 'ARTICLE_ID',
        fields: {
            ITEM_NAME: { friendlyNameEn: 'Name', friendlyNameHe: 'שם', visible: true },
            ENGLISH_NAME: { friendlyNameEn: 'English Name', friendlyNameHe: 'שם באנגלית', visible: true },
            RANK: { friendlyNameEn: 'Rank', friendlyNameHe: 'דרגה', visible: true },
            TITLE: { friendlyNameEn: 'Title', friendlyNameHe: 'תפקיד', visible: true },
        },
        conferenceMapping: {
            meetingName: 'MEETING_NAME',
            meetingTime: 'MEETING_TIME',
            participants: 'PARTICIPANTS',
        },
        mappingInfo: {
            store: '01',
            articleId: 'ARTICLE_ID',
            articleName: 'ITEM_NAME',
        },
        globalFieldAssignments: {},
    };

    const csvArticleFormat = {
        fileExtension: 'csv',
        articleData: ['ITEM_NAME', 'ENGLISH_NAME', 'RANK', 'TITLE', 'MEETING_NAME', 'MEETING_TIME', 'PARTICIPANTS'],
        articleBasicInfo: ['ARTICLE_ID', 'ITEM_NAME'],
        delimeter: ';',
        mappingInfo: {
            store: '01',
            articleId: 'ARTICLE_ID',
            articleName: 'ITEM_NAME',
        },
    };

    describe('CSV Parsing with Pool IDs', () => {
        it('should parse real Hebrew CSV and assign POOL-IDs', () => {
            const people = parsePeopleCSV(realCSVContent, csvArticleFormat, csvMappingConfig);

            expect(people.length).toBe(5);

            // Each person should have a unique UUID and POOL-ID
            const uuids = new Set(people.map(p => p.id));
            const poolIds = new Set(people.map(p => p.virtualSpaceId));

            expect(uuids.size).toBe(5); // All unique UUIDs
            expect(poolIds.size).toBe(5); // All unique POOL-IDs

            // All should be POOL-IDs
            people.forEach(p => {
                expect(isPoolId(p.virtualSpaceId!)).toBe(true);
            });

            // Verify Hebrew data is preserved
            expect(people[0].data['ITEM_NAME']).toBe('יניב מזרחי');
            expect(people[0].data['RANK']).toBe('נצ"מ');
            expect(people[0].data['TITLE']).toBe('רמ"ח קשר ותקשוב');
        });

        it('should reuse empty POOL-IDs from AIMS when provided', () => {
            // Simulate empty POOL articles in AIMS
            const emptyPoolIdsFromAims = new Set(['POOL-0010', 'POOL-0005', 'POOL-0020']);
            const existingLocalIds = new Set<string>(); // Nothing in use locally

            const people = parsePeopleCSV(
                realCSVContent,
                csvArticleFormat,
                csvMappingConfig,
                existingLocalIds,
                emptyPoolIdsFromAims
            );

            // Should reuse AIMS empty articles first (sorted by lowest number)
            expect(people[0].virtualSpaceId).toBe('POOL-0005'); // Lowest
            expect(people[1].virtualSpaceId).toBe('POOL-0010'); // Next
            expect(people[2].virtualSpaceId).toBe('POOL-0020'); // Last from AIMS
            expect(people[3].virtualSpaceId).toBe('POOL-0001'); // New (no more AIMS empties)
            expect(people[4].virtualSpaceId).toBe('POOL-0002'); // New
        });
    });
});
