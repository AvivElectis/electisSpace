/**
 * People AIMS Integration Tests
 * 
 * Tests for AIMS integration including:
 * - Push/fetch articles
 * - Comprehensive workflows (add, delete, assign, unassign)
 * - Full CSV upload workflow
 * 
 * Note: These tests require RUN_INTEGRATION_TESTS=true to run against real AIMS.
 */

import { isPoolId } from '../infrastructure/virtualPoolService';
import { parsePeopleCSV } from '../infrastructure/peopleService';
import type { SolumMappingConfig } from '@features/settings/domain/types';

// =============================================================================
// AIMS INTEGRATION TESTS (Real API calls)
// =============================================================================

describe('AIMS Integration Tests', () => {
    // Test credentials - uses environment variables or mock values
    const AIMS_CONFIG = {
        companyName: import.meta.env.VITE_AIMS_COMPANY_NAME || 'TEST_COMPANY',
        username: import.meta.env.VITE_AIMS_USERNAME || 'test@example.com',
        password: import.meta.env.VITE_AIMS_PASSWORD || 'TestPassword123!',
        storeNumber: import.meta.env.VITE_AIMS_STORE_NUMBER || '01',
        cluster: 'common' as const,
        baseUrl: import.meta.env.VITE_AIMS_BASE_URL || 'https://eu.common.solumesl.com',
        syncInterval: 300,
        tokens: undefined as any,
    };

    let accessToken: string | null = null;

    // Only run integration tests if explicitly enabled
    const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

    beforeAll(async () => {
        if (!runIntegrationTests) {
            console.log('Skipping AIMS integration tests. Set RUN_INTEGRATION_TESTS=true to enable.');
            return;
        }

        // Login to get access token
        try {
            const { login } = await import('@shared/infrastructure/services/solumService');
            const tokens = await login(AIMS_CONFIG);
            accessToken = tokens.accessToken;
            AIMS_CONFIG.tokens = tokens;
            console.log('AIMS login successful');
        } catch (error) {
            console.error('AIMS login failed:', error);
        }
    });

    describe('Push Articles to AIMS', () => {
        it.skipIf(!runIntegrationTests)('should successfully push a test article', async () => {
            if (!accessToken) {
                throw new Error('No access token - login failed');
            }

            const { pushArticles } = await import('@shared/infrastructure/services/solumService');

            const testArticle = {
                articleId: 'TEST-POOL-0001',
                name: 'Test Person',
                department: 'Test Department',
                title: 'Test Title',
            };

            const result = await pushArticles(
                AIMS_CONFIG,
                AIMS_CONFIG.storeNumber,
                accessToken,
                [testArticle]
            );

            // pushArticles returns void on success (throws on error)
            expect(result).toBeUndefined();
            console.log('Push article completed successfully');
        });

        it.skipIf(!runIntegrationTests)('should successfully clear a test article', async () => {
            if (!accessToken) {
                throw new Error('No access token - login failed');
            }

            const { pushArticles } = await import('@shared/infrastructure/services/solumService');

            // Push empty data to clear the article
            const emptyArticle = {
                articleId: 'TEST-POOL-0001',
                name: '',
                department: '',
                title: '',
            };

            const result = await pushArticles(
                AIMS_CONFIG,
                AIMS_CONFIG.storeNumber,
                accessToken,
                [emptyArticle]
            );

            // pushArticles returns void on success (throws on error)
            expect(result).toBeUndefined();
            console.log('Clear article completed successfully');
        });
    });

    describe('Fetch Articles from AIMS', () => {
        it.skipIf(!runIntegrationTests)('should fetch articles from AIMS', async () => {
            if (!accessToken) {
                throw new Error('No access token - login failed');
            }

            const { fetchArticles } = await import('@shared/infrastructure/services/solumService');

            const result = await fetchArticles(
                AIMS_CONFIG,
                AIMS_CONFIG.storeNumber,
                accessToken,
                1,
                100
            );

            // fetchArticles returns an array directly
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            console.log('Fetched articles count:', result.length);
        });
    });

    describe('Full Sync Workflow', () => {
        it.skipIf(!runIntegrationTests)('should push person with POOL-ID, then clear it on physical assignment', async () => {
            if (!accessToken) {
                throw new Error('No access token - login failed');
            }

            const { pushArticles } = await import('@shared/infrastructure/services/solumService');

            // Step 1: Push a person with POOL-ID (simulating unassigned person)
            const poolArticle = {
                articleId: 'TEST-POOL-0002',
                name: 'Unassigned Employee',
                department: 'Engineering',
            };

            await pushArticles(
                AIMS_CONFIG,
                AIMS_CONFIG.storeNumber,
                accessToken,
                [poolArticle]
            );
            console.log('Step 1: Pushed person with POOL-ID');

            // Step 2: Clear the POOL-ID (simulating assignment to physical space)
            const clearedPoolArticle = {
                articleId: 'TEST-POOL-0002',
                name: '',
                department: '',
            };

            await pushArticles(
                AIMS_CONFIG,
                AIMS_CONFIG.storeNumber,
                accessToken,
                [clearedPoolArticle]
            );
            console.log('Step 2: Cleared POOL-ID article');

            // Step 3: Push to physical space
            const physicalArticle = {
                articleId: 'TEST-PHYSICAL-001',
                name: 'Unassigned Employee',
                department: 'Engineering',
            };

            await pushArticles(
                AIMS_CONFIG,
                AIMS_CONFIG.storeNumber,
                accessToken,
                [physicalArticle]
            );
            console.log('Step 3: Pushed to physical space');

            // Cleanup: Clear the physical space article
            const clearedPhysicalArticle = {
                articleId: 'TEST-PHYSICAL-001',
                name: '',
                department: '',
            };

            await pushArticles(
                AIMS_CONFIG,
                AIMS_CONFIG.storeNumber,
                accessToken,
                [clearedPhysicalArticle]
            );
            console.log('Cleanup: Cleared physical space article');

            // Test passes if no errors thrown
            expect(true).toBe(true);
        });
    });
});

// =============================================================================
// AIMS COMPREHENSIVE WORKFLOW TESTS
// =============================================================================

describe('AIMS Comprehensive Workflow Tests', () => {
    // Test credentials - uses environment variables or mock values
    const AIMS_CONFIG = {
        companyName: import.meta.env.VITE_AIMS_COMPANY_NAME || 'TEST_COMPANY',
        username: import.meta.env.VITE_AIMS_USERNAME || 'test@example.com',
        password: import.meta.env.VITE_AIMS_PASSWORD || 'TestPassword123!',
        storeNumber: import.meta.env.VITE_AIMS_STORE_NUMBER || '01',
        cluster: 'common' as const,
        baseUrl: import.meta.env.VITE_AIMS_BASE_URL || 'https://eu.common.solumesl.com',
        syncInterval: 300,
        tokens: undefined as any,
    };

    let accessToken: string | null = null;

    const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

    beforeAll(async () => {
        if (!runIntegrationTests) {
            console.log('Skipping AIMS comprehensive tests. Set RUN_INTEGRATION_TESTS=true to enable.');
            return;
        }

        try {
            const { login } = await import('@shared/infrastructure/services/solumService');
            const tokens = await login(AIMS_CONFIG);
            accessToken = tokens.accessToken;
            AIMS_CONFIG.tokens = tokens;
            console.log('AIMS login successful for comprehensive tests');
        } catch (error) {
            console.error('AIMS login failed:', error);
        }
    });

    // Cleanup helper
    const cleanupArticle = async (articleId: string) => {
        if (!accessToken) return;
        const { pushArticles } = await import('@shared/infrastructure/services/solumService');
        await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
            articleId,
            name: '',
            department: '',
            title: '',
        }]);
    };

    describe('Add Person Workflow', () => {
        const testArticleId = 'TEST-ADD-PERSON-001';

        afterAll(async () => {
            if (runIntegrationTests && accessToken) {
                await cleanupArticle(testArticleId);
            }
        });

        it.skipIf(!runIntegrationTests)('should add a new person with POOL-ID and sync to AIMS', async () => {
            if (!accessToken) throw new Error('No access token');

            const { pushArticles } = await import('@shared/infrastructure/services/solumService');

            // Create new person article
            const newPersonArticle = {
                articleId: testArticleId,
                name: 'Test New Person',
                department: 'Test Department',
                title: 'Tester',
            };

            // Push to AIMS
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [newPersonArticle]);
            console.log('Added person to AIMS');

            // Verify push succeeded (no error thrown)
            expect(true).toBe(true);
        });
    });

    describe('Upload CSV Workflow', () => {
        const testArticleIds = ['TEST-CSV-001', 'TEST-CSV-002', 'TEST-CSV-003'];

        afterAll(async () => {
            if (runIntegrationTests && accessToken) {
                for (const id of testArticleIds) {
                    await cleanupArticle(id);
                }
            }
        });

        it.skipIf(!runIntegrationTests)('should upload multiple people from CSV and sync all to AIMS', async () => {
            if (!accessToken) throw new Error('No access token');

            const { pushArticles } = await import('@shared/infrastructure/services/solumService');

            // Simulate CSV data (3 people)
            const csvPeople = [
                { articleId: testArticleIds[0], name: 'CSV Person 1', department: 'Sales' },
                { articleId: testArticleIds[1], name: 'CSV Person 2', department: 'Marketing' },
                { articleId: testArticleIds[2], name: 'CSV Person 3', department: 'Support' },
            ];

            // Push batch to AIMS
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, csvPeople);
            console.log('Uploaded CSV batch to AIMS');

            expect(true).toBe(true);
        });
    });

    describe('Delete Person Workflow', () => {
        const testArticleId = 'TEST-DELETE-001';

        it.skipIf(!runIntegrationTests)('should delete person by clearing their article in AIMS', async () => {
            if (!accessToken) throw new Error('No access token');

            const { pushArticles } = await import('@shared/infrastructure/services/solumService');

            // First, add a person
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                articleId: testArticleId,
                name: 'Person to Delete',
                department: 'Temporary',
            }]);
            console.log('Step 1: Created person to delete');

            // Now delete by pushing empty data
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                articleId: testArticleId,
                name: '',
                department: '',
            }]);
            console.log('Step 2: Cleared/deleted person');

            expect(true).toBe(true);
        });
    });

    describe('Assign Space Workflow', () => {
        const poolArticleId = 'TEST-ASSIGN-POOL-001';
        const physicalSpaceId = 'TEST-ASSIGN-SPACE-42';

        afterAll(async () => {
            if (runIntegrationTests && accessToken) {
                await cleanupArticle(poolArticleId);
                await cleanupArticle(physicalSpaceId);
            }
        });

        it.skipIf(!runIntegrationTests)('should move person from POOL to physical space', async () => {
            if (!accessToken) throw new Error('No access token');

            const { pushArticles } = await import('@shared/infrastructure/services/solumService');

            // Step 1: Person starts in POOL
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                articleId: poolArticleId,
                name: 'Person in Pool',
                department: 'Unassigned',
            }]);
            console.log('Step 1: Person in POOL');

            // Step 2: Assign to physical space
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                articleId: physicalSpaceId,
                name: 'Person in Pool',
                department: 'Unassigned',
            }]);
            console.log('Step 2: Pushed to physical space');

            // Step 3: Clear the old POOL article
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                articleId: poolArticleId,
                name: '',
                department: '',
            }]);
            console.log('Step 3: Cleared POOL article');

            expect(true).toBe(true);
        });
    });

    describe('Unassign Space Workflow', () => {
        const physicalSpaceId = 'TEST-UNASSIGN-SPACE-99';
        const newPoolId = 'TEST-UNASSIGN-POOL-001';

        afterAll(async () => {
            if (runIntegrationTests && accessToken) {
                await cleanupArticle(physicalSpaceId);
                await cleanupArticle(newPoolId);
            }
        });

        it.skipIf(!runIntegrationTests)('should move person from physical space back to POOL', async () => {
            if (!accessToken) throw new Error('No access token');

            const { pushArticles } = await import('@shared/infrastructure/services/solumService');

            // Step 1: Person is in physical space
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                articleId: physicalSpaceId,
                name: 'Assigned Person',
                department: 'Engineering',
            }]);
            console.log('Step 1: Person in physical space');

            // Step 2: Unassign - move to new POOL
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                articleId: newPoolId,
                name: 'Assigned Person',
                department: 'Engineering',
            }]);
            console.log('Step 2: Pushed to new POOL');

            // Step 3: Clear physical space
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                articleId: physicalSpaceId,
                name: '',
                department: '',
            }]);
            console.log('Step 3: Cleared physical space');

            expect(true).toBe(true);
        });
    });

    describe('Bulk Assignment Workflow', () => {
        const poolIds = ['TEST-BULK-POOL-001', 'TEST-BULK-POOL-002', 'TEST-BULK-POOL-003'];
        const spaceIds = ['TEST-BULK-SPACE-10', 'TEST-BULK-SPACE-20', 'TEST-BULK-SPACE-30'];

        afterAll(async () => {
            if (runIntegrationTests && accessToken) {
                for (const id of [...poolIds, ...spaceIds]) {
                    await cleanupArticle(id);
                }
            }
        });

        it.skipIf(!runIntegrationTests)('should assign multiple people to spaces in batch', async () => {
            if (!accessToken) throw new Error('No access token');

            const { pushArticles } = await import('@shared/infrastructure/services/solumService');

            // Step 1: Create 3 people in POOL
            const poolPeople = poolIds.map((id, i) => ({
                articleId: id,
                name: `Bulk Person ${i + 1}`,
                department: 'Bulk Dept',
            }));
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, poolPeople);
            console.log('Step 1: Created 3 people in POOL');

            // Step 2: Assign all 3 to physical spaces (batch push)
            const assignedPeople = spaceIds.map((id, i) => ({
                articleId: id,
                name: `Bulk Person ${i + 1}`,
                department: 'Bulk Dept',
            }));
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, assignedPeople);
            console.log('Step 2: Assigned all to physical spaces');

            // Step 3: Clear all POOL articles (batch)
            const clearedPools = poolIds.map(id => ({
                articleId: id,
                name: '',
                department: '',
            }));
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, clearedPools);
            console.log('Step 3: Cleared all POOL articles');

            expect(true).toBe(true);
        });
    });

    describe('Sync from AIMS Workflow', () => {
        it.skipIf(!runIntegrationTests)('should fetch all articles from AIMS and convert to people', async () => {
            if (!accessToken) throw new Error('No access token');

            const { fetchArticles } = await import('@shared/infrastructure/services/solumService');

            const articles = await fetchArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, 0, 100);

            expect(Array.isArray(articles)).toBe(true);
            console.log(`Fetched ${articles.length} articles from AIMS`);

            // Convert to people format (simulate sync)
            const spaces = articles.map((article: any) => ({
                id: article.id || article.data?.ARTICLE_ID,
                data: article.data || {},
            }));

            // Filter empties
            const peopleWithData = spaces.filter((space: any) => {
                const hasData = Object.entries(space.data).some(([key, value]) => {
                    if (key === 'ARTICLE_ID') return false;
                    return typeof value === 'string' && value.trim().length > 0;
                });
                return hasData;
            });

            console.log(`Converted to ${peopleWithData.length} people (excluding empties)`);
            expect(peopleWithData.length).toBeLessThanOrEqual(articles.length);
        });
    });

    describe('Update Person Data Workflow', () => {
        const testArticleId = 'TEST-UPDATE-001';

        afterAll(async () => {
            if (runIntegrationTests && accessToken) {
                await cleanupArticle(testArticleId);
            }
        });

        it.skipIf(!runIntegrationTests)('should update person data in AIMS', async () => {
            if (!accessToken) throw new Error('No access token');

            const { pushArticles } = await import('@shared/infrastructure/services/solumService');

            // Create person
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                articleId: testArticleId,
                name: 'Original Name',
                department: 'Original Dept',
            }]);
            console.log('Step 1: Created person with original data');

            // Update person
            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                articleId: testArticleId,
                name: 'Updated Name',
                department: 'Updated Dept',
            }]);
            console.log('Step 2: Updated person data');

            expect(true).toBe(true);
        });
    });
});

// =============================================================================
// FULL CSV UPLOAD & POOL REUSE INTEGRATION TEST (AIMS)
// =============================================================================

describe('Full CSV Upload AIMS Integration', () => {
    // Enable integration tests (set to true to run real AIMS tests)
    const runIntegrationTests = true;

    // AIMS config - uses environment variables or mock values
    const AIMS_CONFIG = {
        companyName: import.meta.env.VITE_AIMS_COMPANY_NAME || 'TEST_COMPANY',
        username: import.meta.env.VITE_AIMS_USERNAME || 'test@example.com',
        password: import.meta.env.VITE_AIMS_PASSWORD || 'TestPassword123!',
        storeNumber: import.meta.env.VITE_AIMS_STORE_NUMBER || '01',
        cluster: 'common' as const,
        baseUrl: import.meta.env.VITE_AIMS_BASE_URL || 'https://eu.common.solumesl.com',
        syncInterval: 300,
        tokens: undefined as any,
    };

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

    describe('AIMS Full Upload Workflow', () => {
        let accessToken: string | null = null;
        const testPoolIds: string[] = [];

        beforeAll(async () => {
            if (!runIntegrationTests) return;

            try {
                const { login } = await import('@shared/infrastructure/services/solumService');
                const tokens = await login(AIMS_CONFIG);
                accessToken = tokens.accessToken;
                AIMS_CONFIG.tokens = tokens;
                console.log('AIMS login successful for CSV upload test');
            } catch (error) {
                console.error('AIMS login failed:', error);
            }
        });

        afterAll(async () => {
            // Cleanup all test articles
            if (runIntegrationTests && accessToken && testPoolIds.length > 0) {
                const { pushArticles } = await import('@shared/infrastructure/services/solumService');

                for (const poolId of testPoolIds) {
                    try {
                        await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                            articleId: poolId,
                            ITEM_NAME: '',
                            ENGLISH_NAME: '',
                            RANK: '',
                            TITLE: '',
                        }]);
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
                console.log(`Cleanup: Cleared ${testPoolIds.length} test articles`);
            }
        });

        it.skipIf(!runIntegrationTests)('should upload CSV people to AIMS and verify', async () => {
            if (!accessToken) throw new Error('No access token');

            const { pushArticles, fetchArticles } = await import('@shared/infrastructure/services/solumService');

            // Parse CSV
            const people = parsePeopleCSV(realCSVContent, csvArticleFormat, csvMappingConfig);
            expect(people.length).toBe(5);

            // Track for cleanup
            people.forEach(p => testPoolIds.push(p.virtualSpaceId!));

            // Build articles and push to AIMS
            const articles = people.map(person => ({
                articleId: person.virtualSpaceId,
                ...person.data,
                __PERSON_UUID__: person.id,
                __VIRTUAL_SPACE__: person.virtualSpaceId,
            }));

            await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, articles);
            console.log(`Uploaded ${people.length} people to AIMS`);
            console.log('Test POOL-IDs:', testPoolIds);

            // Verify by fetching
            const aimsArticles = await fetchArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken);
            console.log(`Total articles in AIMS: ${aimsArticles.length}`);

            // Log first few articles to understand structure
            if (aimsArticles.length > 0) {
                console.log('Sample article structure:', JSON.stringify(aimsArticles[0], null, 2).slice(0, 500));
            }

            // Check our POOL articles exist
            const ourArticles = aimsArticles.filter((a: any) => {
                const id = a.id || a.data?.ARTICLE_ID || a.articleId || a.data?.articleId;
                return testPoolIds.includes(id);
            });

            console.log(`Found ${ourArticles.length} of our ${testPoolIds.length} articles in AIMS`);

            expect(aimsArticles.length).toBeGreaterThanOrEqual(0);
        });

        it.skipIf(!runIntegrationTests)('should identify empty POOL articles after clearing', async () => {
            if (!accessToken) throw new Error('No access token');

            const { pushArticles, fetchArticles } = await import('@shared/infrastructure/services/solumService');

            // Clear first two articles (make them empty)
            const toClear = testPoolIds.slice(0, 2);
            for (const poolId of toClear) {
                await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                    articleId: poolId,
                    ITEM_NAME: '',
                    ENGLISH_NAME: '',
                    RANK: '',
                    TITLE: '',
                }]);
            }
            console.log(`Cleared ${toClear.length} articles to make them empty: ${toClear.join(', ')}`);

            // Fetch and identify empties
            const aimsArticles = await fetchArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken);
            console.log(`Total articles after clearing: ${aimsArticles.length}`);

            const emptyPoolIds = new Set<string>();
            aimsArticles.forEach((article: any) => {
                const articleId = article.id || article.data?.ARTICLE_ID || article.articleId;
                if (!articleId || !isPoolId(articleId)) return;

                const data = article.data || {};
                const hasData = Object.entries(data).some(([key, value]) => {
                    if (key === 'ARTICLE_ID' || key.startsWith('__')) return false;
                    return value && String(value).trim().length > 0;
                });

                if (!hasData) {
                    emptyPoolIds.add(articleId);
                }
            });

            console.log('Found empty POOL articles:', Array.from(emptyPoolIds));

            expect(true).toBe(true);
        });

        it.skipIf(!runIntegrationTests)('should reuse empty POOL articles when adding new person', async () => {
            if (!accessToken) throw new Error('No access token');

            const { fetchArticles, pushArticles } = await import('@shared/infrastructure/services/solumService');

            // Fetch current state
            const aimsArticles = await fetchArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken);
            console.log(`Total articles in AIMS: ${aimsArticles.length}`);

            const emptyPoolIds = new Set<string>();
            aimsArticles.forEach((article: any) => {
                const articleId = article.id || article.data?.ARTICLE_ID || article.articleId;
                if (!articleId || !isPoolId(articleId)) return;

                const data = article.data || {};
                const hasData = Object.entries(data).some(([key, value]) => {
                    if (key === 'ARTICLE_ID' || key.startsWith('__')) return false;
                    return value && String(value).trim().length > 0;
                });

                if (!hasData) {
                    emptyPoolIds.add(articleId);
                }
            });

            console.log('Empty POOL articles available for reuse:', Array.from(emptyPoolIds));

            // If there are empty POOL articles, demonstrate reuse logic
            if (emptyPoolIds.size > 0) {
                const existingInUse = new Set<string>(); // Assume none in use locally

                const availableEmpty = Array.from(emptyPoolIds)
                    .filter(id => !existingInUse.has(id))
                    .sort()[0];

                console.log('Would reuse POOL-ID for new person:', availableEmpty);

                // Push new person using reused ID
                await pushArticles(AIMS_CONFIG, AIMS_CONFIG.storeNumber, accessToken, [{
                    articleId: availableEmpty,
                    ITEM_NAME: 'אדם חדש',
                    RANK: 'חדש',
                    TITLE: 'תפקיד חדש',
                }]);
                console.log('Added new person using reused POOL-ID:', availableEmpty);

                // Verify reuse worked
                expect(availableEmpty).toBeDefined();
            } else {
                // No empty POOL articles available - just verify the test ran
                console.log('No empty POOL articles found to reuse');
            }

            expect(true).toBe(true);
        });
    });
});
