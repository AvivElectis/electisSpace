import type { Request, Response, NextFunction } from 'express';
import { badRequest } from '../../shared/middleware/index.js';
import * as service from './service.js';
import {
    createDepartmentSchema, updateDepartmentSchema,
    createTeamSchema, updateTeamSchema, addTeamMemberSchema,
} from './types.js';

// Departments
export const listDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const data = await service.listDepartments(companyId);
        res.json({ data });
    } catch (error) { next(error); }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const parsed = createDepartmentSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request');
        const dept = await service.createDepartment(companyId, parsed.data);
        res.status(201).json({ data: dept });
    } catch (error) { next(error); }
};

export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        const parsed = updateDepartmentSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request');
        const dept = await service.updateDepartment(companyId, id, parsed.data);
        res.json({ data: dept });
    } catch (error) { next(error); }
};

export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        await service.deleteDepartment(companyId, id);
        res.json({ message: 'Department deactivated' });
    } catch (error) { next(error); }
};

// Teams
export const listTeams = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const data = await service.listTeams(companyId);
        res.json({ data });
    } catch (error) { next(error); }
};

export const createTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const parsed = createTeamSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request');
        const team = await service.createTeam(companyId, parsed.data);
        res.status(201).json({ data: team });
    } catch (error) { next(error); }
};

export const updateTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        const parsed = updateTeamSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request');
        const team = await service.updateTeam(companyId, id, parsed.data);
        res.json({ data: team });
    } catch (error) { next(error); }
};

export const deleteTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        await service.deleteTeam(companyId, id);
        res.json({ message: 'Team deactivated' });
    } catch (error) { next(error); }
};

export const addMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        const parsed = addTeamMemberSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request');
        const member = await service.addTeamMember(
            companyId, id, parsed.data.companyUserId, parsed.data.role,
        );
        res.status(201).json({ data: member });
    } catch (error) { next(error); }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        const uid = req.params.uid as string;
        await service.removeTeamMember(companyId, id, uid);
        res.json({ message: 'Member removed' });
    } catch (error) { next(error); }
};
