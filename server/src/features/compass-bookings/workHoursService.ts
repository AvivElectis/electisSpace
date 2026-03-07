export interface ResolvedWorkHours {
    workingHoursStart: string; // "08:00"
    workingHoursEnd: string; // "17:00"
    workingDays: Record<string, boolean>; // { "0": false, "1": true, ... }
    timezone: string;
}

const PLATFORM_DEFAULTS: ResolvedWorkHours = {
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    workingDays: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
    timezone: 'UTC',
};

/**
 * Resolution chain: Store -> Company -> Platform defaults.
 * Each level's non-null values override the previous level.
 */
export function resolveWorkHours(
    company: {
        workingHoursStart?: string | null;
        workingHoursEnd?: string | null;
        workingDays?: Record<string, boolean> | null;
        defaultTimezone?: string | null;
    },
    store: {
        workingHoursStart?: string | null;
        workingHoursEnd?: string | null;
        workingDays?: Record<string, boolean> | null;
        timezone?: string | null;
    },
): ResolvedWorkHours {
    return {
        workingHoursStart:
            store.workingHoursStart ?? company.workingHoursStart ?? PLATFORM_DEFAULTS.workingHoursStart,
        workingHoursEnd: store.workingHoursEnd ?? company.workingHoursEnd ?? PLATFORM_DEFAULTS.workingHoursEnd,
        workingDays: (store.workingDays ??
            company.workingDays ??
            PLATFORM_DEFAULTS.workingDays) as Record<string, boolean>,
        timezone: store.timezone ?? company.defaultTimezone ?? PLATFORM_DEFAULTS.timezone,
    };
}

/**
 * Check if a booking's start and end time fall within working hours on a working day.
 * Times are compared in UTC (caller should convert to branch timezone first for non-UTC).
 */
export function isWithinWorkingHours(
    startTime: Date,
    endTime: Date | null,
    workHours: ResolvedWorkHours,
): boolean {
    const dayOfWeek = startTime.getUTCDay().toString();
    if (!workHours.workingDays[dayOfWeek]) return false;

    const [startH, startM] = workHours.workingHoursStart.split(':').map(Number);
    const [endH, endM] = workHours.workingHoursEnd.split(':').map(Number);
    const workStart = startH * 60 + startM;
    const workEnd = endH * 60 + endM;

    const bookingStartMinutes = startTime.getUTCHours() * 60 + startTime.getUTCMinutes();
    if (bookingStartMinutes < workStart || bookingStartMinutes >= workEnd) return false;

    if (endTime) {
        const bookingEndMinutes = endTime.getUTCHours() * 60 + endTime.getUTCMinutes();
        if (bookingEndMinutes > workEnd) return false;
    }

    return true;
}
