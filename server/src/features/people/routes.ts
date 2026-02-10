/**
 * People Feature - Routes (Refactored)
 * 
 * @description Thin route definitions for people management.
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../shared/middleware/index.js';
import { peopleController } from './controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================
// People Lists
// ======================

// Get all people lists (must be before /:id)
router.get('/lists', requirePermission('people', 'read'), peopleController.listPeopleLists);

// ======================
// Bulk Import
// ======================

// Bulk import from CSV
router.post('/import', requirePermission('people', 'import'), peopleController.importFromCsv);

// Provision space slot articles in AIMS (people mode)
router.post('/provision-slots', requirePermission('people', 'assign'), peopleController.provisionSlots);

// ======================
// People CRUD
// ======================

// List all people
router.get('/', requirePermission('people', 'read'), peopleController.list);

// Get person details
router.get('/:id', requirePermission('people', 'read'), peopleController.getById);

// Create new person
router.post('/', requirePermission('people', 'create'), peopleController.create);

// Update person
router.patch('/:id', requirePermission('people', 'update'), peopleController.update);

// Delete person
router.delete('/:id', requirePermission('people', 'delete'), peopleController.delete);

// ======================
// Assignment
// ======================

// Assign person to space
router.post('/:id/assign', requirePermission('people', 'assign'), peopleController.assignToSpace);

// Unassign person from space
router.post('/:id/unassign', requirePermission('people', 'assign'), peopleController.unassignFromSpace);

export default router;
