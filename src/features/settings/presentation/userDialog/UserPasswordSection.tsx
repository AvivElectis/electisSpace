/**
 * UserPasswordSection - Password change (profile) and reset (admin) forms
 */
import {
    Box,
    TextField,
    Typography,
    Button,
    IconButton,
    CircularProgress,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';

interface Props {
    profileMode: boolean;
    isRtl: boolean;
    submitting: boolean;
    // Password fields
    showPasswordSection: boolean;
    onShowPasswordSectionChange: (show: boolean) => void;
    currentPassword: string;
    onCurrentPasswordChange: (value: string) => void;
    newPassword: string;
    onNewPasswordChange: (value: string) => void;
    confirmPassword: string;
    onConfirmPasswordChange: (value: string) => void;
    showCurrentPassword: boolean;
    onShowCurrentPasswordChange: (show: boolean) => void;
    showNewPassword: boolean;
    onShowNewPasswordChange: (show: boolean) => void;
    // Handlers
    onChangePassword: () => Promise<void>;
    onResetPassword: () => Promise<void>;
}

export function UserPasswordSection({
    profileMode, isRtl, submitting,
    showPasswordSection, onShowPasswordSectionChange,
    currentPassword, onCurrentPasswordChange,
    newPassword, onNewPasswordChange,
    confirmPassword, onConfirmPasswordChange,
    showCurrentPassword, onShowCurrentPasswordChange,
    showNewPassword, onShowNewPasswordChange,
    onChangePassword, onResetPassword,
}: Props) {
    const { t } = useTranslation();

    const toggleIconSx = {
        mt: 0.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        width: 40,
        height: 40
    };

    // Profile mode - requires current password
    if (profileMode) {
        return (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="primary">
                        {t('settings.users.password')}
                    </Typography>
                    <Button
                        size="small"
                        onClick={() => onShowPasswordSectionChange(!showPasswordSection)}
                    >
                        {showPasswordSection ? t('common.cancel') : t('settings.users.changePassword')}
                    </Button>
                </Box>

                {showPasswordSection && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                                label={t('settings.users.currentPassword')}
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => onCurrentPasswordChange(e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                            <IconButton onClick={() => onShowCurrentPasswordChange(!showCurrentPassword)} sx={toggleIconSx}>
                                {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                                label={t('settings.users.newPassword')}
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => onNewPasswordChange(e.target.value)}
                                size="small"
                                helperText={t('settings.users.passwordRequirements')}
                                sx={{ flex: 1 }}
                            />
                            <IconButton onClick={() => onShowNewPasswordChange(!showNewPassword)} sx={toggleIconSx}>
                                {showNewPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </Box>
                        <TextField
                            label={t('settings.users.confirmPassword')}
                            type="password"
                            fullWidth
                            value={confirmPassword}
                            onChange={(e) => onConfirmPasswordChange(e.target.value)}
                            size="small"
                            error={confirmPassword.length > 0 && newPassword !== confirmPassword}
                            helperText={
                                confirmPassword.length > 0 && newPassword !== confirmPassword
                                    ? t('settings.users.passwordMismatch')
                                    : ''
                            }
                        />
                        <Button
                            variant="contained"
                            color="warning"
                            onClick={onChangePassword}
                            disabled={submitting || !currentPassword || !newPassword || newPassword !== confirmPassword}
                        >
                            {submitting ? <CircularProgress size={20} /> : t('settings.users.changePassword')}
                        </Button>
                    </Box>
                )}
            </Box>
        );
    }

    // Admin mode - reset password without current password
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="primary">
                    {t('settings.users.resetPassword')}
                </Typography>
                <Button
                    size="small"
                    onClick={() => onShowPasswordSectionChange(!showPasswordSection)}
                >
                    {showPasswordSection ? t('common.cancel') : t('settings.users.resetPassword')}
                </Button>
            </Box>

            {showPasswordSection && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
                        <TextField
                            label={t('settings.users.newPassword')}
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => onNewPasswordChange(e.target.value)}
                            size="small"
                            helperText={t('settings.users.passwordRequirements')}
                            sx={{ flex: 1 }}
                        />
                        <IconButton onClick={() => onShowNewPasswordChange(!showNewPassword)} sx={toggleIconSx}>
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </Box>
                    <TextField
                        label={t('settings.users.confirmPassword')}
                        type="password"
                        fullWidth
                        value={confirmPassword}
                        onChange={(e) => onConfirmPasswordChange(e.target.value)}
                        size="small"
                        error={confirmPassword.length > 0 && newPassword !== confirmPassword}
                        helperText={
                            confirmPassword.length > 0 && newPassword !== confirmPassword
                                ? t('settings.users.passwordMismatch')
                                : ''
                        }
                    />
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={onResetPassword}
                        disabled={submitting || !newPassword || newPassword !== confirmPassword}
                    >
                        {submitting ? <CircularProgress size={20} /> : t('settings.users.resetPassword')}
                    </Button>
                </Box>
            )}
        </Box>
    );
}
