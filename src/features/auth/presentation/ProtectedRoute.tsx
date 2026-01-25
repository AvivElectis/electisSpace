/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { tokenManager } from '@shared/infrastructure/services/apiClient';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const location = useLocation();
    const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();

    // Check auth state on mount
    const hasToken = tokenManager.getAccessToken();

    // If we have a token but no user, we might be restoring session
    if (hasToken && !user && !isLoading) {
        // Trigger auth check
        checkAuth();
    }

    // Show loading while checking auth
    if (isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    // If not authenticated and no token, redirect to login
    if (!isAuthenticated && !hasToken) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Render children if authenticated
    return <>{children}</>;
}

export default ProtectedRoute;
