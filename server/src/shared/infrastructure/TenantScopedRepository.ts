import { prisma } from '../../config/index.js';
import type { PrismaClient } from '@prisma/client';

/**
 * Base class for tenant-scoped repositories.
 * Enforces companyId scoping on all queries to prevent cross-tenant data access.
 *
 * Usage:
 * ```
 * class BookingRepo extends TenantScopedRepository {
 *     async findAll() {
 *         return prisma.booking.findMany({
 *             where: this.scoped({ status: 'BOOKED' }),
 *         });
 *     }
 * }
 * const repo = new BookingRepo('company-uuid');
 * ```
 */
export abstract class TenantScopedRepository {
    protected readonly companyId: string;
    protected readonly db: PrismaClient;

    constructor(companyId: string) {
        this.companyId = companyId;
        this.db = prisma;
    }

    /**
     * Merges the tenant companyId into a Prisma `where` clause.
     * Always call this when building queries to enforce scoping.
     */
    protected scoped<T extends Record<string, unknown>>(where?: T): T & { companyId: string } {
        return { ...where, companyId: this.companyId } as T & { companyId: string };
    }

    /**
     * Merges the tenant companyId into a Prisma `data` object for inserts.
     */
    protected scopedData<T extends Record<string, unknown>>(data: T): T & { companyId: string } {
        return { ...data, companyId: this.companyId };
    }
}
