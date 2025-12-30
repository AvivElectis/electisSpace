import { describe, it, expect } from 'vitest';
import { mockSpace, mockSpaces, mockConferenceRoom } from './utils/mockData';

describe('Mock Data', () => {
    describe('Spaces', () => {
        it('should have valid mock space structure', () => {
            expect(mockSpace).toBeDefined();
            expect(mockSpace.id).toBe('101');
            expect(mockSpace.data.ITEM_NAME).toBe('Test Room');
            expect(mockSpace.data).toBeDefined();
            expect(mockSpace.data.ITEM_NAME).toBe('Test Room');
        });

        it('should have multiple mock spaces', () => {
            expect(mockSpaces).toHaveLength(3);
            expect(mockSpaces[0].id).toBe('101');
            expect(mockSpaces[1].id).toBe('102');
            expect(mockSpaces[2].id).toBe('103');
        });

        it('should have consistent data structure across all spaces', () => {
            mockSpaces.forEach(space => {
                expect(space).toHaveProperty('id');
                expect(space).toHaveProperty('data');
                expect(space.data).toHaveProperty('ITEM_NAME');
                expect(space.data).toHaveProperty('ENGLISH_NAME');
            });
        });
    });

    describe('Conference Rooms', () => {
        it('should have valid mock conference room structure', () => {
            expect(mockConferenceRoom).toBeDefined();
            expect(mockConferenceRoom.id).toBe('C001');
            expect(mockConferenceRoom.data.roomName).toBe('Conference Room 001');
            expect(mockConferenceRoom.hasMeeting).toBe(true);
            expect(mockConferenceRoom.meetingName).toBe('Team Meeting');
            expect(mockConferenceRoom.startTime).toBe('09:00');
            expect(mockConferenceRoom.endTime).toBe('10:00');
            expect(mockConferenceRoom.participants).toEqual(['John', 'Jane', 'Bob']);
        });

        it('should have conference room ID starting with C', () => {
            expect(mockConferenceRoom.id).toMatch(/^C/);
        });
    });
});
