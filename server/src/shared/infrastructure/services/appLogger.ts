/**
 * App Logger — Structured logging service for the electisSpace server.
 *
 * Outputs JSON-structured log lines to stdout/stderr so that Promtail
 * (or any Docker log driver) can scrape them into Grafana Loki.
 *
 * Features:
 *  - Structured JSON output with consistent fields (timestamp, level, service, etc.)
 *  - Log levels: debug | info | warn | error
 *  - Configurable via LOG_LEVEL env var
 *  - Request-context enrichment (requestId, userId, storeId)
 *  - Performance timing helpers
 *  - In-memory ring buffer for the /logs API endpoint
 */

import { config } from '../../../config/index.js';

// ── Types ────────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    service: string;
    component: string;
    message: string;
    requestId?: string;
    userId?: string;
    storeId?: string;
    durationMs?: number;
    data?: Record<string, unknown>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const SERVICE_NAME = 'electisspace-server';

// Ring-buffer size for the in-memory log viewer
const MAX_BUFFER_SIZE = 2000;

// ── Class ────────────────────────────────────────────────────────────────────

class AppLogger {
    private minLevel: number;
    private buffer: LogEntry[] = [];
    private timers = new Map<string, number>();

    constructor() {
        this.minLevel = LEVEL_PRIORITY[(config.logLevel as LogLevel) || 'info'];
    }

    // ── Core logging ────────────────────────────────────────────────────────

    private write(level: LogLevel, component: string, message: string, extra?: Partial<LogEntry>): void {
        if (LEVEL_PRIORITY[level] < this.minLevel) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            service: SERVICE_NAME,
            component,
            message,
            ...extra,
        };

        // Push to ring-buffer
        this.buffer.push(entry);
        if (this.buffer.length > MAX_BUFFER_SIZE) {
            this.buffer.shift();
        }

        // Write structured JSON line to stdout/stderr
        const line = JSON.stringify(entry);
        if (level === 'error') {
            process.stderr.write(line + '\n');
        } else {
            process.stdout.write(line + '\n');
        }
    }

    // ── Public log methods ──────────────────────────────────────────────────

    debug(component: string, message: string, data?: Record<string, unknown>): void {
        this.write('debug', component, message, data ? { data } : undefined);
    }

    info(component: string, message: string, data?: Record<string, unknown>): void {
        this.write('info', component, message, data ? { data } : undefined);
    }

    warn(component: string, message: string, data?: Record<string, unknown>): void {
        this.write('warn', component, message, data ? { data } : undefined);
    }

    error(component: string, message: string, data?: Record<string, unknown>): void {
        this.write('error', component, message, data ? { data } : undefined);
    }

    // ── Context-aware logging ───────────────────────────────────────────────

    /** Create a child logger pre-filled with request context */
    withContext(ctx: { requestId?: string; userId?: string; storeId?: string }) {
        const self = this;
        return {
            debug: (component: string, msg: string, data?: Record<string, unknown>) =>
                self.write('debug', component, msg, { ...ctx, data }),
            info: (component: string, msg: string, data?: Record<string, unknown>) =>
                self.write('info', component, msg, { ...ctx, data }),
            warn: (component: string, msg: string, data?: Record<string, unknown>) =>
                self.write('warn', component, msg, { ...ctx, data }),
            error: (component: string, msg: string, data?: Record<string, unknown>) =>
                self.write('error', component, msg, { ...ctx, data }),
        };
    }

    // ── Performance timers ──────────────────────────────────────────────────

    startTimer(operationId: string): void {
        this.timers.set(operationId, Date.now());
    }

    endTimer(operationId: string, component: string, message: string, data?: Record<string, unknown>): number {
        const start = this.timers.get(operationId);
        if (start === undefined) return -1;
        this.timers.delete(operationId);
        const durationMs = Date.now() - start;
        this.write('info', component, message, { durationMs, data });
        return durationMs;
    }

    async measureAsync<T>(operationId: string, component: string, message: string, fn: () => Promise<T>): Promise<T> {
        this.startTimer(operationId);
        try {
            const result = await fn();
            this.endTimer(operationId, component, `${message} — completed`);
            return result;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            this.endTimer(operationId, component, `${message} — failed`, { error: errMsg });
            throw err;
        }
    }

    // ── Buffer access (for /logs API) ───────────────────────────────────────

    getLogs(opts?: { level?: LogLevel; component?: string; limit?: number }): LogEntry[] {
        let logs = [...this.buffer];
        if (opts?.level) {
            logs = logs.filter(l => l.level === opts.level);
        }
        if (opts?.component) {
            logs = logs.filter(l => l.component === opts.component);
        }
        if (opts?.limit) {
            logs = logs.slice(-opts.limit);
        }
        return logs;
    }

    getStats(): { total: number; byLevel: Record<LogLevel, number>; byComponent: Record<string, number> } {
        const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
        const byComponent: Record<string, number> = {};
        for (const entry of this.buffer) {
            byLevel[entry.level]++;
            byComponent[entry.component] = (byComponent[entry.component] || 0) + 1;
        }
        return { total: this.buffer.length, byLevel, byComponent };
    }

    clearBuffer(): void {
        this.buffer = [];
    }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const appLogger = new AppLogger();
