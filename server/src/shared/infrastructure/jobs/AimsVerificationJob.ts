/**
 * AIMS Verification Job
 * 
 * Periodically compares local database state with AIMS to detect drift.
 * Drift can occur when:
 * - External systems modify AIMS directly
 * - Sync failures weren't properly detected
 * - Network issues caused partial updates
 * 
 * When drift is detected, the job queues affected entities for re-sync.
 */

import { prisma } from '../../../config/index.js';
import { aimsGateway } from '../services/aimsGateway.js';
import { syncQueueService } from '../services/syncQueueService.js';
import { appLogger } from '../services/appLogger.js';

// Default verification interval: 5 minutes
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

// Max entities to verify per store per tick
const MAX_ENTITIES_PER_STORE = 100;

export interface VerificationResult {
    storeId: string;
    storeName: string;
    entityType: string;
    totalLocal: number;
    totalAims: number;
    missingInAims: string[];
    extraInAims: string[];
    verified: boolean;
    error?: string;
}

/**
 * AIMS Verification Job
 */
export class AimsVerificationJob {
    private isRunning = false;
    private intervalId: ReturnType<typeof setInterval> | null = null;

    /**
     * Start the verification job with the specified interval
     */
    start(intervalMs = DEFAULT_INTERVAL_MS): void {
        if (this.intervalId) {
            appLogger.info('AimsVerify', 'Job already running');
            return;
        }

        appLogger.info('AimsVerify', `Starting verification job with ${intervalMs}ms interval`);
        this.intervalId = setInterval(() => this.tick(), intervalMs);
        
        // Run initial verification after a short delay
        setTimeout(() => this.tick(), 10000);
    }

    /**
     * Stop the verification job
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            appLogger.info('AimsVerify', 'Job stopped');
        }
    }

    /**
     * Single tick - verify all stores
     */
    private async tick(): Promise<void> {
        if (this.isRunning) {
            appLogger.info('AimsVerify', 'Previous tick still running, skipping');
            return;
        }

        this.isRunning = true;
        try {
            const results = await this.verifyAllStores();
            
            // Log summary
            const driftStores = results.filter(r => !r.verified && !r.error);
            if (driftStores.length > 0) {
                appLogger.warn('AimsVerify', `Drift detected in ${driftStores.length} stores`);
                for (const result of driftStores) {
                    appLogger.warn('AimsVerify', `${result.storeName}: ${result.missingInAims.length} missing in AIMS, ${result.extraInAims.length} extra in AIMS`);
                }
            }
        } catch (error) {
            appLogger.error('AimsVerify', 'Tick error', { error });
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Verify all stores with sync enabled
     */
    async verifyAllStores(): Promise<VerificationResult[]> {
        const results: VerificationResult[] = [];

        // Get all stores with sync enabled
        const stores = await prisma.store.findMany({
            where: { syncEnabled: true },
            select: { 
                id: true, 
                code: true, 
                name: true,
                companyId: true 
            },
        });

        appLogger.info('AimsVerify', `Verifying ${stores.length} stores`);

        for (const store of stores) {
            try {
                // Verify people for this store
                const peopleResult = await this.verifyStorePeople(store.id, store.name || store.code);
                results.push(peopleResult);

                // Queue re-sync for any missing entities
                if (peopleResult.missingInAims.length > 0) {
                    for (const entityId of peopleResult.missingInAims.slice(0, 10)) { // Limit to 10 at a time
                        await syncQueueService.queueUpdate(store.id, 'person', entityId, { verificationResync: true });
                    }
                    appLogger.info('AimsVerify', `Queued ${Math.min(peopleResult.missingInAims.length, 10)} people for re-sync in ${store.name || store.code}`);
                }
            } catch (error: any) {
                results.push({
                    storeId: store.id,
                    storeName: store.name || store.code,
                    entityType: 'person',
                    totalLocal: 0,
                    totalAims: 0,
                    missingInAims: [],
                    extraInAims: [],
                    verified: false,
                    error: error.message,
                });
                appLogger.error('AimsVerify', `Failed to verify store ${store.name || store.code}`, { error: error.message });
            }
        }

        return results;
    }

    /**
     * Verify people for a specific store
     */
    private async verifyStorePeople(storeId: string, storeName: string): Promise<VerificationResult> {
        // Get local people that are marked as synced
        const localPeople = await prisma.person.findMany({
            where: { 
                storeId, 
                syncStatus: 'SYNCED' 
            },
            select: { 
                id: true, 
                externalId: true, 
                virtualSpaceId: true,
                data: true 
            },
            take: MAX_ENTITIES_PER_STORE,
        });

        // Get AIMS articles
        let aimsArticles: any[] = [];
        try {
            aimsArticles = await aimsGateway.pullArticles(storeId);
        } catch (error: any) {
            return {
                storeId,
                storeName,
                entityType: 'person',
                totalLocal: localPeople.length,
                totalAims: 0,
                missingInAims: [],
                extraInAims: [],
                verified: false,
                error: `Failed to fetch AIMS articles: ${error.message}`,
            };
        }

        // Build lookup maps using external/virtual IDs
        const localByExternalId = new Map<string, typeof localPeople[0]>();
        for (const person of localPeople) {
            const extId = person.externalId || person.virtualSpaceId;
            if (extId) {
                localByExternalId.set(extId, person);
            }
        }

        const aimsById = new Map<string, any>();
        for (const article of aimsArticles) {
            const articleId = article.articleId || article.id;
            if (articleId) {
                aimsById.set(articleId, article);
            }
        }

        // Find discrepancies
        const missingInAims: string[] = [];
        const extraInAims: string[] = [];

        // Check which local people are missing in AIMS
        for (const [extId, person] of localByExternalId) {
            if (!aimsById.has(extId)) {
                missingInAims.push(person.id);
            }
        }

        // Check which AIMS articles don't have local counterparts
        for (const [articleId] of aimsById) {
            if (!localByExternalId.has(articleId)) {
                extraInAims.push(articleId);
            }
        }

        const verified = missingInAims.length === 0;

        return {
            storeId,
            storeName,
            entityType: 'person',
            totalLocal: localPeople.length,
            totalAims: aimsArticles.length,
            missingInAims,
            extraInAims,
            verified,
        };
    }

    /**
     * Manual verification trigger - returns results without starting the job
     */
    async verifyNow(): Promise<VerificationResult[]> {
        return this.verifyAllStores();
    }
}

// Export singleton instance
export const aimsVerificationJob = new AimsVerificationJob();
