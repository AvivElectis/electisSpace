import { badRequest, notFound } from '../../shared/middleware/index.js';
import { prisma } from '../../config/index.js';

const MAX_DEPTH = 5;

async function detectCycle(departmentId: string, parentId: string): Promise<boolean> {
    let currentId: string | null = parentId;
    let depth = 0;
    while (currentId && depth < MAX_DEPTH) {
        if (currentId === departmentId) return true;
        const parent: { parentId: string | null } | null = await prisma.department.findUnique({
            where: { id: currentId },
            select: { parentId: true },
        });
        currentId = parent?.parentId ?? null;
        depth++;
    }
    return depth >= MAX_DEPTH;
}

export const createDepartment = async (companyId: string, data: {
    name: string;
    code?: string;
    parentId?: string | null;
    managerId?: string | null;
    color?: string;
    sortOrder?: number;
}) => {
    if (data.parentId) {
        const parent = await prisma.department.findUnique({ where: { id: data.parentId } });
        if (!parent || parent.companyId !== companyId) throw notFound('Parent department not found');
        let depth = 1;
        let currentId: string | null = data.parentId;
        while (currentId) {
            const p: { parentId: string | null } | null = await prisma.department.findUnique({ where: { id: currentId }, select: { parentId: true } });
            currentId = p?.parentId ?? null;
            depth++;
        }
        if (depth > MAX_DEPTH) throw badRequest('MAX_DEPARTMENT_DEPTH_EXCEEDED');
    }

    return prisma.department.create({
        data: { companyId, ...data },
        include: { manager: { select: { displayName: true } } },
    });
};

export const listDepartments = async (companyId: string) => {
    return prisma.department.findMany({
        where: { companyId, isActive: true },
        include: {
            manager: { select: { id: true, displayName: true } },
            _count: { select: { members: true, children: true } },
        },
        orderBy: { sortOrder: 'asc' },
    });
};

export const updateDepartment = async (companyId: string, id: string, data: Record<string, any>) => {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.companyId !== companyId) throw notFound('Department not found');

    if (data.parentId) {
        const hasCycle = await detectCycle(id, data.parentId);
        if (hasCycle) throw badRequest('CIRCULAR_DEPARTMENT_HIERARCHY');
    }

    return prisma.department.update({ where: { id }, data });
};

export const deleteDepartment = async (companyId: string, id: string) => {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.companyId !== companyId) throw notFound('Department not found');
    return prisma.department.update({ where: { id }, data: { isActive: false } });
};

export const createTeam = async (companyId: string, data: {
    name: string;
    departmentId?: string | null;
    leadId?: string | null;
    color?: string;
}) => {
    return prisma.team.create({
        data: { companyId, ...data },
        include: { lead: { select: { displayName: true } }, _count: { select: { members: true } } },
    });
};

export const listTeams = async (companyId: string) => {
    return prisma.team.findMany({
        where: { companyId, isActive: true },
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
};

export const updateTeam = async (companyId: string, id: string, data: Record<string, any>) => {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team || team.companyId !== companyId) throw notFound('Team not found');
    return prisma.team.update({ where: { id }, data });
};

export const deleteTeam = async (companyId: string, id: string) => {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team || team.companyId !== companyId) throw notFound('Team not found');
    return prisma.team.update({ where: { id }, data: { isActive: false } });
};

export const addTeamMember = async (companyId: string, teamId: string, companyUserId: string, role = 'MEMBER') => {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.companyId !== companyId) throw notFound('Team not found');
    const user = await prisma.companyUser.findUnique({ where: { id: companyUserId } });
    if (!user || user.companyId !== companyId) throw notFound('Employee not found');

    return prisma.teamMember.create({
        data: { teamId, companyUserId, role },
        include: { companyUser: { select: { displayName: true, email: true } } },
    });
};

export const removeTeamMember = async (companyId: string, teamId: string, companyUserId: string) => {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.companyId !== companyId) throw notFound('Team not found');
    const member = await prisma.teamMember.findUnique({
        where: { teamId_companyUserId: { teamId, companyUserId } },
    });
    if (!member) throw notFound('Member not found');
    return prisma.teamMember.delete({ where: { id: member.id } });
};
