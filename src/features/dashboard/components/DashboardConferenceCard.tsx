import { Box, Card, CardContent, Typography, Stack, Button, Grid, LinearProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupsIcon from '@mui/icons-material/Groups';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MobileStatTile } from './MobileStatTile';

interface DashboardConferenceCardProps {
    totalRooms: number;
    roomsWithLabels: number;
    roomsWithoutLabels: number;
    assignedLabelsCount: number;
    availableRooms: number;
    occupiedRooms: number;
    onAddRoom: () => void;
    hideAddButton?: boolean;
    isMobile?: boolean;
}

/**
 * DashboardConferenceCard - Conference rooms overview card for dashboard
 */
export function DashboardConferenceCard({
    totalRooms,
    roomsWithLabels,
    roomsWithoutLabels,
    assignedLabelsCount,
    availableRooms,
    occupiedRooms,
    onAddRoom,
    hideAddButton,
    isMobile,
}: DashboardConferenceCardProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const availabilityPercent = totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 0;

    if (isMobile) {
        return (
            <Card data-testid="conference-card">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Tappable header */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        gap={1}
                        onClick={() => navigate('/conference')}
                        sx={{ mb: 2, cursor: 'pointer' }}
                    >
                        <GroupsIcon color="primary" sx={{ fontSize: 24 }} />
                        <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                            {t('conference.title')}
                        </Typography>
                        <ArrowForwardIcon fontSize="small" color="action" />
                    </Stack>

                    {/* Hero number */}
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                        <Typography variant="h2" fontWeight={700} color="primary.main">
                            {totalRooms}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                            {t('dashboard.totalRooms')}
                        </Typography>
                    </Box>

                    {/* Progress bar — availability */}
                    <Stack gap={0.5} sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('dashboard.availability', { count: availableRooms, total: totalRooms })}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                                {availabilityPercent}%
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={availabilityPercent}
                            color="success"
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                    </Stack>

                    {/* Stat tiles row 1 — labels */}
                    <Stack direction="row" gap={1} sx={{ mb: 1 }}>
                        <MobileStatTile
                            value={roomsWithLabels}
                            label={t('dashboard.withLabels')}
                            color="primary"
                        />
                        <MobileStatTile
                            value={roomsWithoutLabels}
                            label={t('dashboard.withoutLabels')}
                            color="warning"
                        />
                        <MobileStatTile
                            value={assignedLabelsCount}
                            label={t('dashboard.assignedLabels')}
                            color="info"
                        />
                    </Stack>

                    {/* Stat tiles row 2 — availability */}
                    <Stack direction="row" gap={1}>
                        <Box sx={{ flex: 1 }}>
                            <MobileStatTile
                                value={availableRooms}
                                label={t('conference.available')}
                                color="success"
                            />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <MobileStatTile
                                value={occupiedRooms}
                                label={t('conference.occupied')}
                                color="error"
                            />
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }} data-testid="conference-card">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" gap={1} alignItems="center">
                        <GroupsIcon color="primary" sx={{ fontSize: 28 }} />
                        <Typography variant="h6" fontWeight={600} sx={{ px: 1 }}>
                            {t('conference.title')}
                        </Typography>
                    </Stack>
                    <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => navigate('/conference')}
                        sx={{ fontSize: '0.95rem' }}
                    >
                        {t('dashboard.toRooms', 'To Rooms')}
                    </Button>
                </Stack>

                <Stack gap={2}>
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {t('dashboard.totalRooms', 'Total Rooms')}
                        </Typography>
                        <Typography variant="h3" fontWeight={600} color="primary.main">
                            {totalRooms}
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    {t('dashboard.withLabels')}
                                </Typography>
                                <Typography variant="h5" fontWeight={500}>
                                    {roomsWithLabels}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    {t('dashboard.withoutLabels')}
                                </Typography>
                                <Typography variant="h5" fontWeight={500} color="warning.main">
                                    {roomsWithoutLabels}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    {t('dashboard.assignedLabels')}
                                </Typography>
                                <Typography variant="h5" fontWeight={500} color="info.main">
                                    {assignedLabelsCount}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    {t('conference.available')}
                                </Typography>
                                <Typography variant="h5" fontWeight={500} color="success.main">
                                    {availableRooms}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    {t('conference.occupied')}
                                </Typography>
                                <Typography variant="h5" fontWeight={500} color="error.main">
                                    {occupiedRooms}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    {!hideAddButton && (
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={onAddRoom}
                            sx={{ width: 'fit-content' }}
                        >
                            {t('conference.addRoom')}
                        </Button>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
