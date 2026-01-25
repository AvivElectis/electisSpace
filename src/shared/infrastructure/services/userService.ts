import api from './apiClient';

export interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: 'ADMIN' | 'MANAGER' | 'VIEWER';
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
}

export interface UserListResponse {
    data: User[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateUserDto {
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'ADMIN' | 'MANAGER' | 'VIEWER';
    password: string;
}

export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    role?: 'ADMIN' | 'MANAGER' | 'VIEWER';
    isActive?: boolean;
}

export interface UserQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
}

export const userService = {
    getAll: async (params: UserQueryParams = {}) => {
        const response = await api.get<UserListResponse>('/users', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<User>(`/users/${id}`);
        return response.data;
    },

    create: async (data: CreateUserDto) => {
        const response = await api.post<User>('/users', data);
        return response.data;
    },

    update: async (id: string, data: UpdateUserDto) => {
        const response = await api.patch<User>(`/users/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        await api.delete(`/users/${id}`);
    }
};
