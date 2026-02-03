/**
 * Companies Feature - Module Exports
 * 
 * @description Clean export of the companies feature with layered architecture.
 * 
 * Architecture:
 * - types.ts     → Type definitions, DTOs, validation schemas
 * - repository.ts → Data access layer (Prisma operations)
 * - service.ts    → Business logic layer (authorization, orchestration)
 * - controller.ts → HTTP request/response handling
 * - routes.ts     → Route definitions (thin)
 */

// Route exports (for API registration)
export { default as companyRoutes } from './routes.js';

// Controller exports (for testing)
export { companyController } from './controller.js';

// Service exports (for use by other features)
export { companyService, isPlatformAdmin, canManageCompany, hasCompanyAccess } from './service.js';

// Repository exports (for direct data access if needed)
export { companyRepository } from './repository.js';

// Type exports (for use across the application)
export type {
    CompanyListParams,
    CreateCompanyDto,
    UpdateCompanyDto,
    UpdateAimsConfigDto,
    CompanyListItem,
    CompanyListResponse,
    CompanyDetails,
    CompanyDetailResponse,
    StoreListItem,
    CompanyUserItem,
    CodeValidationResponse,
    UserContext,
} from './types.js';

// Schema exports (for validation in other places)
export {
    companyCodeSchema,
    createCompanySchema,
    updateCompanySchema,
    updateAimsConfigSchema,
    aimsConfigSchema,
} from './types.js';
