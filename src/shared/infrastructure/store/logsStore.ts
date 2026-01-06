import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from 'idb-keyval';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    id: string;
    timestamp: number;
    level: LogLevel;
    component: string;
    message: string;
    data?: any;
}

export interface LogsStore {
    availableDays: string[]; // List of dates YYYY-MM-DD that have logs
    loadedLogs: Record<string, LogEntry[]>; // In-memory cache of loaded days
    dayLogCounts: Record<string, number>; // Log counts per day (pre-loaded for display)
    isLoading: boolean;
    maxDays: number;

    init: () => Promise<void>;
    addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => Promise<void>;
    loadDayLogs: (date: string) => Promise<void>;
    clearLogs: (date?: string) => Promise<void>;
    clearOldLogs: () => Promise<void>;
    getFilteredLogs: (date: string, level?: LogLevel, search?: string) => LogEntry[];
    exportMultipleDays: (dates: string[]) => Promise<Blob>;
    getDayLogCount: (date: string) => number;
}

const MAX_DAYS = 10;
const LOG_KEY_PREFIX = 'logs_';
const FLUSH_INTERVAL = 5000; // 5 seconds
const MAX_QUEUE_SIZE = 100;

// Global queue for persistence
const logQueue: LogEntry[] = [];
let flushTimeout: any = null;

// Helper: Get date string YYYY-MM-DD
const getDateString = (timestamp: number): string => {
    return new Date(timestamp).toISOString().split('T')[0];
};

const formatLogAsText = (log: LogEntry): string => {
    const timestamp = new Date(log.timestamp).toISOString();
    const level = log.level.toUpperCase().padEnd(5);
    const component = log.component.padEnd(20);
    const dataStr = log.data ? `\n    Data: ${JSON.stringify(log.data, null, 2).replace(/\n/g, '\n    ')}` : '';
    return `[${timestamp}] [${level}] [${component}] ${log.message}${dataStr}`;
};

/**
 * Persists all logs in the queue to IndexedDB
 */
const flushQueue = async () => {
    if (logQueue.length === 0) return;

    // Take current batch
    const batch = [...logQueue];
    logQueue.length = 0;

    // Group by date
    const groups: Record<string, LogEntry[]> = {};
    for (const log of batch) {
        const date = getDateString(log.timestamp);
        if (!groups[date]) groups[date] = [];
        groups[date].push(log);
    }

    try {
        // Persist each group
        for (const [date, logs] of Object.entries(groups)) {
            const storageKey = `${LOG_KEY_PREFIX}${date}`;
            const existingLogs = (await idbGet(storageKey)) as LogEntry[] || [];
            await idbSet(storageKey, [...existingLogs, ...logs]);
        }
    } catch (error) {
        console.error('Failed to flush logs to storage:', error);
        // Put back in queue if it failed? No, might cause infinite loop. 
        // Just log to console as last resort.
    }
};

const triggerFlush = () => {
    if (flushTimeout) return;
    if (logQueue.length >= MAX_QUEUE_SIZE) {
        flushQueue();
        return;
    }
    flushTimeout = setTimeout(async () => {
        flushTimeout = null;
        await flushQueue();
    }, FLUSH_INTERVAL);
};

// Ensure logs are flushed on exit
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        flushQueue();
    });
}

export const useLogsStore = create<LogsStore>()(
    devtools(
        (set, get) => ({
            availableDays: [],
            loadedLogs: {},
            dayLogCounts: {},
            isLoading: false,
            maxDays: MAX_DAYS,

            init: async () => {
                try {
                    set({ isLoading: true });
                    const allKeys = await idbKeys();
                    const logKeys = allKeys.filter((k: IDBValidKey) => String(k).startsWith(LOG_KEY_PREFIX));
                    const days = logKeys
                        .map((k: IDBValidKey) => String(k).replace(LOG_KEY_PREFIX, ''))
                        .sort()
                        .reverse();

                    // Pre-load log counts for all days
                    const counts: Record<string, number> = {};
                    for (const day of days) {
                        try {
                            const storageKey = `${LOG_KEY_PREFIX}${day}`;
                            const logs = (await idbGet(storageKey)) as LogEntry[] | undefined;
                            counts[day] = logs?.length || 0;
                        } catch {
                            counts[day] = 0;
                        }
                    }

                    set({ availableDays: days, dayLogCounts: counts, isLoading: false });

                    // Trigger cleanup on init
                    get().clearOldLogs();
                } catch (error) {
                    console.error('Failed to init logs store:', error);
                    set({ isLoading: false });
                }
            },

            addLog: async (entry) => {
                const timestamp = Date.now();
                const newLog: LogEntry = {
                    ...entry,
                    id: `${timestamp}-${Math.random().toString(36).substring(2, 11)}`,
                    timestamp,
                };

                const dateKey = getDateString(timestamp);

                // Add to internal queue
                logQueue.push(newLog);

                // Update state immediately if day is loaded (optimistic update)
                // We debounce the state update if it's too frequent
                set(state => {
                    const updates: Partial<LogsStore> = {};
                    if (state.loadedLogs[dateKey]) {
                        updates.loadedLogs = {
                            ...state.loadedLogs,
                            [dateKey]: [...state.loadedLogs[dateKey], newLog]
                        };
                    }
                    if (!state.availableDays.includes(dateKey)) {
                        updates.availableDays = [dateKey, ...state.availableDays].sort().reverse();
                    }
                    // Update the day log count
                    updates.dayLogCounts = {
                        ...state.dayLogCounts,
                        [dateKey]: (state.dayLogCounts[dateKey] || 0) + 1
                    };
                    return updates;
                });

                // Trigger debounced flush
                triggerFlush();
            },

            loadDayLogs: async (date) => {
                // If already loaded, skip
                if (get().loadedLogs[date]) return;

                const storageKey = `${LOG_KEY_PREFIX}${date}`;
                try {
                    set({ isLoading: true });
                    const logs = (await idbGet(storageKey)) as LogEntry[];
                    set(state => ({
                        isLoading: false,
                        loadedLogs: {
                            ...state.loadedLogs,
                            [date]: logs || []
                        }
                    }));
                } catch (error) {
                    console.error(`Failed to load logs for ${date}:`, error);
                    set({ isLoading: false });
                }
            },

            clearLogs: async (date?) => {
                try {
                    if (date) {
                        // Clear specific day
                        const storageKey = `${LOG_KEY_PREFIX}${date}`;
                        await idbDel(storageKey);
                        set(state => {
                            const { [date]: _, ...restLoaded } = state.loadedLogs;
                            const { [date]: __, ...restCounts } = state.dayLogCounts;
                            return {
                                availableDays: state.availableDays.filter(d => d !== date),
                                loadedLogs: restLoaded,
                                dayLogCounts: restCounts
                            };
                        });
                    } else {
                        // Clear all
                        const allKeys = await idbKeys();
                        const logKeys = allKeys.filter((k: IDBValidKey) => String(k).startsWith(LOG_KEY_PREFIX));
                        await Promise.all(logKeys.map((k: IDBValidKey) => idbDel(k)));
                        set({ availableDays: [], loadedLogs: {}, dayLogCounts: {} });
                    }
                } catch (error) {
                    console.error('Failed to clear logs:', error);
                }
            },

            clearOldLogs: async () => {
                const maxDays = get().maxDays;
                const availableDays = get().availableDays;

                if (availableDays.length <= maxDays) return;

                // availableDays is sorted desc (newest first).
                // Keep the first maxDays, delete the rest.
                const daysToDelete = availableDays.slice(maxDays);

                for (const date of daysToDelete) {
                    await get().clearLogs(date);
                }
            },

            getFilteredLogs: (date, level?, search?) => {
                const logs = get().loadedLogs[date] || [];

                return logs.filter(log => {
                    if (level && log.level !== level) return false;
                    if (search && search.trim()) {
                        const searchLower = search.toLowerCase();
                        return (
                            log.component.toLowerCase().includes(searchLower) ||
                            log.message.toLowerCase().includes(searchLower) ||
                            (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
                        );
                    }
                    return true;
                });
            },

            exportMultipleDays: async (dates) => {
                const JSZip = (await import('jszip')).default;
                const zip = new JSZip();

                for (const date of dates) {
                    // Start with loaded logs, fall back to fetching if not loaded
                    let logs = get().loadedLogs[date];
                    if (!logs) {
                        const storageKey = `${LOG_KEY_PREFIX}${date}`;
                        logs = (await idbGet(storageKey)) as LogEntry[] || [];
                    }

                    const content = logs.map(formatLogAsText).join('\n\n');
                    zip.file(`${date}.log`, content);
                }

                return await zip.generateAsync({ type: 'blob' });
            },

            getDayLogCount: (date) => {
                // If logs are loaded, use the actual loaded count
                const loadedLogs = get().loadedLogs[date];
                if (loadedLogs) {
                    return loadedLogs.length;
                }
                // Otherwise use the pre-loaded count
                return get().dayLogCounts[date] || 0;
            }
        }),
        { name: 'LogsStore' }
    )
);

