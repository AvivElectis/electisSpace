import { useEffect, useRef } from 'react';

/**
 * Performance metrics for a component render
 */
interface RenderMetrics {
    componentName: string;
    renderCount: number;
    lastRenderDuration: number;
    averageRenderDuration: number;
}

/**
 * Custom hook for monitoring component render performance
 * Only active in development mode
 * 
 * @param componentName - Name of the component being monitored
 * @param enabled - Whether monitoring is enabled (default: true in dev, false in prod)
 * 
 * @example
 * function MyComponent() {
 *   usePerformanceMonitor('MyComponent');
 *   // Component logic...
 * }
 */
export function usePerformanceMonitor(
    componentName: string,
    enabled: boolean = import.meta.env?.DEV ?? false
): void {
    const renderCount = useRef(0);
    const renderTimes = useRef<number[]>([]);
    const startTime = useRef<number>(0);

    if (!enabled) return;

    // Mark render start
    startTime.current = performance.now();

    useEffect(() => {
        // Calculate render duration
        const duration = performance.now() - startTime.current;
        renderCount.current += 1;
        renderTimes.current.push(duration);

        // Keep only last 10 render times for average calculation
        if (renderTimes.current.length > 10) {
            renderTimes.current.shift();
        }

        const averageDuration =
            renderTimes.current.reduce((sum, time) => sum + time, 0) /
            renderTimes.current.length;

        const metrics: RenderMetrics = {
            componentName,
            renderCount: renderCount.current,
            lastRenderDuration: duration,
            averageRenderDuration: averageDuration,
        };

        // Log performance metrics
        if (duration > 16) {
            // Warn if render takes longer than one frame (16ms)
            // console.warn(
            //     `[Performance] ${componentName} render #${renderCount.current} took ${duration.toFixed(2)}ms (avg: ${averageDuration.toFixed(2)}ms)`
            // );
        } else if (renderCount.current % 10 === 0) {
            // Log every 10th render
            // console.log(
            //     `[Performance] ${componentName} render #${renderCount.current} - avg: ${averageDuration.toFixed(2)}ms`
            // );
        }

        // Store metrics globally for debugging
        if (typeof window !== 'undefined') {
            if (!window.__PERFORMANCE_METRICS__) {
                window.__PERFORMANCE_METRICS__ = {};
            }
            window.__PERFORMANCE_METRICS__[componentName] = metrics;
        }
    });
}

// Extend Window interface for TypeScript
declare global {
    interface Window {
        __PERFORMANCE_METRICS__?: Record<string, RenderMetrics>;
    }
}
