/**
 * Shared types for EnhancedUserDialog components
 */
import type { StoreAssignmentData } from '../StoreAssignment';

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
        roleId: string;
        allStoresAccess: boolean;
    }>;
    stores?: Array<{
        store: { id: string; name: string; code: string; companyId: string };
        roleId: string;
        features: string[];
    }>;
}

export const CREATE_STEPS = ['basicInfo', 'companyAssignment', 'storeAssignment'] as const;

export type { StoreAssignmentData };
