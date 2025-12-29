import { Box, CircularProgress, Skeleton, Stack } from '@mui/material';

/**
 * Loading fallback for route transitions
 * Displays a skeleton UI while lazy-loaded routes are loading
 */
export function RouteLoadingFallback() {
    return (
        <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
                {/* Page header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton variant="text" width={200} height={40} />
                    <Skeleton variant="rectangular" width={120} height={40} />
                </Box>

                {/* Search/filter bar */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Skeleton variant="rectangular" width="100%" height={56} />
                    <Skeleton variant="rectangular" width={120} height={56} />
                </Box>

                {/* Content area */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 400
                }}>
                    <CircularProgress size={60} />
                </Box>
            </Stack>
        </Box>
    );
}
