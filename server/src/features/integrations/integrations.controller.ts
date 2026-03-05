import type { Request, Response, NextFunction } from 'express';
import * as service from './integrations.service.js';
import { createIntegrationSchema, updateIntegrationSchema, triggerSyncSchema } from './integrations.types.js';
import type { Provider, IntegrationType } from './integrations.types.js';

export async function create(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        const body = createIntegrationSchema.parse(req.body);

        const integration = await service.createIntegration(
            companyId,
            body.provider as Provider,
            body.type as IntegrationType,
            body.credentials as Record<string, unknown>,
            {
                syncIntervalMinutes: body.syncIntervalMinutes,
                fieldMapping: body.fieldMapping,
            },
        );

        res.status(201).json({
            id: integration.id,
            provider: integration.provider,
            type: integration.type,
            isActive: integration.isActive,
            syncIntervalMinutes: integration.syncIntervalMinutes,
            createdAt: integration.createdAt,
        });
    } catch (error) {
        next(error);
    }
}

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        const integrations = await service.listIntegrations(companyId);

        res.json({
            integrations: integrations.map((i: any) => ({
                id: i.id,
                provider: i.provider,
                type: i.type,
                isActive: i.isActive,
                syncIntervalMinutes: i.syncIntervalMinutes,
                lastSyncAt: i.lastSyncAt,
                lastSyncStatus: i.lastSyncStatus,
                lastSyncError: i.lastSyncError,
                lastSyncStats: i.lastSyncStats,
                createdAt: i.createdAt,
            })),
        });
    } catch (error) {
        next(error);
    }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        const integration = await service.getIntegration(req.params.id as string, companyId);

        res.json({
            id: integration.id,
            provider: integration.provider,
            type: integration.type,
            isActive: integration.isActive,
            syncIntervalMinutes: integration.syncIntervalMinutes,
            lastSyncAt: integration.lastSyncAt,
            lastSyncStatus: integration.lastSyncStatus,
            lastSyncError: integration.lastSyncError,
            lastSyncStats: integration.lastSyncStats,
            fieldMapping: integration.fieldMapping,
            createdAt: integration.createdAt,
            updatedAt: integration.updatedAt,
        });
    } catch (error) {
        next(error);
    }
}

export async function update(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        const body = updateIntegrationSchema.parse(req.body);

        const integration = await service.updateIntegration(
            req.params.id as string,
            companyId,
            body as any,
        );

        res.json({
            id: integration.id,
            provider: integration.provider,
            type: integration.type,
            isActive: integration.isActive,
            syncIntervalMinutes: integration.syncIntervalMinutes,
            updatedAt: integration.updatedAt,
        });
    } catch (error) {
        next(error);
    }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        await service.deleteIntegration(req.params.id as string, companyId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

export async function triggerSync(req: Request, res: Response, next: NextFunction) {
    try {
        const companyId = req.params.companyId as string;
        const body = triggerSyncSchema.parse(req.body ?? {});

        const result = await service.executeSyncForIntegration(
            req.params.id as string,
            companyId,
            body.fullSync,
        );

        res.json({ result });
    } catch (error) {
        next(error);
    }
}
