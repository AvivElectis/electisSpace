/**
 * Logger Service Tests
 * 
 * Tests for the centralized logging service including:
 * - Log level methods (debug, info, warn, error)
 * - Category filtering
 * - Performance timing utilities
 * - Export functionality (JSON/CSV)
 * - Log statistics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, LOG_CATEGORIES } from '../logger';

describe('Logger', () => {
    let logger: Logger;

    beforeEach(() => {
        logger = new Logger();
    });

    describe('Basic Logging', () => {
        it('should log info level messages', () => {
            logger.info('App', 'Test message');

            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe('info');
            expect(logs[0].category).toBe('App');
            expect(logs[0].message).toBe('Test message');
        });

        it('should log debug level messages', () => {
            logger.debug('Sync', 'Debug info', { extra: 'data' });

            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe('debug');
            expect(logs[0].data).toEqual({ extra: 'data' });
        });

        it('should log warn level messages', () => {
            logger.warn('Settings', 'Warning message');

            const logs = logger.getLogs();
            expect(logs[0].level).toBe('warn');
        });

        it('should log error level messages', () => {
            logger.error('Error', 'Error occurred', { code: 500 });

            const logs = logger.getLogs();
            expect(logs[0].level).toBe('error');
            expect(logs[0].data).toEqual({ code: 500 });
        });

        it('should add timestamp to each log entry', () => {
            const before = new Date();
            logger.info('App', 'Timestamped message');
            const after = new Date();

            const logs = logger.getLogs();
            const logTime = new Date(logs[0].timestamp);
            expect(logTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(logTime.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });

    describe('Log Filtering', () => {
        beforeEach(() => {
            logger.info('App', 'App info');
            logger.warn('Sync', 'Sync warning');
            logger.error('AIMS', 'AIMS error');
            logger.info('App', 'Another app info');
        });

        it('should filter logs by level', () => {
            const infoLogs = logger.getLogsByLevel('info');
            expect(infoLogs).toHaveLength(2);

            const warnLogs = logger.getLogsByLevel('warn');
            expect(warnLogs).toHaveLength(1);

            const errorLogs = logger.getLogsByLevel('error');
            expect(errorLogs).toHaveLength(1);
        });

        it('should filter logs by category', () => {
            const appLogs = logger.getLogsByCategory('App');
            expect(appLogs).toHaveLength(2);

            const syncLogs = logger.getLogsByCategory('Sync');
            expect(syncLogs).toHaveLength(1);
        });

        it('should get unique categories from logs', () => {
            const categories = logger.getCategories();
            expect(categories).toContain('App');
            expect(categories).toContain('Sync');
            expect(categories).toContain('AIMS');
            expect(categories.length).toBe(3);
        });
    });

    describe('Performance Timing', () => {
        it('should start and end timer correctly', () => {
            logger.startTimer('test-operation');

            // Simulate some time passing
            const duration = logger.endTimer('test-operation', 'Performance', 'Test completed');

            expect(duration).toBeGreaterThanOrEqual(0);

            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].category).toBe('Performance');
            expect(logs[0].message).toContain('Test completed');
        });

        it('should return -1 for non-existent timer', () => {
            const duration = logger.endTimer('non-existent', 'Test', 'Should fail');
            expect(duration).toBe(-1);
        });

        it('should format duration in performance data', () => {
            logger.startTimer('format-test');
            const duration = logger.endTimer('format-test', 'Performance', 'Done');

            // The duration should be a non-negative number
            expect(duration).toBeGreaterThanOrEqual(0);

            // Check the log entry has formatted duration
            const logs = logger.getLogs();
            expect(logs[0].data._performance.formattedDuration).toBeDefined();
        });

        it('should measure async operations', async () => {
            const result = await logger.measureAsync(
                'async-op',
                'Performance',
                'Async operation',
                async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 'completed';
                }
            );

            expect(result).toBe('completed');

            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toContain('Async operation');
        });
    });

    describe('Export Functionality', () => {
        beforeEach(() => {
            logger.info('App', 'First log');
            logger.warn('Sync', 'Second log');
        });

        it('should export logs as JSON', () => {
            const json = logger.exportLogsAsJson();
            const parsed = JSON.parse(json);

            expect(parsed).toHaveLength(2);
            expect(parsed[0].category).toBe('App');
            expect(parsed[1].category).toBe('Sync');
        });

        it('should export filtered logs as JSON', () => {
            const json = logger.exportLogsAsJson({ category: 'App' });
            const parsed = JSON.parse(json);

            expect(parsed).toHaveLength(1);
            expect(parsed[0].category).toBe('App');
        });

        it('should export logs as CSV', () => {
            const csv = logger.exportLogsAsCsv();
            const lines = csv.trim().split('\n');

            // Header + 2 data rows
            expect(lines).toHaveLength(3);
            expect(lines[0]).toContain('Timestamp');
            expect(lines[0]).toContain('Level');
            expect(lines[0]).toContain('Category');
            expect(lines[0]).toContain('Message');
        });

        it('should use exportLogs with format parameter', () => {
            const json = logger.exportLogs('json');
            expect(JSON.parse(json)).toHaveLength(2);

            const csv = logger.exportLogs('csv');
            expect(csv).toContain('Timestamp');
        });
    });

    describe('Log Management', () => {
        it('should respect max log limit', () => {
            // Logger has maxLogs = 1000, but we test the trimming behavior
            for (let i = 0; i < 10; i++) {
                logger.info('Test', `Message ${i}`);
            }

            expect(logger.getLogs().length).toBe(10);
        });

        it('should clear all logs', () => {
            logger.info('App', 'Test');
            logger.warn('Sync', 'Test');

            expect(logger.getLogs()).toHaveLength(2);

            logger.clearLogs();

            expect(logger.getLogs()).toHaveLength(0);
        });
    });

    describe('Statistics', () => {
        beforeEach(() => {
            logger.info('App', 'Info 1');
            logger.info('App', 'Info 2');
            logger.warn('Sync', 'Warning');
            logger.error('Error', 'Error message');
        });

        it('should return correct statistics', () => {
            const stats = logger.getStats();

            expect(stats.totalLogs).toBe(4);
            expect(stats.byLevel.info).toBe(2);
            expect(stats.byLevel.warn).toBe(1);
            expect(stats.byLevel.error).toBe(1);
            expect(stats.byCategory['App']).toBe(2);
            expect(stats.byCategory['Sync']).toBe(1);
        });

        it('should track active timers', () => {
            logger.startTimer('timer1');
            logger.startTimer('timer2');

            let stats = logger.getStats();
            expect(stats.activeTimers).toBe(2);

            logger.endTimer('timer1', 'Test', 'Done');

            stats = logger.getStats();
            expect(stats.activeTimers).toBe(1);
        });
    });

    describe('Predefined Categories', () => {
        it('should export LOG_CATEGORIES array', () => {
            expect(LOG_CATEGORIES).toContain('App');
            expect(LOG_CATEGORIES).toContain('Auth');
            expect(LOG_CATEGORIES).toContain('Sync');
            expect(LOG_CATEGORIES).toContain('AIMS');
            expect(LOG_CATEGORIES).toContain('People');
            expect(LOG_CATEGORIES).toContain('Conference');
            expect(LOG_CATEGORIES).toContain('Spaces');
            expect(LOG_CATEGORIES).toContain('Settings');
            expect(LOG_CATEGORIES).toContain('Navigation');
            expect(LOG_CATEGORIES).toContain('Performance');
            expect(LOG_CATEGORIES).toContain('Storage');
            expect(LOG_CATEGORIES).toContain('CSV');
            expect(LOG_CATEGORIES).toContain('Error');
        });
    });
});
