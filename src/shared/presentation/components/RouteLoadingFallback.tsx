import { Box } from '@mui/material';
import { SphereLoader } from './SphereLoader';

/**
 * Loading fallback for route transitions
 * Shows sphere animation when navigating to a lazy-loaded route
 */
export function RouteLoadingFallback() {
    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
            p: 3,
        }}>
            <SphereLoader width={240} height={180} />
        </Box>
    );
}
