import { useEffect, useRef } from 'react';
import { performanceMonitor } from '../../infrastructure/monitoring/performanceMonitor';

/**
 * Hook to monitor component render performance
 * @param componentName - Name of the component to track
 * @param enabled - Whether to enable monitoring (default: true in development)
 */
export function usePerformanceMonitor(
    componentName: string,
    enabled: boolean = process.env.NODE_ENV === 'development'
) {
    const renderCountRef = useRef(0);
    const mountTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!enabled) return;

        // Track mount time
        if (renderCountRef.current === 0) {
            mountTimeRef.current = performance.now();
        }

        renderCountRef.current += 1;

        // Track render time
        const renderStartTime = performance.now();

        return () => {
            const renderEndTime = performance.now();
            const renderDuration = renderEndTime - renderStartTime;

            performanceMonitor.trackComponentRender(componentName, renderDuration);

            // Log excessive re-renders
            if (renderCountRef.current > 10) {
                console.warn(
                    `⚠️ Component "${componentName}" has rendered ${renderCountRef.current} times`
                );
            }
        };
    });

    // Log mount time on unmount
    useEffect(() => {
        return () => {
            if (!enabled || mountTimeRef.current === 0) return;

            const totalMountTime = performance.now() - mountTimeRef.current;
            console.log(
                `📊 Component "${componentName}" was mounted for ${totalMountTime.toFixed(2)}ms with ${renderCountRef.current} renders`
            );
        };
    }, [componentName, enabled]);
}

/**
 * Hook to track API call performance
 * Returns a function to wrap API calls with timing
 */
export function useApiPerformanceTracker() {
    return <T>(endpoint: string, apiCall: () => Promise<T>): Promise<T> => {
        const startTime = performance.now();

        return apiCall().finally(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            performanceMonitor.trackApiCall(endpoint, duration);
        });
    };
}
