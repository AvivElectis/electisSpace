/**
 * Integration Sync Processor
 *
 * Background job that runs directory sync for active integrations
 * based on their configured syncIntervalMinutes.
 *
 * Uses setInterval to check periodically (every 5 min) and triggers sync
 * for integrations whose last sync was longer ago than their interval.
 */

import { prisma } from '../../config/index.js';
import { appLogger } from '../../shared/infrastructure/services/appLogger.js';
import { executeSyncForIntegration } from './integrations.service.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

export class IntegrationSyncProcessor {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;

    start(): void {
        if (this.intervalId) {
            appLogger.info('IntegrationSync', 'Processor already running');
            return;
        }

        appLogger.info('IntegrationSync', `Starting processor with ${CHECK_INTERVAL_MS / 1000}s interval`);
        this.intervalId = setInterval(() => this.tick(), CHECK_INTERVAL_MS);

        // First tick after 30s delay (let server boot)
        setTimeout(() => this.tick(), 30_000);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            appLogger.info('IntegrationSync', 'Processor stopped');
        }
    }

    private async tick(): Promise<void> {
        if (this.isRunning) return;

        this.isRunning = true;
        try {
            await this.syncDueIntegrations();
        } catch (error: any) {
            appLogger.error('IntegrationSync', `Tick error: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    private async syncDueIntegrations(): Promise<void> {
        // Find active integrations that are due for sync
        const integrations = await prisma.integrationConfig.findMany({
            where: { isActive: true },
            select: {
                id: true,
                companyId: true,
                provider: true,
                syncIntervalMinutes: true,
                lastSyncAt: true,
            },
        });

        const now = Date.now();

        for (const integration of integrations) {
            const intervalMs = integration.syncIntervalMinutes * 60 * 1000;
            const lastSync = integration.lastSyncAt?.getTime() ?? 0;

            if (now - lastSync < intervalMs) continue;

            appLogger.info('IntegrationSync', `Triggering scheduled sync for ${integration.provider} (${integration.id})`);

            try {
                await executeSyncForIntegration(integration.id, integration.companyId);
            } catch (error: any) {
                // Error already logged in executeSyncForIntegration
                appLogger.error('IntegrationSync', `Scheduled sync failed for ${integration.id}: ${error.message}`);
            }
        }
    }
}

// Singleton
export const integrationSyncProcessor = new IntegrationSyncProcessor();
