/**
 * UserAppRoleSection - Inline app role selector for user dialog
 *
 * Allows platform admins and company admins to set a user's app-level (global) role.
 * Reuses the radio-card pattern from ElevateUserDialog.
 */
import {
    Box,
    Typography,
    RadioGroup,
    Radio,
    FormControlLabel,
    FormControl,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import { useTranslation } from 'react-i18next';

type AppRole = 'PLATFORM_ADMIN' | 'APP_VIEWER' | 'USER';

interface Props {
    appRole: AppRole;
    onAppRoleChange: (role: AppRole) => void;
    allowedRoles: AppRole[];
    disabled: boolean;
}

const roleConfig: Array<{ value: AppRole; icon: React.ReactNode; labelKey: string; descKey: string }> = [
    {
        value: 'PLATFORM_ADMIN',
        icon: <AdminPanelSettingsIcon />,
        labelKey: 'settings.users.role.platformAdmin',
        descKey: 'settings.users.role.platformAdminDesc',
    },
    {
        value: 'APP_VIEWER',
        icon: <VisibilityIcon />,
        labelKey: 'settings.users.role.appViewer',
        descKey: 'settings.users.role.appViewerDesc',
    },
    {
        value: 'USER',
        icon: <PersonIcon />,
        labelKey: 'settings.users.role.regularUser',
        descKey: 'settings.users.role.regularUserDesc',
    },
];

export function UserAppRoleSection({ appRole, onAppRoleChange, allowedRoles, disabled }: Props) {
    const { t } = useTranslation();

    const visibleRoles = roleConfig.filter(r => allowedRoles.includes(r.value));

    return (
        <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {t('settings.users.appRole', 'App Role')}
            </Typography>

            <FormControl component="fieldset" sx={{ width: '100%' }} disabled={disabled}>
                <RadioGroup
                    value={appRole}
                    onChange={(e) => onAppRoleChange(e.target.value as AppRole)}
                >
                    {visibleRoles.map((option) => (
                        <Box
                            key={option.value}
                            sx={{
                                border: 1,
                                borderColor: appRole === option.value ? 'primary.main' : 'divider',
                                borderRadius: 1,
                                p: 1.5,
                                mb: 1,
                                cursor: disabled ? 'default' : 'pointer',
                                bgcolor: appRole === option.value ? 'action.selected' : 'transparent',
                                opacity: disabled ? 0.6 : 1,
                                transition: 'all 0.15s',
                                '&:hover': disabled ? {} : { bgcolor: 'action.hover' },
                            }}
                            onClick={() => !disabled && onAppRoleChange(option.value)}
                        >
                            <FormControlLabel
                                value={option.value}
                                control={<Radio size="small" />}
                                sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                                label={
                                    <Box sx={{ ml: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {option.icon}
                                            <Typography variant="body2" fontWeight={600}>
                                                {t(option.labelKey)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {t(option.descKey)}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Box>
                    ))}
                </RadioGroup>
            </FormControl>
        </Box>
    );
}
