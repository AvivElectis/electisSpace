/**
 * Compass Amenities & Neighborhoods Service - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/index.js', () => ({
    prisma: {
        amenity: {
            findMany: vi.fn(),
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        neighborhood: {
            findMany: vi.fn(),
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        floor: {
            findUnique: vi.fn(),
        },
        space: {
            findMany: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('../../../shared/middleware/index.js', () => {
    class AppError extends Error {
        statusCode: number;
        constructor(message: string, statusCode: number) {
            super(message);
            this.statusCode = statusCode;
        }
    }
    return {
        notFound: (msg: string) => new AppError(msg, 404),
    };
});

import * as service from '../service.js';
import { prisma } from '../../../config/index.js';

const mockPrisma = prisma as unknown as {
    amenity: {
        findMany: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    neighborhood: {
        findMany: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
    floor: {
        findUnique: ReturnType<typeof vi.fn>;
    };
    space: {
        findMany: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
    };
};

// ─── Amenity Tests ──────────────────────────────────

describe('listAmenities', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return active amenities for a company', async () => {
        const amenities = [{ id: 'a1', name: 'Monitor', category: 'tech' }];
        mockPrisma.amenity.findMany.mockResolvedValue(amenities);

        const result = await service.listAmenities('company-1');

        expect(result).toEqual(amenities);
        expect(mockPrisma.amenity.findMany).toHaveBeenCalledWith({
            where: { companyId: 'company-1', isActive: true },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
    });
});

describe('createAmenity', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should create an amenity with company scope', async () => {
        const created = { id: 'a1', companyId: 'company-1', name: 'WiFi', category: 'connectivity' };
        mockPrisma.amenity.create.mockResolvedValue(created);

        const result = await service.createAmenity('company-1', { name: 'WiFi', category: 'connectivity' });

        expect(result).toEqual(created);
        expect(mockPrisma.amenity.create).toHaveBeenCalledWith({
            data: { companyId: 'company-1', name: 'WiFi', category: 'connectivity' },
        });
    });
});

describe('updateAmenity', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should throw notFound when amenity does not exist', async () => {
        mockPrisma.amenity.findUnique.mockResolvedValue(null);

        await expect(service.updateAmenity('company-1', 'a1', { name: 'Updated' }))
            .rejects.toThrow('Amenity not found');
    });

    it('should throw notFound when amenity belongs to different company', async () => {
        mockPrisma.amenity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'other-company' });

        await expect(service.updateAmenity('company-1', 'a1', { name: 'Updated' }))
            .rejects.toThrow('Amenity not found');
    });

    it('should update amenity when found and belongs to company', async () => {
        mockPrisma.amenity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'company-1' });
        mockPrisma.amenity.update.mockResolvedValue({ id: 'a1', name: 'Updated' });

        const result = await service.updateAmenity('company-1', 'a1', { name: 'Updated' });

        expect(result.name).toBe('Updated');
        expect(mockPrisma.amenity.update).toHaveBeenCalledWith({
            where: { id: 'a1' },
            data: { name: 'Updated' },
        });
    });
});

describe('deleteAmenity', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should soft-delete and clean up space references', async () => {
        mockPrisma.amenity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'company-1' });
        mockPrisma.space.findMany.mockResolvedValue([
            { id: 's1', compassAmenities: ['a1', 'a2'] },
        ]);
        mockPrisma.space.update.mockResolvedValue({});
        mockPrisma.amenity.update.mockResolvedValue({ id: 'a1', isActive: false });

        await service.deleteAmenity('company-1', 'a1');

        expect(mockPrisma.space.findMany).toHaveBeenCalledWith({
            where: { compassAmenities: { has: 'a1' } },
            select: { id: true, compassAmenities: true },
        });
        expect(mockPrisma.space.update).toHaveBeenCalledWith({
            where: { id: 's1' },
            data: { compassAmenities: ['a2'] },
        });
        expect(mockPrisma.amenity.update).toHaveBeenCalledWith({
            where: { id: 'a1' },
            data: { isActive: false },
        });
    });

    it('should soft-delete without space cleanup when no spaces reference it', async () => {
        mockPrisma.amenity.findUnique.mockResolvedValue({ id: 'a1', companyId: 'company-1' });
        mockPrisma.space.findMany.mockResolvedValue([]);
        mockPrisma.amenity.update.mockResolvedValue({ id: 'a1', isActive: false });

        await service.deleteAmenity('company-1', 'a1');

        expect(mockPrisma.space.update).not.toHaveBeenCalled();
        expect(mockPrisma.amenity.update).toHaveBeenCalledWith({
            where: { id: 'a1' },
            data: { isActive: false },
        });
    });

    it('should throw notFound when amenity does not exist', async () => {
        mockPrisma.amenity.findUnique.mockResolvedValue(null);

        await expect(service.deleteAmenity('company-1', 'a1'))
            .rejects.toThrow('Amenity not found');
    });
});

// ─── Neighborhood Tests ─────────────────────────────

describe('listNeighborhoods', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return active neighborhoods for a floor', async () => {
        const neighborhoods = [{ id: 'n1', name: 'Zone A' }];
        mockPrisma.floor.findUnique.mockResolvedValue({ id: 'floor-1', building: { companyId: 'company-1' } });
        mockPrisma.neighborhood.findMany.mockResolvedValue(neighborhoods);

        const result = await service.listNeighborhoods('company-1', 'floor-1');

        expect(result).toEqual(neighborhoods);
        expect(mockPrisma.neighborhood.findMany).toHaveBeenCalledWith({
            where: { floorId: 'floor-1', isActive: true },
            include: {
                department: { select: { id: true, name: true } },
                _count: { select: { spaces: true } },
            },
            orderBy: { sortOrder: 'asc' },
        });
    });
});

describe('createNeighborhood', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should create a neighborhood', async () => {
        const created = { id: 'n1', name: 'Engineering Zone', floorId: 'floor-1' };
        mockPrisma.floor.findUnique.mockResolvedValue({ id: 'floor-1', building: { companyId: 'company-1' } });
        mockPrisma.neighborhood.create.mockResolvedValue(created);

        const result = await service.createNeighborhood('company-1', { name: 'Engineering Zone', floorId: 'floor-1' });

        expect(result).toEqual(created);
    });
});

describe('deleteNeighborhood', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should soft-delete by setting isActive to false', async () => {
        mockPrisma.neighborhood.findUnique.mockResolvedValue({ id: 'n1', floor: { building: { companyId: 'company-1' } } });
        mockPrisma.neighborhood.update.mockResolvedValue({ id: 'n1', isActive: false });

        await service.deleteNeighborhood('company-1', 'n1');

        expect(mockPrisma.neighborhood.update).toHaveBeenCalledWith({
            where: { id: 'n1' },
            data: { isActive: false },
        });
    });

    it('should throw notFound when neighborhood does not exist', async () => {
        mockPrisma.neighborhood.findUnique.mockResolvedValue(null);

        await expect(service.deleteNeighborhood('company-1', 'n1'))
            .rejects.toThrow('Neighborhood not found');
    });
});
