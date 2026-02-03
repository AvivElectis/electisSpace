/**
 * Users Feature - Routes (Refactored)
 * 
 * @description Thin route definitions for user management.
 */
import { Router } from 'express';
import { authenticate } from '../../shared/middleware/index.js';
import { userController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================
// User Profile Routes (/me)
// ======================

// Get current user's full profile
router.get('/me', userController.getMyProfile);

// Update current user's profile
router.patch('/me', userController.updateMyProfile);

// Change current user's password
router.post('/me/change-password', userController.changeMyPassword);

// Get current user context (active company/store)
router.get('/me/context', userController.getContext);

// Update current user context
router.patch('/me/context', userController.updateContext);

// ======================
// Feature Reference
// ======================

// Get available features list
router.get('/features', userController.getFeatures);

// ======================
// User Management Routes
// ======================

// List users
router.get('/', userController.list);

// Get user details
router.get('/:id', userController.getById);

// Create new user
router.post('/', userController.create);

// Update user
router.patch('/:id', userController.update);

// Delete user
router.delete('/:id', userController.delete);

// ======================
// User Role Elevation
// ======================

// Elevate user role
router.post('/:id/elevate', userController.elevate);

// ======================
// User-Store Routes
// ======================

// Update user-store assignment
router.patch('/:id/stores/:storeId', userController.updateUserStore);

// Assign user to store
router.post('/:id/stores', userController.assignToStore);

// Remove user from store
router.delete('/:id/stores/:storeId', userController.removeFromStore);

// ======================
// User-Company Routes
// ======================

// Get user's company assignments
router.get('/:id/companies', userController.getUserCompanies);

// Assign user to company
router.post('/:id/companies', userController.assignToCompany);

// Update user-company assignment
router.patch('/:id/companies/:companyId', userController.updateUserCompany);

// Remove user from company
router.delete('/:id/companies/:companyId', userController.removeFromCompany);

export default router;
