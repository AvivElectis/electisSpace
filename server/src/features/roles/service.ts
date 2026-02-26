/**
 * Roles Feature - Service
 *
 * @description Business logic for role management. CRUD for roles,
 * permission matrix, and authorization checks.
 */
import { GlobalRole, RoleScope } from '@prisma/client';
import { prisma } from '../../config/index.js';
import { RESOURCE_ACTIONS, DEFAULT_ROLE_IDS } from './types.js';
import type { CreateRoleDTO, UpdateRoleDTO, PermissionsMap } from './types.js';

// ======================
// User context for authorization
// ======================

interface RoleUserContext {
    id: string;
    globalRole: string | null;
    companies?: Array<{ id: string; role: string }>;
}

function isPlatformAdmin(user: RoleUserContext): boolean {
    return user.globalRole === GlobalRole.PLATFORM_ADMIN;
}

function isCompanyAdminFor(user: RoleUserContext, companyId: string): boolean {
    return user.companies?.some(
        c => c.id === companyId && (c.role === 'COMPANY_ADMIN' || c.role === 'SUPER_USER')
    ) ?? false;
}

// ======================
// Service
// ======================

export const rolesService = {
    /**
     * List roles — system roles + company-specific roles
     */
    async list(companyId?: string) {
        const where: any = {};

        if (companyId) {
            // System roles + roles for this specific company
            where.OR = [
                { scope: RoleScope.SYSTEM },
                { companyId },
            ];
        } else {
            // All system roles only (no company-specific)
            where.scope = RoleScope.SYSTEM;
        }

        return prisma.role.findMany({
            where,
            orderBy: [{ scope: 'asc' }, { name: 'asc' }],
            include: {
                _count: {
                    select: { userStores: true },
                },
            },
        });
    },

    /**
     * Get a single role by ID
     */
    async getById(id: string) {
        return prisma.role.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { userStores: true },
                },
            },
        });
    },

    /**
     * Create a new role
     */
    async create(data: CreateRoleDTO, user: RoleUserContext) {
        // System-scoped roles require platform admin
        if (!data.companyId && !isPlatformAdmin(user)) {
            throw new Error('FORBIDDEN_SYSTEM_ROLE');
        }

        // Company-scoped roles require company admin
        if (data.companyId && !isPlatformAdmin(user) && !isCompanyAdminFor(user, data.companyId)) {
            throw new Error('FORBIDDEN_COMPANY_ROLE');
        }

        const scope = data.companyId ? RoleScope.COMPANY : RoleScope.SYSTEM;

        return prisma.role.create({
            data: {
                name: data.name,
                description: data.description,
                scope,
                companyId: data.companyId ?? null,
                permissions: data.permissions as any,
                isDefault: false,
            },
        });
    },

    /**
     * Update a role
     */
    async update(id: string, data: UpdateRoleDTO, user: RoleUserContext) {
        const existing = await prisma.role.findUnique({ where: { id } });
        if (!existing) throw new Error('ROLE_NOT_FOUND');

        // Cannot rename default system roles (but can edit their permissions if platform admin)
        if (existing.isDefault && data.name && data.name !== existing.name) {
            throw new Error('CANNOT_RENAME_DEFAULT');
        }

        // System-scoped roles require platform admin
        if (existing.scope === RoleScope.SYSTEM && !isPlatformAdmin(user)) {
            throw new Error('FORBIDDEN_SYSTEM_ROLE');
        }

        // Company-scoped roles require company admin
        if (existing.scope === RoleScope.COMPANY && existing.companyId) {
            if (!isPlatformAdmin(user) && !isCompanyAdminFor(user, existing.companyId)) {
                throw new Error('FORBIDDEN_COMPANY_ROLE');
            }
        }

        return prisma.role.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.permissions && { permissions: data.permissions as any }),
            },
        });
    },

    /**
     * Delete a role
     */
    async remove(id: string, user: RoleUserContext) {
        const existing = await prisma.role.findUnique({
            where: { id },
            include: { _count: { select: { userStores: true } } },
        });
        if (!existing) throw new Error('ROLE_NOT_FOUND');

        // Cannot delete default roles
        if (existing.isDefault) {
            throw new Error('CANNOT_DELETE_DEFAULT');
        }

        // Cannot delete if role is still assigned
        if (existing._count.userStores > 0) {
            throw new Error('ROLE_IN_USE');
        }

        // System roles require platform admin
        if (existing.scope === RoleScope.SYSTEM && !isPlatformAdmin(user)) {
            throw new Error('FORBIDDEN_SYSTEM_ROLE');
        }

        // Company roles require company admin
        if (existing.scope === RoleScope.COMPANY && existing.companyId) {
            if (!isPlatformAdmin(user) && !isCompanyAdminFor(user, existing.companyId)) {
                throw new Error('FORBIDDEN_COMPANY_ROLE');
            }
        }

        return prisma.role.delete({ where: { id } });
    },

    /**
     * Get the permissions matrix (resource-action map) for UI rendering
     */
    getPermissionsMatrix() {
        return RESOURCE_ACTIONS;
    },
};
