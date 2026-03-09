import { io, Socket } from 'socket.io-client';
import { useCompassAuthStore } from '@features/auth/application/useCompassAuthStore';
import { useBookingStore } from '@features/booking/application/useBookingStore';
import { useSpacesStore } from '@features/booking/application/useSpacesStore';
import { useFriendsStore } from '@features/friends/application/useFriendsStore';

let socket: Socket | null = null;

export function connectCompassSocket() {
    const token = useCompassAuthStore.getState().accessToken;
    if (!token) return;
    if (socket?.connected) return;

    // Clean up stale socket before creating new one
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }

    socket = io('/compass', {
        path: '/compass-ws',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
        // Connected to Compass WebSocket
    });

    socket.on('disconnect', (_reason) => {
        // Disconnected from Compass WebSocket
    });

    socket.on('connect_error', (_err) => {
        // Connection error — Socket.IO will auto-retry
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
    socket.on('friend:request', () => {
        useFriendsStore.getState().fetchPendingRequests();
    });

    socket.on('friend:checkedIn', () => {
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
