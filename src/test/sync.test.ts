/**
 * Sync Reliability Tests
 * 
 * Integration tests for sync operations (Phase 6.2).
 * Tests sync API endpoints and reliability.
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
    runSyncReliabilityTests,
    testSyncStatus,
    testSyncConnection,
    testSyncQueue,
    stressTestConcurrentRequests,
} from './utils/syncTestUtils';

// Mock server setup
const server = setupServer(
    // Sync status endpoint
    http.get('/api/v1/sync/status', () => {
        return HttpResponse.json({
            status: 'idle',
            lastSync: new Date().toISOString(),
            pendingItems: 0,
            failedItems: 0,
            aimsConnected: true,
        });
    }),

    // Sync connection health
    http.get('/api/v1/sync/health', () => {
        return HttpResponse.json({
            connected: true,
            latency: 150,
        });
    }),

    // Sync queue
    http.get('/api/v1/sync/queue', () => {
        return HttpResponse.json({
            data: [],
            pagination: {
                page: 1,
                limit: 50,
                total: 0,
                totalPages: 1,
            },
        });
    }),

    // Pull sync
    http.post('/api/v1/sync/pull', () => {
        return HttpResponse.json({
            spaces: 10,
            people: 5,
            conferenceRooms: 2,
            created: 5,
            updated: 12,
            duration: 1500,
        });
    }),

    // Push sync
    http.post('/api/v1/sync/push', () => {
        return HttpResponse.json({
            processed: 3,
            succeeded: 3,
            failed: 0,
            duration: 500,
        });
    }),

    // Spaces list
    http.get('/api/v1/spaces', () => {
        return HttpResponse.json({
            data: [
                { id: '1', externalId: 'S001', data: {} },
                { id: '2', externalId: 'S002', data: {} },
            ],
            pagination: {
                page: 1,
                limit: 10,
                total: 2,
                totalPages: 1,
            },
        });
    }),

    // People list
    http.get('/api/v1/people', () => {
        return HttpResponse.json({
            data: [
                { id: '1', externalId: 'P001', firstName: 'John', lastName: 'Doe', data: {} },
            ],
            pagination: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });
    }),

    // Conference rooms list
    http.get('/api/v1/conference-rooms', () => {
        return HttpResponse.json({
            data: [
                { id: '1', externalId: 'C001', name: 'Room A', data: {} },
            ],
            pagination: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });
    })
);

describe('Sync Reliability', () => {
    beforeAll(() => server.listen());
    afterAll(() => server.close());

    const mockStoreId = 'store_123';

    describe('Individual Tests', () => {
        it('should successfully check sync status', async () => {
            const result = await testSyncStatus(mockStoreId);
            expect(result.passed).toBe(true);
            expect(result.duration).toBeLessThan(5000);
        });

        it('should successfully check sync connection', async () => {
            const result = await testSyncConnection(mockStoreId);
            expect(result.passed).toBe(true);
        });

        it('should successfully fetch sync queue', async () => {
            const result = await testSyncQueue(mockStoreId);
            expect(result.passed).toBe(true);
        });
    });

    describe('Full Test Suite', () => {
        it('should pass all reliability tests', async () => {
            const suite = await runSyncReliabilityTests(mockStoreId);
            expect(suite.failed).toBe(0);
            expect(suite.passed).toBeGreaterThan(0);
        });
    });

    describe('Stress Tests', () => {
        it('should handle concurrent requests', async () => {
            const result = await stressTestConcurrentRequests(mockStoreId, 5);
            expect(result.succeeded).toBe(5);
            expect(result.failed).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle connection failures gracefully', async () => {
            // Override with error response
            server.use(
                http.get('/api/v1/sync/health', () => {
                    return HttpResponse.json(
                        { connected: false, error: 'Connection timeout' },
                        { status: 200 }
                    );
                })
            );

            const result = await testSyncConnection(mockStoreId);
            expect(result.passed).toBe(false);
            expect(result.error).toContain('Connection failed');
        });

        it('should handle server errors', async () => {
            server.use(
                http.get('/api/v1/sync/status', () => {
                    return HttpResponse.error();
                })
            );

            const result = await testSyncStatus(mockStoreId);
            expect(result.passed).toBe(false);
        });
    });
});
