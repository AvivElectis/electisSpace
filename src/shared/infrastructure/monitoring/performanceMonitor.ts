/**
 * Performance Monitoring Service
 * Tracks page load times, component render times, and API response times
 */

interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: number;
}

class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private enabled: boolean = process.env.NODE_ENV === 'development';

    /**
     * Track page load performance
     */
    trackPageLoad(): void {
        if (!this.enabled || typeof window === 'undefined' || !window.performance) {
            return;
        }

        // Wait for page to fully load
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                const domContentLoaded = perfData.domContentLoadedEventEnd - perfData.navigationStart;
                const timeToInteractive = perfData.domInteractive - perfData.navigationStart;

                this.recordMetric('page_load_time', pageLoadTime);
                this.recordMetric('dom_content_loaded', domContentLoaded);
                this.recordMetric('time_to_interactive', timeToInteractive);

                console.log(`📊 Performance Metrics:
  - Page Load Time: ${pageLoadTime}ms
  - DOM Content Loaded: ${domContentLoaded}ms
  - Time to Interactive: ${timeToInteractive}ms`);
            }, 0);
        });
    }

    /**
     * Track component render time
     */
    trackComponentRender(componentName: string, renderTime: number): void {
        if (!this.enabled) return;

        this.recordMetric(`component_render_${componentName}`, renderTime);

        if (renderTime > 100) {
            console.warn(`⚠️ Slow render detected: ${componentName} took ${renderTime}ms`);
        }
    }

    /**
     * Track API call duration
     */
    trackApiCall(endpoint: string, duration: number): void {
        if (!this.enabled) return;

        this.recordMetric(`api_call_${endpoint}`, duration);

        if (duration > 1000) {
            console.warn(`⚠️ Slow API call: ${endpoint} took ${duration}ms`);
        }
    }

    /**
     * Start timing an operation
     */
    startTiming(label: string): () => void {
        if (!this.enabled) return () => { };

        const startTime = performance.now();

        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            this.recordMetric(label, duration);
            return duration;
        };
    }

    /**
     * Record a custom metric
     */
    recordMetric(name: string, value: number): void {
        if (!this.enabled) return;

        this.metrics.push({
            name,
            value,
            timestamp: Date.now(),
        });

        // Keep only last 100 metrics
        if (this.metrics.length > 100) {
            this.metrics.shift();
        }
    }

    /**
     * Get all recorded metrics
     */
    getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }

    /**
     * Get metrics by name
     */
    getMetricsByName(name: string): PerformanceMetric[] {
        return this.metrics.filter(m => m.name === name);
    }

    /**
     * Get average value for a metric
     */
    getAverageMetric(name: string): number | null {
        const metrics = this.getMetricsByName(name);
        if (metrics.length === 0) return null;

        const sum = metrics.reduce((acc, m) => acc + m.value, 0);
        return sum / metrics.length;
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics = [];
    }

    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-track page load in browser
if (typeof window !== 'undefined') {
    performanceMonitor.trackPageLoad();
}
