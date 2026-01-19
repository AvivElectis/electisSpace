/**
 * Logger Service
 * Provides structured logging with different levels and in-memory storage
 * Now also sends logs to the persistent logsStore for the logs viewer
 * 
 * Enhanced Features:
 * - Typed log categories for better filtering and organization
 * - Performance timing utilities (startTimer/endTimer)
 * - Export functionality (JSON/CSV formats)
 */

import type { LogLevel as StoreLogLevel } from '../store/logsStore';
import { useLogsStore } from '../store/logsStore';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Predefined log categories for consistent filtering and organization
 */
export type LogCategory =
    | 'App'           // General app lifecycle, initialization
    | 'Auth'          // Authentication, login, logout, token management
    | 'Sync'          // Sync operations between local and remote
    | 'AIMS'          // AIMS/SoluM API calls and responses
    | 'People'        // People management operations
    | 'Conference'    // Conference room operations
    | 'Spaces'        // Spaces management operations
    | 'Settings'      // Settings changes and configuration
    | 'Navigation'    // Route changes and navigation events
    | 'Performance'   // Performance metrics and timing
    | 'Storage'       // Local storage, IndexedDB operations
    | 'CSV'           // CSV import/export operations
    | 'Error';        // Error tracking and exceptions

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    category: string;
    message: string;
    data?: any;
}

export interface PerformanceLogEntry extends LogEntry {
    durationMs: number;
}


export class Logger {
    private logs: LogEntry[] = [];
    private maxLogs = 1000;  // Maximum number of logs to store in memory
    private timers: Map<string, number> = new Map();  // Performance timers

    private log(level: LogLevel, category: string, message: string, data?: any): void {
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            category,
            message,
            data,
        };

        // Add to in-memory storage
        this.logs.push(entry);

        // Keep only last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Send to persistent logs store
        try {
            useLogsStore.getState().addLog({
                level: level as StoreLogLevel,
                component: category,
                message,
                data,
            });
        } catch (error) {
            // Silently fail if store is not available or throws
            // console.error('Failed to log to store:', error);
        }

        // Console output with formatting
        // const prefix = `[${level.toUpperCase()}] [${category}]`;
        // const logData = data ? ` ${JSON.stringify(data)}` : '';

        // switch (level) {
        //     case 'debug':
        //         // console.debug(`${prefix} ${message}${logData}`);
        //         break;
        //     case 'info':
        //         console.info(`${prefix} ${message}${logData}`);
        //         break;
        //     case 'warn':
        //         console.warn(`${prefix} ${message}${logData}`);
        //         break;
        //     case 'error':
        //         console.error(`${prefix} ${message}${logData}`);
        //         break;
        // }
    }

    /**
     * Log debug-level message
     */
    debug(category: string, message: string, data?: any): void {
        this.log('debug', category, message, data);
    }

    /**
     * Log info-level message
     */
    info(category: string, message: string, data?: any): void {
        this.log('info', category, message, data);
    }

    /**
     * Log warning message
     */
    warn(category: string, message: string, data?: any): void {
        this.log('warn', category, message, data);
    }

    /**
     * Log error message
     */
    error(category: string, message: string, data?: any): void {
        this.log('error', category, message, data);
    }

    /**
     * Get all log entries
     */
    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level: LogLevel): LogEntry[] {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * Get logs filtered by category
     */
    getLogsByCategory(category: string): LogEntry[] {
        return this.logs.filter(log => log.category === category);
    }

    /**
     * Get unique categories from current logs
     */
    getCategories(): string[] {
        const categories = new Set(this.logs.map(log => log.category));
        return Array.from(categories).sort();
    }

    // ==================== PERFORMANCE TIMING ====================

    /**
     * Start a performance timer for an operation
     * @param operationId Unique identifier for the operation (e.g., 'sync-download', 'csv-parse')
     */
    startTimer(operationId: string): void {
        this.timers.set(operationId, performance.now());
    }

    /**
     * End a performance timer and log the duration
     * @param operationId The operation ID used in startTimer
     * @param category Log category for the timing entry
     * @param message Description of the completed operation
     * @param data Additional data to include in the log
     * @returns Duration in milliseconds, or -1 if timer wasn't found
     */
    endTimer(operationId: string, category: string, message: string, data?: any): number {
        const startTime = this.timers.get(operationId);
        if (startTime === undefined) {
            this.warn('Performance', `Timer not found: ${operationId}`);
            return -1;
        }

        const durationMs = Math.round(performance.now() - startTime);
        this.timers.delete(operationId);

        // Log with performance data included
        this.info(category, message, {
            ...data,
            _performance: {
                operationId,
                durationMs,
                formattedDuration: this.formatDuration(durationMs),
            },
        });

        return durationMs;
    }

    /**
     * Measure an async operation automatically
     * @param operationId Unique identifier for the operation
     * @param category Log category
     * @param message Description of the operation
     * @param fn Async function to measure
     * @returns Result of the async function
     */
    async measureAsync<T>(
        operationId: string,
        category: string,
        message: string,
        fn: () => Promise<T>
    ): Promise<T> {
        this.startTimer(operationId);
        try {
            const result = await fn();
            this.endTimer(operationId, category, `${message} - completed`, { success: true });
            return result;
        } catch (error) {
            this.endTimer(operationId, category, `${message} - failed`, {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Format duration in human-readable form
     */
    private formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        return `${(ms / 60000).toFixed(2)}min`;
    }

    // ==================== LOG EXPORT ====================

    /**
     * Export logs in JSON format
     * @param filter Optional filter criteria
     */
    exportLogsAsJson(filter?: { level?: LogLevel; category?: string }): string {
        let logsToExport = this.logs;

        if (filter?.level) {
            logsToExport = logsToExport.filter(log => log.level === filter.level);
        }
        if (filter?.category) {
            logsToExport = logsToExport.filter(log => log.category === filter.category);
        }

        return JSON.stringify(logsToExport.map(log => ({
            timestamp: log.timestamp.toISOString(),
            level: log.level,
            category: log.category,
            message: log.message,
            data: log.data,
        })), null, 2);
    }

    /**
     * Export logs in CSV format
     * @param filter Optional filter criteria
     */
    exportLogsAsCsv(filter?: { level?: LogLevel; category?: string }): string {
        let logsToExport = this.logs;

        if (filter?.level) {
            logsToExport = logsToExport.filter(log => log.level === filter.level);
        }
        if (filter?.category) {
            logsToExport = logsToExport.filter(log => log.category === filter.category);
        }

        const header = 'Timestamp,Level,Category,Message,Data';
        const rows = logsToExport.map(log => {
            const timestamp = log.timestamp.toISOString();
            const level = log.level.toUpperCase();
            const category = this.escapeCSV(log.category);
            const message = this.escapeCSV(log.message);
            const data = log.data ? this.escapeCSV(JSON.stringify(log.data)) : '';
            return `${timestamp},${level},${category},${message},${data}`;
        });

        return [header, ...rows].join('\n');
    }

    /**
     * Export logs in the specified format
     */
    exportLogs(format: 'json' | 'csv', filter?: { level?: LogLevel; category?: string }): string {
        return format === 'json'
            ? this.exportLogsAsJson(filter)
            : this.exportLogsAsCsv(filter);
    }

    /**
     * Escape a value for CSV output
     */
    private escapeCSV(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    /**
     * Clear all logs
     */
    clearLogs(): void {
        this.logs = [];
        this.timers.clear();
    }

    /**
     * Get statistics about current logs
     */
    getStats(): {
        totalLogs: number;
        byLevel: Record<LogLevel, number>;
        byCategory: Record<string, number>;
        activeTimers: number;
    } {
        const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
        const byCategory: Record<string, number> = {};

        for (const log of this.logs) {
            byLevel[log.level]++;
            byCategory[log.category] = (byCategory[log.category] || 0) + 1;
        }

        return {
            totalLogs: this.logs.length,
            byLevel,
            byCategory,
            activeTimers: this.timers.size,
        };
    }
}

// Export singleton instance
export const logger = new Logger();

// Export predefined categories for type-safe usage
export const LOG_CATEGORIES: LogCategory[] = [
    'App',
    'Auth',
    'Sync',
    'AIMS',
    'People',
    'Conference',
    'Spaces',
    'Settings',
    'Navigation',
    'Performance',
    'Storage',
    'CSV',
    'Error',
];
