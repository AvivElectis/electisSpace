import { Button, Box, Stack, Typography, Paper } from '@mui/material';
import { useNotifications } from '@shared/infrastructure/store/rootStore';

/**
 * Demo Component for Testing Notification System
 * 
 * This component demonstrates how to use the notification system.
 * Can be used for manual testing or as a reference implementation.
 */
export function NotificationDemo() {
    const { showSuccess, showError, showInfo, showWarning } = useNotifications();

    return (
        <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
            <Typography variant="h5" gutterBottom>
                Notification System Demo
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                Click the buttons below to test different notification types.
            </Typography>

            <Stack spacing={2} sx={{ mt: 3 }}>
                <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    onClick={() => showSuccess('✅ Operation completed successfully!')}
                >
                    Show Success Notification
                </Button>

                <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    onClick={() => showError('❌ An error occurred while processing your request')}
                >
                    Show Error Notification
                </Button>

                <Button
                    variant="contained"
                    color="info"
                    fullWidth
                    onClick={() => showInfo('ℹ️ Here is some helpful information')}
                >
                    Show Info Notification
                </Button>

                <Button
                    variant="contained"
                    color="warning"
                    fullWidth
                    onClick={() => showWarning('⚠️ Please review your settings before continuing')}
                >
                    Show Warning Notification
                </Button>

                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                        <strong>Usage Example:</strong>
                    </Typography>
                    <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                        {`import { useNotifications } from '@shared/infrastructure/store/rootStore';

const { showSuccess, showError } = useNotifications();

// On successful save:
showSuccess('Settings saved!');

// On error:
showError('Failed to connect');`}
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
}
