/**
 * Admin Feature - Routes (Refactored)
 * 
 * @description Thin route definitions for admin panel operations.
 * Platform Admin only - Browse and view any company/store data.
 */
import { Router } from 'express';
import { authenticate, forbidden } from '../../shared/middleware/index.js';
import { GlobalRole } from '@prisma/client';
import { adminController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================
// Middleware: Platform Admin Only
// ======================
const requirePlatformAdmin = (req: any, _res: any, next: any) => {
    if (req.user?.globalRole !== GlobalRole.PLATFORM_ADMIN) {
        return next(forbidden('Platform Admin access required'));
    }
    next();
};

router.use(requirePlatformAdmin);

// ======================
// Dashboard Overview
// ======================

router.get('/overview', adminController.getOverview);

// ======================
// Company Routes
// ======================

router.get('/companies', adminController.listCompanies);
router.get('/companies/:companyId', adminController.getCompanyDetails);

// ======================
// Store Routes
// ======================

router.get('/stores', adminController.listStores);
router.get('/stores/:storeId', adminController.getStoreDetails);

// ======================
// Store Entity Routes
// ======================

router.get('/stores/:storeId/spaces', adminController.listSpaces);
router.get('/stores/:storeId/people', adminController.listPeople);
router.get('/stores/:storeId/conference-rooms', adminController.listConferenceRooms);
router.get('/stores/:storeId/sync-queue', adminController.listSyncQueue);

// ======================
// Context & Audit
// ======================

router.post('/impersonate-context', adminController.impersonateContext);
router.get('/audit-log', adminController.listAuditLog);

export default router;
