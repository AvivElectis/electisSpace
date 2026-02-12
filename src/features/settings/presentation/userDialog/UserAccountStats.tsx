/**
 * UserAccountStats - Login count, last login, member since
 */
import { Box, Typography, Grid } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoginIcon from '@mui/icons-material/Login';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import type { UserData } from './types';

interface Props {
    userData: UserData | null;
}

export function UserAccountStats({ userData }: Props) {
    const { t } = useTranslation();

    if (!userData) return null;

    return (
        <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('settings.users.accountStats')}
            </Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LoginIcon fontSize="small" color="action" />
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                {t('settings.users.loginCount')}
                            </Typography>
                            <Typography variant="body2">
                                {userData?.loginCount || 0}
                            </Typography>
                        </Box>
                    </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                {t('settings.users.lastLogin')}
                            </Typography>
                            <Typography variant="body2">
                                {userData?.lastLogin
                                    ? formatDistanceToNow(new Date(userData.lastLogin), { addSuffix: true })
                                    : t('common.never')
                                }
                            </Typography>
                        </Box>
                    </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                {t('settings.users.memberSince')}
                            </Typography>
                            <Typography variant="body2">
                                {userData?.createdAt
                                    ? new Date(userData.createdAt).toLocaleDateString()
                                    : '-'
                                }
                            </Typography>
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}
