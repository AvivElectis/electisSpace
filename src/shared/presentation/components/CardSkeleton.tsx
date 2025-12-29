import { Card, CardContent, Skeleton, Stack, Box } from '@mui/material';

interface CardSkeletonProps {
    /** Number of cards to display */
    count?: number;
    /** Height of each card */
    height?: number;
}

/**
 * Skeleton loader for card-based layouts
 * Displays animated placeholder for loading card data
 * 
 * @example
 * {loading ? (
 *   <CardSkeleton count={6} height={200} />
 * ) : (
 *   conferenceRooms.map(room => <RoomCard key={room.id} room={room} />)
 * )}
 */
export function CardSkeleton({ count = 6, height = 200 }: CardSkeletonProps) {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                },
                gap: 2,
            }}
        >
            {Array.from({ length: count }).map((_, index) => (
                <Card key={`skeleton-${index}`} sx={{ height }}>
                    <CardContent>
                        <Stack spacing={2}>
                            {/* Title */}
                            <Skeleton variant="text" width="70%" height={32} />

                            {/* Subtitle */}
                            <Skeleton variant="text" width="50%" height={24} />

                            {/* Content lines */}
                            <Skeleton variant="text" width="90%" />
                            <Skeleton variant="text" width="85%" />
                            <Skeleton variant="text" width="60%" />

                            {/* Action buttons */}
                            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                <Skeleton variant="rectangular" width={80} height={36} />
                                <Skeleton variant="rectangular" width={80} height={36} />
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );
}
