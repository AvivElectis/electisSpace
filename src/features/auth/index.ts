/**
 * Auth Feature Index
 * Re-exports all auth components and hooks
 */

export { useAuthStore } from './infrastructure/authStore';
export { LoginPage } from './presentation/LoginPage';
export { ProtectedRoute } from './presentation/ProtectedRoute';
export { authService } from '@shared/infrastructure/services/authService';
export type { User, LoginResponse, AuthCredentials } from '@shared/infrastructure/services/authService';
