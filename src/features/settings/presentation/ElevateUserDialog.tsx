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
                t('settings.users.elevateError', 'Failed to elevate user')
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
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AdminPanelSettingsIcon color="warning" />
                {t('settings.users.elevateTitle', 'Elevate to Platform Admin')}
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Warning */}
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
                    {t('settings.users.elevateWarning', 
                        'You are about to grant PLATFORM_ADMIN privileges to this user. This action cannot be easily undone.')}
                </Alert>

                {/* User Info */}
                <Box sx={{ 
                    bgcolor: 'action.hover', 
                    p: 2, 
                    borderRadius: 1,
                    mb: 3
                }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t('settings.users.userToElevate', 'User to elevate')}
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
                    {t('settings.users.platformAdminPrivileges', 'Platform Admin privileges include:')}
                </Typography>

                <List dense>
                    <ListItem>
                        <ListItemIcon>
                            <BusinessIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                            primary={t('settings.users.privilege.companies', 'Create and manage all companies')}
                            secondary={t('settings.users.privilege.companiesDesc', 'Full control over company settings and AIMS configuration')}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <GroupIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                            primary={t('settings.users.privilege.users', 'Manage all users across all companies')}
                            secondary={t('settings.users.privilege.usersDesc', 'Assign users to any company or store, change roles')}
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <SecurityIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                            primary={t('settings.users.privilege.elevate', 'Elevate other users to Platform Admin')}
                            secondary={t('settings.users.privilege.elevateDesc', 'Grant highest-level access to other users')}
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
                                {t('settings.users.elevateConfirm', 
                                    'I understand and want to grant Platform Admin privileges to this user')}
                            </Typography>
                        }
                    />
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>
                    {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                    variant="contained"
                    color="warning"
                    onClick={handleElevate}
                    disabled={submitting || !confirmed}
                    startIcon={submitting ? <CircularProgress size={16} /> : <AdminPanelSettingsIcon />}
                >
                    {t('settings.users.elevateButton', 'Elevate User')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ElevateUserDialog;
