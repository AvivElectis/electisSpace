import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
    message?: string;
    size?: number;
}

/**
 * Loading Spinner Component
 * Displays a centered loading indicator with optional message
 */
export function LoadingSpinner({ message = 'Loading...', size = 40 }: LoadingSpinnerProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                gap: 2,
            }}
        >
            <CircularProgress size={size} aria-busy="true" />
            {message && (
                <Typography variant="body2" color="text.secondary">
                    {message}
                </Typography>
            )}
        </Box>
    );
}
