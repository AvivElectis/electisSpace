import type { ConferenceRoom } from '@shared/domain/types';
import type { ConferenceStats } from './types';

/**
 * Conference Domain Business Rules
 */

/**
 * Generate unique conference room ID
 * @param existingIds - List of existing IDs
 * @returns Unique ID in format C01, C02, etc.
 */
export function generateConferenceRoomId(existingIds: string[]): string {
    // Extract numeric parts from existing IDs
    const numbers = existingIds
        .filter(id => id.startsWith('C'))
        .map(id => parseInt(id.substring(1), 10))
        .filter(n => !isNaN(n));

    // Find next available number
    let nextNumber = 1;
    while (numbers.includes(nextNumber)) {
        nextNumber++;
    }

    // Format as C01, C02, etc.
    return `C${String(nextNumber).padStart(2, '0')}`;
}

/**
 * Create empty conference room with defaults
 * @param id - Room ID
 * @param roomName - Room name
 * @returns Conference room with default values
 */
export function createEmptyConferenceRoom(id: string, roomName: string): ConferenceRoom {
    return {
        id,
        roomName,
        hasMeeting: false,
        meetingName: '',
        startTime: '',
        endTime: '',
        participants: [],
    };
}

/**
 * Toggle meeting status for conference room
 * @param room - Conference room
 * @returns Updated room with toggled meeting status
 */
export function toggleMeetingStatus(room: ConferenceRoom): ConferenceRoom {
    if (room.hasMeeting) {
        // Clear meeting when toggling off
        return {
            ...room,
            hasMeeting: false,
            meetingName: '',
            startTime: '',
            endTime: '',
            participants: [],
        };
    } else {
        // Just toggle on, user will fill in details
        return {
            ...room,
            hasMeeting: true,
        };
    }
}

/**
 * Filter conference rooms by search query and filters
 * @param rooms - Conference rooms list
 * @param searchQuery - Search text
 * @param hasMeeting - Filter by meeting status
 * @returns Filtered rooms
 */
export function filterConferenceRooms(
    rooms: ConferenceRoom[],
    searchQuery?: string,
    hasMeeting?: boolean
): ConferenceRoom[] {
    let filtered = [...rooms];

    // Apply search query
    if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(room => {
            if (room.id.toLowerCase().includes(query)) return true;
            if (room.roomName.toLowerCase().includes(query)) return true;
            if (room.meetingName.toLowerCase().includes(query)) return true;
            if (room.participants.some(p => p.toLowerCase().includes(query))) return true;
            return false;
        });
    }

    // Apply meeting status filter
    if (hasMeeting !== undefined) {
        filtered = filtered.filter(room => room.hasMeeting === hasMeeting);
    }

    return filtered;
}

/**
 * Get conference room statistics
 * @param rooms - Conference rooms list
 * @returns Statistics
 */
export function getConferenceStats(rooms: ConferenceRoom[]): ConferenceStats {
    return {
        total: rooms.length,
        occupied: rooms.filter(r => r.hasMeeting).length,
        available: rooms.filter(r => !r.hasMeeting).length,
    };
}

/**
 * Sort conference rooms by ID
 * @param rooms - Conference rooms list
 * @returns Sorted rooms
 */
export function sortConferenceRooms(rooms: ConferenceRoom[]): ConferenceRoom[] {
    return [...rooms].sort((a, b) => a.id.localeCompare(b.id));
}
