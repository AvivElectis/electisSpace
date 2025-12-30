import { Snackbar, Alert } from '@mui/material';
import type { AlertColor } from '@mui/material';
import { useNotificationStore } from '@shared/infrastructure/store/notificationStore';
import type { NotificationType } from '@shared/infrastructure/store/notificationStore';

/**
 * NotificationContainer Component
 * 
 * Displays toast notifications at the top-right of the screen.
 * Supports multiple simultaneous notifications in a stack.
 * Auto-dismisses based on configured duration.
 */
export function NotificationContainer() {
    const notifications = useNotificationStore((state) => state.notifications);
    const removeNotification = useNotificationStore((state) => state.removeNotification);

    const mapTypeToSeverity = (type: NotificationType): AlertColor => {
        // MUI Alert uses 'success', 'error', 'info', 'warning' which matches our types
        return type as AlertColor;
    };

    return (
        <>
            {notifications.map((notification, index) => (
                <Snackbar
                    key={notification.id}
                    open={true}
                    autoHideDuration={notification.duration}
                    onClose={() => removeNotification(notification.id)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    sx={{
                        // Stack notifications vertically
                        top: `${24 + index * 70}px !important`,
                    }}
                >
                    <Alert
                        onClose={() => removeNotification(notification.id)}
                        severity={mapTypeToSeverity(notification.type)}
                        variant="filled"
                        sx={{
                            width: '100%',
                            minWidth: '300px',
                            maxWidth: '500px',
                        }}
                    >
                        {notification.message}
                    </Alert>
                </Snackbar>
            ))}
        </>
    );
}
