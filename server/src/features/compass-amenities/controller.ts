import type { Request, Response, NextFunction } from 'express';
import { badRequest } from '../../shared/middleware/index.js';
import * as service from './service.js';
import {
    createAmenitySchema, updateAmenitySchema,
    createNeighborhoodSchema, updateNeighborhoodSchema,
} from './types.js';

// ======================
// Amenities (Admin — companyId from route params)
// ======================

export const listAmenities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const data = await service.listAmenities(companyId);
        res.json({ data });
    } catch (error) { next(error); }
};

export const createAmenity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const parsed = createAmenitySchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request');
        const amenity = await service.createAmenity(companyId, parsed.data);
        res.status(201).json({ data: amenity });
    } catch (error) { next(error); }
};

export const updateAmenity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        const parsed = updateAmenitySchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request');
        const amenity = await service.updateAmenity(companyId, id, parsed.data);
        res.json({ data: amenity });
    } catch (error) { next(error); }
};

export const deleteAmenity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        await service.deleteAmenity(companyId, id);
        res.json({ message: 'Amenity deactivated' });
    } catch (error) { next(error); }
};

// ======================
// Amenities (Compass mobile — companyId from JWT context)
// ======================

export const compassListAmenities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.compassUser!.companyId;
        const data = await service.listAmenities(companyId);
        res.json({ data });
    } catch (error) { next(error); }
};

// ======================
// Neighborhoods (Admin — floorId from route params)
// ======================

export const listNeighborhoods = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const floorId = req.params.floorId as string;
        const data = await service.listNeighborhoods(companyId, floorId);
        res.json({ data });
    } catch (error) { next(error); }
};

export const createNeighborhood = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const parsed = createNeighborhoodSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request');
        const neighborhood = await service.createNeighborhood(companyId, parsed.data);
        res.status(201).json({ data: neighborhood });
    } catch (error) { next(error); }
};

export const updateNeighborhood = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        const parsed = updateNeighborhoodSchema.safeParse(req.body);
        if (!parsed.success) throw badRequest('Invalid request');
        const neighborhood = await service.updateNeighborhood(companyId, id, parsed.data);
        res.json({ data: neighborhood });
    } catch (error) { next(error); }
};

export const deleteNeighborhood = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.params.companyId as string;
        const id = req.params.id as string;
        await service.deleteNeighborhood(companyId, id);
        res.json({ message: 'Neighborhood deactivated' });
    } catch (error) { next(error); }
};

// ======================
// Neighborhoods (Compass mobile — floorId from route params, auth via compass JWT)
// ======================

export const compassListNeighborhoods = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = req.compassUser!.companyId;
        const floorId = req.params.floorId as string;
        const data = await service.listNeighborhoods(companyId, floorId);
        res.json({ data });
    } catch (error) { next(error); }
};
