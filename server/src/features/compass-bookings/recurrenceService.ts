import { rrulestr } from 'rrule';
import { v4 as uuidv4 } from 'uuid';
import { badRequest } from '../../shared/middleware/index.js';
import * as ruleEngine from './ruleEngine.js';

export const MAX_INSTANCES = 90;

// ─── Generate Recurrence Dates ─────────────────────────

export function generateInstances(params: {
    rrule: string;
    startTime: string; // "HH:mm"
    endTime: string | null;
    refDate: Date;
}): Date[] {
    const ruleStr = params.rrule;

    // Safety: must have COUNT or UNTIL to prevent infinite generation
    if (!ruleStr.includes('COUNT') && !ruleStr.includes('UNTIL')) {
        throw badRequest('RRULE must have COUNT or UNTIL to prevent infinite generation');
    }

    const rule = rrulestr(
        `DTSTART:${formatRRuleDate(params.refDate)}\nRRULE:${ruleStr}`,
    );
    const dates = rule.all((_date, i) => i < MAX_INSTANCES);

    // Apply time of day from startTime
    const [startH, startM] = params.startTime.split(':').map(Number);
    return dates.map(d => {
        const result = new Date(d);
        result.setUTCHours(startH, startM, 0, 0);
        return result;
    });
}

// ─── Create Recurring Series ───────────────────────────

export async function createRecurringSeries(params: {
    rrule: string;
    startTime: string;
    endTime: string | null;
    spaceId: string;
    companyUserId: string;
    companyId: string;
    branchId: string;
    notes?: string;
    bookedBy?: string;
    prisma: any;
}): Promise<{ groupId: string; created: number; conflicts: Date[] }> {
    const groupId = uuidv4();
    const dates = generateInstances({
        rrule: params.rrule,
        startTime: params.startTime,
        endTime: params.endTime,
        refDate: new Date(),
    });

    // Validate against booking rules
    const rules = await ruleEngine.resolveRules(params.companyId, params.branchId);

    // Validate duration per instance
    if (params.endTime) {
        const [endH, endM] = params.endTime.split(':').map(Number);
        const [startH, startM] = params.startTime.split(':').map(Number);
        const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (durationMinutes < rules.minBookingDurationMinutes) {
            throw badRequest('BOOKING_TOO_SHORT', { min: rules.minBookingDurationMinutes });
        }
        if (durationMinutes > rules.maxBookingDurationMinutes) {
            throw badRequest('BOOKING_TOO_LONG', { max: rules.maxBookingDurationMinutes });
        }
    }

    // Validate concurrent bookings limit per-date
    // Group recurrence dates by calendar day and check each day's total
    const datesByDay = new Map<string, Date[]>();
    for (const d of dates) {
        const dayKey = d.toISOString().slice(0, 10);
        const arr = datesByDay.get(dayKey) ?? [];
        arr.push(d);
        datesByDay.set(dayKey, arr);
    }
    for (const [dayKey, dayDates] of datesByDay) {
        const dayStart = new Date(dayKey + 'T00:00:00Z');
        const dayEnd = new Date(dayKey + 'T23:59:59Z');
        const existingOnDay = await params.prisma.booking.count({
            where: {
                companyUserId: params.companyUserId,
                companyId: params.companyId,
                status: { in: ['BOOKED', 'CHECKED_IN'] },
                startTime: { gte: dayStart, lte: dayEnd },
            },
        });
        if (existingOnDay + dayDates.length > rules.maxConcurrentBookings) {
            throw badRequest('MAX_CONCURRENT_BOOKINGS_EXCEEDED', { max: rules.maxConcurrentBookings });
        }
    }

    // Calculate duration from start/end times
    let durationMs: number | null = null;
    if (params.endTime) {
        const [endH, endM] = params.endTime.split(':').map(Number);
        const [startH, startM] = params.startTime.split(':').map(Number);
        durationMs = ((endH * 60 + endM) - (startH * 60 + startM)) * 60 * 1000;
    }

    // Conflict detection + creation in a single transaction for atomicity
    const { conflicts, created } = await params.prisma.$transaction(async (tx: any) => {
        const txConflicts: Date[] = [];
        const txNonConflicting: Date[] = [];

        for (const date of dates) {
            const endDate = durationMs ? new Date(date.getTime() + durationMs) : null;
            const conflictWhere: any = {
                spaceId: params.spaceId,
                status: { in: ['BOOKED', 'CHECKED_IN'] },
            };

            if (endDate) {
                conflictWhere.startTime = { lt: endDate };
                conflictWhere.OR = [{ endTime: null }, { endTime: { gt: date } }];
            } else {
                conflictWhere.OR = [{ endTime: null }, { endTime: { gt: date } }];
            }

            const existing = await tx.booking.findFirst({
                where: conflictWhere,
                select: { id: true },
            });

            if (existing) {
                txConflicts.push(date);
            } else {
                txNonConflicting.push(date);
            }
        }

        let count = 0;
        if (txNonConflicting.length > 0) {
            const result = await tx.booking.createMany({
                data: txNonConflicting.map((date: Date) => ({
                    companyUserId: params.companyUserId,
                    spaceId: params.spaceId,
                    branchId: params.branchId,
                    companyId: params.companyId,
                    startTime: date,
                    endTime: durationMs ? new Date(date.getTime() + durationMs) : null,
                    status: 'BOOKED',
                    bookingType: 'HOT_DESK',
                    recurrenceRule: params.rrule,
                    recurrenceGroupId: groupId,
                    isRecurrence: true,
                    bookedBy: params.bookedBy,
                    notes: params.notes,
                })),
            });
            count = result.count;
        }

        return { conflicts: txConflicts, created: count };
    });

    return { groupId, created, conflicts };
}

// ─── Helpers ───────────────────────────────────────────

function formatRRuleDate(d: Date): string {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}T000000Z`;
}
