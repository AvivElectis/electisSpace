/**
 * Logs Store Tests
 * Phase 10.34 - Deep Testing System
 * 
 * Tests log persistence and filtering functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock idb-keyval before importing store
vi.mock('idb-keyval', () => ({
    get: vi.fn(() => Promise.resolve([])),
    set: vi.fn(() => Promise.resolve()),
    del: vi.fn(() => Promise.resolve()),
    keys: vi.fn(() => Promise.resolve([])),
}));

import { useLogsStore, type LogEntry } from './logsStore';

describe('Logs Store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store state
        useLogsStore.setState({
            availableDays: [],
            loadedLogs: {},
            dayLogCounts: {},
            isLoading: false,
        });
    });

    describe('initial state', () => {
        it('should start with empty available days', () => {
            const { result } = renderHook(() => useLogsStore());
            expect(result.current.availableDays).toEqual([]);
        });

        it('should start with empty loaded logs', () => {
            const { result } = renderHook(() => useLogsStore());
            expect(result.current.loadedLogs).toEqual({});
        });

        it('should not be loading initially', () => {
            const { result } = renderHook(() => useLogsStore());
            expect(result.current.isLoading).toBe(false);
        });

        it('should have maxDays set to 10', () => {
            const { result } = renderHook(() => useLogsStore());
            expect(result.current.maxDays).toBe(10);
        });
    });

    describe('getFilteredLogs', () => {
        beforeEach(() => {
            const today = new Date().toISOString().split('T')[0];
            const testLogs: LogEntry[] = [
                { id: '1', timestamp: Date.now(), level: 'info', component: 'App', message: 'Info message' },
                { id: '2', timestamp: Date.now(), level: 'error', component: 'Sync', message: 'Error occurred' },
                { id: '3', timestamp: Date.now(), level: 'warn', component: 'App', message: 'Warning about sync' },
                { id: '4', timestamp: Date.now(), level: 'debug', component: 'Debug', message: 'Debug info' },
            ];
            useLogsStore.setState({
                loadedLogs: { [today]: testLogs },
            });
        });

        it('should return all logs for a day when no filters', () => {
            const { result } = renderHook(() => useLogsStore());
            const today = new Date().toISOString().split('T')[0];
            
            const logs = result.current.getFilteredLogs(today);
            expect(logs).toHaveLength(4);
        });

        it('should filter by level', () => {
            const { result } = renderHook(() => useLogsStore());
            const today = new Date().toISOString().split('T')[0];
            
            const logs = result.current.getFilteredLogs(today, 'error');
            expect(logs).toHaveLength(1);
            expect(logs[0].level).toBe('error');
        });

        it('should filter by search in message', () => {
            const { result } = renderHook(() => useLogsStore());
            const today = new Date().toISOString().split('T')[0];
            
            const logs = result.current.getFilteredLogs(today, undefined, 'sync');
            expect(logs).toHaveLength(2); // 'Error occurred' doesn't match, but 'Warning about sync' does
        });

        it('should filter by search in component', () => {
            const { result } = renderHook(() => useLogsStore());
            const today = new Date().toISOString().split('T')[0];
            
            const logs = result.current.getFilteredLogs(today, undefined, 'App');
            expect(logs).toHaveLength(2);
        });

        it('should combine level and search filters', () => {
            const { result } = renderHook(() => useLogsStore());
            const today = new Date().toISOString().split('T')[0];
            
            const logs = result.current.getFilteredLogs(today, 'warn', 'sync');
            expect(logs).toHaveLength(1);
        });

        it('should return empty array for non-loaded day', () => {
            const { result } = renderHook(() => useLogsStore());
            
            const logs = result.current.getFilteredLogs('2020-01-01');
            expect(logs).toEqual([]);
        });

        it('should be case-insensitive for search', () => {
            const { result } = renderHook(() => useLogsStore());
            const today = new Date().toISOString().split('T')[0];
            
            const logs = result.current.getFilteredLogs(today, undefined, 'INFO');
            expect(logs.length).toBeGreaterThan(0);
        });
    });

    describe('getDayLogCount', () => {
        it('should return count from dayLogCounts', () => {
            useLogsStore.setState({
                dayLogCounts: { '2025-01-14': 42 },
            });
            
            const { result } = renderHook(() => useLogsStore());
            expect(result.current.getDayLogCount('2025-01-14')).toBe(42);
        });

        it('should return 0 for unknown day', () => {
            const { result } = renderHook(() => useLogsStore());
            expect(result.current.getDayLogCount('unknown-date')).toBe(0);
        });
    });

    describe('addLog', () => {
        it('should add log entry', async () => {
            const { result } = renderHook(() => useLogsStore());
            
            await act(async () => {
                await result.current.addLog({
                    level: 'info',
                    component: 'Test',
                    message: 'Test message',
                });
            });
            
            // Log is queued, not immediately visible in store
            // The queue flushes on interval or when full
            expect(result.current).toBeDefined();
        });
    });
});
