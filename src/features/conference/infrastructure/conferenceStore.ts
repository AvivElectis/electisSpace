import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { ConferenceRoom } from '@shared/domain/types';
import { conferenceApi } from './conferenceApi';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

interface ConferenceStore {
    // State
    conferenceRooms: ConferenceRoom[];
    isLoading: boolean;
    error: string | null;

    // Local actions (for offline/CSV mode)
    setConferenceRooms: (rooms: ConferenceRoom[]) => void;
    addConferenceRoomLocal: (room: ConferenceRoom) => void;
    updateConferenceRoomLocal: (id: string, updates: Partial<ConferenceRoom>) => void;
    deleteConferenceRoomLocal: (id: string) => void;
    toggleMeetingLocal: (id: string) => void;

    // Server actions (for API mode)
    fetchRooms: () => Promise<void>;
    createRoom: (data: { storeId: string; externalId: string; roomName: string; labelCode?: string; hasMeeting?: boolean; meetingName?: string; startTime?: string; endTime?: string; participants?: string[] }) => Promise<ConferenceRoom | null>;
    updateRoom: (id: string, updates: { roomName?: string; labelCode?: string | null; hasMeeting?: boolean; meetingName?: string | null; startTime?: string | null; endTime?: string | null; participants?: string[] }) => Promise<ConferenceRoom | null>;
    deleteRoom: (id: string) => Promise<boolean>;
    toggleMeeting: (id: string, meetingData?: {
        meetingName?: string;
        startTime?: string;
        endTime?: string;
        participants?: string[];
    }) => Promise<ConferenceRoom | null>;

    // Error handling
    clearError: () => void;

    // Cleanup
    clearAllData: () => void;
}

export const useConferenceStore = create<ConferenceStore>()(
    devtools(
        persist(
            (set) => ({
                // Initial state
                conferenceRooms: [],
                isLoading: false,
                error: null,

                // Local actions (for offline/CSV mode)
                setConferenceRooms: (rooms) => set({ conferenceRooms: rooms }, false, 'setConferenceRooms'),

                addConferenceRoomLocal: (room) =>
                    set((state) => ({
                        conferenceRooms: [...state.conferenceRooms, room],
                    }), false, 'addConferenceRoomLocal'),

                updateConferenceRoomLocal: (id, updates) =>
                    set((state) => ({
                        conferenceRooms: state.conferenceRooms.map((r) =>
                            r.id === id ? { ...r, ...updates } : r
                        ),
                    }), false, 'updateConferenceRoomLocal'),

                deleteConferenceRoomLocal: (id) =>
                    set((state) => ({
                        conferenceRooms: state.conferenceRooms.filter((r) => r.id !== id && r.serverId !== id),
                    }), false, 'deleteConferenceRoomLocal'),

                toggleMeetingLocal: (id) =>
                    set((state) => ({
                        conferenceRooms: state.conferenceRooms.map((r) =>
                            (r.id === id || r.serverId === id)
                                ? {
                                    ...r,
                                    hasMeeting: !r.hasMeeting,
                                    // Clear meeting data when toggling off
                                    ...(r.hasMeeting
                                        ? {
                                            meetingName: '',
                                            startTime: '',
                                            endTime: '',
                                            participants: [],
                                        }
                                        : {}),
                                }
                                : r
                        ),
                    }), false, 'toggleMeetingLocal'),

                // Server actions (for API mode)
                fetchRooms: async () => {
                    set({ isLoading: true, error: null }, false, 'fetchRooms/start');
                    try {
                        const storeId = useAuthStore.getState().activeStoreId;
                        const { rooms } = await conferenceApi.getAll(storeId ? { storeId } : undefined);
                        set({ conferenceRooms: rooms, isLoading: false }, false, 'fetchRooms/success');
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to fetch rooms';
                        set({ error: message, isLoading: false }, false, 'fetchRooms/error');
                    }
                },

                createRoom: async (data) => {
                    set({ isLoading: true, error: null }, false, 'createRoom/start');
                    try {
                        const room = await conferenceApi.create(data);
                        set((state) => ({
                            conferenceRooms: [...state.conferenceRooms, room],
                            isLoading: false,
                        }), false, 'createRoom/success');
                        return room;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to create room';
                        set({ error: message, isLoading: false }, false, 'createRoom/error');
                        return null;
                    }
                },

                updateRoom: async (id, updates) => {
                    set({ isLoading: true, error: null }, false, 'updateRoom/start');
                    try {
                        const room = await conferenceApi.update(id, updates);
                        set((state) => ({
                            // Match by serverId OR id (for rooms returned from server)
                            conferenceRooms: state.conferenceRooms.map((r) =>
                                (r.serverId === id || r.id === room.id) ? room : r
                            ),
                            isLoading: false,
                        }), false, 'updateRoom/success');
                        return room;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to update room';
                        set({ error: message, isLoading: false }, false, 'updateRoom/error');
                        return null;
                    }
                },

                deleteRoom: async (id) => {
                    set({ isLoading: true, error: null }, false, 'deleteRoom/start');
                    try {
                        await conferenceApi.delete(id);
                        set((state) => ({
                            conferenceRooms: state.conferenceRooms.filter((r) => r.id !== id && r.serverId !== id),
                            isLoading: false,
                        }), false, 'deleteRoom/success');
                        return true;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to delete room';
                        set({ error: message, isLoading: false }, false, 'deleteRoom/error');
                        return false;
                    }
                },

                toggleMeeting: async (id, meetingData) => {
                    set({ isLoading: true, error: null }, false, 'toggleMeeting/start');
                    try {
                        const room = await conferenceApi.toggleMeeting(id, meetingData);
                        set((state) => ({
                            conferenceRooms: state.conferenceRooms.map((r) => (r.id === id || r.serverId === id) ? room : r),
                            isLoading: false,
                        }), false, 'toggleMeeting/success');
                        return room;
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'Failed to toggle meeting';
                        set({ error: message, isLoading: false }, false, 'toggleMeeting/error');
                        return null;
                    }
                },

                // Error handling
                clearError: () => set({ error: null }, false, 'clearError'),

                // Cleanup
                clearAllData: () => set({
                    conferenceRooms: [],
                    error: null
                }, false, 'clearAllData'),
            }),
            {
                name: 'conference-store',
                version: 2,
                partialize: () => ({
                    // Do NOT persist conferenceRooms — always fresh-fetch from server.
                    // Persisting causes stale rooms from a previous store to flash
                    // when switching stores (especially for multi-store users).
                }),
                migrate: (persistedState: unknown, version: number) => {
                    const state = persistedState as Record<string, unknown>;
                    if (version < 2) {
                        // Strip stale conference rooms from old localStorage data
                        delete state.conferenceRooms;
                    }
                    return state as any;
                },
            }
        ),
        { name: 'ConferenceStore' }
    )
);
