/**
 * Spaces Lists Feature - Routes
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../shared/middleware/index.js';
import { spacesListsController } from './controller.js';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('spaces', 'read'), spacesListsController.list);
router.get('/:id', requirePermission('spaces', 'read'), spacesListsController.getById);
router.post('/', requirePermission('spaces', 'create'), spacesListsController.create);
router.patch('/:id', requirePermission('spaces', 'update'), spacesListsController.update);
router.delete('/:id', requirePermission('spaces', 'delete'), spacesListsController.delete);

export default router;
