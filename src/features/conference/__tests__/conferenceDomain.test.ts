/**
 * Conference Domain Tests
 * Phase 10.18 - Deep Testing System
 * 
 * Tests business rules and validation for conference room management
 */

import { describe, it, expect } from 'vitest';
import {
    generateConferenceRoomId,
    createEmptyConferenceRoom,
    toggleMeetingStatus,
    filterConferenceRooms,
    getConferenceStats,
    sortConferenceRooms,
} from '../domain/businessRules';
import {
    validateConferenceRoom,
    isConferenceRoomIdUnique,
} from '../domain/validation';
import type { ConferenceRoom } from '@shared/domain/types';

describe('Conference Domain Business Rules', () => {
    describe('generateConferenceRoomId', () => {
        it('should generate 01 when no existing IDs', () => {
            const result = generateConferenceRoomId([]);
            expect(result).toBe('01');
        });

        it('should find next available number', () => {
            const result = generateConferenceRoomId(['01', '02', '03']);
            expect(result).toBe('04');
        });

        it('should fill gaps in sequence', () => {
            const result = generateConferenceRoomId(['01', '03', '04']);
            expect(result).toBe('02');
        });

        it('should handle IDs with C prefix', () => {
            const result = generateConferenceRoomId(['C01', 'C02']);
            expect(result).toBe('03');
        });

        it('should handle mixed formats', () => {
            const result = generateConferenceRoomId(['01', 'C02', '03']);
            expect(result).toBe('04');
        });

        it('should handle single digit IDs', () => {
            const result = generateConferenceRoomId(['1', '2']);
            expect(result).toBe('03');
        });
    });

    describe('createEmptyConferenceRoom', () => {
        it('should create room with correct ID and name', () => {
            const room = createEmptyConferenceRoom('05', 'Meeting Room A');

            expect(room.id).toBe('05');
            expect(room.data.roomName).toBe('Meeting Room A');
        });

        it('should initialize with no meeting', () => {
            const room = createEmptyConferenceRoom('01', 'Test Room');

            expect(room.hasMeeting).toBe(false);
            expect(room.meetingName).toBe('');
            expect(room.startTime).toBe('');
            expect(room.endTime).toBe('');
        });

        it('should initialize with empty participants', () => {
            const room = createEmptyConferenceRoom('01', 'Test Room');

            expect(room.participants).toEqual([]);
        });
    });

    describe('toggleMeetingStatus', () => {
        it('should toggle from false to true', () => {
            const room: ConferenceRoom = {
                id: '01',
                hasMeeting: false,
                meetingName: '',
                startTime: '',
                endTime: '',
                participants: [],
                data: { roomName: 'Test' },
            };

            const result = toggleMeetingStatus(room);

            expect(result.hasMeeting).toBe(true);
        });

        it('should clear meeting details when toggling off', () => {
            const room: ConferenceRoom = {
                id: '01',
                hasMeeting: true,
                meetingName: 'Team Meeting',
                startTime: '09:00',
                endTime: '10:00',
                participants: ['Alice', 'Bob'],
                data: { roomName: 'Test' },
            };

            const result = toggleMeetingStatus(room);

            expect(result.hasMeeting).toBe(false);
            expect(result.meetingName).toBe('');
            expect(result.startTime).toBe('');
            expect(result.endTime).toBe('');
            expect(result.participants).toEqual([]);
        });

        it('should preserve room data when toggling', () => {
            const room: ConferenceRoom = {
                id: '01',
                hasMeeting: true,
                meetingName: 'Meeting',
                startTime: '09:00',
                endTime: '10:00',
                participants: [],
                data: { roomName: 'Conference A', extra: 'data' },
            };

            const result = toggleMeetingStatus(room);

            expect(result.data.roomName).toBe('Conference A');
            expect(result.data.extra).toBe('data');
        });
    });

    describe('filterConferenceRooms', () => {
        const rooms: ConferenceRoom[] = [
            { id: '01', hasMeeting: true, meetingName: 'Sales Meeting', startTime: '09:00', endTime: '10:00', participants: ['Alice'], data: { roomName: 'Conference A' } },
            { id: '02', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: { roomName: 'Conference B' } },
            { id: '03', hasMeeting: true, meetingName: 'Engineering Sync', startTime: '14:00', endTime: '15:00', participants: ['Bob', 'Charlie'], data: { roomName: 'Board Room' } },
        ];

        it('should return all rooms without filters', () => {
            const result = filterConferenceRooms(rooms);
            expect(result.length).toBe(3);
        });

        it('should filter by room ID', () => {
            const result = filterConferenceRooms(rooms, '01');
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('01');
        });

        it('should filter by room name', () => {
            const result = filterConferenceRooms(rooms, 'Board');
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('03');
        });

        it('should filter by meeting name', () => {
            const result = filterConferenceRooms(rooms, 'Sales');
            expect(result.length).toBe(1);
            expect(result[0].meetingName).toBe('Sales Meeting');
        });

        it('should filter by participant name', () => {
            const result = filterConferenceRooms(rooms, 'Charlie');
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('03');
        });

        it('should filter by meeting status true', () => {
            const result = filterConferenceRooms(rooms, undefined, true);
            expect(result.length).toBe(2);
            expect(result.every(r => r.hasMeeting)).toBe(true);
        });

        it('should filter by meeting status false', () => {
            const result = filterConferenceRooms(rooms, undefined, false);
            expect(result.length).toBe(1);
            expect(result[0].hasMeeting).toBe(false);
        });

        it('should combine search and filter', () => {
            const result = filterConferenceRooms(rooms, 'Conference', true);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('01');
        });

        it('should be case insensitive', () => {
            const result = filterConferenceRooms(rooms, 'ENGINEERING');
            expect(result.length).toBe(1);
        });
    });

    describe('getConferenceStats', () => {
        it('should return correct stats', () => {
            const rooms: ConferenceRoom[] = [
                { id: '01', hasMeeting: true, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
                { id: '02', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
                { id: '03', hasMeeting: true, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
            ];

            const stats = getConferenceStats(rooms);

            expect(stats.total).toBe(3);
            expect(stats.occupied).toBe(2);
            expect(stats.available).toBe(1);
        });

        it('should handle empty list', () => {
            const stats = getConferenceStats([]);

            expect(stats.total).toBe(0);
            expect(stats.occupied).toBe(0);
            expect(stats.available).toBe(0);
        });
    });

    describe('sortConferenceRooms', () => {
        it('should sort rooms by ID', () => {
            const rooms: ConferenceRoom[] = [
                { id: '03', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
                { id: '01', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
                { id: '02', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
            ];

            const sorted = sortConferenceRooms(rooms);

            expect(sorted[0].id).toBe('01');
            expect(sorted[1].id).toBe('02');
            expect(sorted[2].id).toBe('03');
        });

        it('should not mutate original array', () => {
            const rooms: ConferenceRoom[] = [
                { id: '02', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
                { id: '01', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
            ];

            sortConferenceRooms(rooms);

            expect(rooms[0].id).toBe('02');
        });
    });
});

describe('Conference Domain Validation', () => {
    describe('validateConferenceRoom', () => {
        it('should reject missing ID', () => {
            const result = validateConferenceRoom({ data: { roomName: 'Test' } });
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'id' })
            );
        });

        it('should reject non-numeric ID', () => {
            const result = validateConferenceRoom({ id: 'ABC', data: { roomName: 'Test' } });
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('numeric') })
            );
        });

        it('should reject missing room name', () => {
            const result = validateConferenceRoom({ id: '01', data: {} });
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'roomName' })
            );
        });

        it('should accept valid room without meeting', () => {
            const result = validateConferenceRoom({
                id: '01',
                hasMeeting: false,
                data: { roomName: 'Conference A' },
            });
            expect(result.valid).toBe(true);
        });

        it('should require meeting name when has meeting', () => {
            const result = validateConferenceRoom({
                id: '01',
                hasMeeting: true,
                meetingName: '',
                startTime: '09:00',
                endTime: '10:00',
                data: { roomName: 'Test' },
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'meetingName' })
            );
        });

        it('should require start time when has meeting', () => {
            const result = validateConferenceRoom({
                id: '01',
                hasMeeting: true,
                meetingName: 'Test',
                startTime: '',
                endTime: '10:00',
                data: { roomName: 'Test' },
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'startTime' })
            );
        });

        it('should require end time when has meeting', () => {
            const result = validateConferenceRoom({
                id: '01',
                hasMeeting: true,
                meetingName: 'Test',
                startTime: '09:00',
                endTime: '',
                data: { roomName: 'Test' },
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ field: 'endTime' })
            );
        });

        it('should validate time format', () => {
            const result = validateConferenceRoom({
                id: '01',
                hasMeeting: true,
                meetingName: 'Test',
                startTime: '9:00',
                endTime: '10:00',
                data: { roomName: 'Test' },
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('HH:mm') })
            );
        });

        it('should reject end time before start time', () => {
            const result = validateConferenceRoom({
                id: '01',
                hasMeeting: true,
                meetingName: 'Test',
                startTime: '14:00',
                endTime: '13:00',
                data: { roomName: 'Test' },
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('after start time') })
            );
        });

        it('should accept valid room with meeting', () => {
            const result = validateConferenceRoom({
                id: '01',
                hasMeeting: true,
                meetingName: 'Team Sync',
                startTime: '09:00',
                endTime: '10:00',
                data: { roomName: 'Conference A' },
            });
            expect(result.valid).toBe(true);
        });
    });

    describe('isConferenceRoomIdUnique', () => {
        const rooms: ConferenceRoom[] = [
            { id: '01', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
            { id: '02', hasMeeting: false, meetingName: '', startTime: '', endTime: '', participants: [], data: {} },
        ];

        it('should return true for unique ID', () => {
            const result = isConferenceRoomIdUnique('03', rooms);
            expect(result).toBe(true);
        });

        it('should return false for existing ID', () => {
            const result = isConferenceRoomIdUnique('01', rooms);
            expect(result).toBe(false);
        });

        it('should exclude specified ID from check', () => {
            const result = isConferenceRoomIdUnique('01', rooms, '01');
            expect(result).toBe(true);
        });

        it('should handle empty rooms list', () => {
            const result = isConferenceRoomIdUnique('01', []);
            expect(result).toBe(true);
        });
    });
});
