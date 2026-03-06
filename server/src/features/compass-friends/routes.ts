import { Router } from 'express';
import { compassAuthenticate, requireCompassEnabled } from '../../shared/middleware/compassAuth.js';
import { authenticate, requireCompassAdmin } from '../../shared/middleware/index.js';
import * as controller from './controller.js';

// Employee routes (Compass JWT)
export const compassFriendRoutes = Router();
compassFriendRoutes.use(compassAuthenticate, requireCompassEnabled);

compassFriendRoutes.get('/', controller.listFriends);
compassFriendRoutes.get('/requests', controller.listRequests);
compassFriendRoutes.get('/locations', controller.friendLocations);
compassFriendRoutes.post('/request', controller.sendRequest);
compassFriendRoutes.patch('/:id/accept', controller.acceptRequest);
compassFriendRoutes.patch('/:id/block', controller.blockUser);
compassFriendRoutes.delete('/:id', controller.removeFriend);

// Admin employee routes (Admin JWT)
export const adminEmployeeRoutes = Router();

adminEmployeeRoutes.get('/:companyId', authenticate, requireCompassAdmin(), controller.listEmployees);
adminEmployeeRoutes.post('/:companyId', authenticate, requireCompassAdmin(), controller.createEmployee);
adminEmployeeRoutes.put('/:companyId/:userId', authenticate, requireCompassAdmin(), controller.updateEmployee);
