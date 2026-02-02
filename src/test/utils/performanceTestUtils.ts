/**
 * Performance Test Utilities
 * 
 * Utilities for performance testing and benchmarking (Phase 6.4).
 */

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    threshold?: number;
    passed?: boolean;
}

export interface PerformanceReport {
    name: string;
    timestamp: Date;
    metrics: PerformanceMetric[];
    summary: {
        passed: number;
        failed: number;
        total: number;
    };
}

export interface TimingResult {
    duration: number;
    iterations: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
}

// ============================================================================
// Timing Utilities
// ============================================================================

/**
 * Measure execution time of an async function
 */
export async function measureAsync<T>(
    fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
}

/**
 * Measure execution time of a sync function
 */
export function measureSync<T>(fn: () => T): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return { result, duration };
}

/**
 * Run a function multiple times and collect timing statistics
 */
export async function benchmark(
    fn: () => Promise<void>,
    iterations: number = 10
): Promise<TimingResult> {
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await fn();
        durations.push(performance.now() - start);
    }

    // Sort for percentile calculations
    durations.sort((a, b) => a - b);

    const sum = durations.reduce((a, b) => a + b, 0);

    return {
        duration: sum,
        iterations,
        avgDuration: sum / iterations,
        minDuration: durations[0],
        maxDuration: durations[durations.length - 1],
        p50Duration: percentile(durations, 50),
        p95Duration: percentile(durations, 95),
        p99Duration: percentile(durations, 99),
    };
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

// ============================================================================
// Memory Utilities
// ============================================================================

/**
 * Get current memory usage (if available)
 */
export function getMemoryUsage(): { usedHeap: number; totalHeap: number } | null {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        return {
            usedHeap: memory.usedJSHeapSize,
            totalHeap: memory.totalJSHeapSize,
        };
    }
    return null;
}

/**
 * Measure memory delta during function execution
 */
export async function measureMemory<T>(
    fn: () => Promise<T>
): Promise<{ result: T; memoryDelta: number | null }> {
    const before = getMemoryUsage();
    const result = await fn();
    const after = getMemoryUsage();

    const memoryDelta = before && after ? after.usedHeap - before.usedHeap : null;

    return { result, memoryDelta };
}

// ============================================================================
// Component Performance
// ============================================================================

/**
 * Measure React component render time
 * Note: Should be used with React DevTools profiler for accurate measurements
 */
export function createRenderTimer() {
    let startTime: number | null = null;
    let renders = 0;
    const renderTimes: number[] = [];

    return {
        start: () => {
            startTime = performance.now();
        },
        end: () => {
            if (startTime !== null) {
                renderTimes.push(performance.now() - startTime);
                renders++;
                startTime = null;
            }
        },
        getStats: () => ({
            renders,
            totalTime: renderTimes.reduce((a, b) => a + b, 0),
            avgTime: renders > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renders : 0,
            renderTimes: [...renderTimes],
        }),
        reset: () => {
            startTime = null;
            renders = 0;
            renderTimes.length = 0;
        },
    };
}

// ============================================================================
// Network Performance
// ============================================================================

/**
 * Measure API call performance
 */
export async function measureApiCall(
    name: string,
    apiCall: () => Promise<any>,
    iterations: number = 5
): Promise<PerformanceMetric[]> {
    const timings = await benchmark(apiCall, iterations);

    return [
        { name: `${name} - Avg`, value: timings.avgDuration, unit: 'ms' },
        { name: `${name} - Min`, value: timings.minDuration, unit: 'ms' },
        { name: `${name} - Max`, value: timings.maxDuration, unit: 'ms' },
        { name: `${name} - P95`, value: timings.p95Duration, unit: 'ms' },
    ];
}

// ============================================================================
// Performance Thresholds
// ============================================================================

export const defaultThresholds = {
    // API response times (ms)
    apiResponse: {
        fast: 100,
        acceptable: 500,
        slow: 1000,
    },
    // Render times (ms)
    render: {
        fast: 16,
        acceptable: 50,
        slow: 100,
    },
    // Memory (bytes)
    memory: {
        small: 1024 * 1024,      // 1MB
        medium: 10 * 1024 * 1024, // 10MB
        large: 50 * 1024 * 1024,  // 50MB
    },
};

/**
 * Check if metric passes threshold
 */
export function checkThreshold(
    value: number,
    threshold: number,
    lessThanBetter: boolean = true
): boolean {
    return lessThanBetter ? value <= threshold : value >= threshold;
}

// ============================================================================
// Reporting
// ============================================================================

/**
 * Create a performance report
 */
export function createPerformanceReport(
    name: string,
    metrics: PerformanceMetric[]
): PerformanceReport {
    const passed = metrics.filter(m => m.passed === true || m.passed === undefined).length;
    const failed = metrics.filter(m => m.passed === false).length;

    return {
        name,
        timestamp: new Date(),
        metrics,
        summary: {
            passed,
            failed,
            total: metrics.length,
        },
    };
}

/**
 * Print performance report to console
 */
export function printPerformanceReport(report: PerformanceReport): void {
    console.log('\n========================================');
    console.log(`  ${report.name.toUpperCase()}`);
    console.log(`  ${report.timestamp.toISOString()}`);
    console.log('========================================\n');

    for (const metric of report.metrics) {
        const status = metric.passed === false ? '❌' : metric.passed === true ? '✅' : '•';
        const threshold = metric.threshold ? ` (threshold: ${metric.threshold}${metric.unit})` : '';
        console.log(`${status} ${metric.name}: ${metric.value.toFixed(2)}${metric.unit}${threshold}`);
    }

    console.log('\n========================================');
    console.log(`  Summary: ${report.summary.passed} passed, ${report.summary.failed} failed`);
    console.log('========================================\n');
}

// ============================================================================
// Bundle Size Analysis
// ============================================================================

/**
 * Estimate JSON serialization size
 */
export function estimateSize(obj: any): number {
    return new Blob([JSON.stringify(obj)]).size;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
