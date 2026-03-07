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
    return prisma.amenity.update({ where: { id }, data: { isActive: false } });
};

// ======================
// Neighborhood CRUD (floor-scoped)
// ======================

export const listNeighborhoods = async (floorId: string) => {
    return prisma.neighborhood.findMany({
        where: { floorId, isActive: true },
        include: {
            department: { select: { id: true, name: true } },
            _count: { select: { spaces: true } },
        },
        orderBy: { sortOrder: 'asc' },
    });
};

export const createNeighborhood = async (data: {
    name: string; floorId: string; departmentId?: string | null;
    color?: string; description?: string; sortOrder?: number;
}) => {
    return prisma.neighborhood.create({
        data,
        include: { department: { select: { id: true, name: true } } },
    });
};

export const updateNeighborhood = async (id: string, data: Record<string, any>) => {
    const neighborhood = await prisma.neighborhood.findUnique({ where: { id } });
    if (!neighborhood) throw notFound('Neighborhood not found');
    return prisma.neighborhood.update({ where: { id }, data });
};

export const deleteNeighborhood = async (id: string) => {
    const neighborhood = await prisma.neighborhood.findUnique({ where: { id } });
    if (!neighborhood) throw notFound('Neighborhood not found');
    return prisma.neighborhood.update({ where: { id }, data: { isActive: false } });
};
