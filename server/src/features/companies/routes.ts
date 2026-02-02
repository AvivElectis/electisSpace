import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/index.js';
import { authenticate, notFound, conflict, badRequest, forbidden } from '../../shared/middleware/index.js';
import { GlobalRole, CompanyRole } from '@prisma/client';
import { encrypt } from '../../shared/utils/encryption.js';
import { config } from '../../config/index.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ======================
// Validation Schemas
// ======================

// Company code: 3+ uppercase letters only
const companyCodeSchema = z.string()
    .min(3, 'Company code must be at least 3 characters')
    .max(20, 'Company code must be at most 20 characters')
    .regex(/^[A-Z]+$/, 'Company code must contain only uppercase letters');

const createCompanySchema = z.object({
    code: companyCodeSchema,
    name: z.string().min(1).max(100),
    location: z.string().max(255).optional(),
    description: z.string().optional(),
    aimsConfig: z.object({
        baseUrl: z.string().url(),
        cluster: z.string().optional(),
        username: z.string(),
        password: z.string(),
    }).optional(),
});

const updateCompanySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    location: z.string().max(255).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
});

const updateAimsConfigSchema = z.object({
    baseUrl: z.string().url(),
    cluster: z.string().optional(),
    username: z.string(),
    password: z.string(),
});

// ======================
// Helper Functions
// ======================

// Check if user can manage companies (Platform Admin only)
const isPlatformAdmin = (req: any): boolean => {
    return req.user?.globalRole === GlobalRole.PLATFORM_ADMIN;
};

// Check if user can manage a specific company
const canManageCompany = (req: any, companyId: string): boolean => {
    if (isPlatformAdmin(req)) return true;
    
    // Check if user is company admin
    const companyAccess = req.user?.companies?.find((c: any) => c.id === companyId);
    return companyAccess?.role === CompanyRole.COMPANY_ADMIN;
};

// Check if user has any access to a company
const hasCompanyAccess = (req: any, companyId: string): boolean => {
    if (isPlatformAdmin(req)) return true;
    return req.user?.companies?.some((c: any) => c.id === companyId);
};

// ======================
// Routes
// ======================

/**
 * GET /companies
 * List companies accessible to the current user
 */
router.get('/', async (req, res, next) => {
    try {
        const search = req.query.search as string;
        
        let companies;
        
        if (isPlatformAdmin(req)) {
            // Platform admins see all companies
            companies = await prisma.company.findMany({
                where: search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { code: { contains: search, mode: 'insensitive' } },
                        { location: { contains: search, mode: 'insensitive' } },
                    ],
                } : undefined,
                include: {
                    _count: {
                        select: { stores: true, userCompanies: true }
                    }
                },
                orderBy: { name: 'asc' },
            });
            
            // Map with null role (platform admin has implicit access)
            companies = companies.map(c => ({
                id: c.id,
                code: c.code,
                name: c.name,
                location: c.location,
                description: c.description,
                isActive: c.isActive,
                storeCount: c._count.stores,
                userCount: c._count.userCompanies,
                userRole: null, // Platform admin
                hasAimsConfig: !!(c.aimsBaseUrl && c.aimsUsername),
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            }));
        } else {
            // Regular users see only their assigned companies
            const userCompanies = await prisma.userCompany.findMany({
                where: { userId: req.user!.id },
                include: {
                    company: {
                        include: {
                            _count: {
                                select: { stores: true, userCompanies: true }
                            }
                        }
                    }
                }
            });
            
            companies = userCompanies
                .filter(uc => {
                    if (!search) return true;
                    const searchLower = search.toLowerCase();
                    return uc.company.name.toLowerCase().includes(searchLower) ||
                           uc.company.code.toLowerCase().includes(searchLower) ||
                           uc.company.location?.toLowerCase().includes(searchLower);
                })
                .map(uc => ({
                    id: uc.company.id,
                    code: uc.company.code,
                    name: uc.company.name,
                    location: uc.company.location,
                    description: uc.company.description,
                    isActive: uc.company.isActive,
                    storeCount: uc.company._count.stores,
                    userCount: uc.company._count.userCompanies,
                    userRole: uc.role,
                    allStoresAccess: uc.allStoresAccess,
                    hasAimsConfig: !!(uc.company.aimsBaseUrl && uc.company.aimsUsername),
                    createdAt: uc.company.createdAt,
                    updatedAt: uc.company.updatedAt,
                }));
        }
        
        res.json({ companies });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /companies/validate-code/:code
 * Validate if a company code is available
 */
router.get('/validate-code/:code', async (req, res, next) => {
    try {
        const code = req.params.code.toUpperCase();
        
        // Validate format
        const validation = companyCodeSchema.safeParse(code);
        if (!validation.success) {
            return res.json({ 
                available: false, 
                reason: validation.error.errors[0].message 
            });
        }
        
        const existing = await prisma.company.findUnique({
            where: { code },
            select: { id: true }
        });
        
        res.json({ 
            available: !existing,
            reason: existing ? 'Company code already exists' : null
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /companies/:id
 * Get company details with stores
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Check access
        if (!hasCompanyAccess(req, id) && !isPlatformAdmin(req)) {
            throw forbidden('You do not have access to this company');
        }
        
        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                stores: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        timezone: true,
                        syncEnabled: true,
                        lastAimsSyncAt: true,
                        isActive: true,
                        _count: {
                            select: { spaces: true, people: true, conferenceRooms: true }
                        }
                    },
                    orderBy: { code: 'asc' }
                },
                userCompanies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                globalRole: true,
                                isActive: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!company) {
            throw notFound('Company');
        }
        
        // Format response
        const canManage = canManageCompany(req, id);
        
        res.json({
            company: {
                id: company.id,
                code: company.code,
                name: company.name,
                location: company.location,
                description: company.description,
                isActive: company.isActive,
                createdAt: company.createdAt,
                updatedAt: company.updatedAt,
                // Only show AIMS config to managers
                aimsConfig: canManage ? {
                    baseUrl: company.aimsBaseUrl,
                    cluster: company.aimsCluster,
                    username: company.aimsUsername,
                    hasPassword: !!company.aimsPasswordEnc,
                } : undefined,
            },
            stores: company.stores.map(s => ({
                id: s.id,
                code: s.code,
                name: s.name,
                timezone: s.timezone,
                syncEnabled: s.syncEnabled,
                lastAimsSyncAt: s.lastAimsSyncAt,
                isActive: s.isActive,
                spaceCount: s._count.spaces,
                peopleCount: s._count.people,
                conferenceRoomCount: s._count.conferenceRooms,
            })),
            users: canManage ? company.userCompanies.map(uc => ({
                id: uc.user.id,
                email: uc.user.email,
                firstName: uc.user.firstName,
                lastName: uc.user.lastName,
                globalRole: uc.user.globalRole,
                companyRole: uc.role,
                allStoresAccess: uc.allStoresAccess,
                isActive: uc.user.isActive,
            })) : undefined,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /companies
 * Create a new company (Platform Admin only)
 */
router.post('/', async (req, res, next) => {
    try {
        // Only platform admins can create companies
        if (!isPlatformAdmin(req)) {
            throw forbidden('Only platform administrators can create companies');
        }
        
        const validation = createCompanySchema.safeParse(req.body);
        if (!validation.success) {
            throw badRequest(validation.error.errors[0].message);
        }
        
        const { code, name, location, description, aimsConfig } = validation.data;
        const upperCode = code.toUpperCase();
        
        // Check code uniqueness
        const existing = await prisma.company.findUnique({
            where: { code: upperCode }
        });
        
        if (existing) {
            throw conflict('Company code already exists');
        }
        
        // Encrypt AIMS password if provided
        let encryptedPassword: string | null = null;
        if (aimsConfig?.password) {
            encryptedPassword = encrypt(aimsConfig.password, config.encryptionKey);
        }
        
        const company = await prisma.company.create({
            data: {
                code: upperCode,
                name,
                location,
                description,
                aimsBaseUrl: aimsConfig?.baseUrl,
                aimsCluster: aimsConfig?.cluster,
                aimsUsername: aimsConfig?.username,
                aimsPasswordEnc: encryptedPassword,
            },
            include: {
                _count: {
                    select: { stores: true }
                }
            }
        });
        
        res.status(201).json({
            company: {
                id: company.id,
                code: company.code,
                name: company.name,
                location: company.location,
                description: company.description,
                isActive: company.isActive,
                storeCount: company._count.stores,
                hasAimsConfig: !!(company.aimsBaseUrl && company.aimsUsername),
                createdAt: company.createdAt,
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /companies/:id
 * Update company basic info
 */
router.patch('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Check management access
        if (!canManageCompany(req, id)) {
            throw forbidden('You do not have permission to update this company');
        }
        
        const validation = updateCompanySchema.safeParse(req.body);
        if (!validation.success) {
            throw badRequest(validation.error.errors[0].message);
        }
        
        const company = await prisma.company.update({
            where: { id },
            data: validation.data,
        });
        
        res.json({
            company: {
                id: company.id,
                code: company.code,
                name: company.name,
                location: company.location,
                description: company.description,
                isActive: company.isActive,
                updatedAt: company.updatedAt,
            }
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw notFound('Company');
        }
        next(error);
    }
});

/**
 * PATCH /companies/:id/aims
 * Update AIMS configuration
 */
router.patch('/:id/aims', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Check management access
        if (!canManageCompany(req, id)) {
            throw forbidden('You do not have permission to update AIMS configuration');
        }
        
        const validation = updateAimsConfigSchema.safeParse(req.body);
        if (!validation.success) {
            throw badRequest(validation.error.errors[0].message);
        }
        
        const { baseUrl, cluster, username, password } = validation.data;
        
        // Encrypt password
        const encryptedPassword = encrypt(password, config.encryptionKey);
        
        const company = await prisma.company.update({
            where: { id },
            data: {
                aimsBaseUrl: baseUrl,
                aimsCluster: cluster,
                aimsUsername: username,
                aimsPasswordEnc: encryptedPassword,
            },
        });
        
        res.json({
            aimsConfig: {
                baseUrl: company.aimsBaseUrl,
                cluster: company.aimsCluster,
                username: company.aimsUsername,
                hasPassword: true,
            }
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw notFound('Company');
        }
        next(error);
    }
});

/**
 * DELETE /companies/:id
 * Delete a company (Platform Admin only)
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Only platform admins can delete companies
        if (!isPlatformAdmin(req)) {
            throw forbidden('Only platform administrators can delete companies');
        }
        
        // Check if company exists
        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { stores: true, userCompanies: true }
                }
            }
        });
        
        if (!company) {
            throw notFound('Company');
        }
        
        // Warn about cascading deletes
        if (company._count.stores > 0) {
            // Delete will cascade to stores, spaces, people, etc.
            console.warn(`Deleting company ${company.code} with ${company._count.stores} stores`);
        }
        
        await prisma.company.delete({
            where: { id }
        });
        
        res.json({ 
            success: true,
            message: `Company ${company.code} deleted`,
            deletedStores: company._count.stores,
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw notFound('Company');
        }
        next(error);
    }
});

export default router;
