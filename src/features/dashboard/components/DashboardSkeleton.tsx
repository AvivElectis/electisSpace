import { Box, Card, CardContent, Skeleton, Stack, Grid } from '@mui/material';

interface DashboardSkeletonProps {
    isMobile?: boolean;
}

function MobileCardSkeleton() {
    return (
        <Card>
            <CardContent sx={{ p: 2 }}>
                {/* Header */}
                <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" width={120} height={24} />
                </Stack>

                {/* Hero number */}
                <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                    <Skeleton variant="text" width={80} height={56} />
                    <Skeleton variant="text" width={100} height={20} />
                </Box>

                {/* Progress bar */}
                <Stack gap={0.5} sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between">
                        <Skeleton variant="text" width={140} height={16} />
                        <Skeleton variant="text" width={30} height={16} />
                    </Stack>
                    <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 4 }} />
                </Stack>

                {/* Stat tiles */}
                <Stack direction="row" gap={1}>
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="rectangular" sx={{ flex: 1, height: 56, borderRadius: 1 }} />
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
}

/**
 * DashboardSkeleton - Loading placeholder for dashboard cards
 * Shows animated skeletons while data is being fetched
 */
export function DashboardSkeleton({ isMobile }: DashboardSkeletonProps) {
    if (isMobile) {
        return (
            <Box>
                {/* Header Skeleton */}
                <Box sx={{ mb: 1 }}>
                    <Skeleton variant="text" width={160} height={32} />
                </Box>

                <Stack gap={1.5}>
                    <MobileCardSkeleton />
                    <MobileCardSkeleton />
                </Stack>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header Skeleton */}
            <Box sx={{ mb: 4 }}>
                <Skeleton variant="text" width={200} height={40} />
                <Skeleton variant="text" width={350} height={24} />
            </Box>

            <Grid container spacing={3}>
                {/* First Card Skeleton */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: 280 }}>
                        <CardContent>
                            <Stack gap={2}>
                                {/* Header with icon */}
                                <Stack direction="row" alignItems="center" gap={1}>
                                    <Skeleton variant="circular" width={40} height={40} />
                                    <Skeleton variant="text" width={150} height={32} />
                                </Stack>

                                {/* Stats grid */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
                                    {[1, 2, 3, 4].map((i) => (
                                        <Box key={i}>
                                            <Skeleton variant="text" width="60%" height={20} />
                                            <Skeleton variant="text" width="40%" height={36} />
                                        </Box>
                                    ))}
                                </Box>

                                {/* Action button */}
                                <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1, mt: 2 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Second Card Skeleton */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: 280 }}>
                        <CardContent>
                            <Stack gap={2}>
                                {/* Header with icon */}
                                <Stack direction="row" alignItems="center" gap={1}>
                                    <Skeleton variant="circular" width={40} height={40} />
                                    <Skeleton variant="text" width={180} height={32} />
                                </Stack>

                                {/* Stats grid */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
                                    {[1, 2, 3, 4].map((i) => (
                                        <Box key={i}>
                                            <Skeleton variant="text" width="60%" height={20} />
                                            <Skeleton variant="text" width="40%" height={36} />
                                        </Box>
                                    ))}
                                </Box>

                                {/* Action button */}
                                <Skeleton variant="rectangular" width={140} height={36} sx={{ borderRadius: 1, mt: 2 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* App Info Card Skeleton (Full Width) */}
                <Grid size={{ xs: 12 }}>
                    <Card>
                        <CardContent>
                            <Stack gap={2}>
                                {/* Header */}
                                <Stack direction="row" alignItems="center" gap={1}>
                                    <Skeleton variant="circular" width={40} height={40} />
                                    <Skeleton variant="text" width={200} height={32} />
                                </Stack>

                                {/* Info chips */}
                                <Stack direction="row" gap={2} flexWrap="wrap" mt={1}>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Skeleton key={i} variant="rectangular" width={100 + i * 20} height={32} sx={{ borderRadius: 2 }} />
                                    ))}
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
