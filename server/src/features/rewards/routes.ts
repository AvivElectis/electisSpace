import { Router } from 'express';
import { authenticate, requirePermission } from '../../shared/middleware/index.js';
import { rewardsController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Campaign CRUD
router.get('/', requirePermission('labels', 'view'), rewardsController.list);
router.get('/analytics', requirePermission('labels', 'view'), rewardsController.analytics);
router.get('/:id', requirePermission('labels', 'view'), rewardsController.getById);
router.post('/', requirePermission('labels', 'manage'), rewardsController.create);
router.put('/:id', requirePermission('labels', 'manage'), rewardsController.update);
router.delete('/:id', requirePermission('labels', 'manage'), rewardsController.delete);

// Status transitions
router.post('/:id/activate', requirePermission('labels', 'manage'), rewardsController.activate);
router.post('/:id/pause', requirePermission('labels', 'manage'), rewardsController.pause);
router.post('/:id/complete', requirePermission('labels', 'manage'), rewardsController.complete);

export default router;
