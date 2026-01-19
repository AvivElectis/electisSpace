import { Box, Card, CardContent, Typography, Stack, Grid } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorIcon from '@mui/icons-material/Error';
import BusinessIcon from '@mui/icons-material/Business';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import PersonIcon from '@mui/icons-material/Person';
import { useTranslation } from 'react-i18next';
import { DashboardStatusChip } from './DashboardStatusChip';

interface DashboardAppInfoCardProps {
    workingMode: string;
    spaceType: string;
    spaceTypeLabel: string;
    autoSyncEnabled: boolean;
    syncInterval: number;
    lastSync?: string | Date | null;
}

/**
 * DashboardAppInfoCard - Application information card for dashboard
 */
export function DashboardAppInfoCard({
    workingMode,
    spaceType,
    spaceTypeLabel,
    autoSyncEnabled,
    syncInterval,
    lastSync,
}: DashboardAppInfoCardProps) {
    const { t } = useTranslation();

    const getSpaceIcon = (type: string) => {
        switch (type) {
            case 'office':
                return <BusinessIcon />;
            case 'room':
                return <MeetingRoomIcon />;
            case 'chair':
                return <EventSeatIcon />;
            case 'person-tag':
                return <PersonIcon />;
            default:
                return <SettingsIcon />;
        }
    };

    return (
        <Card data-testid="app-info-card">
            <CardContent>
                <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 3 }}>
                    <SettingsIcon color="action" />
                    <Typography variant="h6" fontWeight={600}>
                        {t('dashboard.applicationInfo')}
                    </Typography>
                </Stack>

                <Grid container spacing={4}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Stack gap={1}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('sync.workingMode')}
                            </Typography>
                            <Box>
                                {workingMode === 'SFTP' ? (
                                    <DashboardStatusChip label={t('sync.sftpMode')} color="info" icon={<SyncIcon />} sx={{ bgcolor: 'info.main', p: 2 }} />
                                ) : (
                                    <DashboardStatusChip
                                        label={t('sync.solumMode')}
                                        color="primary"
                                        icon={<SyncIcon />}
                                        sx={{ bgcolor: 'primary.main', p: 1 }}
                                    />
                                )}
                            </Box>
                        </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Stack gap={1}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('dashboard.spaceType')}
                            </Typography>
                            <Stack direction="row" alignItems="center" gap={1}>
                                <Box sx={{ color: 'action.active', display: 'flex' }}>
                                    {getSpaceIcon(spaceType)}
                                </Box>
                                <Typography variant="body1" sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
                                    {spaceTypeLabel}
                                </Typography>
                            </Stack>
                        </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Stack gap={1}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('dashboard.autoSync')}
                            </Typography>
                            <Stack direction="row" gap={1} alignItems="center">
                                {autoSyncEnabled ? (
                                    <DashboardStatusChip
                                        label={`${t('dashboard.every')} ${syncInterval}s`}
                                        color="success"
                                        icon={<AccessTimeIcon sx={{ width: 20, height: 20 }} />}
                                        sx={{ px: 0.5, paddingInlineStart: 1 }}
                                    />
                                ) : (
                                    <DashboardStatusChip
                                        label={t('dashboard.disabled')}
                                        color="default"
                                        icon={<ErrorIcon />}
                                    />
                                )}
                                {lastSync && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mx: 2 }}>
                                        (Last: {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                    </Typography>
                                )}
                            </Stack>
                        </Stack>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
