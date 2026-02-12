/**
 * Logs Store Tests
 * Phase 10.21 - Deep Testing System
 * 
 * Tests the logs store for managing application logs with IndexedDB persistence
 */

import { useLogsStore, type LogEntry, type LogLevel } from '../logsStore';

// Mock idb-keyval
const mockStore: Record<string, LogEntry[]> = {};

vi.mock('idb-keyval', () => ({
    get: vi.fn((key: string) => Promise.resolve(mockStore[key] || [])),
    set: vi.fn((key: string, value: LogEntry[]) => {
        mockStore[key] = value;
        return Promise.resolve();
    }),
    del: vi.fn((key: string) => {
        delete mockStore[key];
        return Promise.resolve();
    }),
    keys: vi.fn(() => Promise.resolve(Object.keys(mockStore))),
}));

// Mock JSZip
vi.mock('jszip', () => ({
    default: class {
        files: Record<string, { content: string }> = {};
        file(name: string, content: string) {
            this.files[name] = { content };
        }
        generateAsync() {
            return Promise.resolve(new Blob([JSON.stringify(this.files)]));
        }
    },
}));

describe('Logs Store', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Clear mock store
        Object.keys(mockStore).forEach(key => delete mockStore[key]);
        // Reset zustand store
        useLogsStore.setState({
            availableDays: [],
            loadedLogs: {},
            dayLogCounts: {},
            isLoading: false,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('init', () => {
        it('should initialize with empty state when no logs exist', async () => {
            const { init } = useLogsStore.getState();

            await init();

            const state = useLogsStore.getState();
            expect(state.availableDays).toEqual([]);
            expect(state.loadedLogs).toEqual({});
            expect(state.isLoading).toBe(false);
        });

        it('should load available days from IndexedDB', async () => {
            // Setup mock data
            mockStore['logs_2025-01-10'] = [
                { id: '1', timestamp: Date.now(), level: 'info', component: 'Test', message: 'Test' },
            ];
            mockStore['logs_2025-01-11'] = [
                { id: '2', timestamp: Date.now(), level: 'info', component: 'Test', message: 'Test' },
            ];

            const { init } = useLogsStore.getState();
            await init();

            const state = useLogsStore.getState();
            expect(state.availableDays).toContain('2025-01-10');
            expect(state.availableDays).toContain('2025-01-11');
        });

        it('should sort days in reverse order (newest first)', async () => {
            mockStore['logs_2025-01-08'] = [];
            mockStore['logs_2025-01-10'] = [];
            mockStore['logs_2025-01-09'] = [];

            const { init } = useLogsStore.getState();
            await init();

            const state = useLogsStore.getState();
            expect(state.availableDays[0]).toBe('2025-01-10');
            expect(state.availableDays[1]).toBe('2025-01-09');
            expect(state.availableDays[2]).toBe('2025-01-08');
        });

        it('should pre-load log counts for all days', async () => {
            mockStore['logs_2025-01-10'] = [
                { id: '1', timestamp: Date.now(), level: 'info', component: 'Test', message: 'Test 1' },
                { id: '2', timestamp: Date.now(), level: 'info', component: 'Test', message: 'Test 2' },
            ];
            mockStore['logs_2025-01-11'] = [
                { id: '3', timestamp: Date.now(), level: 'info', component: 'Test', message: 'Test 3' },
            ];

            const { init } = useLogsStore.getState();
            await init();

            const state = useLogsStore.getState();
            expect(state.dayLogCounts['2025-01-10']).toBe(2);
            expect(state.dayLogCounts['2025-01-11']).toBe(1);
        });
    });

    describe('addLog', () => {
        it('should add a log entry with generated ID and timestamp', async () => {
            const now = new Date('2025-01-13T12:00:00.000Z').getTime();
            vi.setSystemTime(now);

            const { addLog } = useLogsStore.getState();
            await addLog({ level: 'info', component: 'TestComponent', message: 'Test message' });

            const state = useLogsStore.getState();
            expect(state.dayLogCounts['2025-01-13']).toBe(1);
        });

        it('should update availableDays when adding to new day', async () => {
            const now = new Date('2025-01-13T12:00:00.000Z').getTime();
            vi.setSystemTime(now);

            const { addLog } = useLogsStore.getState();
            await addLog({ level: 'info', component: 'Test', message: 'Test' });

            const state = useLogsStore.getState();
            expect(state.availableDays).toContain('2025-01-13');
        });

        it('should support all log levels', async () => {
            const { addLog } = useLogsStore.getState();
            const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

            for (const level of levels) {
                await addLog({ level, component: 'Test', message: `${level} message` });
            }

            // Logs should be queued
            const state = useLogsStore.getState();
            expect(state.dayLogCounts[Object.keys(state.dayLogCounts)[0]]).toBeGreaterThan(0);
        });

        it('should support optional data field', async () => {
            const { addLog, loadDayLogs } = useLogsStore.getState();
            const now = new Date('2025-01-13T12:00:00.000Z').getTime();
            vi.setSystemTime(now);

            await addLog({
                level: 'info',
                component: 'Test',
                message: 'Test with data',
                data: { key: 'value', count: 42 },
            });

            // Force flush by advancing timers
            vi.advanceTimersByTime(5000);

            // Load the logs
            await loadDayLogs('2025-01-13');

            const state = useLogsStore.getState();
            const logs = state.loadedLogs['2025-01-13'];
            expect(logs).toBeDefined();
        });
    });

    describe('loadDayLogs', () => {
        it('should load logs for a specific day', async () => {
            const testLogs: LogEntry[] = [
                { id: '1', timestamp: Date.now(), level: 'info', component: 'Test', message: 'Log 1' },
                { id: '2', timestamp: Date.now(), level: 'error', component: 'Test', message: 'Log 2' },
            ];
            mockStore['logs_2025-01-10'] = testLogs;

            const { loadDayLogs } = useLogsStore.getState();
            await loadDayLogs('2025-01-10');

            const state = useLogsStore.getState();
            expect(state.loadedLogs['2025-01-10']).toHaveLength(2);
        });

        it('should not reload if already loaded', async () => {
            const testLogs: LogEntry[] = [
                { id: '1', timestamp: Date.now(), level: 'info', component: 'Test', message: 'Log 1' },
            ];
            mockStore['logs_2025-01-10'] = testLogs;

            useLogsStore.setState({
                loadedLogs: { '2025-01-10': testLogs },
            });

            const { get } = await import('idb-keyval');
            vi.mocked(get).mockClear(); // Clear previous calls

            const { loadDayLogs } = useLogsStore.getState();
            await loadDayLogs('2025-01-10');

            // get should not be called since already loaded
            expect(get).not.toHaveBeenCalled();
        });

        it('should handle empty day gracefully', async () => {
            mockStore['logs_2025-01-10'] = [];

            const { loadDayLogs } = useLogsStore.getState();
            await loadDayLogs('2025-01-10');

            const state = useLogsStore.getState();
            expect(state.loadedLogs['2025-01-10']).toEqual([]);
        });
    });

    describe('clearLogs', () => {
        it('should clear logs for a specific day', async () => {
            mockStore['logs_2025-01-10'] = [
                { id: '1', timestamp: Date.now(), level: 'info', component: 'Test', message: 'Log' },
            ];
            useLogsStore.setState({
                availableDays: ['2025-01-10'],
                loadedLogs: { '2025-01-10': mockStore['logs_2025-01-10'] },
                dayLogCounts: { '2025-01-10': 1 },
            });

            const { clearLogs } = useLogsStore.getState();
            await clearLogs('2025-01-10');

            const state = useLogsStore.getState();
            expect(state.availableDays).not.toContain('2025-01-10');
            expect(state.loadedLogs['2025-01-10']).toBeUndefined();
            expect(state.dayLogCounts['2025-01-10']).toBeUndefined();
        });

        it('should clear all logs when no date specified', async () => {
            mockStore['logs_2025-01-10'] = [];
            mockStore['logs_2025-01-11'] = [];
            useLogsStore.setState({
                availableDays: ['2025-01-11', '2025-01-10'],
                loadedLogs: { '2025-01-10': [], '2025-01-11': [] },
                dayLogCounts: { '2025-01-10': 5, '2025-01-11': 3 },
            });

            const { clearLogs } = useLogsStore.getState();
            await clearLogs();

            const state = useLogsStore.getState();
            expect(state.availableDays).toEqual([]);
            expect(state.loadedLogs).toEqual({});
            expect(state.dayLogCounts).toEqual({});
        });
    });

    describe('clearOldLogs', () => {
        it('should remove logs older than maxDays', async () => {
            // Create 12 days of logs (more than MAX_DAYS = 10)
            for (let i = 1; i <= 12; i++) {
                const day = `2025-01-${String(i).padStart(2, '0')}`;
                mockStore[`logs_${day}`] = [];
            }

            useLogsStore.setState({
                availableDays: Array.from({ length: 12 }, (_, i) =>
                    `2025-01-${String(12 - i).padStart(2, '0')}`
                ),
                dayLogCounts: Object.fromEntries(
                    Array.from({ length: 12 }, (_, i) => [
                        `2025-01-${String(i + 1).padStart(2, '0')}`,
                        1,
                    ])
                ),
            });

            const { clearOldLogs } = useLogsStore.getState();
            await clearOldLogs();

            const state = useLogsStore.getState();
            expect(state.availableDays.length).toBe(10);
        });

        it('should do nothing if within maxDays', async () => {
            useLogsStore.setState({
                availableDays: ['2025-01-10', '2025-01-09', '2025-01-08'],
                dayLogCounts: { '2025-01-10': 1, '2025-01-09': 1, '2025-01-08': 1 },
            });

            const { clearOldLogs } = useLogsStore.getState();
            await clearOldLogs();

            const state = useLogsStore.getState();
            expect(state.availableDays.length).toBe(3);
        });
    });

    describe('getFilteredLogs', () => {
        const testLogs: LogEntry[] = [
            { id: '1', timestamp: 1000, level: 'info', component: 'Auth', message: 'User logged in' },
            { id: '2', timestamp: 2000, level: 'error', component: 'Auth', message: 'Login failed' },
            { id: '3', timestamp: 3000, level: 'warn', component: 'API', message: 'Rate limit warning' },
            { id: '4', timestamp: 4000, level: 'debug', component: 'Cache', message: 'Cache hit', data: { key: 'user:123' } },
        ];

        beforeEach(() => {
            useLogsStore.setState({
                loadedLogs: { '2025-01-10': testLogs },
            });
        });

        it('should return all logs when no filters applied', () => {
            const { getFilteredLogs } = useLogsStore.getState();

            const result = getFilteredLogs('2025-01-10');

            expect(result).toHaveLength(4);
        });

        it('should filter by log level', () => {
            const { getFilteredLogs } = useLogsStore.getState();

            const result = getFilteredLogs('2025-01-10', 'error');

            expect(result).toHaveLength(1);
            expect(result[0].message).toBe('Login failed');
        });

        it('should filter by search text in component', () => {
            const { getFilteredLogs } = useLogsStore.getState();

            const result = getFilteredLogs('2025-01-10', undefined, 'Auth');

            expect(result).toHaveLength(2);
        });

        it('should filter by search text in message', () => {
            const { getFilteredLogs } = useLogsStore.getState();

            const result = getFilteredLogs('2025-01-10', undefined, 'warning');

            expect(result).toHaveLength(1);
            expect(result[0].component).toBe('API');
        });

        it('should filter by search text in data', () => {
            const { getFilteredLogs } = useLogsStore.getState();

            const result = getFilteredLogs('2025-01-10', undefined, 'user:123');

            expect(result).toHaveLength(1);
            expect(result[0].component).toBe('Cache');
        });

        it('should be case-insensitive for search', () => {
            const { getFilteredLogs } = useLogsStore.getState();

            const result = getFilteredLogs('2025-01-10', undefined, 'USER LOGGED');

            expect(result).toHaveLength(1);
        });

        it('should combine level and search filters', () => {
            const { getFilteredLogs } = useLogsStore.getState();

            const result = getFilteredLogs('2025-01-10', 'info', 'logged');

            expect(result).toHaveLength(1);
            expect(result[0].message).toBe('User logged in');
        });

        it('should return empty array for unloaded day', () => {
            const { getFilteredLogs } = useLogsStore.getState();

            const result = getFilteredLogs('2025-01-01');

            expect(result).toEqual([]);
        });
    });

    describe('getDayLogCount', () => {
        it('should return count from loaded logs if available', () => {
            const testLogs: LogEntry[] = [
                { id: '1', timestamp: 1000, level: 'info', component: 'Test', message: 'Log 1' },
                { id: '2', timestamp: 2000, level: 'info', component: 'Test', message: 'Log 2' },
            ];
            useLogsStore.setState({
                loadedLogs: { '2025-01-10': testLogs },
                dayLogCounts: { '2025-01-10': 100 }, // Pre-loaded count is wrong
            });

            const { getDayLogCount } = useLogsStore.getState();

            expect(getDayLogCount('2025-01-10')).toBe(2); // Should use loaded count
        });

        it('should return pre-loaded count if logs not loaded', () => {
            useLogsStore.setState({
                dayLogCounts: { '2025-01-10': 50 },
            });

            const { getDayLogCount } = useLogsStore.getState();

            expect(getDayLogCount('2025-01-10')).toBe(50);
        });

        it('should return 0 for unknown day', () => {
            const { getDayLogCount } = useLogsStore.getState();

            expect(getDayLogCount('2025-01-01')).toBe(0);
        });
    });

    describe('exportMultipleDays', () => {
        it('should export logs from multiple days as zip', async () => {
            mockStore['logs_2025-01-10'] = [
                { id: '1', timestamp: 1000, level: 'info', component: 'Test', message: 'Day 1 Log' },
            ];
            mockStore['logs_2025-01-11'] = [
                { id: '2', timestamp: 2000, level: 'info', component: 'Test', message: 'Day 2 Log' },
            ];

            const { exportMultipleDays } = useLogsStore.getState();

            const blob = await exportMultipleDays(['2025-01-10', '2025-01-11']);

            expect(blob).toBeInstanceOf(Blob);
        });

        it('should use loaded logs when available', async () => {
            const loadedLogs: LogEntry[] = [
                { id: '1', timestamp: 1000, level: 'info', component: 'Test', message: 'Loaded log' },
            ];
            useLogsStore.setState({
                loadedLogs: { '2025-01-10': loadedLogs },
            });

            const { exportMultipleDays } = useLogsStore.getState();

            const blob = await exportMultipleDays(['2025-01-10']);

            expect(blob).toBeInstanceOf(Blob);
        });
    });
});
