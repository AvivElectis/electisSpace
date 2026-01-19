import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSpaceTypeLabels } from './useSpaceTypeLabels';

// Mock useSettingsController
vi.mock('../application/useSettingsController', () => ({
    useSettingsController: vi.fn(() => ({
        settings: {
            spaceType: 'room',
        },
    })),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'spaceTypes.office.singular': 'Office',
                'spaceTypes.office.singularDef': 'the Office',
                'spaceTypes.office.plural': 'Offices',
                'spaceTypes.office.pluralDef': 'the Offices',
                'spaceTypes.office.add': 'Add Office',
                'spaceTypes.office.edit': 'Edit Office',
                'spaceTypes.office.delete': 'Delete Office',
                'spaceTypes.office.list': 'Office List',
                'spaceTypes.room.singular': 'Room',
                'spaceTypes.room.singularDef': 'the Room',
                'spaceTypes.room.plural': 'Rooms',
                'spaceTypes.room.pluralDef': 'the Rooms',
                'spaceTypes.room.add': 'Add Room',
                'spaceTypes.room.edit': 'Edit Room',
                'spaceTypes.room.delete': 'Delete Room',
                'spaceTypes.room.list': 'Room List',
                'spaceTypes.chair.singular': 'Chair',
                'spaceTypes.chair.plural': 'Chairs',
                'spaceTypes.personTag.singular': 'Person Tag',
                'spaceTypes.personTag.plural': 'Person Tags',
            };
            return translations[key] || key;
        },
    }),
}));

import { useSettingsController } from '../application/useSettingsController';

describe('useSpaceTypeLabels Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getLabel for room type', () => {
        beforeEach(() => {
            vi.mocked(useSettingsController).mockReturnValue({
                settings: { spaceType: 'room' },
            } as any);
        });

        it('should return singular label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('singular')).toBe('Room');
        });

        it('should return singularDef label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('singularDef')).toBe('the Room');
        });

        it('should return plural label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('plural')).toBe('Rooms');
        });

        it('should return pluralDef label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('pluralDef')).toBe('the Rooms');
        });

        it('should return add label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('add')).toBe('Add Room');
        });

        it('should return edit label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('edit')).toBe('Edit Room');
        });

        it('should return delete label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('delete')).toBe('Delete Room');
        });

        it('should return list label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('list')).toBe('Room List');
        });
    });

    describe('getLabel for office type', () => {
        beforeEach(() => {
            vi.mocked(useSettingsController).mockReturnValue({
                settings: { spaceType: 'office' },
            } as any);
        });

        it('should return office singular label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('singular')).toBe('Office');
        });

        it('should return office plural label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('plural')).toBe('Offices');
        });
    });

    describe('getLabel for chair type', () => {
        beforeEach(() => {
            vi.mocked(useSettingsController).mockReturnValue({
                settings: { spaceType: 'chair' },
            } as any);
        });

        it('should return chair singular label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('singular')).toBe('Chair');
        });

        it('should return chair plural label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('plural')).toBe('Chairs');
        });
    });

    describe('getLabel for person-tag type', () => {
        beforeEach(() => {
            vi.mocked(useSettingsController).mockReturnValue({
                settings: { spaceType: 'person-tag' },
            } as any);
        });

        it('should return person tag singular label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('singular')).toBe('Person Tag');
        });

        it('should return person tag plural label', () => {
            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.getLabel('plural')).toBe('Person Tags');
        });
    });

    describe('spaceType property', () => {
        it('should return current space type', () => {
            vi.mocked(useSettingsController).mockReturnValue({
                settings: { spaceType: 'room' },
            } as any);

            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.spaceType).toBe('room');
        });

        it('should return office space type', () => {
            vi.mocked(useSettingsController).mockReturnValue({
                settings: { spaceType: 'office' },
            } as any);

            const { result } = renderHook(() => useSpaceTypeLabels());
            
            expect(result.current.spaceType).toBe('office');
        });
    });
});
