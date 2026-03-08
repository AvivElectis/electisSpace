import { rrulestr } from 'rrule';
import { v4 as uuidv4 } from 'uuid';
import { badRequest } from '../../shared/middleware/index.js';

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

    // Calculate duration from start/end times
    let durationMs: number | null = null;
    if (params.endTime) {
        const [endH, endM] = params.endTime.split(':').map(Number);
        const [startH, startM] = params.startTime.split(':').map(Number);
        durationMs = ((endH * 60 + endM) - (startH * 60 + startM)) * 60 * 1000;
    }

    // Batch conflict check — find existing bookings at the same times
    const conflicts: Date[] = [];
    const nonConflicting: Date[] = [];

    const existingBookings = await params.prisma.booking.findMany({
        where: {
            spaceId: params.spaceId,
            status: { in: ['BOOKED', 'CHECKED_IN'] },
            startTime: { in: dates },
        },
        select: { startTime: true },
    });

    const conflictSet = new Set(
        existingBookings.map((b: any) => b.startTime.toISOString()),
    );

    for (const date of dates) {
        if (conflictSet.has(date.toISOString())) {
            conflicts.push(date);
        } else {
            nonConflicting.push(date);
        }
    }

    // Create all non-conflicting booking instances
    const result = await params.prisma.booking.createMany({
        data: nonConflicting.map(date => ({
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

    return { groupId, created: result.count, conflicts };
}

// ─── Helpers ───────────────────────────────────────────

function formatRRuleDate(d: Date): string {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}T000000Z`;
}
