import api from '@shared/infrastructure/services/apiClient';
import type { Booking, BookingRule, CompassSpace, Department, Employee, SpaceMode, Team } from '../domain/types';

export const compassAdminApi = {
    // Bookings
    listBookings: (companyId: string, params?: { status?: string }) =>
        api.get<{ data: Booking[] }>(`/admin/compass/bookings/${companyId}`, { params }),

    cancelBooking: (companyId: string, bookingId: string) =>
        api.patch(`/admin/compass/bookings/${companyId}/${bookingId}/cancel`),

    createBooking: (companyId: string, data: {
        companyUserId: string;
        branchId: string;
        spaceId: string;
        startTime: string;
        endTime: string | null;
        notes?: string;
    }) => api.post<{ data: import('../domain/types').Booking }>(`/admin/compass/bookings/${companyId}`, data),

    // Rules
    listRules: (companyId: string) =>
        api.get<{ data: BookingRule[] }>(`/admin/compass/rules/${companyId}`),

    createRule: (companyId: string, data: { name: string; ruleType: string; config: Record<string, unknown> }) =>
        api.post(`/admin/compass/rules/${companyId}`, data),

    updateRule: (companyId: string, ruleId: string, data: Partial<BookingRule>) =>
        api.put(`/admin/compass/rules/${companyId}/${ruleId}`, data),

    deleteRule: (companyId: string, ruleId: string) =>
        api.delete(`/admin/compass/rules/${companyId}/${ruleId}`),

    // Spaces
    listSpaces: (storeId: string) =>
        api.get<{ data: CompassSpace[] }>(`/admin/compass/spaces/${storeId}`),

    updateSpaceMode: (spaceId: string, mode: SpaceMode, assigneeId?: string) =>
        api.put(`/admin/compass/spaces/${spaceId}/mode`, { mode, permanentAssigneeId: assigneeId }),

    // Employees
    listEmployees: (companyId: string) =>
        api.get<{ data: Employee[] }>(`/admin/compass/employees/${companyId}`),

    createEmployee: (companyId: string, data: { branchId: string; email: string; displayName: string }) =>
        api.post(`/admin/compass/employees/${companyId}`, data),

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
};
