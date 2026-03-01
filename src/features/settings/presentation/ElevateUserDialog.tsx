/**
 * Elevate User Dialog
 *
 * @description Dialog for changing a user's app-level (global) role.
 * Supports: Platform Admin, App Viewer, Regular User.
 * Only PLATFORM_ADMIN users can access this functionality.
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
    RadioGroup,
    Radio,
    FormControlLabel,
    FormControl,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@shared/infrastructure/services/apiClient';
import type { User } from '@shared/infrastructure/services/userService';

type AppRole = 'PLATFORM_ADMIN' | 'APP_VIEWER' | 'USER';

interface ElevateUserDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: User;
    /** Roles the caller is allowed to assign. Defaults to all. */
    allowedRoles?: AppRole[];
}

export function ElevateUserDialog({ open, onClose, onSuccess, user, allowedRoles }: ElevateUserDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Determine current role
    const currentRole: AppRole = user.globalRole === 'PLATFORM_ADMIN'
        ? 'PLATFORM_ADMIN'
        : user.globalRole === 'APP_VIEWER'
            ? 'APP_VIEWER'
            : 'USER';

    // State
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<AppRole>(currentRole);

    // Reset state when dialog opens
    const handleEnter = () => {
        setError(null);
        setSelectedRole(currentRole);
    };

    // Handle role change
    const handleSubmit = async () => {
        if (selectedRole === currentRole) {
            onClose();
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await api.post(`/users/${user.id}/elevate`, {
                globalRole: selectedRole,
            });
            onSuccess();
        } catch (err: any) {
            console.error('Failed to change user role:', err);
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

    const roleOptions: Array<{ value: AppRole; icon: React.ReactNode; label: string; description: string; color: 'warning' | 'info' | 'default' }> = [
        {
            value: 'PLATFORM_ADMIN',
            icon: <AdminPanelSettingsIcon />,
            label: t('settings.users.role.platformAdmin', 'App Admin'),
            description: t('settings.users.role.platformAdminDesc', 'Full unrestricted access to all companies, stores, and settings'),
            color: 'warning',
        },
        {
            value: 'APP_VIEWER',
            icon: <VisibilityIcon />,
            label: t('settings.users.role.appViewer', 'App Viewer'),
            description: t('settings.users.role.appViewerDesc', 'Read-only access — all add, edit, and delete actions are disabled'),
            color: 'info',
        },
        {
            value: 'USER',
            icon: <PersonIcon />,
            label: t('settings.users.role.regularUser', 'Regular User'),
            description: t('settings.users.role.regularUserDesc', 'Access determined by company and store role assignments'),
            color: 'default',
        },
    ];

    return (
        <Dialog
            open={open}
            onClose={submitting ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            TransitionProps={{ onEnter: handleEnter }}
            PaperProps={{
                sx: { maxHeight: isMobile ? '100%' : '90vh', borderRadius: isMobile ? 0 : undefined }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AdminPanelSettingsIcon color="primary" />
                {t('settings.users.changeAppRole', 'Change App Role')}
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* User Info */}
                <Box sx={{
                    bgcolor: 'action.hover',
                    p: 2,
                    borderRadius: 1,
                    mb: 3
                }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t('settings.users.userToElevate', 'User')}
                    </Typography>
                    <Typography variant="h6">
                        {displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {user.email}
                    </Typography>
                </Box>

                {/* Role Selection */}
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                    <RadioGroup
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as AppRole)}
                    >
                        {roleOptions.filter(o => !allowedRoles || allowedRoles.includes(o.value)).map((option) => (
                            <Box
                                key={option.value}
                                sx={{
                                    border: 1,
                                    borderColor: selectedRole === option.value ? 'primary.main' : 'divider',
                                    borderRadius: 1,
                                    p: 2,
                                    mb: 1,
                                    cursor: 'pointer',
                                    bgcolor: selectedRole === option.value ? 'action.selected' : 'transparent',
                                    transition: 'all 0.15s',
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                                onClick={() => setSelectedRole(option.value)}
                            >
                                <FormControlLabel
                                    value={option.value}
                                    control={<Radio />}
                                    sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                                    label={
                                        <Box sx={{ ml: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {option.icon}
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {option.label}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                {option.description}
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Box>
                        ))}
                    </RadioGroup>
                </FormControl>

                {/* Warning for Platform Admin */}
                {selectedRole === 'PLATFORM_ADMIN' && selectedRole !== currentRole && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        {t('settings.users.elevateWarning', 'This will grant full administrative access to all companies, stores, and platform settings.')}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={submitting}>
                    {t('common.cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting || selectedRole === currentRole}
                    startIcon={submitting ? <CircularProgress size={16} /> : undefined}
                >
                    {t('settings.users.elevateButton', 'Save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ElevateUserDialog;
