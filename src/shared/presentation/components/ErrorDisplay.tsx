import { Alert, AlertTitle, Box } from '@mui/material';

interface ErrorDisplayProps {
    title?: string;
    message: string;
    severity?: 'error' | 'warning' | 'info';
}

/**
 * Error Display Component
 * Shows error/warning messages in a styled alert
 */
export function ErrorDisplay({
    title = 'Error',
    message,
    severity = 'error'
}: ErrorDisplayProps) {
    return (
        <Box sx={{ my: 2 }}>
            <Alert severity={severity}>
                <AlertTitle>{title}</AlertTitle>
                {message}
            </Alert>
        </Box>
    );
}
