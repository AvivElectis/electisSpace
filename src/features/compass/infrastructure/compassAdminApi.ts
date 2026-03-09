import api from '@shared/infrastructure/services/apiClient';
import type { Amenity, Booking, BookingRule, CompassSpace, CompassSpaceType, Department, Employee, Neighborhood, SpaceMode, Team } from '../domain/types';

export const compassAdminApi = {
    // Bookings
    listBookings: (companyId: string, params?: { status?: string }) =>
        api.get<{ data: Booking[] }>(`/admin/compass/bookings/${companyId}`, { params }),

    cancelBooking: (companyId: string, bookingId: string, scope?: 'instance' | 'future' | 'all') =>
        api.patch(`/admin/compass/bookings/${companyId}/${bookingId}/cancel`, null, {
            params: scope ? { scope } : undefined,
        }),

    updateBooking: (companyId: string, bookingId: string, data: {
        startTime?: string;
        endTime?: string | null;
        notes?: string | null;
    }) => api.patch<{ data: import('../domain/types').Booking }>(`/admin/compass/bookings/${companyId}/${bookingId}`, data),

    createBooking: (companyId: string, data: {
        companyUserId: string;
        branchId: string;
        spaceId: string;
        startTime: string;
        endTime: string | null;
        notes?: string;
        recurrenceRule?: string;
    }) => api.post<{ data: import('../domain/types').Booking }>(`/admin/compass/bookings/${companyId}`, data),

    // Rules
    listRules: (companyId: string) =>
        api.get<{ data: BookingRule[] }>(`/admin/compass/rules/${companyId}`),

    createRule: (companyId: string, data: {
        name: string;
        ruleType: string;
        config: Record<string, unknown>;
        priority?: number;
        applyTo?: string;
        targetBranchIds?: string[];
        targetSpaceTypes?: string[];
        isActive?: boolean;
    }) => api.post(`/admin/compass/rules/${companyId}`, data),

    updateRule: (companyId: string, ruleId: string, data: Partial<BookingRule>) =>
        api.put(`/admin/compass/rules/${companyId}/${ruleId}`, data),

    deleteRule: (companyId: string, ruleId: string) =>
        api.delete(`/admin/compass/rules/${companyId}/${ruleId}`),

    // Spaces
    listSpaces: (storeId: string) =>
        api.get<{ data: CompassSpace[] }>(`/admin/compass/spaces/${storeId}`),

    createSpace: (storeId: string, data: { externalId: string; data: Record<string, string> }) =>
        api.post('/spaces', { storeId, ...data }),

    updateSpaceMode: (spaceId: string, mode: SpaceMode, assigneeId?: string) =>
        api.put(`/admin/compass/spaces/${spaceId}/mode`, { mode, permanentAssigneeId: assigneeId }),

    updateSpaceProperties: (spaceId: string, data: {
        compassSpaceType?: CompassSpaceType | null;
        compassCapacity?: number | null;
        buildingId?: string | null;
        floorId?: string | null;
        areaId?: string | null;
        neighborhoodId?: string | null;
    }) => api.put(`/admin/compass/spaces/${spaceId}/properties`, data),

    // Employees
    listEmployees: (companyId: string) =>
        api.get<{ data: Employee[] }>(`/admin/compass/employees/${companyId}`),

    createEmployee: (companyId: string, data: {
        branchId: string;
        email: string;
        displayName: string;
        role?: string;
        departmentId?: string | null;
        jobTitle?: string | null;
        employeeNumber?: string | null;
        phone?: string | null;
        isRemote?: boolean;
    }) => api.post(`/admin/compass/employees/${companyId}`, data),

    updateEmployee: (companyId: string, employeeId: string, data: Partial<Employee>) =>
        api.put(`/admin/compass/employees/${companyId}/${employeeId}`, data),

    // Departments
    listDepartments: (companyId: string) =>
        api.get<{ data: Department[] }>(`/admin/compass/departments/${companyId}`),

    createDepartment: (companyId: string, data: { name: string; code?: string; parentId?: string; managerId?: string; color?: string }) =>
        api.post<{ data: Department }>(`/admin/compass/departments/${companyId}`, data),

    updateDepartment: (companyId: string, id: string, data: { name?: string; code?: string; parentId?: string | null; managerId?: string | null; color?: string | null }) =>
        api.put<{ data: Department }>(`/admin/compass/departments/${companyId}/${id}`, data),

    deleteDepartment: (companyId: string, id: string) =>
        api.delete(`/admin/compass/departments/${companyId}/${id}`),

    // Teams
    listTeams: (companyId: string) =>
        api.get<{ data: Team[] }>(`/admin/compass/teams/${companyId}`),

    createTeam: (companyId: string, data: { name: string; departmentId?: string; leadId?: string; color?: string }) =>
        api.post<{ data: Team }>(`/admin/compass/teams/${companyId}`, data),

    updateTeam: (companyId: string, id: string, data: { name?: string; departmentId?: string | null; leadId?: string | null; color?: string | null }) =>
        api.put<{ data: Team }>(`/admin/compass/teams/${companyId}/${id}`, data),

    deleteTeam: (companyId: string, id: string) =>
        api.delete(`/admin/compass/teams/${companyId}/${id}`),

    addTeamMember: (companyId: string, teamId: string, companyUserId: string) =>
        api.post(`/admin/compass/teams/${companyId}/${teamId}/members`, { companyUserId }),

    removeTeamMember: (companyId: string, teamId: string, userId: string) =>
        api.delete(`/admin/compass/teams/${companyId}/${teamId}/members/${userId}`),

    // Amenities
    listAmenities: (companyId: string) =>
        api.get<{ data: Amenity[] }>(`/admin/compass/amenities/${companyId}`),

    createAmenity: (companyId: string, data: { name: string; nameHe?: string; icon?: string; category: string }) =>
        api.post<{ data: Amenity }>(`/admin/compass/amenities/${companyId}`, data),

    updateAmenity: (companyId: string, id: string, data: { name?: string; nameHe?: string | null; icon?: string | null; category?: string; isActive?: boolean }) =>
        api.put<{ data: Amenity }>(`/admin/compass/amenities/${companyId}/${id}`, data),

    deleteAmenity: (companyId: string, id: string) =>
        api.delete(`/admin/compass/amenities/${companyId}/${id}`),

    // Buildings (hierarchy: building → floors → areas)
    listBuildings: (companyId: string) =>
        api.get<{ data: Array<{ id: string; name: string; floors: Array<{ id: string; name: string }> }> }>(`/admin/compass/buildings/${companyId}`),

    // Neighborhoods
    listNeighborhoods: (floorId: string) =>
        api.get<{ data: Neighborhood[] }>(`/admin/compass/neighborhoods/${floorId}`),

    createNeighborhood: (data: { name: string; floorId: string; departmentId?: string; color?: string; description?: string }) =>
        api.post<{ data: Neighborhood }>(`/admin/compass/neighborhoods`, data),

    updateNeighborhood: (id: string, data: { name?: string; departmentId?: string | null; color?: string | null; description?: string | null }) =>
        api.put<{ data: Neighborhood }>(`/admin/compass/neighborhoods/${id}`, data),

    deleteNeighborhood: (id: string) =>
        api.delete(`/admin/compass/neighborhoods/${id}`),
};
