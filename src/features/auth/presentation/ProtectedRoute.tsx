/**
 * Protected Route Component
 * Redirects to login if user is not authenticated.
 * Waits for session restoration before making auth decisions.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { tokenManager } from '@shared/infrastructure/services/apiClient';
import { CircularProgress, Box, Typography } from '@mui/material';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const location = useLocation();
    const { isAuthenticated, isLoading, user, isInitialized } = useAuthStore();

    // Check if we have a token in memory
    const hasToken = tokenManager.getAccessToken();

    // Show loading while session is being restored
    // This prevents redirecting to login before we've tried to restore the session
    if (!isInitialized || isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    gap: 2,
                }}
            >
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                    Restoring session...
                </Typography>
            </Box>
        );
    }

    // After initialization, if not authenticated and no token, redirect to login
    if (!isAuthenticated && !hasToken && !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Render children if authenticated or has user/token
    return <>{children}</>;
}

export default ProtectedRoute;
