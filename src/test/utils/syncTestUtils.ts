/**
 * Sync Test Utilities
 * 
 * Test utilities for verifying sync reliability and performance.
 * Used for sync reliability testing (Phase 6.2).
 */

import { syncApi } from '@shared/infrastructure/services/syncApi';
import { spacesApi } from '@shared/infrastructure/services/spacesApi';
import { peopleApi } from '@shared/infrastructure/services/peopleApi';
import { conferenceApi } from '@shared/infrastructure/services/conferenceApi';

// ============================================================================
// Types
// ============================================================================

export interface SyncTestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
    details?: Record<string, unknown>;
}

export interface SyncTestSuite {
    name: string;
    results: SyncTestResult[];
    totalDuration: number;
    passed: number;
    failed: number;
}

export interface SyncPerformanceMetrics {
    pullDuration: number;
    pushDuration: number;
    statusCheckDuration: number;
    queueFetchDuration: number;
    totalItems: number;
    itemsPerSecond: number;
}

// ============================================================================
// Test Runners
// ============================================================================

/**
 * Run a single sync test with timing
 */
async function runTest(
    name: string,
    testFn: () => Promise<void>
): Promise<SyncTestResult> {
    const start = performance.now();
    try {
        await testFn();
        return {
            name,
            passed: true,
            duration: performance.now() - start,
        };
    } catch (error) {
        return {
            name,
            passed: false,
            duration: performance.now() - start,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Run sync connection test
 */
export async function testSyncConnection(storeId: string): Promise<SyncTestResult> {
    return runTest('Sync Connection', async () => {
        const result = await syncApi.checkConnection(storeId);
        if (!result.connected) {
            throw new Error(`Connection failed: ${result.error || 'Unknown error'}`);
        }
    });
}

/**
 * Run sync status test
 */
export async function testSyncStatus(storeId: string): Promise<SyncTestResult> {
    return runTest('Sync Status', async () => {
        const status = await syncApi.getStatus(storeId);
        if (status.status === 'error') {
            throw new Error('Sync status indicates error state');
        }
    });
}

/**
 * Run pull sync test
 */
export async function testPullSync(storeId: string): Promise<SyncTestResult> {
    return runTest('Pull Sync', async () => {
        const result = await syncApi.pull(storeId);
        // Verify result structure
        if (typeof result.spaces !== 'number' || typeof result.duration !== 'number') {
            throw new Error('Invalid pull result structure');
        }
    });
}

/**
 * Run push sync test
 */
export async function testPushSync(storeId: string): Promise<SyncTestResult> {
    return runTest('Push Sync', async () => {
        const result = await syncApi.push(storeId);
        // Verify result structure
        if (typeof result.processed !== 'number' || typeof result.succeeded !== 'number') {
            throw new Error('Invalid push result structure');
        }
    });
}

/**
 * Run sync queue test
 */
export async function testSyncQueue(storeId: string): Promise<SyncTestResult> {
    return runTest('Sync Queue', async () => {
        const queue = await syncApi.getQueue(storeId);
        // Verify result structure
        if (!Array.isArray(queue.data) || !queue.pagination) {
            throw new Error('Invalid queue result structure');
        }
    });
}

/**
 * Run spaces API test
 */
export async function testSpacesApi(storeId: string): Promise<SyncTestResult> {
    return runTest('Spaces API', async () => {
        const response = await spacesApi.list({ storeId, limit: 10 });
        if (!Array.isArray(response.data)) {
            throw new Error('Invalid spaces response');
        }
    });
}

/**
 * Run people API test
 */
export async function testPeopleApi(storeId: string): Promise<SyncTestResult> {
    return runTest('People API', async () => {
        const response = await peopleApi.list({ storeId, limit: 10 });
        if (!Array.isArray(response.data)) {
            throw new Error('Invalid people response');
        }
    });
}

/**
 * Run conference API test
 */
export async function testConferenceApi(storeId: string): Promise<SyncTestResult> {
    return runTest('Conference API', async () => {
        const response = await conferenceApi.list({ storeId, limit: 10 });
        if (!Array.isArray(response.data)) {
            throw new Error('Invalid conference response');
        }
    });
}

// ============================================================================
// Test Suite Runners
// ============================================================================

/**
 * Run full sync reliability test suite
 */
export async function runSyncReliabilityTests(storeId: string): Promise<SyncTestSuite> {
    const start = performance.now();
    const results: SyncTestResult[] = [];

    // Run tests sequentially
    results.push(await testSyncStatus(storeId));
    results.push(await testSyncConnection(storeId));
    results.push(await testSyncQueue(storeId));
    results.push(await testSpacesApi(storeId));
    results.push(await testPeopleApi(storeId));
    results.push(await testConferenceApi(storeId));

    // Only run pull/push if previous tests passed
    const allPassed = results.every(r => r.passed);
    if (allPassed) {
        results.push(await testPullSync(storeId));
        results.push(await testPushSync(storeId));
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
        name: 'Sync Reliability Tests',
        results,
        totalDuration: performance.now() - start,
        passed,
        failed,
    };
}

/**
 * Run sync performance benchmarks
 */
export async function runSyncPerformanceBenchmarks(storeId: string): Promise<SyncPerformanceMetrics> {
    // Measure status check
    let start = performance.now();
    await syncApi.getStatus(storeId);
    const statusCheckDuration = performance.now() - start;

    // Measure queue fetch
    start = performance.now();
    await syncApi.getQueue(storeId, { limit: 100 });
    const queueFetchDuration = performance.now() - start;

    // Measure pull
    start = performance.now();
    const pullResult = await syncApi.pull(storeId);
    const pullDuration = performance.now() - start;

    // Measure push
    start = performance.now();
    await syncApi.push(storeId);
    const pushDuration = performance.now() - start;

    const totalItems = pullResult.spaces + pullResult.people + pullResult.conferenceRooms;
    const totalDuration = pullDuration + pushDuration;
    const itemsPerSecond = totalDuration > 0 ? (totalItems / (totalDuration / 1000)) : 0;

    return {
        pullDuration,
        pushDuration,
        statusCheckDuration,
        queueFetchDuration,
        totalItems,
        itemsPerSecond,
    };
}

// ============================================================================
// Stress Tests
// ============================================================================

/**
 * Run concurrent sync requests stress test
 */
export async function stressTestConcurrentRequests(
    storeId: string,
    concurrency: number = 10
): Promise<{ succeeded: number; failed: number; avgDuration: number }> {
    const promises = Array(concurrency).fill(null).map(() =>
        (async () => {
            const start = performance.now();
            try {
                await syncApi.getStatus(storeId);
                return { success: true, duration: performance.now() - start };
            } catch {
                return { success: false, duration: performance.now() - start };
            }
        })()
    );

    const results = await Promise.all(promises);
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    return { succeeded, failed, avgDuration };
}

/**
 * Run repeated sync stress test
 */
export async function stressTestRepeatedSync(
    storeId: string,
    iterations: number = 5
): Promise<{ succeeded: number; failed: number; durations: number[] }> {
    const durations: number[] = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
            await syncApi.pull(storeId);
            durations.push(performance.now() - start);
            succeeded++;
        } catch {
            durations.push(performance.now() - start);
            failed++;
        }
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { succeeded, failed, durations };
}

// ============================================================================
// Reporting
// ============================================================================

/**
 * Print test suite results to console
 */
export function printSyncTestResults(suite: SyncTestSuite): void {
    console.log('\n========================================');
    console.log(`       ${suite.name.toUpperCase()}`);
    console.log('========================================\n');

    for (const result of suite.results) {
        const status = result.passed ? '✅' : '❌';
        const duration = `(${result.duration.toFixed(0)}ms)`;
        console.log(`${status} ${result.name} ${duration}`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }

    console.log('\n========================================');
    console.log(`  TOTAL: ${suite.passed} passed, ${suite.failed} failed`);
    console.log(`  Duration: ${suite.totalDuration.toFixed(0)}ms`);
    console.log('========================================\n');
}

/**
 * Print performance metrics to console
 */
export function printPerformanceMetrics(metrics: SyncPerformanceMetrics): void {
    console.log('\n========================================');
    console.log('       PERFORMANCE METRICS');
    console.log('========================================\n');

    console.log(`  Pull Duration:    ${metrics.pullDuration.toFixed(0)}ms`);
    console.log(`  Push Duration:    ${metrics.pushDuration.toFixed(0)}ms`);
    console.log(`  Status Check:     ${metrics.statusCheckDuration.toFixed(0)}ms`);
    console.log(`  Queue Fetch:      ${metrics.queueFetchDuration.toFixed(0)}ms`);
    console.log(`  Total Items:      ${metrics.totalItems}`);
    console.log(`  Items/Second:     ${metrics.itemsPerSecond.toFixed(2)}`);

    console.log('\n========================================\n');
}
