/**
 * ConferenceStore Tests
 * 
 * Tests for conference room state management including:
 * - Initial state
 * - CRUD operations
 * - Meeting toggle functionality
 * - Data cleanup
 */

import { useConferenceStore } from '../infrastructure/conferenceStore';
import type { ConferenceRoom } from '@shared/domain/types';

describe('ConferenceStore', () => {
    // Helper to create a test conference room
    const createMockRoom = (overrides: Partial<ConferenceRoom> = {}): ConferenceRoom => ({
        id: 'C001',
        hasMeeting: false,
        meetingName: '',
        startTime: '',
        endTime: '',
        participants: [],
        data: {},
        ...overrides,
    });

    beforeEach(() => {
        // Reset store before each test
        useConferenceStore.getState().clearAllData();
    });

    describe('Initial State', () => {
        it('should have empty conference rooms array initially', () => {
            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toEqual([]);
        });
    });

    describe('Set Conference Rooms', () => {
        it('should set conference rooms array', () => {
            const rooms = [
                createMockRoom({ id: 'C001', data: { roomName: 'Room A' } }),
                createMockRoom({ id: 'C002', data: { roomName: 'Room B' } }),
            ];

            useConferenceStore.getState().setConferenceRooms(rooms);

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toHaveLength(2);
            expect(conferenceRooms[0].data.roomName).toBe('Room A');
            expect(conferenceRooms[1].data.roomName).toBe('Room B');
        });

        it('should replace existing rooms when setting new array', () => {
            // Set initial rooms
            useConferenceStore.getState().setConferenceRooms([
                createMockRoom({ id: 'C001' }),
            ]);

            // Replace with new rooms
            useConferenceStore.getState().setConferenceRooms([
                createMockRoom({ id: 'C002' }),
                createMockRoom({ id: 'C003' }),
            ]);

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toHaveLength(2);
            expect(conferenceRooms.find(r => r.id === 'C001')).toBeUndefined();
        });
    });

    describe('Add Conference Room', () => {
        it('should add a conference room', () => {
            const room = createMockRoom({ id: 'C001', data: { roomName: 'New Room' } });

            useConferenceStore.getState().addConferenceRoomLocal(room);

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toHaveLength(1);
            expect(conferenceRooms[0].id).toBe('C001');
            expect(conferenceRooms[0].data.roomName).toBe('New Room');
        });

        it('should add multiple rooms', () => {
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C001' }));
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C002' }));
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C003' }));

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toHaveLength(3);
        });

        it('should preserve existing rooms when adding new one', () => {
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C001', data: { roomName: 'First' } }));
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C002', data: { roomName: 'Second' } }));

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms[0].data.roomName).toBe('First');
            expect(conferenceRooms[1].data.roomName).toBe('Second');
        });
    });

    describe('Update Conference Room', () => {
        it('should update a conference room by ID', () => {
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C001', data: { roomName: 'Original' } }));

            useConferenceStore.getState().updateConferenceRoomLocal('C001', { data: { roomName: 'Updated' } });

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms[0].data.roomName).toBe('Updated');
        });

        it('should only update specified fields', () => {
            useConferenceStore.getState().addConferenceRoomLocal(
                createMockRoom({ id: 'C001', data: { roomName: 'Original' }, hasMeeting: false })
            );

            useConferenceStore.getState().updateConferenceRoomLocal('C001', { hasMeeting: true });

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms[0].data.roomName).toBe('Original'); // Unchanged
            expect(conferenceRooms[0].hasMeeting).toBe(true); // Updated
        });

        it('should not affect other rooms', () => {
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C001', data: { roomName: 'Room A' } }));
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C002', data: { roomName: 'Room B' } }));

            useConferenceStore.getState().updateConferenceRoomLocal('C001', { data: { roomName: 'Updated A' } });

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms[0].data.roomName).toBe('Updated A');
            expect(conferenceRooms[1].data.roomName).toBe('Room B'); // Unchanged
        });

        it('should handle updating non-existent room gracefully', () => {
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C001' }));

            // Should not throw
            useConferenceStore.getState().updateConferenceRoomLocal('NON-EXISTENT', { data: { roomName: 'Test' } });

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toHaveLength(1);
            expect(conferenceRooms[0].id).toBe('C001');
        });
    });

    describe('Delete Conference Room', () => {
        it('should delete a conference room by ID', () => {
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C001' }));
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C002' }));

            useConferenceStore.getState().deleteConferenceRoomLocal('C001');

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toHaveLength(1);
            expect(conferenceRooms[0].id).toBe('C002');
        });

        it('should handle deleting non-existent room gracefully', () => {
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C001' }));

            // Should not throw
            useConferenceStore.getState().deleteConferenceRoomLocal('NON-EXISTENT');

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toHaveLength(1);
        });

        it('should delete all rooms when called for each', () => {
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C001' }));
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C002' }));

            useConferenceStore.getState().deleteConferenceRoomLocal('C001');
            useConferenceStore.getState().deleteConferenceRoomLocal('C002');

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toHaveLength(0);
        });
    });

    describe('Toggle Meeting', () => {
        it('should toggle meeting status from false to true', () => {
            useConferenceStore.getState().addConferenceRoomLocal(
                createMockRoom({ id: 'C001', hasMeeting: false })
            );

            useConferenceStore.getState().toggleMeetingLocal('C001');

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms[0].hasMeeting).toBe(true);
        });

        it('should toggle meeting status from true to false', () => {
            useConferenceStore.getState().addConferenceRoomLocal(
                createMockRoom({ id: 'C001', hasMeeting: true })
            );

            useConferenceStore.getState().toggleMeetingLocal('C001');

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms[0].hasMeeting).toBe(false);
        });

        it('should clear meeting data when toggling off', () => {
            useConferenceStore.getState().addConferenceRoomLocal(
                createMockRoom({
                    id: 'C001',
                    hasMeeting: true,
                    meetingName: 'Team Standup',
                    startTime: '09:00',
                    endTime: '09:30',
                    participants: ['Alice', 'Bob'],
                })
            );

            useConferenceStore.getState().toggleMeetingLocal('C001');

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms[0].hasMeeting).toBe(false);
            expect(conferenceRooms[0].meetingName).toBe('');
            expect(conferenceRooms[0].startTime).toBe('');
            expect(conferenceRooms[0].endTime).toBe('');
            expect(conferenceRooms[0].participants).toEqual([]);
        });

        it('should not clear data when toggling on', () => {
            useConferenceStore.getState().addConferenceRoomLocal(
                createMockRoom({
                    id: 'C001',
                    hasMeeting: false,
                    meetingName: 'Preset Meeting',
                })
            );

            useConferenceStore.getState().toggleMeetingLocal('C001');

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms[0].hasMeeting).toBe(true);
            expect(conferenceRooms[0].meetingName).toBe('Preset Meeting');
        });

        it('should not affect other rooms', () => {
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C001', hasMeeting: false }));
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C002', hasMeeting: false }));

            useConferenceStore.getState().toggleMeetingLocal('C001');

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms[0].hasMeeting).toBe(true);
            expect(conferenceRooms[1].hasMeeting).toBe(false);
        });
    });

    describe('Clear All Data', () => {
        it('should clear all conference rooms', () => {
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C001' }));
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C002' }));
            useConferenceStore.getState().addConferenceRoomLocal(createMockRoom({ id: 'C003' }));

            useConferenceStore.getState().clearAllData();

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toHaveLength(0);
        });

        it('should work on empty store', () => {
            // Should not throw
            useConferenceStore.getState().clearAllData();

            const { conferenceRooms } = useConferenceStore.getState();
            expect(conferenceRooms).toHaveLength(0);
        });
    });
});
