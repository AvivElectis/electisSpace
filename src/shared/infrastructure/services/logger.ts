/**
 * Logger Service
 * Provides structured logging with different levels and in-memory storage
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    category: string;
    message: string;
    data?: any;
}

class Logger {
    private logs: LogEntry[] = [];
    private maxLogs = 1000;  // Maximum number of logs to store in memory

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

        // Console output with formatting
        const prefix = `[${level.toUpperCase()}] [${category}]`;
        const logData = data ? ` ${JSON.stringify(data)}` : '';

        switch (level) {
            case 'debug':
                console.debug(`${prefix} ${message}${logData}`);
                break;
            case 'info':
                console.info(`${prefix} ${message}${logData}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${message}${logData}`);
                break;
            case 'error':
                console.error(`${prefix} ${message}${logData}`);
                break;
        }
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
     * Clear all logs
     */
    clearLogs(): void {
        this.logs = [];
    }
}

// Export singleton instance
export const logger = new Logger();
