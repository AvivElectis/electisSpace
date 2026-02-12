import { performanceMonitor } from './performanceMonitor';

describe('Performance Monitor', () => {
    beforeEach(() => {
        performanceMonitor.clearMetrics();
        performanceMonitor.setEnabled(true);
    });

    describe('recordMetric', () => {
        it('should record a metric', () => {
            performanceMonitor.recordMetric('test_metric', 100);
            const metrics = performanceMonitor.getMetrics();

            expect(metrics).toHaveLength(1);
            expect(metrics[0].name).toBe('test_metric');
            expect(metrics[0].value).toBe(100);
        });

        it('should record multiple metrics', () => {
            performanceMonitor.recordMetric('metric1', 100);
            performanceMonitor.recordMetric('metric2', 200);
            performanceMonitor.recordMetric('metric3', 300);

            const metrics = performanceMonitor.getMetrics();
            expect(metrics).toHaveLength(3);
        });

        it('should limit metrics to 100 entries', () => {
            for (let i = 0; i < 150; i++) {
                performanceMonitor.recordMetric(`metric_${i}`, i);
            }

            const metrics = performanceMonitor.getMetrics();
            expect(metrics).toHaveLength(100);
        });
    });

    describe('getMetricsByName', () => {
        it('should filter metrics by name', () => {
            performanceMonitor.recordMetric('test', 100);
            performanceMonitor.recordMetric('other', 200);
            performanceMonitor.recordMetric('test', 150);

            const testMetrics = performanceMonitor.getMetricsByName('test');
            expect(testMetrics).toHaveLength(2);
            expect(testMetrics[0].value).toBe(100);
            expect(testMetrics[1].value).toBe(150);
        });
    });

    describe('getAverageMetric', () => {
        it('should calculate average of metrics', () => {
            performanceMonitor.recordMetric('test', 100);
            performanceMonitor.recordMetric('test', 200);
            performanceMonitor.recordMetric('test', 300);

            const average = performanceMonitor.getAverageMetric('test');
            expect(average).toBe(200);
        });

        it('should return null for non-existent metric', () => {
            const average = performanceMonitor.getAverageMetric('nonexistent');
            expect(average).toBeNull();
        });
    });

    describe('startTiming', () => {
        it('should measure operation duration', async () => {
            const endTiming = performanceMonitor.startTiming('test_operation');

            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, 10));

            endTiming();

            const metrics = performanceMonitor.getMetricsByName('test_operation');
            expect(metrics).toHaveLength(1);
            expect(metrics[0].value).toBeGreaterThan(0);
        });
    });

    describe('clearMetrics', () => {
        it('should clear all metrics', () => {
            performanceMonitor.recordMetric('test1', 100);
            performanceMonitor.recordMetric('test2', 200);

            performanceMonitor.clearMetrics();

            const metrics = performanceMonitor.getMetrics();
            expect(metrics).toHaveLength(0);
        });
    });

    describe('setEnabled', () => {
        it('should not record metrics when disabled', () => {
            performanceMonitor.setEnabled(false);
            performanceMonitor.recordMetric('test', 100);

            const metrics = performanceMonitor.getMetrics();
            expect(metrics).toHaveLength(0);
        });
    });
});
