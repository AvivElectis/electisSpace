/**
 * AIMS Management Feature - Types & Validation Schemas
 */
import { z } from 'zod';

// MAC address pattern (e.g., D02544FFFE123456)
const macAddressSchema = z.string().min(12).max(17);

export const registerGatewaySchema = z.object({
    mac: macAddressSchema,
});

export const deregisterGatewaysSchema = z.object({
    macs: z.array(macAddressSchema).min(1),
});

export const batchHistoryQuerySchema = z.object({
    page: z.coerce.number().int().min(0).default(0),
    size: z.coerce.number().int().min(1).max(100).default(20),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
});

export const labelHistoryQuerySchema = z.object({
    page: z.coerce.number().int().min(0).default(0),
    size: z.coerce.number().int().min(1).max(100).default(50),
});

export const articleHistoryQuerySchema = z.object({
    page: z.coerce.number().int().min(0).default(0),
    size: z.coerce.number().int().min(1).max(100).default(50),
});
