import { Router } from 'express';
import { authenticate, requireCompassAdmin } from '../../shared/middleware/index.js';
import * as controller from './controller.js';

// ======================
// Admin Department Routes (Admin JWT)
// ======================
export const adminDepartmentRoutes = Router();

adminDepartmentRoutes.get('/:companyId', authenticate, requireCompassAdmin(), controller.listDepartments);
adminDepartmentRoutes.post('/:companyId', authenticate, requireCompassAdmin(), controller.createDepartment);
adminDepartmentRoutes.put('/:companyId/:id', authenticate, requireCompassAdmin(), controller.updateDepartment);
adminDepartmentRoutes.delete('/:companyId/:id', authenticate, requireCompassAdmin(), controller.deleteDepartment);

// ======================
// Admin Team Routes (Admin JWT)
// ======================
export const adminTeamRoutes = Router();

adminTeamRoutes.get('/:companyId', authenticate, requireCompassAdmin(), controller.listTeams);
adminTeamRoutes.post('/:companyId', authenticate, requireCompassAdmin(), controller.createTeam);
adminTeamRoutes.put('/:companyId/:id', authenticate, requireCompassAdmin(), controller.updateTeam);
adminTeamRoutes.delete('/:companyId/:id', authenticate, requireCompassAdmin(), controller.deleteTeam);
adminTeamRoutes.post('/:companyId/:id/members', authenticate, requireCompassAdmin(), controller.addMember);
adminTeamRoutes.delete('/:companyId/:id/members/:uid', authenticate, requireCompassAdmin(), controller.removeMember);
