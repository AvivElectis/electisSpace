import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBookingStore } from '../application/useBookingStore';

const mockBooking = {
    id: 'b1',
    spaceId: 's1',
    companyUserId: 'u1',
    startTime: '2026-03-10T09:00:00Z',
    endTime: '2026-03-10T10:00:00Z',
    status: 'BOOKED' as const,
    notes: null,
    checkedInAt: null,
    recurrenceRule: null,
    recurrenceGroupId: null,
    isRecurrence: false,
    space: { id: 's1', name: 'Desk A', type: 'HOT_DESK', compassMode: 'AVAILABLE', compassCapacity: 1 },
    companyUser: { id: 'u1', displayName: 'Test', email: 'test@test.com' },
};

vi.mock('../infrastructure/bookingApi', () => ({
    bookingApi: {
        list: vi.fn(),
        getActive: vi.fn(),
        create: vi.fn(),
        checkIn: vi.fn(),
        release: vi.fn(),
        extend: vi.fn(),
        cancel: vi.fn(),
    },
}));

import { bookingApi } from '../infrastructure/bookingApi';

describe('useBookingStore', () => {
    beforeEach(() => {
        useBookingStore.setState({
            activeBooking: null,
            upcomingBookings: [],
            pastBookings: [],
            isLoading: false,
            error: null,
        });
        vi.clearAllMocks();
    });

    it('has correct initial state', () => {
        const state = useBookingStore.getState();
        expect(state.activeBooking).toBeNull();
        expect(state.upcomingBookings).toEqual([]);
        expect(state.pastBookings).toEqual([]);
        expect(state.isLoading).toBe(false);
    });

    it('fetchActiveBooking sets active booking', async () => {
        vi.mocked(bookingApi.getActive).mockResolvedValue({
            data: { data: mockBooking },
        } as any);

        await useBookingStore.getState().fetchActiveBooking();

        expect(useBookingStore.getState().activeBooking).toEqual(mockBooking);
    });

    it('fetchActiveBooking clears on failure', async () => {
        useBookingStore.setState({ activeBooking: mockBooking as any });
        vi.mocked(bookingApi.getActive).mockRejectedValue(new Error('No active'));

        await useBookingStore.getState().fetchActiveBooking();

        expect(useBookingStore.getState().activeBooking).toBeNull();
    });

    it('fetchBookings loads upcoming and past', async () => {
        const pastBooking = { ...mockBooking, id: 'b2', status: 'RELEASED' };
        vi.mocked(bookingApi.list)
            .mockResolvedValueOnce({ data: { data: [mockBooking] } } as any)
            .mockResolvedValueOnce({ data: { data: [pastBooking] } } as any);

        await useBookingStore.getState().fetchBookings();

        const state = useBookingStore.getState();
        expect(state.upcomingBookings).toHaveLength(1);
        expect(state.pastBookings).toHaveLength(1);
        expect(state.isLoading).toBe(false);
    });

    it('fetchBookings sets error on failure', async () => {
        vi.mocked(bookingApi.list).mockRejectedValue({
            response: { data: { error: { message: 'Server error' } } },
        });

        await useBookingStore.getState().fetchBookings();

        expect(useBookingStore.getState().error).toBe('Server error');
        expect(useBookingStore.getState().isLoading).toBe(false);
    });

    it('createBooking returns booking on success', async () => {
        vi.mocked(bookingApi.create).mockResolvedValue({
            data: { data: mockBooking },
        } as any);
        vi.mocked(bookingApi.getActive).mockResolvedValue({ data: { data: mockBooking } } as any);
        vi.mocked(bookingApi.list).mockResolvedValue({ data: { data: [] } } as any);

        const result = await useBookingStore.getState().createBooking({
            spaceId: 's1',
            startTime: '2026-03-10T09:00:00Z',
            endTime: '2026-03-10T10:00:00Z',
        });

        expect(result).toEqual(mockBooking);
        expect(useBookingStore.getState().isLoading).toBe(false);
    });

    it('createBooking returns null on failure', async () => {
        vi.mocked(bookingApi.create).mockRejectedValue({
            response: { data: { error: { message: 'Conflict' } } },
        });

        const result = await useBookingStore.getState().createBooking({
            spaceId: 's1',
            startTime: '2026-03-10T09:00:00Z',
            endTime: '2026-03-10T10:00:00Z',
        });

        expect(result).toBeNull();
        expect(useBookingStore.getState().error).toBe('Conflict');
    });

    it('checkIn updates active booking', async () => {
        const checkedIn = { ...mockBooking, status: 'CHECKED_IN', checkedInAt: '2026-03-10T09:05:00Z' };
        vi.mocked(bookingApi.checkIn).mockResolvedValue({
            data: { data: checkedIn },
        } as any);

        const result = await useBookingStore.getState().checkIn('b1');

        expect(result).toBe(true);
        expect(useBookingStore.getState().activeBooking).toEqual(checkedIn);
    });

    it('release clears active booking', async () => {
        useBookingStore.setState({ activeBooking: mockBooking as any });
        vi.mocked(bookingApi.release).mockResolvedValue({} as any);
        vi.mocked(bookingApi.list).mockResolvedValue({ data: { data: [] } } as any);

        const result = await useBookingStore.getState().release('b1');

        expect(result).toBe(true);
        expect(useBookingStore.getState().activeBooking).toBeNull();
    });

    it('cancel refreshes bookings', async () => {
        vi.mocked(bookingApi.cancel).mockResolvedValue({} as any);
        vi.mocked(bookingApi.getActive).mockResolvedValue({ data: { data: null } } as any);
        vi.mocked(bookingApi.list).mockResolvedValue({ data: { data: [] } } as any);

        const result = await useBookingStore.getState().cancel('b1');

        expect(result).toBe(true);
        expect(bookingApi.cancel).toHaveBeenCalledWith('b1', undefined);
    });

    it('cancel with scope passes scope param', async () => {
        vi.mocked(bookingApi.cancel).mockResolvedValue({} as any);
        vi.mocked(bookingApi.getActive).mockResolvedValue({ data: { data: null } } as any);
        vi.mocked(bookingApi.list).mockResolvedValue({ data: { data: [] } } as any);

        await useBookingStore.getState().cancel('b1', 'all');

        expect(bookingApi.cancel).toHaveBeenCalledWith('b1', 'all');
    });

    it('updateBookingFromSocket clears active when released', () => {
        useBookingStore.setState({ activeBooking: mockBooking as any });
        vi.mocked(bookingApi.list).mockResolvedValue({ data: { data: [] } } as any);

        useBookingStore.getState().updateBookingFromSocket({
            ...mockBooking,
            status: 'RELEASED',
        } as any);

        expect(useBookingStore.getState().activeBooking).toBeNull();
    });

    it('updateBookingFromSocket updates active when still active', () => {
        useBookingStore.setState({ activeBooking: mockBooking as any });
        vi.mocked(bookingApi.list).mockResolvedValue({ data: { data: [] } } as any);

        const updated = { ...mockBooking, notes: 'updated' };
        useBookingStore.getState().updateBookingFromSocket(updated as any);

        expect(useBookingStore.getState().activeBooking).toEqual(updated);
    });

    it('clearError clears the error', () => {
        useBookingStore.setState({ error: 'some error' });
        useBookingStore.getState().clearError();
        expect(useBookingStore.getState().error).toBeNull();
    });
});
