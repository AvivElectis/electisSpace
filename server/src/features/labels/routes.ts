import { Router } from 'express';
import { authenticate, requirePermission } from '../../shared/middleware/index.js';
import { labelsController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Labels routes
router.get('/', requirePermission('labels', 'view'), labelsController.list);
router.get('/unassigned', requirePermission('labels', 'view'), labelsController.listUnassigned);
router.get('/status', requirePermission('labels', 'view'), labelsController.getStatus);
router.get('/articles', requirePermission('labels', 'view'), labelsController.getArticles);
router.get('/type-info', requirePermission('labels', 'view'), labelsController.getLabelTypeInfo);
router.get('/:labelCode/images', requirePermission('labels', 'view'), labelsController.getLabelImages);
router.post('/link', requirePermission('labels', 'manage'), labelsController.linkLabel);
router.post('/unlink', requirePermission('labels', 'manage'), labelsController.unlinkLabel);
router.post('/dither-preview', requirePermission('labels', 'view'), labelsController.getDitherPreview);
router.post('/image-push', requirePermission('labels', 'manage'), labelsController.pushImage);
router.post('/:labelCode/blink', requirePermission('labels', 'manage'), labelsController.blinkLabel);

export default router;
