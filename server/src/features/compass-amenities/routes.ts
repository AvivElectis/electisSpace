import { Router } from 'express';
import { authenticate, requireCompassAdmin } from '../../shared/middleware/index.js';
import { compassAuthenticate, requireCompassEnabled } from '../../shared/middleware/compassAuth.js';
import * as controller from './controller.js';

// ======================
// Admin Amenity Routes (Admin JWT)
// ======================
export const adminAmenityRoutes = Router();

adminAmenityRoutes.get('/:companyId', authenticate, requireCompassAdmin(), controller.listAmenities);
adminAmenityRoutes.post('/:companyId', authenticate, requireCompassAdmin(), controller.createAmenity);
adminAmenityRoutes.put('/:companyId/:id', authenticate, requireCompassAdmin(), controller.updateAmenity);
adminAmenityRoutes.delete('/:companyId/:id', authenticate, requireCompassAdmin(), controller.deleteAmenity);

// ======================
// Admin Neighborhood Routes (Admin JWT)
// ======================
export const adminNeighborhoodRoutes = Router();

adminNeighborhoodRoutes.get('/:floorId', authenticate, requireCompassAdmin(), controller.listNeighborhoods);
adminNeighborhoodRoutes.post('/', authenticate, requireCompassAdmin(), controller.createNeighborhood);
adminNeighborhoodRoutes.put('/:id', authenticate, requireCompassAdmin(), controller.updateNeighborhood);
adminNeighborhoodRoutes.delete('/:id', authenticate, requireCompassAdmin(), controller.deleteNeighborhood);

// ======================
// Compass Mobile Amenity Routes (Compass JWT — read-only)
// ======================
export const compassAmenityRoutes = Router();

compassAmenityRoutes.use(compassAuthenticate, requireCompassEnabled);
compassAmenityRoutes.get('/', controller.compassListAmenities);

// ======================
// Compass Mobile Neighborhood Routes (Compass JWT — read-only)
// ======================
export const compassNeighborhoodRoutes = Router();

compassNeighborhoodRoutes.use(compassAuthenticate, requireCompassEnabled);
compassNeighborhoodRoutes.get('/:floorId', controller.compassListNeighborhoods);
