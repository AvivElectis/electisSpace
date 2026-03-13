/**
 * Companies Feature - Routes
 * 
 * @description Thin route definitions. Maps HTTP endpoints to controller methods.
 * All business logic lives in service.ts, all data access in repository.ts.
 */
import { Router } from 'express';
import { authenticate, restrictAppViewer, requireGlobalRole, requirePermission } from '../../shared/middleware/index.js';
import { companyController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(restrictAppViewer());

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
 * POST /companies/aims/stores
 * Fetch AIMS stores using raw credentials (for company creation wizard)
 */
router.post('/aims/stores', companyController.fetchAimsStores);

/**
 * POST /companies/aims/article-format
 * Fetch article format from AIMS using raw credentials (for wizard)
 */
router.post('/aims/article-format', companyController.fetchArticleFormat);

/**
 * GET /companies/:id
 * Get company details with stores and users
 */
router.get('/:id', companyController.getById);

/**
 * POST /companies
 * Create a new company (Platform Admin only)
 */
router.post('/', requireGlobalRole('PLATFORM_ADMIN'), companyController.create);

/**
 * PATCH /companies/:id
 * Update company basic info (requires settings:write — controller also checks canManageCompany)
 */
router.patch('/:id', requirePermission('settings', 'edit'), companyController.update);

/**
 * PATCH /companies/:id/aims
 * Update AIMS configuration (requires settings:write — controller also checks canManageCompany)
 */
router.patch('/:id/aims', requirePermission('settings', 'edit'), companyController.updateAimsConfig);

/**
 * POST /companies/:id/aims/test
 * Test AIMS connection
 */
router.post('/:id/aims/test', companyController.testAimsConnection);

/**
 * DELETE /companies/:id
 * Delete a company (Platform Admin only)
 */
router.delete('/:id', requireGlobalRole('PLATFORM_ADMIN'), companyController.delete);

export default router;
