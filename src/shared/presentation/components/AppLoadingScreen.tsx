import { Box } from '@mui/material';
import { SphereLoader } from './SphereLoader';

interface AppLoadingScreenProps {
    message?: string;
}

/**
 * Full-viewport centered loading screen with bouncing sphere animation.
 * Used for initial app load, route transitions, and store switching.
 */
export function AppLoadingScreen({ message }: AppLoadingScreenProps) {
    return (
        <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
            sx={{ bgcolor: 'background.default' }}
        >
            <SphereLoader message={message} />
        </Box>
    );
}
