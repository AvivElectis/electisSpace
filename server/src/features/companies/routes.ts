/**
 * Companies Feature - Routes
 * 
 * @description Thin route definitions. Maps HTTP endpoints to controller methods.
 * All business logic lives in service.ts, all data access in repository.ts.
 */
import { Router } from 'express';
import { authenticate } from '../../shared/middleware/index.js';
import { companyController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================
// Route Definitions
// ======================

/**
 * GET /companies
 * List companies accessible to the current user
 */
router.get('/', companyController.list);

/**
 * GET /companies/validate-code/:code
 * Validate if a company code is available
 */
router.get('/validate-code/:code', companyController.validateCode);

/**
 * GET /companies/:id
 * Get company details with stores and users
 */
router.get('/:id', companyController.getById);

/**
 * POST /companies
 * Create a new company (Platform Admin only)
 */
router.post('/', companyController.create);

/**
 * PATCH /companies/:id
 * Update company basic info
 */
router.patch('/:id', companyController.update);

/**
 * PATCH /companies/:id/aims
 * Update AIMS configuration
 */
router.patch('/:id/aims', companyController.updateAimsConfig);

/**
 * POST /companies/:id/aims/test
 * Test AIMS connection
 */
router.post('/:id/aims/test', companyController.testAimsConnection);

/**
 * DELETE /companies/:id
 * Delete a company (Platform Admin only)
 */
router.delete('/:id', companyController.delete);

export default router;
