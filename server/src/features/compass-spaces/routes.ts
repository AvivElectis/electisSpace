import { Router } from 'express';
import { compassAuthenticate, requireCompassEnabled } from '../../shared/middleware/compassAuth.js';
import { authenticate } from '../../shared/middleware/index.js';
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
adminCompassSpaceRoutes.get('/:branchId', authenticate, controller.adminList);
adminCompassSpaceRoutes.put('/:id/mode', authenticate, controller.updateMode);
