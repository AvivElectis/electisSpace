/**
 * Logger Service Tests
 * Phase 10.34 - Deep Testing System
 * 
 * Tests logging functionality including levels, categories, and performance timing
 */

import { Logger } from './logger';

// Mock the logsStore
vi.mock('../store/logsStore', () => ({
    useLogsStore: {
        getState: () => ({
            addLog: vi.fn(),
        }),
    },
}));

describe('Logger Service', () => {
    let logger: Logger;

    beforeEach(() => {
        logger = new Logger();
    });

    describe('basic logging', () => {
        it('should log debug messages', () => {
            logger.debug('Test', 'Debug message');
            const logs = logger.getLogs();
            
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe('debug');
            expect(logs[0].message).toBe('Debug message');
        });

        it('should log info messages', () => {
            logger.info('Test', 'Info message');
            const logs = logger.getLogs();
            
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe('info');
        });

        it('should log warn messages', () => {
            logger.warn('Test', 'Warning message');
            const logs = logger.getLogs();
            
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe('warn');
        });

        it('should log error messages', () => {
            logger.error('Test', 'Error message');
            const logs = logger.getLogs();
            
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe('error');
        });

        it('should include category in log entry', () => {
            logger.info('MyCategory', 'Test message');
            const logs = logger.getLogs();
            
            expect(logs[0].category).toBe('MyCategory');
        });

        it('should include timestamp in log entry', () => {
            const before = new Date();
            logger.info('Test', 'Message');
            const after = new Date();
            
            const logs = logger.getLogs();
            expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(logs[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should include additional data when provided', () => {
            logger.info('Test', 'Message', { key: 'value', num: 42 });
            const logs = logger.getLogs();
            
            expect(logs[0].data).toEqual({ key: 'value', num: 42 });
        });

        it('should handle undefined data', () => {
            logger.info('Test', 'Message');
            const logs = logger.getLogs();
            
            expect(logs[0].data).toBeUndefined();
        });
    });

    describe('log retrieval', () => {
        beforeEach(() => {
            logger.debug('Debug', 'Debug msg');
            logger.info('Info', 'Info msg');
            logger.warn('Warn', 'Warn msg');
            logger.error('Error', 'Error msg');
        });

        it('should get all logs', () => {
            const logs = logger.getLogs();
            expect(logs).toHaveLength(4);
        });

        it('should filter logs by level', () => {
            const errorLogs = logger.getLogsByLevel('error');
            expect(errorLogs).toHaveLength(1);
            expect(errorLogs[0].level).toBe('error');
        });

        it('should filter logs by category', () => {
            const infoLogs = logger.getLogsByCategory('Info');
            expect(infoLogs).toHaveLength(1);
            expect(infoLogs[0].category).toBe('Info');
        });

        it('should get unique categories', () => {
            const categories = logger.getCategories();
            expect(categories).toEqual(['Debug', 'Error', 'Info', 'Warn']);
        });

        it('should return copy of logs array', () => {
            const logs1 = logger.getLogs();
            const logs2 = logger.getLogs();
            
            expect(logs1).not.toBe(logs2);
            expect(logs1).toEqual(logs2);
        });
    });

    describe('log storage limits', () => {
        it('should limit logs to maxLogs entries', () => {
            // Default maxLogs is 1000
            for (let i = 0; i < 1050; i++) {
                logger.info('Test', `Message ${i}`);
            }
            
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1000);
        });

        it('should keep most recent logs when exceeding limit', () => {
            for (let i = 0; i < 1010; i++) {
                logger.info('Test', `Message ${i}`);
            }
            
            const logs = logger.getLogs();
            // First log should be Message 10 (first 10 removed)
            expect(logs[0].message).toBe('Message 10');
            expect(logs[logs.length - 1].message).toBe('Message 1009');
        });
    });

    describe('performance timing', () => {
        it('should start and end timer', () => {
            logger.startTimer('test-op');
            const duration = logger.endTimer('test-op', 'Perf', 'Operation complete');
            
            expect(duration).toBeGreaterThanOrEqual(0);
        });

        it('should return -1 for unknown timer', () => {
            const duration = logger.endTimer('unknown', 'Perf', 'Unknown op');
            expect(duration).toBe(-1);
        });

        it('should log timing result', () => {
            logger.startTimer('timed-op');
            logger.endTimer('timed-op', 'Perf', 'Timed operation');
            
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].category).toBe('Perf');
            expect(logs[0].message).toContain('Timed operation');
        });

        it('should include duration in performance data', () => {
            logger.startTimer('measure');
            logger.endTimer('measure', 'Perf', 'Measurement');
            
            const logs = logger.getLogs();
            expect(logs[0].data).toHaveProperty('_performance');
            expect(logs[0].data._performance).toHaveProperty('durationMs');
            expect(typeof logs[0].data._performance.durationMs).toBe('number');
        });
    });

    describe('log count', () => {
        it('should report correct log count', () => {
            logger.info('Test', 'Message 1');
            logger.info('Test', 'Message 2');
            expect(logger.getLogs()).toHaveLength(2);
        });
    });
});
