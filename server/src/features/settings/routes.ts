/**
 * Settings Feature - Routes (Refactored)
 * 
 * @description Thin route definitions for settings management.
 */
import { Router } from 'express';
import { authenticate } from '../../shared/middleware/index.js';
import { settingsController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================
// Store Settings
// ======================

// Get store settings
router.get('/store/:storeId', settingsController.getStoreSettings);

// Update store settings
router.put('/store/:storeId', settingsController.updateStoreSettings);

// ======================
// Company Settings
// ======================

// Get company settings
router.get('/company/:companyId', settingsController.getCompanySettings);

// Update company settings
router.put('/company/:companyId', settingsController.updateCompanySettings);

// ======================
// Field Mappings (Company-Level)
// ======================

// Get field mappings
router.get('/company/:companyId/field-mappings', settingsController.getFieldMappings);

// Update field mappings
router.put('/company/:companyId/field-mappings', settingsController.updateFieldMappings);

// ======================
// AIMS Configuration
// ======================

// Get AIMS config
router.get('/company/:companyId/aims-config', settingsController.getAimsConfig);

// Test AIMS connection
router.post('/company/:companyId/aims-test', settingsController.testAimsConnection);

export default router;
