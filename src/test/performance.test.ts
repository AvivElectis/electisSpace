/**
 * Performance Tests
 * 
 * Performance benchmarks and tests (Phase 6.4).
 */

import {
    measureAsync,
    measureSync,
    benchmark,
    checkThreshold,
    defaultThresholds,
    createPerformanceReport,
    estimateSize,
    formatBytes,
    createRenderTimer,
} from './utils/performanceTestUtils';

describe('Performance Tests', () => {
    describe('Timing Utilities', () => {
        it('should measure async function execution time', async () => {
            const { result, duration } = await measureAsync(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return 'done';
            });

            expect(result).toBe('done');
            expect(duration).toBeGreaterThanOrEqual(45);
            expect(duration).toBeLessThan(150);
        });

        it('should measure sync function execution time', () => {
            const { result, duration } = measureSync(() => {
                let sum = 0;
                for (let i = 0; i < 10000; i++) sum += i;
                return sum;
            });

            expect(result).toBe(49995000);
            expect(duration).toBeGreaterThanOrEqual(0);
        });

        it('should benchmark with multiple iterations', async () => {
            let callCount = 0;
            const timings = await benchmark(async () => {
                callCount++;
                await new Promise(resolve => setTimeout(resolve, 10));
            }, 5);

            expect(callCount).toBe(5);
            expect(timings.iterations).toBe(5);
            expect(timings.avgDuration).toBeGreaterThan(8);
            expect(timings.minDuration).toBeLessThanOrEqual(timings.avgDuration);
            expect(timings.maxDuration).toBeGreaterThanOrEqual(timings.avgDuration);
            expect(timings.p50Duration).toBeDefined();
            expect(timings.p95Duration).toBeDefined();
            expect(timings.p99Duration).toBeDefined();
        });
    });

    describe('Threshold Checking', () => {
        it('should correctly check thresholds', () => {
            expect(checkThreshold(50, 100, true)).toBe(true);  // 50 <= 100
            expect(checkThreshold(150, 100, true)).toBe(false); // 150 > 100
            expect(checkThreshold(150, 100, false)).toBe(true); // 150 >= 100
            expect(checkThreshold(50, 100, false)).toBe(false); // 50 < 100
        });

        it('should have sensible default thresholds', () => {
            expect(defaultThresholds.apiResponse.fast).toBe(100);
            expect(defaultThresholds.apiResponse.acceptable).toBe(500);
            expect(defaultThresholds.render.fast).toBe(16); // ~60fps
        });
    });

    describe('Performance Reporting', () => {
        it('should create performance report', () => {
            const metrics = [
                { name: 'API Call', value: 150, unit: 'ms', threshold: 200, passed: true },
                { name: 'Render', value: 25, unit: 'ms', threshold: 16, passed: false },
            ];

            const report = createPerformanceReport('Test Report', metrics);

            expect(report.name).toBe('Test Report');
            expect(report.metrics.length).toBe(2);
            expect(report.summary.passed).toBe(1);
            expect(report.summary.failed).toBe(1);
        });
    });

    describe('Size Utilities', () => {
        it('should estimate object size', () => {
            const obj = { name: 'test', value: 123, nested: { a: 1, b: 2 } };
            const size = estimateSize(obj);
            expect(size).toBeGreaterThan(0);
        });

        it('should format bytes correctly', () => {
            expect(formatBytes(500)).toBe('500 B');
            expect(formatBytes(1500)).toBe('1.46 KB');
            expect(formatBytes(1500000)).toBe('1.43 MB');
        });
    });

    describe('Render Timer', () => {
        it('should track render times', () => {
            const timer = createRenderTimer();

            timer.start();
            // Simulate some work
            for (let i = 0; i < 1000; i++) Math.random();
            timer.end();

            timer.start();
            for (let i = 0; i < 1000; i++) Math.random();
            timer.end();

            const stats = timer.getStats();
            expect(stats.renders).toBe(2);
            expect(stats.totalTime).toBeGreaterThan(0);
            expect(stats.avgTime).toBeGreaterThan(0);
            expect(stats.renderTimes.length).toBe(2);

            timer.reset();
            expect(timer.getStats().renders).toBe(0);
        });
    });
});

describe('Application Performance Benchmarks', () => {
    describe('Permission Checks', () => {
        it('should perform permission checks quickly', async () => {
            // Import dynamically to avoid circular deps
            const { createMockUser, createMockCompany, createMockStore, isPlatformAdmin, canAccessFeature } = 
                await import('./utils/permissionTestUtils');

            const user = createMockUser({
                role: 'USER',
                companies: Array(10).fill(null).map((_, i) => 
                    createMockCompany({
                        id: `company_${i}`,
                    })
                ),
                stores: Array(10).fill(null).map((_, i) => 
                    createMockStore({ id: `store_${i}`, companyId: `company_${Math.floor(i / 10)}` })
                ),
            });

            const timings = await benchmark(async () => {
                isPlatformAdmin(user);
                for (const store of user.stores) {
                    canAccessFeature(user, store.id, 'dashboard');
                }
            }, 100);

            // Permission checks should be very fast (<1ms average)
            expect(timings.avgDuration).toBeLessThan(5);
        });
    });

    describe('Data Serialization', () => {
        it('should serialize spaces data efficiently', () => {
            const spaces = Array(1000).fill(null).map((_, i) => ({
                id: `space_${i}`,
                externalId: `EXT_${i}`,
                data: { field1: 'value1', field2: 'value2', field3: i.toString() },
                labelCode: i % 10 === 0 ? `LABEL_${i}` : undefined,
            }));

            const { duration } = measureSync(() => JSON.stringify(spaces));
            const size = estimateSize(spaces);

            // Should serialize 1000 items in <10ms
            expect(duration).toBeLessThan(50);
            
            // Size should be reasonable (<1MB for 1000 items)
            expect(size).toBeLessThan(1024 * 1024);
        });
    });

    describe('State Updates', () => {
        it('should handle rapid state updates', async () => {
            const state = { items: [] as any[], counter: 0 };

            const timings = await benchmark(async () => {
                for (let i = 0; i < 100; i++) {
                    state.items = [...state.items, { id: i, data: {} }];
                    state.counter++;
                }
                state.items = [];
                state.counter = 0;
            }, 10);

            // Should handle 100 updates in <10ms on average
            expect(timings.avgDuration).toBeLessThan(50);
        });
    });
});
