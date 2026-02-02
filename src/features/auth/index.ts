/**
 * Auth Feature Index
 * Re-exports all auth components and hooks
 */

// Infrastructure
export { useAuthStore } from './infrastructure/authStore';

// Application (hooks & helpers)
export { useAuthContext } from './application/useAuthContext';
export type { AuthContext } from './application/useAuthContext';
export * from './application/permissionHelpers';

// Presentation
export { LoginPage } from './presentation/LoginPage';
export { ProtectedRoute } from './presentation/ProtectedRoute';
export { ProtectedFeature, usePermissionCheck } from './presentation/ProtectedFeature';
export { CompanyStoreSelector } from './presentation/CompanyStoreSelector';

// Re-export from shared
export { authService } from '@shared/infrastructure/services/authService';
export type { User, Store, Company, LoginResponse, AuthCredentials } from '@shared/infrastructure/services/authService';
