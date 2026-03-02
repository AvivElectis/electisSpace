/**
 * AIMS Management Feature - Routes
 * 
 * Route definitions with authentication and role-based guards.
 * Read operations: minimum STORE_MANAGER role (view permission)
 * Write operations: minimum STORE_ADMIN role (manage permission)
 */

import { Router } from 'express';
import { authenticate, restrictAppViewer, requirePermission } from '../../shared/middleware/index.js';
import { aimsManagementController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(restrictAppViewer());

// ─── Summary / Overview (STORE_MANAGER+) ────────────────────────────────────
router.get('/store/summary', requirePermission('aims-management', 'view'), aimsManagementController.getStoreSummary);
router.get('/labels/summary/status', requirePermission('aims-management', 'view'), aimsManagementController.getLabelStatusSummary);
router.get('/labels/models', requirePermission('aims-management', 'view'), aimsManagementController.getLabelModels);
router.get('/gateways/summary/status', requirePermission('aims-management', 'view'), aimsManagementController.getGatewayStatusSummary);

// ─── Gateway Read Operations (STORE_MANAGER+) ──────────────────────────────
router.get('/gateways', requirePermission('aims-management', 'view'), aimsManagementController.listGateways);
router.get('/gateways/floating', requirePermission('aims-management', 'view'), aimsManagementController.getFloatingGateways);
router.get('/gateways/:mac', requirePermission('aims-management', 'view'), aimsManagementController.getGatewayDetail);
router.get('/gateways/:mac/debug', requirePermission('aims-management', 'view'), aimsManagementController.getGatewayDebugReport);
router.get('/gateways/:mac/status', requirePermission('aims-management', 'view'), aimsManagementController.getGatewayStatus);
router.get('/gateways/:mac/opcodes', requirePermission('aims-management', 'view'), aimsManagementController.getGatewayOpcodes);

// ─── Gateway Write Operations (STORE_ADMIN+) ───────────────────────────────
router.post('/gateways', requirePermission('aims-management', 'manage'), aimsManagementController.registerGateway);
router.delete('/gateways', requirePermission('aims-management', 'manage'), aimsManagementController.deregisterGateways);
router.patch('/gateways/:mac/reboot', requirePermission('aims-management', 'manage'), aimsManagementController.rebootGateway);
router.put('/gateways/:mac/config', requirePermission('aims-management', 'manage'), aimsManagementController.updateGatewayConfig);

// ─── Label Listing (STORE_MANAGER+) ─────────────────────────────────────────
router.get('/labels', requirePermission('aims-management', 'view'), aimsManagementController.listLabels);
router.get('/labels/unassigned', requirePermission('aims-management', 'view'), aimsManagementController.listUnassignedLabels);

// ─── Label Detail & Read (STORE_MANAGER+) ──────────────────────────────────
router.get('/labels/:code/history', requirePermission('aims-management', 'view'), aimsManagementController.getLabelStatusHistory);
router.get('/labels/:code/detail', requirePermission('aims-management', 'view'), aimsManagementController.getLabelDetail);
router.get('/labels/:code/article', requirePermission('aims-management', 'view'), aimsManagementController.getLabelArticle);
router.get('/labels/:code/alive-history', requirePermission('aims-management', 'view'), aimsManagementController.getLabelAliveHistory);
router.get('/labels/:code/operation-history', requirePermission('aims-management', 'view'), aimsManagementController.getLabelOperationHistory);

// ─── Label Actions (STORE_ADMIN+) ──────────────────────────────────────────
router.put('/labels/:code/led', requirePermission('aims-management', 'manage'), aimsManagementController.setLabelLed);
router.post('/labels/:code/blink', requirePermission('aims-management', 'manage'), aimsManagementController.blinkLabel);
router.put('/labels/:code/nfc', requirePermission('aims-management', 'manage'), aimsManagementController.setLabelNfc);
router.post('/labels/:code/heartbeat', requirePermission('aims-management', 'manage'), aimsManagementController.forceLabelAlive);

// ─── Product / Batch History (STORE_MANAGER+) ───────────────────────────────
router.get('/products/history', requirePermission('aims-management', 'view'), aimsManagementController.getBatchHistory);
router.get('/products/history/:name', requirePermission('aims-management', 'view'), aimsManagementController.getBatchDetail);
router.get('/products/history/:name/errors', requirePermission('aims-management', 'view'), aimsManagementController.getBatchErrors);
router.get('/products/errors/:batchId', requirePermission('aims-management', 'view'), aimsManagementController.getBatchErrorsById);
router.get('/products/:articleId/history', requirePermission('aims-management', 'view'), aimsManagementController.getArticleUpdateHistory);

export default router;
