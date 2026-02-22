import { Box, Card, CardContent, Typography, Stack, Button, Grid, LinearProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MobileStatTile } from './MobileStatTile';

interface DashboardSpacesCardProps {
    spaceTypeIcon: string;
    spaceTypeLabel: string;
    totalSpaces: number;
    spacesWithLabels: number;
    spacesWithoutLabels: number;
    assignedLabelsCount: number;
    onAddSpace: () => void;
    hideAddButton?: boolean;
    isMobile?: boolean;
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
    assignedLabelsCount,
    onAddSpace,
    hideAddButton,
    isMobile,
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

    const coveragePercent = totalSpaces > 0 ? Math.round((spacesWithLabels / totalSpaces) * 100) : 0;

    if (isMobile) {
        return (
            <Card data-testid="spaces-card">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Tappable header */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        gap={1}
                        onClick={() => navigate('/spaces')}
                        sx={{ mb: 2, cursor: 'pointer' }}
                    >
                        <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: 24 } }}>
                            {getSpaceIcon(spaceTypeIcon)}
                        </Box>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                            {spaceTypeLabel}
                        </Typography>
                        <ArrowForwardIcon fontSize="small" color="action" />
                    </Stack>

                    {/* Hero number */}
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                        <Typography variant="h2" fontWeight={700} color="primary.main">
                            {totalSpaces}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                            {t('dashboard.totalSpaces')}
                        </Typography>
                    </Box>

                    {/* Progress bar — label coverage */}
                    <Stack gap={0.5} sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('dashboard.labelCoverage', { count: spacesWithLabels, total: totalSpaces })}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                                {coveragePercent}%
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={coveragePercent}
                            color="primary"
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                    </Stack>

                    {/* Stat tiles */}
                    <Stack direction="row" gap={1}>
                        <MobileStatTile
                            value={spacesWithLabels}
                            label={t('dashboard.withLabels')}
                            color="success"
                        />
                        <MobileStatTile
                            value={spacesWithoutLabels}
                            label={t('dashboard.withoutLabels')}
                            color="warning"
                        />
                        <MobileStatTile
                            value={assignedLabelsCount}
                            label={t('dashboard.assignedLabels')}
                            color="info"
                        />
                    </Stack>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }} data-testid="spaces-card">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
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
                        sx={{ fontSize: '0.95rem' }}
                    >
                        {t('dashboard.toSpaceType', { type: spaceTypeLabel })}
                    </Button>
                </Stack>

                <Stack gap={2}>
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
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
                    </Grid>

                    {!hideAddButton && (
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={onAddSpace}
                            sx={{ width: 'fit-content' }}
                        >
                            {t('dashboard.addSpace', 'Add Space')}
                        </Button>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
