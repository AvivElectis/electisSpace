import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePeopleController } from '../application/usePeopleController';

// Mock idb-keyval to avoid indexedDB errors
vi.mock('idb-keyval', () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
}));

// Mock external dependencies
vi.mock('@shared/infrastructure/services/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        startTimer: vi.fn(),
        endTimer: vi.fn(),
    },
}));

vi.mock('@shared/infrastructure/services/solumService', () => ({
    fetchArticles: vi.fn().mockResolvedValue([]),
    pushArticles: vi.fn().mockResolvedValue({ success: true }),
    updateArticle: vi.fn().mockResolvedValue({ success: true }),
}));

/**
 * Tests for usePeopleController hook
 * Covers initialization and function exposure
 * 
 * Note: The peopleStore uses IndexedDB for persistence which requires
 * more complex async testing. These tests focus on hook initialization
 * and function exposure to avoid test complexity.
 */
describe('usePeopleController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize and expose all required state properties', () => {
            const { result } = renderHook(() => usePeopleController());

            expect(result.current.people).toBeDefined();
            expect(result.current.peopleLists).toBeDefined();
            // activeListName and activeListId may be null/undefined initially
            expect('activeListName' in result.current).toBe(true);
            expect('activeListId' in result.current).toBe(true);
            expect(result.current.spaceAllocation).toBeDefined();
        });

        it('should expose CSV loading functions', () => {
            const { result } = renderHook(() => usePeopleController());

            expect(typeof result.current.loadPeopleFromCSV).toBe('function');
            expect(typeof result.current.loadPeopleFromContent).toBe('function');
            expect(typeof result.current.loadPeopleFromCSVWithSync).toBe('function');
        });

        it('should expose space assignment functions', () => {
            const { result } = renderHook(() => usePeopleController());

            expect(typeof result.current.assignSpaceToPerson).toBe('function');
            expect(typeof result.current.bulkAssignSpaces).toBe('function');
            expect(typeof result.current.unassignSpace).toBe('function');
        });

        it('should expose AIMS sync functions', () => {
            const { result } = renderHook(() => usePeopleController());

            expect(typeof result.current.postSelectedToAims).toBe('function');
            expect(typeof result.current.postAllAssignmentsToAims).toBe('function');
            expect(typeof result.current.syncFromAims).toBe('function');
            expect(typeof result.current.syncFromAimsWithVirtualPool).toBe('function');
        });

        it('should expose list management functions', () => {
            const { result } = renderHook(() => usePeopleController());

            expect(typeof result.current.savePeopleList).toBe('function');
            expect(typeof result.current.updateCurrentList).toBe('function');
            expect(typeof result.current.loadList).toBe('function');
            expect(typeof result.current.deleteList).toBe('function');
        });

        it('should expose raw store actions', () => {
            const { result } = renderHook(() => usePeopleController());

            expect(typeof result.current.addPersonRaw).toBe('function');
            expect(typeof result.current.updatePersonRaw).toBe('function');
            expect(typeof result.current.deletePersonRaw).toBe('function');
            expect(typeof result.current.updateSyncStatus).toBe('function');
        });

        it('should expose sync-enabled CRUD actions', () => {
            const { result } = renderHook(() => usePeopleController());

            expect(typeof result.current.addPerson).toBe('function');
            expect(typeof result.current.updatePerson).toBe('function');
            expect(typeof result.current.deletePerson).toBe('function');
        });

        it('should expose space allocation functions', () => {
            const { result } = renderHook(() => usePeopleController());

            expect(typeof result.current.setTotalSpaces).toBe('function');
            expect(typeof result.current.cancelAllAssignments).toBe('function');
        });
    });

    describe('Hook Stability', () => {
        it('should return stable function references', () => {
            const { result, rerender } = renderHook(() => usePeopleController());

            const firstRender = {
                loadPeopleFromCSV: result.current.loadPeopleFromCSV,
                assignSpaceToPerson: result.current.assignSpaceToPerson,
                savePeopleList: result.current.savePeopleList,
            };

            rerender();

            // Functions should be memoized (same reference)
            expect(result.current.loadPeopleFromCSV).toBe(firstRender.loadPeopleFromCSV);
            expect(result.current.assignSpaceToPerson).toBe(firstRender.assignSpaceToPerson);
            expect(result.current.savePeopleList).toBe(firstRender.savePeopleList);
        });
    });

    describe('State Properties', () => {
        it('should have people as an array', () => {
            const { result } = renderHook(() => usePeopleController());
            expect(Array.isArray(result.current.people)).toBe(true);
        });

        it('should have peopleLists as an array', () => {
            const { result } = renderHook(() => usePeopleController());
            expect(Array.isArray(result.current.peopleLists)).toBe(true);
        });

        it('should have spaceAllocation as an object', () => {
            const { result } = renderHook(() => usePeopleController());
            expect(typeof result.current.spaceAllocation).toBe('object');
        });
    });
});
