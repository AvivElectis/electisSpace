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

    // Safe handler wrapper to prevent unhandled errors from crashing the socket
    const safeHandler = <T>(handler: (data: T) => void) => (data: T) => {
        try { handler(data); } catch { /* socket event handler error — non-fatal */ }
    };

    // ─── Space Events ────────────────────────────────
    socket.on('space:booked', safeHandler((data: { spaceId: string }) => {
        useSpacesStore.getState().updateSpaceFromSocket(data.spaceId, false);
    }));

    socket.on('space:released', safeHandler((data: { spaceId: string }) => {
        useSpacesStore.getState().updateSpaceFromSocket(data.spaceId, true);
    }));

    socket.on('space:checkedIn', safeHandler((data: { spaceId: string }) => {
        useSpacesStore.getState().updateSpaceFromSocket(data.spaceId, false);
    }));

    // ─── Booking Events (for current user) ──────────
    socket.on('booking:updated', safeHandler((data: { booking: any }) => {
        useBookingStore.getState().updateBookingFromSocket(data.booking);
    }));

    socket.on('booking:autoReleased', safeHandler((data: { bookingId: string }) => {
        const active = useBookingStore.getState().activeBooking;
        if (active?.id === data.bookingId) {
            useBookingStore.getState().fetchActiveBooking();
        }
    }));

    // ─── Friend Events ──────────────────────────────
    socket.on('friend:request', safeHandler(() => {
        useFriendsStore.getState().fetchPendingRequests();
    }));

    socket.on('friend:checkedIn', safeHandler(() => {
        useSpacesStore.getState().fetchSpaces();
    }));

    socket.on('friend:left', safeHandler(() => {
        useSpacesStore.getState().fetchSpaces();
    }));
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
