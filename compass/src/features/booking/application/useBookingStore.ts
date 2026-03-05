import { create } from 'zustand';
import type { Booking, CreateBookingRequest, ExtendBookingRequest } from '../domain/types';
import { bookingApi } from '../infrastructure/bookingApi';

interface BookingState {
    activeBooking: Booking | null;
    upcomingBookings: Booking[];
    pastBookings: Booking[];
    isLoading: boolean;
    error: string | null;
}

interface BookingActions {
    fetchActiveBooking: () => Promise<void>;
    fetchBookings: () => Promise<void>;
    createBooking: (data: CreateBookingRequest) => Promise<Booking | null>;
    checkIn: (id: string) => Promise<boolean>;
    release: (id: string) => Promise<boolean>;
    extend: (id: string, data: ExtendBookingRequest) => Promise<boolean>;
    cancel: (id: string) => Promise<boolean>;
    clearError: () => void;
    updateBookingFromSocket: (booking: Booking) => void;
}

export const useBookingStore = create<BookingState & BookingActions>((set, get) => ({
    activeBooking: null,
    upcomingBookings: [],
    pastBookings: [],
    isLoading: false,
    error: null,

    fetchActiveBooking: async () => {
        try {
            const { data } = await bookingApi.getActive();
            set({ activeBooking: data.booking });
        } catch {
            // No active booking
            set({ activeBooking: null });
        }
    },

    fetchBookings: async () => {
        set({ isLoading: true, error: null });
        try {
            const [upcomingRes, pastRes] = await Promise.all([
                bookingApi.list({ upcoming: true }),
                bookingApi.list({ status: 'past' }),
            ]);
            set({
                upcomingBookings: upcomingRes.data.bookings,
                pastBookings: pastRes.data.bookings,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error?.response?.data?.error?.message || 'Failed to load bookings',
                isLoading: false,
            });
        }
    },

    createBooking: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const { data: result } = await bookingApi.create(data);
            // Refresh bookings after creation
            get().fetchActiveBooking();
            get().fetchBookings();
            set({ isLoading: false });
            return result.booking;
        } catch (error: any) {
            set({
                error: error?.response?.data?.error?.message || 'Failed to create booking',
                isLoading: false,
            });
            return null;
        }
    },

    checkIn: async (id) => {
        set({ error: null });
        try {
            const { data } = await bookingApi.checkIn(id);
            set({ activeBooking: data.booking });
            return true;
        } catch (error: any) {
            set({ error: error?.response?.data?.error?.message || 'Failed to check in' });
            return false;
        }
    },

    release: async (id) => {
        set({ error: null });
        try {
            await bookingApi.release(id);
            set({ activeBooking: null });
            get().fetchBookings();
            return true;
        } catch (error: any) {
            set({ error: error?.response?.data?.error?.message || 'Failed to release' });
            return false;
        }
    },

    extend: async (id, data) => {
        set({ error: null });
        try {
            const { data: result } = await bookingApi.extend(id, data);
            set({ activeBooking: result.booking });
            return true;
        } catch (error: any) {
            set({ error: error?.response?.data?.error?.message || 'Failed to extend booking' });
            return false;
        }
    },

    cancel: async (id) => {
        set({ error: null });
        try {
            await bookingApi.cancel(id);
            get().fetchActiveBooking();
            get().fetchBookings();
            return true;
        } catch (error: any) {
            set({ error: error?.response?.data?.error?.message || 'Failed to cancel booking' });
            return false;
        }
    },

    clearError: () => set({ error: null }),

    updateBookingFromSocket: (booking) => {
        const state = get();
        if (state.activeBooking?.id === booking.id) {
            if (['RELEASED', 'AUTO_RELEASED', 'NO_SHOW', 'CANCELLED'].includes(booking.status)) {
                set({ activeBooking: null });
            } else {
                set({ activeBooking: booking });
            }
        }
        // Refresh lists
        get().fetchBookings();
    },
}));
