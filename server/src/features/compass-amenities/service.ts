import { notFound } from '../../shared/middleware/index.js';
import { prisma } from '../../config/index.js';

// ======================
// Amenity CRUD (company-scoped)
// ======================

export const listAmenities = async (companyId: string) => {
    return prisma.amenity.findMany({
        where: { companyId, isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
};

export const createAmenity = async (companyId: string, data: {
    name: string; nameHe?: string; icon?: string; category: string;
}) => {
    return prisma.amenity.create({ data: { companyId, ...data } });
};

export const updateAmenity = async (companyId: string, id: string, data: Record<string, any>) => {
    const amenity = await prisma.amenity.findUnique({ where: { id } });
    if (!amenity || amenity.companyId !== companyId) throw notFound('Amenity not found');
    return prisma.amenity.update({ where: { id }, data });
};

export const deleteAmenity = async (companyId: string, id: string) => {
    const amenity = await prisma.amenity.findUnique({ where: { id } });
    if (!amenity || amenity.companyId !== companyId) throw notFound('Amenity not found');

    // Remove this amenity ID from all spaces that reference it
    const spacesWithAmenity = await prisma.space.findMany({
        where: { compassAmenities: { has: id } },
        select: { id: true, compassAmenities: true },
    });
    if (spacesWithAmenity.length > 0) {
        await Promise.all(
            spacesWithAmenity.map(space =>
                prisma.space.update({
                    where: { id: space.id },
                    data: { compassAmenities: space.compassAmenities.filter(aid => aid !== id) },
                }),
            ),
        );
    }

    return prisma.amenity.update({ where: { id }, data: { isActive: false } });
};

// ======================
// Neighborhood CRUD (floor-scoped)
// ======================

export const listNeighborhoods = async (companyId: string, floorId: string) => {
    // Verify floor belongs to the company
    const floor = await prisma.floor.findUnique({
        where: { id: floorId },
        select: { building: { select: { companyId: true } } },
    });
    if (!floor || floor.building.companyId !== companyId) throw notFound('Floor not found');

    return prisma.neighborhood.findMany({
        where: { floorId, isActive: true },
        include: {
            department: { select: { id: true, name: true } },
            _count: { select: { spaces: true } },
        },
        orderBy: { sortOrder: 'asc' },
    });
};

export const createNeighborhood = async (companyId: string, data: {
    name: string; floorId: string; departmentId?: string | null;
    color?: string; description?: string; sortOrder?: number;
}) => {
    // Verify floor belongs to the company
    const floor = await prisma.floor.findUnique({
        where: { id: data.floorId },
        select: { building: { select: { companyId: true } } },
    });
    if (!floor || floor.building.companyId !== companyId) throw notFound('Floor not found');

    return prisma.neighborhood.create({
        data,
        include: { department: { select: { id: true, name: true } } },
    });
};

export const updateNeighborhood = async (companyId: string, id: string, data: Record<string, any>) => {
    const neighborhood = await prisma.neighborhood.findUnique({
        where: { id },
        select: { floor: { select: { building: { select: { companyId: true } } } } },
    });
    if (!neighborhood || neighborhood.floor.building.companyId !== companyId) throw notFound('Neighborhood not found');
    return prisma.neighborhood.update({ where: { id }, data });
};

export const deleteNeighborhood = async (companyId: string, id: string) => {
    const neighborhood = await prisma.neighborhood.findUnique({
        where: { id },
        select: { floor: { select: { building: { select: { companyId: true } } } } },
    });
    if (!neighborhood || neighborhood.floor.building.companyId !== companyId) throw notFound('Neighborhood not found');
    return prisma.neighborhood.update({ where: { id }, data: { isActive: false } });
};
