import api from '@shared/infrastructure/services/apiClient';
import type { Role, PermissionsMatrix } from '../domain/types';

export const rolesApi = {
    async list(companyId?: string): Promise<{ data: Role[]; total: number }> {
        const params = companyId ? { companyId } : {};
        const response = await api.get('/roles', { params });
        return response.data;
    },

    async getById(id: string): Promise<Role> {
        const response = await api.get(`/roles/${id}`);
        return response.data.data;
    },

    async create(data: { name: string; description?: string; companyId?: string | null; permissions: Record<string, string[]> }): Promise<Role> {
        const response = await api.post('/roles', data);
        return response.data.data;
    },

    async update(id: string, data: { name?: string; description?: string | null; permissions?: Record<string, string[]> }): Promise<Role> {
        const response = await api.patch(`/roles/${id}`, data);
        return response.data.data;
    },

    async remove(id: string): Promise<void> {
        await api.delete(`/roles/${id}`);
    },

    async getPermissionsMatrix(): Promise<PermissionsMatrix> {
        const response = await api.get('/roles/permissions-matrix');
        return response.data.data;
    },
};
