import { Router } from 'express';
import { authenticate } from '../../shared/middleware/index.js';
import * as controller from './controller.js';

export const compassDashboardRoutes = Router();

// Admin dashboard summary (admin JWT)
compassDashboardRoutes.get('/summary/:companyId', authenticate, controller.summary);
