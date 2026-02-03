// ============================================================================
// Health Check Interfaces
// ============================================================================

export type HealthStatus = 'ok' | 'error' | 'degraded';

export interface BaseHealthCheck {
    status: HealthStatus;
    error?: string;
}

export interface DetailedHealthCheck extends BaseHealthCheck {
    latencyMs?: number;
    memoryBytes?: number;
}

export interface HealthChecks {
    database: BaseHealthCheck | DetailedHealthCheck;
    redis: BaseHealthCheck | DetailedHealthCheck;
    solum: BaseHealthCheck | DetailedHealthCheck;
}

export interface MemoryInfo {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    unit: 'MB';
}

export interface BasicHealthResponse {
    status: HealthStatus;
    timestamp: string;
}

export interface ReadinessResponse {
    status: HealthStatus;
    checks: Record<string, HealthStatus>;
}

export interface DetailedHealthResponse {
    status: HealthStatus;
    uptime: number;
    version: string;
    memory: MemoryInfo;
    database: DetailedHealthCheck;
    redis: DetailedHealthCheck;
    solum: DetailedHealthCheck;
}
