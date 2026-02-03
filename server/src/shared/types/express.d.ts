/**
 * Express Type Augmentations
 * 
 * @description Extends Express Request interface with authentication data.
 * This file is automatically loaded by TypeScript.
 */
import { GlobalRole, StoreRole, CompanyRole } from '@prisma/client';

declare global {
    namespace Express {
        /**
         * Store access information for authenticated user
         */
        interface StoreAccess {
            id: string;
            role: StoreRole;
            companyId: string;
        }

        /**
         * Company access information for authenticated user
         */
        interface CompanyAccess {
            id: string;
            role: CompanyRole;
            allStoresAccess?: boolean;
        }

        /**
         * Authenticated user attached to request by auth middleware
         */
        interface AuthenticatedUser {
            id: string;
            email: string;
            globalRole: GlobalRole | null;
            stores: StoreAccess[];
            companies: CompanyAccess[];
        }

        /**
         * Extended Request interface with user and requestId
         */
        interface Request {
            user?: AuthenticatedUser;
            requestId?: string;
        }
    }
}

export {};
