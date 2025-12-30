import { Alert, AlertTitle, Box, Button } from '@mui/material';

interface ErrorDisplayProps {
    title?: string;
    message: string;
    severity?: 'error' | 'warning' | 'info';
    onRetry?: () => void;
}

/**
 * Error Display Component
 * Shows error/warning messages in a styled alert
 */
export function ErrorDisplay({
    title = 'Error',
    message,
    severity = 'error',
    onRetry
}: ErrorDisplayProps) {
    return (
        <Box sx={{ my: 2 }}>
            <Alert
                severity={severity}
                action={
                    onRetry ? (
                        <Button color="inherit" size="small" onClick={onRetry}>
                            Retry
                        </Button>
                    ) : undefined
                }
            >
                <AlertTitle>{title}</AlertTitle>
                {message}
            </Alert>
        </Box>
    );
}
