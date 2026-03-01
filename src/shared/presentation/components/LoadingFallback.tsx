import { Box } from '@mui/material';
import { AppLoadingScreen } from './AppLoadingScreen';
import { SphereLoader } from './SphereLoader';

/**
 * Loading Fallback Component
 *
 * Shown while lazy-loaded routes/components are loading.
 * Uses the sphere animation for a consistent branded experience.
 */
export function LoadingFallback() {
    return <AppLoadingScreen />;
}

/**
 * Simple Loading Spinner
 *
 * Minimal loading indicator for inline use
 */
export function LoadingSpinner() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <SphereLoader width={160} height={120} />
        </Box>
    );
}
