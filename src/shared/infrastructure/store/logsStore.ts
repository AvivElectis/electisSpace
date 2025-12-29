import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    id: string;
    timestamp: number;
    level: LogLevel;
    component: string;
    message: string;
    data?: any;
}

export interface DayLogs {
    date: string; // YYYY-MM-DD format
    logs: LogEntry[];
}

export interface LogsStore {
    logsByDay: Record<string, LogEntry[]>; // date -> logs mapping
    maxLogsPerDay: number;
    maxDays: number;

    addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
    clearLogs: (date?: string) => void; // Clear specific day or all
    clearOldLogs: () => void; // Remove logs older than maxDays
    getLogsByDay: (date: string) => LogEntry[];
    getAllDays: () => string[]; // Get all dates with logs
    getFilteredLogs: (date: string, level?: LogLevel, search?: string) => LogEntry[];
    exportDay: (date: string, format: 'json' | 'log') => string;
    exportMultipleDays: (dates: string[]) => Promise<Blob>; // ZIP export
}

const MAX_LOGS_PER_DAY = 1000;
const MAX_DAYS = 30; // Keep logs for 30 days

// Helper to get date string in YYYY-MM-DD format
const getDateString = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
};

// Helper to format log entry as text
const formatLogAsText = (log: LogEntry): string => {
    const timestamp = new Date(log.timestamp).toISOString();
    const level = log.level.toUpperCase().padEnd(5);
    const component = log.component.padEnd(20);
    const dataStr = log.data ? `\n    Data: ${JSON.stringify(log.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${timestamp}] [${level}] [${component}] ${log.message}${dataStr}`;
};

export const useLogsStore = create<LogsStore>()(
    devtools(
        persist(
            (set, get) => ({
                logsByDay: {},
                maxLogsPerDay: MAX_LOGS_PER_DAY,
                maxDays: MAX_DAYS,

                addLog: (entry) => {
                    const newLog: LogEntry = {
                        ...entry,
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        timestamp: Date.now(),
                    };

                    const dateKey = getDateString(newLog.timestamp);

                    set((state) => {
                        const dayLogs = state.logsByDay[dateKey] || [];
                        const updatedDayLogs = [...dayLogs, newLog];

                        // Keep only last MAX_LOGS_PER_DAY entries for this day
                        const trimmedLogs = updatedDayLogs.length > state.maxLogsPerDay
                            ? updatedDayLogs.slice(-state.maxLogsPerDay)
                            : updatedDayLogs;

                        return {
                            logsByDay: {
                                ...state.logsByDay,
                                [dateKey]: trimmedLogs,
                            },
                        };
                    }, false, 'addLog');

                    // Clean up old logs
                    get().clearOldLogs();
                },

                clearLogs: (date?) => {
                    if (date) {
                        // Clear specific day
                        set((state) => {
                            const { [date]: _, ...rest } = state.logsByDay;
                            return { logsByDay: rest };
                        }, false, 'clearLogs');
                    } else {
                        // Clear all
                        set({ logsByDay: {} }, false, 'clearAllLogs');
                    }
                },

                clearOldLogs: () => {
                    const now = Date.now();
                    const maxAge = get().maxDays * 24 * 60 * 60 * 1000; // days to ms

                    set((state) => {
                        const filtered: Record<string, LogEntry[]> = {};

                        Object.entries(state.logsByDay).forEach(([date, logs]) => {
                            const dateTimestamp = new Date(date).getTime();
                            if (now - dateTimestamp <= maxAge) {
                                filtered[date] = logs;
                            }
                        });

                        return { logsByDay: filtered };
                    }, false, 'clearOldLogs');
                },

                getLogsByDay: (date) => {
                    return get().logsByDay[date] || [];
                },

                getAllDays: () => {
                    return Object.keys(get().logsByDay).sort().reverse(); // Newest first
                },

                getFilteredLogs: (date, level?, search?) => {
                    let logs = get().getLogsByDay(date);

                    // Filter by level
                    if (level) {
                        logs = logs.filter(log => log.level === level);
                    }

                    // Filter by search term
                    if (search && search.trim()) {
                        const searchLower = search.toLowerCase();
                        logs = logs.filter(log =>
                            log.component.toLowerCase().includes(searchLower) ||
                            log.message.toLowerCase().includes(searchLower) ||
                            (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
                        );
                    }

                    return logs;
                },

                exportDay: (date, format) => {
                    const logs = get().getLogsByDay(date);

                    if (format === 'json') {
                        return JSON.stringify(logs, null, 2);
                    }

                    // Log format
                    return logs.map(formatLogAsText).join('\n\n');
                },

                exportMultipleDays: async (dates) => {
                    // Dynamic import of JSZip
                    const JSZip = (await import('jszip')).default;
                    const zip = new JSZip();

                    dates.forEach(date => {
                        const logs = get().getLogsByDay(date);
                        const content = logs.map(formatLogAsText).join('\n\n');
                        zip.file(`${date}.log`, content);
                    });

                    return await zip.generateAsync({ type: 'blob' });
                },
            }),
            {
                name: 'logs-store-by-day', // Changed name to avoid conflicts with old array-based store
                partialize: (state) => ({
                    logsByDay: state.logsByDay,
                }),
            }
        ),
        { name: 'LogsStore' }
    )
);
