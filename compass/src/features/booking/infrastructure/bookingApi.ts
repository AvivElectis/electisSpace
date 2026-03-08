import compassApi from '@shared/api/compassApi';
import type { Booking, CancelScope, CreateBookingRequest, ExtendBookingRequest } from '../domain/types';

export const bookingApi = {
    list: (params?: { status?: string }) =>
        compassApi.get<{ data: Booking[] }>('/bookings', { params }),

    getById: (id: string) =>
        compassApi.get<{ data: Booking }>(`/bookings/${id}`),

    create: (data: CreateBookingRequest) =>
        compassApi.post<{ data: Booking }>('/bookings', data),

    checkIn: (id: string) =>
        compassApi.patch<{ data: Booking }>(`/bookings/${id}/check-in`),

    release: (id: string) =>
        compassApi.patch<{ data: Booking }>(`/bookings/${id}/release`),

    extend: (id: string, data: ExtendBookingRequest) =>
        compassApi.patch<{ data: Booking }>(`/bookings/${id}/extend`, data),

    cancel: (id: string, scope?: CancelScope) =>
        compassApi.delete<{ data: Booking }>(`/bookings/${id}`, {
            params: scope ? { scope } : undefined,
        }),

    getActive: () =>
        compassApi.get<{ data: Booking | null }>('/bookings/active'),
};
