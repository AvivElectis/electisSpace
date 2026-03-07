import { z } from 'zod';

export const createAmenitySchema = z.object({
    name: z.string().min(1).max(100),
    nameHe: z.string().max(100).optional(),
    icon: z.string().max(50).optional(),
    category: z.string().min(1).max(50),
});

export const updateAmenitySchema = createAmenitySchema.partial();

export const createNeighborhoodSchema = z.object({
    name: z.string().min(1).max(100),
    floorId: z.string().uuid(),
    departmentId: z.string().uuid().nullable().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    description: z.string().max(500).optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const updateNeighborhoodSchema = createNeighborhoodSchema.partial().omit({ floorId: true });
