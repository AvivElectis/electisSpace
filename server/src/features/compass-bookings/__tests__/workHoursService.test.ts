import { describe, it, expect } from 'vitest';
import { resolveWorkHours, isWithinWorkingHours } from '../workHoursService.js';

describe('resolveWorkHours', () => {
    const DEFAULTS = {
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        workingDays: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
        timezone: 'UTC',
    };

    it('should return platform defaults when company has no config', () => {
        const result = resolveWorkHours({}, {});
        expect(result).toEqual(DEFAULTS);
    });

    it('should use company values when set', () => {
        const result = resolveWorkHours(
            { workingHoursStart: '09:00', workingHoursEnd: '18:00', defaultTimezone: 'Asia/Jerusalem' },
            {},
        );
        expect(result.workingHoursStart).toBe('09:00');
        expect(result.workingHoursEnd).toBe('18:00');
        expect(result.timezone).toBe('Asia/Jerusalem');
    });

    it('should override with store values when set', () => {
        const result = resolveWorkHours(
            { workingHoursStart: '09:00', workingHoursEnd: '18:00' },
            { workingHoursStart: '07:00', workingHoursEnd: '16:00' },
        );
        expect(result.workingHoursStart).toBe('07:00');
        expect(result.workingHoursEnd).toBe('16:00');
    });
});

describe('isWithinWorkingHours', () => {
    const workHours = {
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        workingDays: { '0': false, '1': true, '2': true, '3': true, '4': true, '5': true, '6': false },
        timezone: 'UTC',
    };

    it('should return true for booking within hours on a working day', () => {
        // Wednesday 2026-03-11 10:00 UTC
        const start = new Date('2026-03-11T10:00:00Z');
        const end = new Date('2026-03-11T12:00:00Z');
        expect(isWithinWorkingHours(start, end, workHours)).toBe(true);
    });

    it('should return false for booking on a non-working day (Sunday)', () => {
        // Sunday 2026-03-08
        const start = new Date('2026-03-08T10:00:00Z');
        const end = new Date('2026-03-08T12:00:00Z');
        expect(isWithinWorkingHours(start, end, workHours)).toBe(false);
    });

    it('should return false for booking outside hours', () => {
        // Wednesday but 06:00-07:00
        const start = new Date('2026-03-11T06:00:00Z');
        const end = new Date('2026-03-11T07:00:00Z');
        expect(isWithinWorkingHours(start, end, workHours)).toBe(false);
    });
});
