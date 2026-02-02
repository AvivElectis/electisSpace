/**
 * Elevate User Dialog
 * 
 * @description Dialog for promoting a user to PLATFORM_ADMIN role.
 * Only PLATFORM_ADMIN users can access this functionality.
 * Includes confirmation step with warning about elevated privileges.
 */
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Alert,
    Box,
    CircularProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import BusinessIcon from '@mui/icons-material/Business';
import GroupIcon from '@mui/icons-material/Group';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@shared/infrastructure/services/apiClient';
import type { User } from '@shared/infrastructure/services/userService';

interface ElevateUserDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: User;
}

export function ElevateUserDialog({ open, onClose, onSuccess, user }: ElevateUserDialogProps) {
    const { t } = useTranslation();

    // State
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    // Reset state when dialog opens
    const handleEnter = () => {
        setError(null);
        setConfirmed(false);
    };

    // Handle elevation
    const handleElevate = async () => {
        if (!confirmed) return;

        setSubmitting(true);
        setError(null);

        try {
            await api.post(`/users/${user.id}/elevate`, {
                targetRole: 'PLATFORM_ADMIN'
            });
            onSuccess();
        } catch (err: any) {
            console.error('Failed to elevate user:', err);
            setError(
                err.response?.data?.message || 
                t('settings.users.elevateError')
            );
        } finally {
            setSubmitting(false);
        }
    };

    // User display name
    const displayName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.email;

    return (
        <Dialog 
            open={open} 
            onClose={submitting ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            TransitionProps={{ onEnter: handleEnter }}
            PaperProps={{
                sx: { maxHeight: '90vh' }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AdminPanelSettingsIcon color="warning" />
                {t('settings.users.elevateTitle')}
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Warning */}
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
                    {t('settings.users.elevateWarning')}
                </Alert>

                {/* User Info */}
                <Box sx={{ 
                    bgcolor: 'action.hover', 
                    p: 2, 
                    borderRadius: 1,
                    mb: 3
                }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t('settings.users.userToElevate')}
                    </Typography>
                    <Typography variant="h6">
                        {displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {user.email}
                    </Typography>
                </Box>

                {/* Privileges List */}
                <Typography variant="subtitle2" gutterBottom>
                    {t('settings.users.platformAdminPrivileges')}
                </Typography>

                <List dense>
                    <ListItem>
                        <ListItemIcon>
                            <BusinessIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                            primary={t('settings.users.privilege.companies')}
                            secondary={t('settings.users.privilege.companiesDesc')}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <GroupIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                            primary={t('settings.users.privilege.users')}
                            secondary={t('settings.users.privilege.usersDesc')}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <SecurityIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                            primary={t('settings.users.privilege.elevate')}
                            secondary={t('settings.users.privilege.elevateDesc')}
                        />
                    </ListItem>
                </List>

                {/* Confirmation Checkbox */}
                <Box sx={{ mt: 3 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                color="warning"
                            />
                        }
                        label={
                            <Typography variant="body2">
                                {t('settings.users.elevateConfirm')}
                            </Typography>
                        }
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={submitting}>
                    {t('common.cancel')}
                </Button>
                <Button
                    variant="contained"
                    color="warning"
                    onClick={handleElevate}
                    disabled={submitting || !confirmed}
                    startIcon={submitting ? <CircularProgress size={16} /> : <AdminPanelSettingsIcon />}
                >
                    {t('settings.users.elevateButton')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ElevateUserDialog;
