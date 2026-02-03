/**
 * Spaces Feature - Routes (Refactored)
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../shared/middleware/index.js';
import { spacesController } from './controller.js';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('spaces', 'read'), spacesController.list);
router.get('/:id', requirePermission('spaces', 'read'), spacesController.getById);
router.post('/', requirePermission('spaces', 'create'), spacesController.create);
router.patch('/:id', requirePermission('spaces', 'update'), spacesController.update);
router.delete('/:id', requirePermission('spaces', 'delete'), spacesController.delete);
router.post('/:id/assign-label', requirePermission('spaces', 'update'), spacesController.assignLabel);
router.post('/sync', requirePermission('sync', 'trigger'), spacesController.forceSync);

export default router;
