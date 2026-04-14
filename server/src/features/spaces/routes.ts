/**
 * Spaces Feature - Routes (Refactored)
 */
import { Router } from 'express';
import { authenticate, restrictAppViewer, requirePermission } from '../../shared/middleware/index.js';
import { spacesController } from './controller.js';

const router = Router();
router.use(authenticate);
router.use(restrictAppViewer());

router.get('/', requirePermission('spaces', 'read'), spacesController.list);
router.post('/bulk-delete', requirePermission('spaces', 'delete'), spacesController.deleteBulk);
router.get('/:id', requirePermission('spaces', 'read'), spacesController.getById);
router.post('/', requirePermission('spaces', 'create'), spacesController.create);
router.patch('/:id', requirePermission('spaces', 'update'), spacesController.update);
router.delete('/:id', requirePermission('spaces', 'delete'), spacesController.delete);
router.post('/:id/assign-label', requirePermission('spaces', 'update'), spacesController.assignLabel);
router.post('/sync', requirePermission('sync', 'trigger'), spacesController.forceSync);

// Spaces AIMS sync endpoints
router.post('/sync/pull', requirePermission('sync', 'trigger'), spacesController.syncPull);
router.post('/sync/push', requirePermission('sync', 'trigger'), spacesController.syncPush);
router.post('/sync/full', requirePermission('sync', 'trigger'), spacesController.syncFull);
router.get('/sync/status', requirePermission('sync', 'read'), spacesController.syncStatus);

export default router;
