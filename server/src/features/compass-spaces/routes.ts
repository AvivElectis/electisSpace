import { Router } from 'express';
import { compassAuthenticate, requireCompassEnabled } from '../../shared/middleware/compassAuth.js';
import { authenticate, requireCompassAdminForStore } from '../../shared/middleware/index.js';
import * as controller from './controller.js';

// Employee routes (Compass JWT)
export const compassSpaceRoutes = Router();
compassSpaceRoutes.use(compassAuthenticate, requireCompassEnabled);
compassSpaceRoutes.get('/', controller.list);

// Buildings endpoint (Compass JWT)
export const compassBuildingRoutes = Router();
compassBuildingRoutes.use(compassAuthenticate, requireCompassEnabled);
compassBuildingRoutes.get('/', controller.listBuildings);

// Admin routes (Admin JWT)
export const adminCompassSpaceRoutes = Router();
adminCompassSpaceRoutes.get('/:branchId', authenticate, requireCompassAdminForStore('branchId'), controller.adminList);
adminCompassSpaceRoutes.put('/:id/mode', authenticate, controller.updateMode);
adminCompassSpaceRoutes.put('/:id/properties', authenticate, controller.updateProperties);

// Admin buildings route (Admin JWT)
export const adminCompassBuildingRoutes = Router();
adminCompassBuildingRoutes.get('/:companyId', authenticate, controller.adminListBuildings);
