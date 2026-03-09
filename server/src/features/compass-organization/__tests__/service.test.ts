/**
 * Compass Organization Service - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma (hoisted to avoid TDZ issues)
const { mockDepartment, mockTeam, mockTeamMember, mockCompanyUser, mockTransaction } = vi.hoisted(() => {
    const dept = {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    };
    const team = {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    };
    const teamMember = {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    };
    const companyUser = {
        findUnique: vi.fn(),
    };
    const $transaction = vi.fn();
    return { mockDepartment: dept, mockTeam: team, mockTeamMember: teamMember, mockCompanyUser: companyUser, mockTransaction: $transaction };
});

vi.mock('../../../config/index.js', () => {
    const prisma = {
        department: mockDepartment,
        team: mockTeam,
        teamMember: mockTeamMember,
        companyUser: mockCompanyUser,
        $transaction: mockTransaction,
    };
    // Pass-through: execute callback/array with the same prisma mock
    mockTransaction.mockImplementation(async (arg: any) => {
        if (typeof arg === 'function') return arg(prisma);
        return Promise.all(arg);
    });
    return { prisma };
});

// Mock middleware error factories
vi.mock('../../../shared/middleware/index.js', () => {
    class AppError extends Error {
        statusCode: number;
        details?: unknown;
        constructor(message: string, statusCode: number, details?: unknown) {
            super(message);
            this.statusCode = statusCode;
            this.details = details;
        }
    }
    return {
        badRequest: (msg: string, details?: unknown) => new AppError(msg, 400, details),
        notFound: (msg: string) => new AppError(msg, 404),
    };
});

import * as service from '../service.js';

// ─── Test Data ──────────────────────────────────────

const COMPANY_ID = 'company-1';

const mockDeptData = {
    id: 'dept-1',
    companyId: COMPANY_ID,
    name: 'Engineering',
    code: 'ENG',
    parentId: null,
    managerId: null,
    color: '#0000FF',
    sortOrder: 0,
    isActive: true,
};

const mockTeamData = {
    id: 'team-1',
    companyId: COMPANY_ID,
    name: 'Frontend',
    departmentId: 'dept-1',
    leadId: null,
    color: '#00FF00',
    isActive: true,
};

// ─── createDepartment ───────────────────────────────

describe('createDepartment', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should create a department successfully without parent', async () => {
        const created = { ...mockDeptData, manager: null };
        mockDepartment.create.mockResolvedValue(created);

        const result = await service.createDepartment(COMPANY_ID, {
            name: 'Engineering',
            code: 'ENG',
            color: '#0000FF',
        });

        expect(result).toEqual(created);
        expect(mockDepartment.create).toHaveBeenCalledWith({
            data: {
                companyId: COMPANY_ID,
                name: 'Engineering',
                code: 'ENG',
                color: '#0000FF',
            },
            include: { manager: { select: { displayName: true } } },
        });
    });

    it('should create a department with a valid parent', async () => {
        // Parent exists and belongs to company
        mockDepartment.findUnique
            .mockResolvedValueOnce({ id: 'parent-1', companyId: COMPANY_ID, parentId: null })
            // Depth walk: parent has no further parent
            .mockResolvedValueOnce({ parentId: null });

        const created = { ...mockDeptData, parentId: 'parent-1', manager: null };
        mockDepartment.create.mockResolvedValue(created);

        const result = await service.createDepartment(COMPANY_ID, {
            name: 'Sub-team',
            parentId: 'parent-1',
        });

        expect(result.parentId).toBe('parent-1');
    });

    it('should reject when parent department not found', async () => {
        mockDepartment.findUnique.mockResolvedValue(null);

        await expect(
            service.createDepartment(COMPANY_ID, { name: 'Sub', parentId: 'nonexistent' }),
        ).rejects.toThrow('Parent department not found');
    });

    it('should reject when parent belongs to different company', async () => {
        mockDepartment.findUnique.mockResolvedValue({
            id: 'parent-1',
            companyId: 'other-company',
            parentId: null,
        });

        await expect(
            service.createDepartment(COMPANY_ID, { name: 'Sub', parentId: 'parent-1' }),
        ).rejects.toThrow('Parent department not found');
    });

    it('should reject deep hierarchy exceeding MAX_DEPTH=5', async () => {
        // Parent exists and belongs to company
        mockDepartment.findUnique
            .mockResolvedValueOnce({ id: 'p5', companyId: COMPANY_ID, parentId: 'p4' })
            // Depth walk chain: p5 -> p4 -> p3 -> p2 -> p1 -> null = depth 6
            .mockResolvedValueOnce({ parentId: 'p4' })
            .mockResolvedValueOnce({ parentId: 'p3' })
            .mockResolvedValueOnce({ parentId: 'p2' })
            .mockResolvedValueOnce({ parentId: 'p1' })
            .mockResolvedValueOnce({ parentId: null });

        await expect(
            service.createDepartment(COMPANY_ID, { name: 'TooDeep', parentId: 'p5' }),
        ).rejects.toThrow('MAX_DEPARTMENT_DEPTH_EXCEEDED');
    });
});

// ─── listDepartments ────────────────────────────────

describe('listDepartments', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return active departments sorted by sortOrder', async () => {
        const depts = [
            { ...mockDeptData, sortOrder: 0, manager: null, _count: { members: 2, children: 0 } },
            { ...mockDeptData, id: 'dept-2', name: 'Design', sortOrder: 1, manager: null, _count: { members: 1, children: 0 } },
        ];
        mockDepartment.findMany.mockResolvedValue(depts);

        const result = await service.listDepartments(COMPANY_ID);

        expect(result).toHaveLength(2);
        expect(mockDepartment.findMany).toHaveBeenCalledWith({
            where: { companyId: COMPANY_ID, isActive: true },
            include: {
                manager: { select: { id: true, displayName: true } },
                _count: { select: { members: true, children: true } },
            },
            orderBy: { sortOrder: 'asc' },
        });
    });

    it('should return empty array when no departments exist', async () => {
        mockDepartment.findMany.mockResolvedValue([]);

        const result = await service.listDepartments(COMPANY_ID);

        expect(result).toHaveLength(0);
    });
});

// ─── updateDepartment ───────────────────────────────

describe('updateDepartment', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should update a department successfully', async () => {
        mockDepartment.findUnique.mockResolvedValue(mockDeptData);
        const updated = { ...mockDeptData, name: 'Platform' };
        mockDepartment.update.mockResolvedValue(updated);

        const result = await service.updateDepartment(COMPANY_ID, 'dept-1', { name: 'Platform' });

        expect(result.name).toBe('Platform');
        expect(mockDepartment.update).toHaveBeenCalledWith({
            where: { id: 'dept-1' },
            data: { name: 'Platform' },
        });
    });

    it('should throw notFound when department does not exist', async () => {
        mockDepartment.findUnique.mockResolvedValue(null);

        await expect(
            service.updateDepartment(COMPANY_ID, 'nonexistent', { name: 'X' }),
        ).rejects.toThrow('Department not found');
    });

    it('should throw notFound when department belongs to different company', async () => {
        mockDepartment.findUnique.mockResolvedValue({
            ...mockDeptData,
            companyId: 'other-company',
        });

        await expect(
            service.updateDepartment(COMPANY_ID, 'dept-1', { name: 'X' }),
        ).rejects.toThrow('Department not found');
    });

    it('should detect circular hierarchy when setting parentId', async () => {
        // Department exists
        mockDepartment.findUnique
            .mockResolvedValueOnce(mockDeptData)
            // detectCycle walk: parent-1 -> dept-1 (circular!)
            .mockResolvedValueOnce({ parentId: 'dept-1' });

        await expect(
            service.updateDepartment(COMPANY_ID, 'dept-1', { parentId: 'parent-1' }),
        ).rejects.toThrow('CIRCULAR_DEPARTMENT_HIERARCHY');
    });

    it('should allow update with parentId when no cycle exists', async () => {
        mockDepartment.findUnique
            .mockResolvedValueOnce(mockDeptData)
            // detectCycle walk: new-parent has no further parent -> no cycle
            .mockResolvedValueOnce({ parentId: null });

        const updated = { ...mockDeptData, parentId: 'new-parent' };
        mockDepartment.update.mockResolvedValue(updated);

        const result = await service.updateDepartment(COMPANY_ID, 'dept-1', { parentId: 'new-parent' });

        expect(result.parentId).toBe('new-parent');
    });
});

// ─── deleteDepartment ───────────────────────────────

describe('deleteDepartment', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should soft delete a department (set isActive=false, clear managerId, detach children)', async () => {
        mockDepartment.findUnique.mockResolvedValue(mockDeptData);
        mockDepartment.updateMany.mockResolvedValue({ count: 0 });
        mockDepartment.update.mockResolvedValue({ ...mockDeptData, isActive: false, managerId: null });

        const result = await service.deleteDepartment(COMPANY_ID, 'dept-1');

        expect(result.isActive).toBe(false);
        expect(result.managerId).toBeNull();
        expect(mockDepartment.updateMany).toHaveBeenCalledWith({
            where: { parentId: 'dept-1' },
            data: { parentId: null },
        });
        expect(mockDepartment.update).toHaveBeenCalledWith({
            where: { id: 'dept-1' },
            data: { isActive: false, managerId: null },
        });
    });

    it('should throw notFound when department does not exist', async () => {
        mockDepartment.findUnique.mockResolvedValue(null);

        await expect(
            service.deleteDepartment(COMPANY_ID, 'nonexistent'),
        ).rejects.toThrow('Department not found');
    });

    it('should throw notFound when department belongs to different company', async () => {
        mockDepartment.findUnique.mockResolvedValue({
            ...mockDeptData,
            companyId: 'other-company',
        });

        await expect(
            service.deleteDepartment(COMPANY_ID, 'dept-1'),
        ).rejects.toThrow('Department not found');
    });
});

// ─── createTeam ─────────────────────────────────────

describe('createTeam', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should create a team successfully', async () => {
        const created = {
            ...mockTeamData,
            lead: null,
            _count: { members: 0 },
        };
        mockTeam.create.mockResolvedValue(created);

        const result = await service.createTeam(COMPANY_ID, {
            name: 'Frontend',
            departmentId: 'dept-1',
            color: '#00FF00',
        });

        expect(result.name).toBe('Frontend');
        expect(mockTeam.create).toHaveBeenCalledWith({
            data: {
                companyId: COMPANY_ID,
                name: 'Frontend',
                departmentId: 'dept-1',
                color: '#00FF00',
            },
            include: {
                lead: { select: { displayName: true } },
                _count: { select: { members: true } },
            },
        });
    });
});

// ─── listTeams ──────────────────────────────────────

describe('listTeams', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return active teams sorted by name', async () => {
        const teams = [
            { ...mockTeamData, name: 'Alpha', lead: null, department: { id: 'dept-1', name: 'Eng' }, _count: { members: 3 } },
            { ...mockTeamData, id: 'team-2', name: 'Beta', lead: null, department: null, _count: { members: 1 } },
        ];
        mockTeam.findMany.mockResolvedValue(teams);

        const result = await service.listTeams(COMPANY_ID);

        expect(result).toHaveLength(2);
        expect(mockTeam.findMany).toHaveBeenCalledWith({
            where: { companyId: COMPANY_ID, isActive: true },
            include: {
                lead: { select: { id: true, displayName: true } },
                department: { select: { id: true, name: true } },
                members: {
                    include: { companyUser: { select: { id: true, displayName: true, email: true } } },
                },
                _count: { select: { members: true } },
            },
            orderBy: { name: 'asc' },
        });
    });

    it('should return empty array when no teams exist', async () => {
        mockTeam.findMany.mockResolvedValue([]);

        const result = await service.listTeams(COMPANY_ID);

        expect(result).toHaveLength(0);
    });
});

// ─── addTeamMember ──────────────────────────────────

describe('addTeamMember', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should add a team member successfully', async () => {
        mockTeam.findUnique.mockResolvedValue(mockTeamData);
        mockCompanyUser.findUnique.mockResolvedValue({
            id: 'user-1',
            companyId: COMPANY_ID,
            displayName: 'John',
            email: 'john@test.com',
        });
        const created = {
            teamId: 'team-1',
            companyUserId: 'user-1',
            role: 'MEMBER',
            companyUser: { displayName: 'John', email: 'john@test.com' },
        };
        mockTeamMember.create.mockResolvedValue(created);

        const result = await service.addTeamMember(COMPANY_ID, 'team-1', 'user-1');

        expect(result.companyUser.displayName).toBe('John');
        expect(mockTeamMember.create).toHaveBeenCalledWith({
            data: { teamId: 'team-1', companyUserId: 'user-1', role: 'MEMBER' },
            include: { companyUser: { select: { displayName: true, email: true } } },
        });
    });

    it('should reject when team does not exist', async () => {
        mockTeam.findUnique.mockResolvedValue(null);

        await expect(
            service.addTeamMember(COMPANY_ID, 'nonexistent', 'user-1'),
        ).rejects.toThrow('Team not found');
    });

    it('should reject when team belongs to different company', async () => {
        mockTeam.findUnique.mockResolvedValue({
            ...mockTeamData,
            companyId: 'other-company',
        });

        await expect(
            service.addTeamMember(COMPANY_ID, 'team-1', 'user-1'),
        ).rejects.toThrow('Team not found');
    });

    it('should reject when user does not exist', async () => {
        mockTeam.findUnique.mockResolvedValue(mockTeamData);
        mockCompanyUser.findUnique.mockResolvedValue(null);

        await expect(
            service.addTeamMember(COMPANY_ID, 'team-1', 'nonexistent'),
        ).rejects.toThrow('Employee not found');
    });

    it('should reject when user belongs to different company', async () => {
        mockTeam.findUnique.mockResolvedValue(mockTeamData);
        mockCompanyUser.findUnique.mockResolvedValue({
            id: 'user-1',
            companyId: 'other-company',
        });

        await expect(
            service.addTeamMember(COMPANY_ID, 'team-1', 'user-1'),
        ).rejects.toThrow('Employee not found');
    });

    it('should add a team member with a custom role', async () => {
        mockTeam.findUnique.mockResolvedValue(mockTeamData);
        mockCompanyUser.findUnique.mockResolvedValue({
            id: 'user-1',
            companyId: COMPANY_ID,
        });
        const created = {
            teamId: 'team-1',
            companyUserId: 'user-1',
            role: 'LEAD',
            companyUser: { displayName: 'Jane', email: 'jane@test.com' },
        };
        mockTeamMember.create.mockResolvedValue(created);

        const result = await service.addTeamMember(COMPANY_ID, 'team-1', 'user-1', 'LEAD');

        expect(result.role).toBe('LEAD');
    });
});

// ─── removeTeamMember ───────────────────────────────

describe('removeTeamMember', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should remove a team member successfully', async () => {
        mockTeam.findUnique.mockResolvedValue(mockTeamData);
        mockTeamMember.findUnique.mockResolvedValue({
            id: 'tm-1',
            teamId: 'team-1',
            companyUserId: 'user-1',
        });
        mockTeamMember.delete.mockResolvedValue({ id: 'tm-1' });

        const result = await service.removeTeamMember(COMPANY_ID, 'team-1', 'user-1');

        expect(result.id).toBe('tm-1');
        expect(mockTeamMember.findUnique).toHaveBeenCalledWith({
            where: { teamId_companyUserId: { teamId: 'team-1', companyUserId: 'user-1' } },
        });
        expect(mockTeamMember.delete).toHaveBeenCalledWith({ where: { id: 'tm-1' } });
    });

    it('should reject when team does not exist', async () => {
        mockTeam.findUnique.mockResolvedValue(null);

        await expect(
            service.removeTeamMember(COMPANY_ID, 'nonexistent', 'user-1'),
        ).rejects.toThrow('Team not found');
    });

    it('should reject when member not found in team', async () => {
        mockTeam.findUnique.mockResolvedValue(mockTeamData);
        mockTeamMember.findUnique.mockResolvedValue(null);

        await expect(
            service.removeTeamMember(COMPANY_ID, 'team-1', 'nonexistent'),
        ).rejects.toThrow('Member not found');
    });
});
