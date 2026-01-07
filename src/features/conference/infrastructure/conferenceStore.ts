import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConferenceRoom } from '@shared/domain/types';

interface ConferenceStore {
    // State
    conferenceRooms: ConferenceRoom[];

    // Actions
    setConferenceRooms: (rooms: ConferenceRoom[]) => void;
    addConferenceRoom: (room: ConferenceRoom) => void;
    updateConferenceRoom: (id: string, updates: Partial<ConferenceRoom>) => void;
    deleteConferenceRoom: (id: string) => void;
    toggleMeeting: (id: string) => void;

    // Cleanup
    clearAllData: () => void;
}

export const useConferenceStore = create<ConferenceStore>()(
    persist(
        (set) => ({
            // Initial state
            conferenceRooms: [],

            // Actions
            setConferenceRooms: (rooms) => set({ conferenceRooms: rooms }),

            addConferenceRoom: (room) =>
                set((state) => ({
                    conferenceRooms: [...state.conferenceRooms, room],
                })),

            updateConferenceRoom: (id, updates) =>
                set((state) => ({
                    conferenceRooms: state.conferenceRooms.map((r) =>
                        r.id === id ? { ...r, ...updates } : r
                    ),
                })),

            deleteConferenceRoom: (id) =>
                set((state) => ({
                    conferenceRooms: state.conferenceRooms.filter((r) => r.id !== id),
                })),

            toggleMeeting: (id) =>
                set((state) => ({
                    conferenceRooms: state.conferenceRooms.map((r) =>
                        r.id === id
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
                })),

            // Cleanup
            clearAllData: () => set({ conferenceRooms: [] }),
        }),
        {
            name: 'conference-store',
            partialize: (state) => ({
                conferenceRooms: state.conferenceRooms,
            }),
        }
    )
);
