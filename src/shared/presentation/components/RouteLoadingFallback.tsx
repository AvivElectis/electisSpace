import { Box, CircularProgress, Skeleton, Stack } from '@mui/material';

/**
 * Loading fallback for route transitions
 * Shows immediately when navigating to a lazy-loaded route
 */
export function RouteLoadingFallback() {
    return (
        <Box sx={{ p: 3 }}>
            <Stack gap={3}>
                {/* Page header skeleton */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton variant="text" width={200} height={40} animation="wave" />
                    <Skeleton variant="rectangular" width={120} height={40} animation="wave" />
                </Box>

                {/* Search/filter bar skeleton */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Skeleton variant="rectangular" width="100%" height={56} animation="wave" />
                    <Skeleton variant="rectangular" width={120} height={56} animation="wave" />
                </Box>

                {/* Content area with centered spinner */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 300
                }}>
                    <CircularProgress size={48} />
                </Box>
            </Stack>
        </Box>
    );
}
