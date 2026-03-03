/**
 * Roles Feature - Routes
 *
 * @description Express router for role management endpoints.
 */
import { Router } from 'express';
import { rolesController } from './controller.js';
import { authenticate, restrictAppViewer, requirePermission, requireGlobalRole } from '../../shared/middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(restrictAppViewer());

// Read access: require settings:view permission
router.get('/', requirePermission('settings', 'view'), rolesController.list);
router.get('/permissions-matrix', requirePermission('settings', 'view'), rolesController.getPermissionsMatrix);
router.get('/:id', requirePermission('settings', 'view'), rolesController.getById);

// Write access: platform admin only
router.post('/', requireGlobalRole('PLATFORM_ADMIN'), rolesController.create);
router.patch('/:id', requireGlobalRole('PLATFORM_ADMIN'), rolesController.update);
router.delete('/:id', requireGlobalRole('PLATFORM_ADMIN'), rolesController.remove);

export default router;
