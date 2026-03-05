import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Chip,
    Stack,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import { useTranslation } from 'react-i18next';
import type { SpaceWithAvailability } from '../domain/types';

interface SpaceCardProps {
    space: SpaceWithAvailability;
    onBook: (space: SpaceWithAvailability) => void;
}

export function SpaceCard({ space, onBook }: SpaceCardProps) {
    const { t } = useTranslation();

    const locationParts = [space.buildingName, space.floorName, space.areaName].filter(Boolean);
    const locationText = locationParts.join(' · ');

    return (
        <Card
            variant="outlined"
            sx={{
                mb: 1.5,
                opacity: space.available ? 1 : 0.6,
            }}
        >
            <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {space.displayName}
                        </Typography>

                        {locationText && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {locationText}
                                </Typography>
                            </Box>
                        )}

                        {space.compassCapacity && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                    {t('find.capacity', { count: space.compassCapacity })}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Button
                        variant="contained"
                        size="small"
                        disabled={!space.available}
                        onClick={() => onBook(space)}
                        sx={{ minWidth: 64, ml: 1 }}
                    >
                        {t('find.book')}
                    </Button>
                </Box>

                {/* Amenities */}
                {space.compassAmenities.length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                        {space.compassAmenities.slice(0, 4).map((amenity) => (
                            <Chip key={amenity} label={amenity} size="small" variant="outlined" />
                        ))}
                    </Stack>
                )}

                {/* Availability status */}
                <Box sx={{ mt: 1 }}>
                    {space.available ? (
                        <Typography variant="caption" sx={{ color: 'success.main' }}>
                            {t('find.available')}
                        </Typography>
                    ) : space.nextAvailableAt ? (
                        <Typography variant="caption" color="text.secondary">
                            {t('find.availableFrom', {
                                time: new Date(space.nextAvailableAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                }),
                            })}
                        </Typography>
                    ) : (
                        <Typography variant="caption" color="error">
                            {t('find.unavailable')}
                        </Typography>
                    )}
                </Box>

                {/* Friends nearby */}
                {space.friendsNearby.length > 0 && (
                    <Typography variant="caption" sx={{ color: 'secondary.main', mt: 0.5, display: 'block' }}>
                        {t('find.friendsNearby', { count: space.friendsNearby.length })}
                        {' — '}
                        {space.friendsNearby.map((f) => f.displayName).join(', ')}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}
