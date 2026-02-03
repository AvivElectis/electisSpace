import { Router } from 'express';
import { healthController } from './controller.js';

const router = Router();

// Health routes - no authentication required
router.get('/', healthController.liveness);
router.get('/ready', healthController.readiness);
router.get('/aims', healthController.aimsHealth);
router.get('/detailed', healthController.detailed);

export default router;
