import { io, Socket } from 'socket.io-client';
import { useCompassAuthStore } from '@features/auth/application/useCompassAuthStore';
import { useBookingStore } from '@features/booking/application/useBookingStore';
import { useSpacesStore } from '@features/booking/application/useSpacesStore';

let socket: Socket | null = null;

export function connectCompassSocket() {
    const token = useCompassAuthStore.getState().accessToken;
    if (!token || socket?.connected) return;

    socket = io('/compass', {
        path: '/compass-ws',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
        console.log('[Compass WS] Connected');
    });

    socket.on('disconnect', (reason) => {
        console.log('[Compass WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
        console.warn('[Compass WS] Connection error:', err.message);
    });

    // ─── Space Events ────────────────────────────────
    socket.on('space:booked', (data: { spaceId: string }) => {
        useSpacesStore.getState().updateSpaceFromSocket(data.spaceId, false);
    });

    socket.on('space:released', (data: { spaceId: string }) => {
        useSpacesStore.getState().updateSpaceFromSocket(data.spaceId, true);
    });

    socket.on('space:checkedIn', (data: { spaceId: string }) => {
        useSpacesStore.getState().updateSpaceFromSocket(data.spaceId, false);
    });

    // ─── Booking Events (for current user) ──────────
    socket.on('booking:updated', (data: { booking: any }) => {
        useBookingStore.getState().updateBookingFromSocket(data.booking);
    });

    socket.on('booking:autoReleased', (data: { bookingId: string }) => {
        const active = useBookingStore.getState().activeBooking;
        if (active?.id === data.bookingId) {
            useBookingStore.getState().fetchActiveBooking();
        }
    });

    // ─── Friend Events ──────────────────────────────
    socket.on('friend:checkedIn', () => {
        // Trigger a refresh of friend locations if on Find tab
        useSpacesStore.getState().fetchSpaces();
    });

    socket.on('friend:left', () => {
        useSpacesStore.getState().fetchSpaces();
    });
}

export function disconnectCompassSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function getCompassSocket(): Socket | null {
    return socket;
}
