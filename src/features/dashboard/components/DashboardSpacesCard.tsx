import { Box, Card, CardContent, Typography, Stack, Button, Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface DashboardSpacesCardProps {
    spaceTypeIcon: string;
    spaceTypeLabel: string;
    totalSpaces: number;
    spacesWithLabels: number;
    spacesWithoutLabels: number;
    onAddSpace: () => void;
}

/**
 * DashboardSpacesCard - Spaces overview card for dashboard
 */
export function DashboardSpacesCard({
    spaceTypeIcon,
    spaceTypeLabel,
    totalSpaces,
    spacesWithLabels,
    spacesWithoutLabels,
    onAddSpace,
}: DashboardSpacesCardProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

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
        <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }} data-testid="spaces-card">
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Stack direction="row" gap={1} alignItems="center">
                        <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: 28 } }}>
                            {getSpaceIcon(spaceTypeIcon)}
                        </Box>
                        <Typography variant="h6" fontWeight={600} sx={{ px: 1 }}>
                            {spaceTypeLabel}
                        </Typography>
                    </Stack>
                    <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => navigate('/spaces')}
                    >
                        {t('dashboard.toSpaceType', { type: spaceTypeLabel })}
                    </Button>
                </Stack>

                <Stack gap={3}>
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {t('dashboard.totalSpaces', 'Total Spaces')}
                        </Typography>
                        <Typography variant="h3" fontWeight={600} color="primary.main">
                            {totalSpaces}
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    {t('dashboard.withLabels')}
                                </Typography>
                                <Typography variant="h5" fontWeight={500}>
                                    {spacesWithLabels}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    {t('dashboard.withoutLabels')}
                                </Typography>
                                <Typography variant="h5" fontWeight={500} color="warning.main">
                                    {spacesWithoutLabels}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={onAddSpace}
                        sx={{ mt: 2, width: 'fit-content' }}
                    >
                        {t('dashboard.addSpace', 'Add Space')}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
}
