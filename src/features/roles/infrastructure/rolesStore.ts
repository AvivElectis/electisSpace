import { create } from 'zustand';
import { rolesApi } from './rolesApi';
import type { Role, PermissionsMatrix } from '../domain/types';

interface RolesState {
    roles: Role[];
    permissionsMatrix: PermissionsMatrix | null;
    loading: boolean;
    error: string | null;

    fetchRoles: (companyId?: string) => Promise<void>;
    fetchPermissionsMatrix: () => Promise<void>;
    createRole: (data: { name: string; description?: string; companyId?: string | null; permissions: Record<string, string[]> }) => Promise<Role>;
    updateRole: (id: string, data: { name?: string; description?: string | null; permissions?: Record<string, string[]> }) => Promise<Role>;
    deleteRole: (id: string) => Promise<void>;
}

export const useRolesStore = create<RolesState>((set, get) => ({
    roles: [],
    permissionsMatrix: null,
    loading: false,
    error: null,

    fetchRoles: async (companyId?: string) => {
        set({ loading: true, error: null });
        try {
            const { data } = await rolesApi.list(companyId);
            set({ roles: data, loading: false });
        } catch (err: unknown) {
            set({ error: err instanceof Error ? err.message : 'FETCH_ROLES_ERROR', loading: false });
        }
    },

    fetchPermissionsMatrix: async () => {
        try {
            const matrix = await rolesApi.getPermissionsMatrix();
            set({ permissionsMatrix: matrix });
        } catch {
            // ignore — non-critical
        }
    },

    createRole: async (data) => {
        const role = await rolesApi.create(data);
        set({ roles: [...get().roles, role] });
        return role;
    },

    updateRole: async (id, data) => {
        const role = await rolesApi.update(id, data);
        set({ roles: get().roles.map(r => r.id === id ? role : r) });
        return role;
    },

    deleteRole: async (id) => {
        await rolesApi.remove(id);
        set({ roles: get().roles.filter(r => r.id !== id) });
    },
}));
