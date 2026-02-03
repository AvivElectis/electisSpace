/**
 * Labels Routes
 * 
 * Server-side API for label operations via AIMS gateway.
 * All operations use company credentials from database.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission, badRequest, notFound, forbidden } from '../../shared/middleware/index.js';
import { aimsGateway } from '../../shared/infrastructure/services/aimsGateway.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper to get store IDs user has access to
const getUserStoreIds = (req: { user?: { stores?: { id: string }[] } }): string[] => {
    return req.user?.stores?.map(s => s.id) || [];
};

// Helper to validate store access
const validateStoreAccess = (storeId: string, storeIds: string[]): void => {
    if (!storeIds.includes(storeId)) {
        throw forbidden('Access denied to this store');
    }
};

/**
 * GET /labels
 * Fetch all labels for a store
 */
router.get('/', requirePermission('labels', 'view'), async (req, res, next) => {
    try {
        const schema = z.object({
            storeId: z.string().uuid(),
        });

        const { storeId } = schema.parse(req.query);
        const storeIds = getUserStoreIds(req);
        
        validateStoreAccess(storeId, storeIds);

        // Check AIMS config exists
        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        if (!storeConfig) {
            throw badRequest('AIMS not configured for this store');
        }

        const labels = await aimsGateway.fetchLabels(storeId);

        res.json({
            data: labels,
            total: labels.length,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /labels/unassigned
 * Fetch unassigned (available) labels for a store
 */
router.get('/unassigned', requirePermission('labels', 'view'), async (req, res, next) => {
    try {
        const schema = z.object({
            storeId: z.string().uuid(),
        });

        const { storeId } = schema.parse(req.query);
        const storeIds = getUserStoreIds(req);
        
        validateStoreAccess(storeId, storeIds);

        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        if (!storeConfig) {
            throw badRequest('AIMS not configured for this store');
        }

        const labels = await aimsGateway.fetchUnassignedLabels(storeId);

        res.json({
            data: labels,
            total: labels.length,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /labels/:labelCode/images
 * Fetch images for a specific label
 */
router.get('/:labelCode/images', requirePermission('labels', 'view'), async (req, res, next) => {
    try {
        const schema = z.object({
            storeId: z.string().uuid(),
        });

        const labelCode = String(req.params.labelCode);
        const { storeId } = schema.parse(req.query);
        const storeIds = getUserStoreIds(req);
        
        validateStoreAccess(storeId, storeIds);

        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        if (!storeConfig) {
            throw badRequest('AIMS not configured for this store');
        }

        const result = await aimsGateway.fetchLabelImages(storeId, labelCode);

        res.json({
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /labels/link
 * Link a label to an article
 */
router.post('/link', requirePermission('labels', 'manage'), async (req, res, next) => {
    try {
        const schema = z.object({
            storeId: z.string().uuid(),
            labelCode: z.string().min(1),
            articleId: z.string().min(1),
            templateName: z.string().optional(),
        });

        const { storeId, labelCode, articleId, templateName } = schema.parse(req.body);
        const storeIds = getUserStoreIds(req);
        
        validateStoreAccess(storeId, storeIds);

        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        if (!storeConfig) {
            throw badRequest('AIMS not configured for this store');
        }

        const result = await aimsGateway.linkLabel(storeId, labelCode, articleId, templateName);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /labels/unlink
 * Unlink a label from its article
 */
router.post('/unlink', requirePermission('labels', 'manage'), async (req, res, next) => {
    try {
        const schema = z.object({
            storeId: z.string().uuid(),
            labelCode: z.string().min(1),
        });

        const { storeId, labelCode } = schema.parse(req.body);
        const storeIds = getUserStoreIds(req);
        
        validateStoreAccess(storeId, storeIds);

        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        if (!storeConfig) {
            throw badRequest('AIMS not configured for this store');
        }

        const result = await aimsGateway.unlinkLabel(storeId, labelCode);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /labels/:labelCode/blink
 * Make a label flash for identification
 */
router.post('/:labelCode/blink', requirePermission('labels', 'manage'), async (req, res, next) => {
    try {
        const schema = z.object({
            storeId: z.string().uuid(),
        });

        const labelCode = String(req.params.labelCode);
        const { storeId } = schema.parse(req.body);
        const storeIds = getUserStoreIds(req);
        
        validateStoreAccess(storeId, storeIds);

        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        if (!storeConfig) {
            throw badRequest('AIMS not configured for this store');
        }

        const result = await aimsGateway.blinkLabel(storeId, labelCode);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /labels/status
 * Check if AIMS is configured for a store
 */
router.get('/status', requirePermission('labels', 'view'), async (req, res, next) => {
    try {
        const schema = z.object({
            storeId: z.string().uuid(),
        });

        const { storeId } = schema.parse(req.query);
        const storeIds = getUserStoreIds(req);
        
        validateStoreAccess(storeId, storeIds);

        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        const isConnected = storeConfig ? await aimsGateway.checkHealth(storeId) : false;

        res.json({
            configured: !!storeConfig,
            connected: isConnected,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /labels/articles
 * Fetch articles for linking labels
 */
router.get('/articles', requirePermission('labels', 'view'), async (req, res, next) => {
    try {
        const schema = z.object({
            storeId: z.string().uuid(),
        });

        const { storeId } = schema.parse(req.query);
        const storeIds = getUserStoreIds(req);
        
        validateStoreAccess(storeId, storeIds);

        const storeConfig = await aimsGateway.getStoreConfig(storeId);
        if (!storeConfig) {
            throw badRequest('AIMS not configured for this store');
        }

        const articles = await aimsGateway.pullArticles(storeId);

        res.json({
            data: articles,
            total: articles.length,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
