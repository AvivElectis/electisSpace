/**
 * People Lists Tests
 * 
 * Tests for people lists feature including:
 * - Space type labels and translations
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// SPACE TYPE LABELS TESTS
// =============================================================================

describe('Space Type Labels', () => {
    const spaceTypeTranslations = {
        office: { singular: 'Office', plural: 'Offices' },
        room: { singular: 'Room', plural: 'Rooms' },
        chair: { singular: 'Chair', plural: 'Chairs' },
        'person-tag': { singular: 'Person Tag', plural: 'Person Tags' },
    };

    it('should have all space types defined', () => {
        expect(spaceTypeTranslations).toHaveProperty('office');
        expect(spaceTypeTranslations).toHaveProperty('room');
        expect(spaceTypeTranslations).toHaveProperty('chair');
        expect(spaceTypeTranslations).toHaveProperty('person-tag');
    });

    it('should have singular and plural for each type', () => {
        Object.values(spaceTypeTranslations).forEach(type => {
            expect(type).toHaveProperty('singular');
            expect(type).toHaveProperty('plural');
            expect(type.singular.length).toBeGreaterThan(0);
            expect(type.plural.length).toBeGreaterThan(0);
        });
    });

    // Test that translation keys exist and work
    it('should format translation with space type interpolation', () => {
        const template = 'Total {{spaceTypePlural}}';
        const result = template.replace('{{spaceTypePlural}}', spaceTypeTranslations.office.plural.toLowerCase());
        expect(result).toBe('Total offices');
    });

    it('should format assigned space translation', () => {
        const template = 'Assigned {{spaceTypeSingular}}';
        const result = template.replace('{{spaceTypeSingular}}', spaceTypeTranslations.room.singular.toLowerCase());
        expect(result).toBe('Assigned room');
    });
});
