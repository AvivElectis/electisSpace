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
 * Convert a Date to the hours/minutes in a specific timezone.
 */
function getTimeInTimezone(date: Date, timezone: string): { hours: number; minutes: number; dayOfWeek: number } {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric', minute: 'numeric', weekday: 'short',
            hour12: false,
        }).formatToParts(date);

        const hours = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
        const minutes = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
        const weekdayStr = parts.find(p => p.type === 'weekday')?.value ?? '';
        const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const dayOfWeek = dayMap[weekdayStr] ?? date.getUTCDay();

        return { hours, minutes, dayOfWeek };
    } catch {
        // Fallback to UTC if timezone is invalid
        return { hours: date.getUTCHours(), minutes: date.getUTCMinutes(), dayOfWeek: date.getUTCDay() };
    }
}

/**
 * Check if a booking's start and end time fall within working hours on a working day.
 * Times are converted to the branch/company timezone for comparison.
 */
export function isWithinWorkingHours(
    startTime: Date,
    endTime: Date | null,
    workHours: ResolvedWorkHours,
): boolean {
    const tz = workHours.timezone || 'UTC';

    const localStart = getTimeInTimezone(startTime, tz);
    if (!workHours.workingDays[localStart.dayOfWeek.toString()]) return false;

    const [startH, startM] = workHours.workingHoursStart.split(':').map(Number);
    const [endH, endM] = workHours.workingHoursEnd.split(':').map(Number);
    const workStart = startH * 60 + startM;
    const workEnd = endH * 60 + endM;

    const bookingStartMinutes = localStart.hours * 60 + localStart.minutes;
    if (bookingStartMinutes < workStart || bookingStartMinutes >= workEnd) return false;

    if (endTime) {
        const localEnd = getTimeInTimezone(endTime, tz);
        const bookingEndMinutes = localEnd.hours * 60 + localEnd.minutes;
        if (bookingEndMinutes > workEnd) return false;
    }

    return true;
}
