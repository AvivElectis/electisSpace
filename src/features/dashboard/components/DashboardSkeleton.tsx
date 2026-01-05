import { Box, Card, CardContent, Skeleton, Stack, Grid } from '@mui/material';

/**
 * DashboardSkeleton - Loading placeholder for dashboard cards
 * Shows animated skeletons while data is being fetched
 */
export function DashboardSkeleton() {
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
