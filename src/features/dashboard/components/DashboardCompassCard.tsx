import { Card, CardContent, Typography, Box, Chip, Stack, Skeleton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ExploreIcon from '@mui/icons-material/Explore';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface CompassSummary {
    totalEmployees: number;
    totalSpaces: number;
    todayBookings: number;
    activeBookings: number;
    checkedIn: number;
    occupancyRate: number;
    checkInRate: number;
}

interface DashboardCompassCardProps {
    summary: CompassSummary | null;
    loading: boolean;
}

export function DashboardCompassCard({ summary, loading }: DashboardCompassCardProps) {
    const { t } = useTranslation();

    if (loading) {
        return (
            <Card variant="outlined">
                <CardContent>
                    <Skeleton variant="text" width={150} height={32} />
                    <Skeleton variant="rectangular" height={100} sx={{ mt: 1, borderRadius: 1 }} />
                </CardContent>
            </Card>
        );
    }

    if (!summary) return null;

    const stats = [
        {
            icon: <PeopleIcon fontSize="small" />,
            label: t('compass.dashboard.employees'),
            value: summary.totalEmployees,
        },
        {
            icon: <BusinessIcon fontSize="small" />,
            label: t('compass.dashboard.spaces'),
            value: summary.totalSpaces,
        },
        {
            icon: <CheckCircleIcon fontSize="small" />,
            label: t('compass.dashboard.checkedIn'),
            value: summary.checkedIn,
        },
        {
            icon: <TrendingUpIcon fontSize="small" />,
            label: t('compass.dashboard.occupancy'),
            value: `${summary.occupancyRate}%`,
        },
    ];

    return (
        <Card variant="outlined">
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ExploreIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                        {t('compass.dashboard.title')}
                    </Typography>
                    <Chip
                        label={`${summary.todayBookings} ${t('compass.dashboard.todayBookings')}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                </Box>

                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    {stats.map((stat) => (
                        <Box
                            key={stat.label}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                minWidth: 120,
                            }}
                        >
                            {stat.icon}
                            <Typography variant="body2" color="text.secondary">
                                {stat.label}:
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                                {stat.value}
                            </Typography>
                        </Box>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
}
