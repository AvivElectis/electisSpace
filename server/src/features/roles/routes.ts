/**
 * Roles Feature - Routes
 *
 * @description Express router for role management endpoints.
 */
import { Router } from 'express';
import { rolesController } from './controller.js';
import { authenticate } from '../../shared/middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', rolesController.list);
router.get('/permissions-matrix', rolesController.getPermissionsMatrix);
router.get('/:id', rolesController.getById);
router.post('/', rolesController.create);
router.patch('/:id', rolesController.update);
router.delete('/:id', rolesController.remove);

export default router;
