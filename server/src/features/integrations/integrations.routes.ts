import { Router } from 'express';
import * as controller from './integrations.controller.js';
import { authenticate, requireGlobalRole } from '../../shared/middleware/index.js';

const router = Router({ mergeParams: true });

// All integration routes require admin auth
router.use(authenticate, requireGlobalRole('PLATFORM_ADMIN'));

// CRUD
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

// Test connection (before saving)
router.post('/test-connection', controller.testConnection);

// Sync trigger
router.post('/:id/sync', controller.triggerSync);

export default router;
