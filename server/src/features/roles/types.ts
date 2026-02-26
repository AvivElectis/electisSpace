/**
 * Roles Feature - Types & DTOs
 *
 * @description Type definitions, validation schemas, and DTOs for role management.
 */
import { z } from 'zod';

// ======================
// Constants
// ======================

export const AVAILABLE_RESOURCES = [
    'spaces', 'people', 'conference', 'settings', 'users',
    'audit', 'sync', 'labels', 'stores', 'companies', 'aims-management',
] as const;

export const AVAILABLE_ACTIONS = [
    'view', 'create', 'edit', 'delete',
    'import', 'assign', 'toggle', 'trigger', 'manage', 'link', 'unlink',
    'read', 'update',  // Legacy aliases (read=view, update=edit) — kept for backward compatibility
] as const;

export type Resource = typeof AVAILABLE_RESOURCES[number];
export type Action = typeof AVAILABLE_ACTIONS[number];
export type PermissionsMap = Partial<Record<Resource, Action[]>>;

// ======================
// Validation Schemas
// ======================

export const permissionsMapSchema = z.record(
    z.enum(AVAILABLE_RESOURCES),
    z.array(z.enum(AVAILABLE_ACTIONS))
);

export const createRoleSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    companyId: z.string().uuid().optional().nullable(),
    permissions: permissionsMapSchema,
});

export const updateRoleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    permissions: permissionsMapSchema.optional(),
});

// ======================
// DTOs
// ======================

export type CreateRoleDTO = z.infer<typeof createRoleSchema>;
export type UpdateRoleDTO = z.infer<typeof updateRoleSchema>;

// ======================
// Resource-Action Matrix (for UI rendering)
// ======================

export const RESOURCE_ACTIONS: Record<Resource, Action[]> = {
    spaces: ['view', 'create', 'edit', 'delete'],
    people: ['view', 'create', 'edit', 'delete', 'import', 'assign'],
    conference: ['view', 'create', 'edit', 'delete', 'toggle'],
    settings: ['view', 'edit'],
    users: ['view', 'create', 'edit', 'delete'],
    audit: ['view'],
    sync: ['view', 'trigger'],
    labels: ['view', 'manage', 'link', 'unlink'],
    stores: ['view', 'edit', 'delete', 'manage'],
    companies: ['view'],
    'aims-management': ['view', 'manage'],
};

// ======================
// Default Role IDs (must match migration seed)
// ======================

export const DEFAULT_ROLE_IDS = {
    ADMIN: 'role-admin',
    MANAGER: 'role-manager',
    EMPLOYEE: 'role-employee',
    VIEWER: 'role-viewer',
} as const;
