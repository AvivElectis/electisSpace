import api from './apiClient';

// Store assignment for a user
export interface UserStoreAssignment {
    id: string;
    name: string;
    storeNumber: string;
    role: 'STORE_ADMIN' | 'STORE_MANAGER' | 'STORE_EMPLOYEE' | 'STORE_VIEWER';
    features: string[];
}

export interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    globalRole: 'PLATFORM_ADMIN' | null;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
    stores: UserStoreAssignment[];
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
    password: string;
    storeId: string;
    role: 'STORE_ADMIN' | 'STORE_MANAGER' | 'STORE_EMPLOYEE' | 'STORE_VIEWER';
    features: string[];
}

export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
}

export interface UpdateUserStoreDto {
    role?: 'STORE_ADMIN' | 'STORE_MANAGER' | 'STORE_EMPLOYEE' | 'STORE_VIEWER';
    features?: string[];
}

export interface UserQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    storeId?: string;
}

export interface Feature {
    id: string;
    name: string;
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

    getFeatures: async () => {
        const response = await api.get<{ features: Feature[] }>('/users/features');
        return response.data.features;
    },

    create: async (data: CreateUserDto) => {
        const response = await api.post<User>('/users', data);
        return response.data;
    },

    update: async (id: string, data: UpdateUserDto) => {
        const response = await api.patch<User>(`/users/${id}`, data);
        return response.data;
    },

    updateStoreAccess: async (userId: string, storeId: string, data: UpdateUserStoreDto) => {
        const response = await api.patch<UserStoreAssignment>(`/users/${userId}/stores/${storeId}`, data);
        return response.data;
    },

    assignToStore: async (userId: string, data: { storeId: string; role: string; features: string[] }) => {
        const response = await api.post<UserStoreAssignment>(`/users/${userId}/stores`, data);
        return response.data;
    },

    removeFromStore: async (userId: string, storeId: string) => {
        await api.delete(`/users/${userId}/stores/${storeId}`);
    },

    delete: async (id: string) => {
        await api.delete(`/users/${id}`);
    }
};
