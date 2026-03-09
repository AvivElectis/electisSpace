import { useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useCompassAuthStore } from '../application/useCompassAuthStore';

export function SsoCallbackPage() {
    const [searchParams] = useSearchParams();
    const { handleSsoCallback, isAuthenticated } = useCompassAuthStore();

    useEffect(() => {
        const token = searchParams.get('token');
        const refresh = searchParams.get('refresh');
        if (token && refresh) {
            handleSsoCallback(token, refresh);
        }
    }, [searchParams, handleSsoCallback]);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const hasError = !searchParams.get('token');

    if (hasError) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>Completing SSO login...</Typography>
            </Box>
        </Box>
    );
}
