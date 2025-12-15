import { Box, CircularProgress, Skeleton, Typography } from '@mui/material';

/**
 * Loading Fallback Component
 * 
 * Shown while lazy-loaded routes/components are loading.
 * Provides a skeleton that matches the main app layout.
 */
export function LoadingFallback() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.default',
            }}
        >
            {/* Header Skeleton */}
            <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
                <Skeleton variant="rectangular" height={64} />
            </Box>

            {/* Tabs Skeleton */}
            <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', px: 3 }}>
                <Skeleton variant="rectangular" height={48} />
            </Box>

            {/* Content Skeleton */}
            <Box sx={{ flex: 1, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading...
                </Typography>
            </Box>
        </Box>
    );
}

/**
 * Simple Loading Spinner
 * 
 * Minimal loading indicator for inline use
 */
export function LoadingSpinner() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress />
        </Box>
    );
}
