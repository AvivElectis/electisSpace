/**
 * Stores Feature - Routes (Refactored)
 * 
 * @description Thin route definitions for store management.
 */
import { Router } from 'express';
import { authenticate } from '../../shared/middleware/index.js';
import { storeController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================
// Company-Scoped Store Routes
// ======================

// List stores in a company
router.get('/companies/:companyId/stores', storeController.listByCompany);

// Validate store code availability
router.get('/companies/:companyId/stores/validate-code/:code', storeController.validateCode);

// Create a new store in a company
router.post('/companies/:companyId/stores', storeController.create);

// ======================
// Direct Store Routes
// ======================

// Get store details
router.get('/stores/:id', storeController.getById);

// Update store
router.patch('/stores/:id', storeController.update);

// Delete store
router.delete('/stores/:id', storeController.delete);

export default router;
