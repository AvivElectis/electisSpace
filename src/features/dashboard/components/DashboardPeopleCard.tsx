import { Box, Card, CardContent, Typography, Stack, Button, Grid, Chip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface DashboardPeopleCardProps {
    totalPeople: number;
    assignedPeople: number;
    unassignedPeople: number;
    assignedLabelsCount: number;
    savedLists: number;
    activeListName?: string | null;
}

/**
 * DashboardPeopleCard - People Manager overview card for dashboard
 */
export function DashboardPeopleCard({
    totalPeople,
    assignedPeople,
    unassignedPeople,
    assignedLabelsCount,
    savedLists,
    activeListName,
}: DashboardPeopleCardProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }} data-testid="people-card">
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Stack direction="row" gap={1} alignItems="center">
                        <PeopleIcon color="primary" sx={{ fontSize: 28 }} />
                        <Typography variant="h6" fontWeight={600} sx={{ px: 1 }}>
                            {t('people.title')}
                        </Typography>
                        {activeListName && (
                            <Chip
                                label={activeListName}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                    </Stack>
                    <Button
                        variant="text"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => navigate('/people')}
                        sx={{ fontSize: '0.95rem' }}
                    >
                        {t('dashboard.toPeople')}
                    </Button>
                </Stack>

                <Stack gap={3}>
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {t('people.total')}
                        </Typography>
                        <Typography variant="h3" fontWeight={600} color="primary.main">
                            {totalPeople}
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
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
                                <Stack direction="row" alignItems="center" gap={0.5}>
                                    <AssignmentIndIcon color="success" fontSize="small" />
                                    <Typography variant="body2" color="text.secondary">
                                        {t('people.assigned')}
                                    </Typography>
                                </Stack>
                                <Typography variant="h5" fontWeight={500} color="success.main">
                                    {assignedPeople}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    {t('people.unassigned')}
                                </Typography>
                                <Typography variant="h5" fontWeight={500} color="warning.main">
                                    {unassignedPeople}
                                </Typography>
                            </Box>
                        </Grid>
                        {savedLists > 0 && (
                            <Grid size={{ xs: 6 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={500}>
                                        {t('dashboard.savedLists', { count: savedLists })}
                                    </Typography>
                                </Box>
                            </Grid>
                        )}
                    </Grid>

                    <Button
                        variant="outlined"
                        startIcon={<PeopleIcon />}
                        onClick={() => navigate('/people')}
                        sx={{ mt: 2, width: 'fit-content' }}
                    >
                        {t('dashboard.managePeople')}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
}
