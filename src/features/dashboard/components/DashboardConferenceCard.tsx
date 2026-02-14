import { Box, Card, CardContent, Typography, Stack, Button, Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupsIcon from '@mui/icons-material/Groups';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface DashboardConferenceCardProps {
    totalRooms: number;
    roomsWithLabels: number;
    roomsWithoutLabels: number;
    availableRooms: number;
    occupiedRooms: number;
    onAddRoom: () => void;
    hideAddButton?: boolean;
}

/**
 * DashboardConferenceCard - Conference rooms overview card for dashboard
 */
export function DashboardConferenceCard({
    totalRooms,
    roomsWithLabels,
    roomsWithoutLabels,
    availableRooms,
    occupiedRooms,
    onAddRoom,
    hideAddButton,
}: DashboardConferenceCardProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

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
