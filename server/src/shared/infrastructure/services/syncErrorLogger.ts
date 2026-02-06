/**
 * Sync Error Logger Service
 * 
 * Captures detailed error information when AIMS sync operations fail.
 * Stores errors in the AuditLog table for debugging and monitoring.
 */

import { prisma } from '../../../config/index.js';

export interface SyncErrorLog {
    storeId: string;
    entityType: 'person' | 'space' | 'conference' | 'list';
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    errorMessage: string;
    errorStack?: string;
    requestPayload?: object;
    aimsResponse?: object;
}

export const syncErrorLogger = {
    /**
     * Log a sync error to the audit log
     */
    async log(error: SyncErrorLog): Promise<void> {
        try {
            await prisma.auditLog.create({
                data: {
                    storeId: error.storeId,
                    action: `AIMS_SYNC_${error.action}_FAILED`,
                    entityType: error.entityType,
                    entityId: error.entityId,
                    newData: {
                        errorMessage: error.errorMessage,
                        errorStack: error.errorStack,
                        requestPayload: error.requestPayload,
                        aimsResponse: error.aimsResponse,
                        timestamp: new Date().toISOString(),
                    },
                },
            });
            
            console.error(`[SyncError] ${error.entityType}/${error.entityId} (${error.action}): ${error.errorMessage}`);
        } catch (logError) {
            // Don't let logging errors propagate
            console.error('[SyncErrorLogger] Failed to log error:', logError);
            console.error('[SyncErrorLogger] Original error:', error);
        }
    },

    /**
     * Get recent sync errors for a store
     */
    async getRecentErrors(storeId: string, limit = 50): Promise<any[]> {
        return prisma.auditLog.findMany({
            where: {
                storeId,
                action: { startsWith: 'AIMS_SYNC_' },
                action: { contains: 'FAILED' },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    },

    /**
     * Get error count for a store in the last N hours
     */
    async getErrorCount(storeId: string, hours = 24): Promise<number> {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        return prisma.auditLog.count({
            where: {
                storeId,
                action: { contains: 'AIMS_SYNC_' },
                action: { contains: 'FAILED' },
                createdAt: { gte: since },
            },
        });
    },

    /**
     * Clear old sync error logs (older than N days)
     */
    async cleanup(daysToKeep = 30): Promise<number> {
        const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
        
        const result = await prisma.auditLog.deleteMany({
            where: {
                action: { contains: 'AIMS_SYNC_' },
                createdAt: { lt: cutoff },
            },
        });
        
        console.log(`[SyncErrorLogger] Cleaned up ${result.count} old sync error logs`);
        return result.count;
    },
};
