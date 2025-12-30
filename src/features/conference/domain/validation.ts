import type { ConferenceRoom, ValidationResult, ValidationError } from '@shared/domain/types';

/**
 * Conference Domain Validation
 */

/**
 * Validate a conference room entity
 * @param room - Conference room to validate
 * @returns Validation result
 */
export function validateConferenceRoom(room: Partial<ConferenceRoom>): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate ID
    if (!room.id || room.id.trim() === '') {
        errors.push({
            field: 'id',
            message: 'Conference room ID is required',
        });
    }

    // ID should start with 'C' for conference rooms
    if (room.id && !room.id.startsWith('C')) {
        errors.push({
            field: 'id',
            message: 'Conference room ID must start with "C"',
        });
    }

    // Validate room name
    if (!room.data?.roomName || room.data.roomName.trim() === '') {
        errors.push({
            field: 'roomName',
            message: 'Room name is required',
        });
    }

    // If has meeting, validate meeting details
    if (room.hasMeeting) {
        if (!room.meetingName || room.meetingName.trim() === '') {
            errors.push({
                field: 'meetingName',
                message: 'Meeting name is required when room is occupied',
            });
        }

        if (!room.startTime || room.startTime.trim() === '') {
            errors.push({
                field: 'startTime',
                message: 'Start time is required when room is occupied',
            });
        }

        if (!room.endTime || room.endTime.trim() === '') {
            errors.push({
                field: 'endTime',
                message: 'End time is required when room is occupied',
            });
        }

        // Validate time format (HH:mm)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (room.startTime && !timeRegex.test(room.startTime)) {
            errors.push({
                field: 'startTime',
                message: 'Start time must be in HH:mm format',
            });
        }

        if (room.endTime && !timeRegex.test(room.endTime)) {
            errors.push({
                field: 'endTime',
                message: 'End time must be in HH:mm format',
            });
        }

        // Validate end time is after start time
        if (room.startTime && room.endTime && timeRegex.test(room.startTime) && timeRegex.test(room.endTime)) {
            const [startHour, startMin] = room.startTime.split(':').map(Number);
            const [endHour, endMin] = room.endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;

            if (endMinutes <= startMinutes) {
                errors.push({
                    field: 'endTime',
                    message: 'End time must be after start time',
                });
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Check if conference room ID is unique
 * @param id - Room ID to check
 * @param rooms - Existing rooms list
 * @param excludeId - Optional ID to exclude from check (for updates)
 * @returns true if ID is unique
 */
export function isConferenceRoomIdUnique(
    id: string,
    rooms: ConferenceRoom[],
    excludeId?: string
): boolean {
    return !rooms.some(r => r.id === id && r.id !== excludeId);
}
