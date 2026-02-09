/**
 * People Lists Feature - Routes
 * 
 * CRUD for people lists (store-scoped, shared between users)
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../shared/middleware/index.js';
import { peopleListsController } from './controller.js';

const router = Router();
router.use(authenticate);

// List all people lists for a store
router.get('/', requirePermission('people', 'read'), peopleListsController.list);

// Get a single people list with content
router.get('/:id', requirePermission('people', 'read'), peopleListsController.getById);

// Create a new people list
router.post('/', requirePermission('people', 'create'), peopleListsController.create);

// Update a people list (name and/or content)
router.patch('/:id', requirePermission('people', 'update'), peopleListsController.update);

// Delete a people list
router.delete('/:id', requirePermission('people', 'delete'), peopleListsController.delete);

// Load a list — atomically replaces all people in the store with list snapshot
router.post('/:id/load', requirePermission('people', 'create'), peopleListsController.load);

// Free (unload) current list — people remain, list tracking cleared
router.post('/free', requirePermission('people', 'read'), peopleListsController.free);

export default router;
