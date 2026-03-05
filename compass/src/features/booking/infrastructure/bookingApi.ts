import compassApi from '@shared/api/compassApi';
import type { Booking, CreateBookingRequest, ExtendBookingRequest } from '../domain/types';

export const bookingApi = {
    list: (params?: { status?: string; upcoming?: boolean }) =>
        compassApi.get<{ bookings: Booking[] }>('/bookings', { params }),

    getById: (id: string) =>
        compassApi.get<{ booking: Booking }>(`/bookings/${id}`),

    create: (data: CreateBookingRequest) =>
        compassApi.post<{ booking: Booking }>('/bookings', data),

    checkIn: (id: string) =>
        compassApi.patch<{ booking: Booking }>(`/bookings/${id}/check-in`),

    release: (id: string) =>
        compassApi.patch<{ booking: Booking }>(`/bookings/${id}/release`),

    extend: (id: string, data: ExtendBookingRequest) =>
        compassApi.patch<{ booking: Booking }>(`/bookings/${id}/extend`, data),

    cancel: (id: string) =>
        compassApi.delete<{ success: boolean }>(`/bookings/${id}`),

    getActive: () =>
        compassApi.get<{ booking: Booking | null }>('/bookings/active'),
};
