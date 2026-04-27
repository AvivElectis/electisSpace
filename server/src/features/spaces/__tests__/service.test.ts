import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Top-level mock function handles
// ============================================================================

const mockSpaceFindMany = vi.fn();
const mockSpaceDeleteMany = vi.fn();
const mockTransaction = vi.fn();
const mockQueueDelete = vi.fn();

// ============================================================================
// Mocks (must appear before any imports that consume them)
// ============================================================================

vi.mock('../../../config/index.js', () => ({
    prisma: {
        space: {
            findMany: (...a: unknown[]) => mockSpaceFindMany(...a),
            deleteMany: (...a: unknown[]) => mockSpaceDeleteMany(...a),
        },
        $transaction: (...a: unknown[]) => mockTransaction(...a),
    },
}));

vi.mock('../../../shared/infrastructure/services/syncQueueService.js', () => ({
    syncQueueService: {
        queueDelete: (...a: unknown[]) => mockQueueDelete(...a),
        queueCreate: vi.fn(),
        queueUpdate: vi.fn(),
    },
}));

vi.mock('../../../shared/infrastructure/services/appLogger.js', () => ({
    appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// spacesRepository is used by other service methods — mock it so the module loads
vi.mock('../repository.js', () => ({
    spacesRepository: {
        list: vi.fn(),
        getById: vi.fn(),
        findByIdWithAccess: vi.fn(),
        findByExternalId: vi.fn(),
        findLabelInStore: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

// ============================================================================
// Subject under test (imported AFTER all vi.mock calls)
// ============================================================================

import { spacesService } from '../service.js';

// ============================================================================
// Test fixtures
// ============================================================================

const userInStore1 = { id: 'user-1', stores: [{ id: 'store-1' }], globalRole: 'USER' as any };
const adminUser = { id: 'admin-1', stores: [], globalRole: 'PLATFORM_ADMIN' as any };

beforeEach(() => {
    mockSpaceFindMany.mockReset();
    mockSpaceDeleteMany.mockReset();
    mockTransaction.mockReset();
    mockQueueDelete.mockReset();
});

// ============================================================================
// Tests
// ============================================================================

describe('spacesService.deleteBulk', () => {
    it('deletes all accessible ids in one transaction and queues deletes', async () => {
        mockSpaceFindMany.mockResolvedValue([
            { id: 'a', storeId: 'store-1', externalId: 'E-A', assignedLabels: [] },
            { id: 'b', storeId: 'store-1', externalId: 'E-B', assignedLabels: [] },
        ]);
        // $transaction passes a tx object that exposes the same methods as prisma.
        mockTransaction.mockImplementation(async (fn: any) => {
            return fn({ space: { deleteMany: mockSpaceDeleteMany } });
        });
        mockSpaceDeleteMany.mockResolvedValue({ count: 2 });

        const result = await spacesService.deleteBulk(['a', 'b'], userInStore1);

        expect(mockQueueDelete).toHaveBeenCalledTimes(2);
        expect(mockQueueDelete).toHaveBeenCalledWith('store-1', 'space', 'a', 'E-A');
        expect(mockQueueDelete).toHaveBeenCalledWith('store-1', 'space', 'b', 'E-B');
        expect(mockSpaceDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['a', 'b'] } } });
        expect(result).toEqual({ deleted: ['a', 'b'], alreadyGone: [], storeIds: ['store-1'] });
    });

    it('throws FORBIDDEN when an id belongs to a store the user cannot access', async () => {
        mockSpaceFindMany.mockResolvedValue([
            { id: 'a', storeId: 'store-1', externalId: 'E-A', assignedLabels: [] },
            { id: 'b', storeId: 'store-2', externalId: 'E-B', assignedLabels: [] },
        ]);

        await expect(
            spacesService.deleteBulk(['a', 'b'], userInStore1),
        ).rejects.toThrow('FORBIDDEN');
        expect(mockQueueDelete).not.toHaveBeenCalled();
        expect(mockSpaceDeleteMany).not.toHaveBeenCalled();
    });

    it('treats missing ids as already-deleted (idempotent)', async () => {
        mockSpaceFindMany.mockResolvedValue([
            { id: 'a', storeId: 'store-1', externalId: 'E-A', assignedLabels: [] },
        ]);
        mockTransaction.mockImplementation(async (fn: any) => {
            return fn({ space: { deleteMany: mockSpaceDeleteMany } });
        });
        mockSpaceDeleteMany.mockResolvedValue({ count: 1 });

        const result = await spacesService.deleteBulk(['a', 'ghost'], userInStore1);

        expect(result).toEqual({ deleted: ['a'], alreadyGone: ['ghost'], storeIds: ['store-1'] });
        expect(mockQueueDelete).toHaveBeenCalledTimes(1);
    });

    it('returns empty deleted with all-alreadyGone when no rows exist', async () => {
        mockSpaceFindMany.mockResolvedValue([]);
        const result = await spacesService.deleteBulk(['ghost1', 'ghost2'], userInStore1);
        expect(result).toEqual({ deleted: [], alreadyGone: ['ghost1', 'ghost2'], storeIds: [] });
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('returns unique storeIds across multiple stores when all are accessible', async () => {
        mockSpaceFindMany.mockResolvedValue([
            { id: 'a', storeId: 'store-1', externalId: 'E-A', assignedLabels: [] },
            { id: 'b', storeId: 'store-1', externalId: 'E-B', assignedLabels: [] },
            { id: 'c', storeId: 'store-2', externalId: 'E-C', assignedLabels: [] },
        ]);
        mockTransaction.mockImplementation(async (fn: any) => {
            return fn({ space: { deleteMany: mockSpaceDeleteMany } });
        });
        mockSpaceDeleteMany.mockResolvedValue({ count: 3 });

        const result = await spacesService.deleteBulk(['a', 'b', 'c'], adminUser);

        expect(result.storeIds.sort()).toEqual(['store-1', 'store-2']);
    });
});
