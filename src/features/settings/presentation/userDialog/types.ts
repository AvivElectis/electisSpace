/**
 * Shared types for EnhancedUserDialog components
 */
import type { StoreAssignmentData } from '../StoreAssignment';

/** Roles selectable in the UI (excludes SUPER_USER which is server-only) */
export const COMPANY_ROLES = ['VIEWER', 'STORE_VIEWER', 'STORE_ADMIN', 'COMPANY_ADMIN'] as const;
export type CompanyRole = typeof COMPANY_ROLES[number];

/** All possible company roles returned by the server */
export type ServerCompanyRole = CompanyRole | 'SUPER_USER';

export interface UserData {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone?: string | null;
    globalRole: 'PLATFORM_ADMIN' | null;
    isActive: boolean;
    lastLogin?: string | null;
    lastActivity?: string | null;
    loginCount?: number;
    createdAt?: string;
    companies?: Array<{
        company: { id: string; name: string; code: string };
        role: ServerCompanyRole;
    }>;
    stores?: Array<{
        store: { id: string; name: string; code: string; companyId: string };
        role: string;
        features: string[];
    }>;
}

export const CREATE_STEPS = ['basicInfo', 'companyAssignment', 'storeAssignment'] as const;

export type { StoreAssignmentData };
