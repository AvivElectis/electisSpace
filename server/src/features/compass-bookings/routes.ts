/**
 * Compass Bookings Feature - Routes
 *
 * Employee routes: /api/v2/compass/bookings (Compass JWT auth)
 * Admin routes: /api/v2/admin/compass/rules (Admin JWT auth)
 */
import { Router } from 'express';
import { compassAuthenticate, requireCompassEnabled } from '../../shared/middleware/compassAuth.js';
import { authenticate, requireCompassAdmin } from '../../shared/middleware/index.js';
import * as controller from './controller.js';

// ======================
// Employee Booking Routes (Compass JWT)
// ======================
export const compassBookingRoutes = Router();

compassBookingRoutes.use(compassAuthenticate, requireCompassEnabled);

// GET    /bookings/work-hours — Get resolved work hours for user's branch
compassBookingRoutes.get('/work-hours', controller.getWorkHours);

// POST   /bookings          — Create a booking
compassBookingRoutes.post('/', controller.create);

// GET    /bookings          — List user's bookings
compassBookingRoutes.get('/', controller.list);

// PATCH  /bookings/:id/check-in — Check into a booking
compassBookingRoutes.patch('/:id/check-in', controller.checkIn);

// PATCH  /bookings/:id/release  — Release a space early
compassBookingRoutes.patch('/:id/release', controller.release);

// PATCH  /bookings/:id/extend   — Extend a booking
compassBookingRoutes.patch('/:id/extend', controller.extend);

// DELETE /bookings/:id      — Cancel a booking
compassBookingRoutes.delete('/:id', controller.cancel);

// ======================
// Admin Booking Routes (Admin JWT)
// ======================
export const adminBookingRoutes = Router();

// GET    /compass/bookings/:companyId     — List bookings for a company
adminBookingRoutes.get('/:companyId', authenticate, requireCompassAdmin(), controller.adminList);

// POST   /compass/bookings/:companyId     — Admin create/reserve a booking
adminBookingRoutes.post('/:companyId', authenticate, requireCompassAdmin(), controller.adminCreate);

// POST   /compass/bookings/:companyId/bulk-cancel       — Bulk cancel bookings (admin)
adminBookingRoutes.post('/:companyId/bulk-cancel', authenticate, requireCompassAdmin(), controller.adminBulkCancel);

// PATCH  /compass/bookings/:companyId/:bookingId/cancel — Cancel a booking (admin)
adminBookingRoutes.patch('/:companyId/:bookingId/cancel', authenticate, requireCompassAdmin(), controller.adminCancel);

// PATCH  /compass/bookings/:companyId/:bookingId         — Update a booking (admin)
adminBookingRoutes.patch('/:companyId/:bookingId', authenticate, requireCompassAdmin(), controller.adminUpdate);

// ======================
// Admin Booking Rule Routes (Admin JWT)
// ======================
export const adminBookingRuleRoutes = Router();

// GET    /compass/rules/:companyId     — List rules for a company
adminBookingRuleRoutes.get('/:companyId', authenticate, requireCompassAdmin(), controller.listRules);

// POST   /compass/rules/:companyId     — Create a rule
adminBookingRuleRoutes.post('/:companyId', authenticate, requireCompassAdmin(), controller.createRule);

// PUT    /compass/rules/:companyId/:ruleId  — Update a rule
adminBookingRuleRoutes.put('/:companyId/:ruleId', authenticate, requireCompassAdmin(), controller.updateRule);

// DELETE /compass/rules/:companyId/:ruleId  — Delete a rule
adminBookingRuleRoutes.delete('/:companyId/:ruleId', authenticate, requireCompassAdmin(), controller.deleteRule);
