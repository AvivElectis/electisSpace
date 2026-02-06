/**
 * Sync Feature - Routes (Refactored)
 * 
 * @description Thin route definitions for sync operations.
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../shared/middleware/index.js';
import { syncController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================
// General Sync Routes (body-based storeId — used by frontend syncApi)
// ======================

// Get sync status
router.get('/status', requirePermission('sync', 'view'), syncController.getStatus);

// Check AIMS connection health
router.get('/health', requirePermission('sync', 'view'), syncController.checkHealth);

// Connect to AIMS for a store
router.post('/connect', requirePermission('sync', 'trigger'), syncController.connectToAims);

// Disconnect from AIMS for a store
router.post('/disconnect', requirePermission('sync', 'trigger'), syncController.disconnectFromAims);

// Pull from AIMS (body-based storeId)
router.post('/pull', requirePermission('sync', 'trigger'), syncController.pull);

// Push to AIMS (body-based storeId)
router.post('/push', requirePermission('sync', 'trigger'), syncController.push);

// Full sync (pull + push, body-based storeId)
router.post('/full', requirePermission('sync', 'trigger'), syncController.fullSync);

// Trigger sync (legacy endpoint)
router.post('/trigger', requirePermission('sync', 'trigger'), syncController.triggerSync);

// Get sync job status
router.get('/jobs/:id', requirePermission('sync', 'view'), syncController.getJob);

// View sync queue items
router.get('/queue', requirePermission('sync', 'view'), syncController.listQueue);

// Retry failed sync item
router.post('/queue/:id/retry', requirePermission('sync', 'trigger'), syncController.retryItem);

// ======================
// Store-specific Sync Routes (param-based storeId)
// ======================

// Pull from AIMS
router.post('/stores/:storeId/pull', requirePermission('sync', 'trigger'), syncController.pullFromAims);

// Push to AIMS
router.post('/stores/:storeId/push', requirePermission('sync', 'trigger'), syncController.pushToAims);

// Get store sync status
router.get('/stores/:storeId/status', requirePermission('sync', 'view'), syncController.getStoreStatus);

// Retry specific failed item
router.post('/stores/:storeId/retry/:itemId', requirePermission('sync', 'trigger'), syncController.retryStoreItem);

export default router;
