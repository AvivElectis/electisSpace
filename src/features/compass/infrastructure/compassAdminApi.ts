import api from '@shared/infrastructure/services/apiClient';
import type { Booking, BookingRule, CompassSpace, Employee, SpaceMode } from '../domain/types';

export const compassAdminApi = {
    // Bookings
    listBookings: (companyId: string, params?: { status?: string }) =>
        api.get<{ data: Booking[] }>(`/admin/compass/bookings/${companyId}`, { params }),

    cancelBooking: (companyId: string, bookingId: string) =>
        api.patch(`/admin/compass/bookings/${companyId}/${bookingId}/cancel`),

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
};
