import { Router } from 'express';
import { authenticate, restrictAppViewer, requirePermission } from '../../shared/middleware/index.js';
import { conferenceController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(restrictAppViewer());

// Conference room routes
router.get('/label-pages', requirePermission('conference', 'read'), conferenceController.getLabelPages);
router.get('/', requirePermission('conference', 'read'), conferenceController.list);
router.get('/:id', requirePermission('conference', 'read'), conferenceController.getById);
router.post('/', requirePermission('conference', 'create'), conferenceController.create);
router.patch('/:id', requirePermission('conference', 'update'), conferenceController.update);
router.delete('/:id', requirePermission('conference', 'delete'), conferenceController.delete);
router.post('/:id/toggle', requirePermission('conference', 'toggle'), conferenceController.toggleMeeting);
router.post('/:id/flip-page', requirePermission('conference', 'toggle'), conferenceController.flipPage);

export default router;
