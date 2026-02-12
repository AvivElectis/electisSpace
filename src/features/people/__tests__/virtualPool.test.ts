/**
 * Virtual Pool Service Tests
 * 
 * Tests for virtual POOL-ID generation and management.
 * These IDs are used for people who are not assigned to physical spaces.
 */

import {
    getNextPoolId,
    isPoolId,
    generatePoolIds,
    extractPoolNumber,
} from '../infrastructure/virtualPoolService';

describe('VirtualPoolService', () => {
    describe('isPoolId', () => {
        it('should identify POOL-IDs correctly', () => {
            expect(isPoolId('POOL-0001')).toBe(true);
            expect(isPoolId('POOL-9999')).toBe(true);
            expect(isPoolId('POOL-0123')).toBe(true);
        });

        it('should reject non-POOL IDs', () => {
            expect(isPoolId('1')).toBe(false);
            expect(isPoolId('123')).toBe(false);
            expect(isPoolId('OFFICE-001')).toBe(false);
            expect(isPoolId('')).toBe(false);
        });
    });

    describe('getNextPoolId', () => {
        it('should generate POOL-0001 when no existing IDs', () => {
            const existingIds = new Set<string>();
            const nextId = getNextPoolId(existingIds);
            expect(nextId).toBe('POOL-0001');
        });

        it('should generate next sequential ID', () => {
            const existingIds = new Set(['POOL-0001', 'POOL-0002']);
            const nextId = getNextPoolId(existingIds);
            expect(nextId).toBe('POOL-0003');
        });

        it('should reuse freed POOL-IDs (lowest available)', () => {
            // Simulate: POOL-0001 was freed (person assigned to physical space)
            // POOL-0002 and POOL-0003 are still in use
            const existingIds = new Set(['POOL-0002', 'POOL-0003']);
            const nextId = getNextPoolId(existingIds);
            expect(nextId).toBe('POOL-0001'); // Should reuse POOL-0001
        });

        it('should find gaps in sequence and reuse them', () => {
            // POOL-0002 was freed
            const existingIds = new Set(['POOL-0001', 'POOL-0003', 'POOL-0004']);
            const nextId = getNextPoolId(existingIds);
            expect(nextId).toBe('POOL-0002'); // Should reuse POOL-0002
        });

        it('should handle multiple gaps and pick lowest', () => {
            // POOL-0002 and POOL-0004 were freed
            const existingIds = new Set(['POOL-0001', 'POOL-0003', 'POOL-0005']);
            const nextId = getNextPoolId(existingIds);
            expect(nextId).toBe('POOL-0002'); // Should pick lowest gap
        });
    });

    describe('generatePoolIds', () => {
        it('should generate multiple unique pool IDs', () => {
            const existingIds = new Set<string>();
            const ids = generatePoolIds(5, existingIds);

            expect(ids).toHaveLength(5);
            expect(ids[0]).toBe('POOL-0001');
            expect(ids[1]).toBe('POOL-0002');
            expect(ids[2]).toBe('POOL-0003');
            expect(ids[3]).toBe('POOL-0004');
            expect(ids[4]).toBe('POOL-0005');
        });

        it('should skip existing IDs when generating', () => {
            const existingIds = new Set(['POOL-0001', 'POOL-0003']);
            const ids = generatePoolIds(3, existingIds);

            expect(ids).toHaveLength(3);
            expect(ids[0]).toBe('POOL-0002'); // Skips 0001
            expect(ids[1]).toBe('POOL-0004'); // Skips 0003
            expect(ids[2]).toBe('POOL-0005');
        });

        it('should reuse preferred POOL-IDs first (empty articles from AIMS)', () => {
            const existingIds = new Set<string>(); // No local IDs in use
            const preferredIds = new Set(['POOL-0005', 'POOL-0002', 'POOL-0008']); // Empty articles in AIMS

            const ids = generatePoolIds(4, existingIds, undefined, preferredIds);

            expect(ids).toHaveLength(4);
            // Should use preferred IDs first, sorted by lowest number
            expect(ids[0]).toBe('POOL-0002'); // Lowest preferred
            expect(ids[1]).toBe('POOL-0005'); // Next preferred
            expect(ids[2]).toBe('POOL-0008'); // Last preferred
            expect(ids[3]).toBe('POOL-0001'); // New ID since preferred exhausted
        });

        it('should not reuse preferred POOL-IDs already in use locally', () => {
            const existingIds = new Set(['POOL-0002']); // 0002 is in use locally
            const preferredIds = new Set(['POOL-0002', 'POOL-0005']); // 0002 is also empty in AIMS (stale)

            const ids = generatePoolIds(2, existingIds, undefined, preferredIds);

            expect(ids).toHaveLength(2);
            // Should skip 0002 since it's in use locally, use 0005 from preferred
            expect(ids[0]).toBe('POOL-0005');
            expect(ids[1]).toBe('POOL-0001'); // New ID (not 0002 since it's in use)
        });
    });

    describe('extractPoolNumber', () => {
        it('should extract number from pool ID', () => {
            expect(extractPoolNumber('POOL-0001')).toBe(1);
            expect(extractPoolNumber('POOL-0123')).toBe(123);
            expect(extractPoolNumber('POOL-9999')).toBe(9999);
        });

        it('should return null for non-pool IDs', () => {
            expect(extractPoolNumber('123')).toBeNull();
            expect(extractPoolNumber('invalid')).toBeNull();
        });
    });
});
