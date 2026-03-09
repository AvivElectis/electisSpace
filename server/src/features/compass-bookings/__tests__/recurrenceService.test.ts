import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../shared/middleware/index.js', () => ({
    badRequest: (msg: string) => {
        const err = new Error(msg);
        (err as any).statusCode = 400;
        return err;
    },
}));

import { generateInstances, MAX_INSTANCES } from '../recurrenceService.js';

describe('generateInstances', () => {
    it('should generate daily instances for 5 days', () => {
        const dates = generateInstances({
            rrule: 'FREQ=DAILY;COUNT=5',
            startTime: '09:00',
            endTime: '17:00',
            refDate: new Date('2026-03-09'),
        });
        expect(dates).toHaveLength(5);
        expect(dates[0].getUTCDate()).toBe(9);
        expect(dates[4].getUTCDate()).toBe(13);
    });

    it('should apply startTime hours to all generated dates', () => {
        const dates = generateInstances({
            rrule: 'FREQ=DAILY;COUNT=3',
            startTime: '14:30',
            endTime: '16:00',
            refDate: new Date('2026-03-09'),
        });
        expect(dates).toHaveLength(3);
        for (const d of dates) {
            expect(d.getUTCHours()).toBe(14);
            expect(d.getUTCMinutes()).toBe(30);
        }
    });

    it('should generate weekly Mon/Wed/Fri instances', () => {
        const dates = generateInstances({
            rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6',
            startTime: '09:00',
            endTime: '17:00',
            refDate: new Date('2026-03-09'),
        });
        expect(dates).toHaveLength(6);
    });

    it('should cap at MAX_INSTANCES', () => {
        const dates = generateInstances({
            rrule: 'FREQ=DAILY;COUNT=200',
            startTime: '09:00',
            endTime: '17:00',
            refDate: new Date('2026-03-09'),
        });
        expect(dates.length).toBeLessThanOrEqual(MAX_INSTANCES);
    });

    it('should reject rules without COUNT or UNTIL', () => {
        expect(() =>
            generateInstances({
                rrule: 'FREQ=DAILY',
                startTime: '09:00',
                endTime: '17:00',
                refDate: new Date('2026-03-09'),
            }),
        ).toThrow();
    });

    it('should accept rules with UNTIL', () => {
        const dates = generateInstances({
            rrule: 'FREQ=DAILY;UNTIL=20260315T000000Z',
            startTime: '09:00',
            endTime: '17:00',
            refDate: new Date('2026-03-09'),
        });
        expect(dates.length).toBeGreaterThan(0);
        expect(dates.length).toBeLessThanOrEqual(7); // 9th through 15th
    });
});
