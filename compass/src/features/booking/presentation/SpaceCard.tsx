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
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PhoneIcon from '@mui/icons-material/Phone';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import LockIcon from '@mui/icons-material/Lock';
import EventIcon from '@mui/icons-material/Event';
import { useTranslation } from 'react-i18next';
import type { SpaceWithAvailability, CompassSpaceType } from '../domain/types';

const SPACE_TYPE_ICONS: Record<CompassSpaceType, React.ElementType> = {
    DESK: LaptopMacIcon,
    MEETING_ROOM: MeetingRoomIcon,
    PHONE_BOOTH: PhoneIcon,
    COLLABORATION_ZONE: GroupsIcon,
    PARKING: LocalParkingIcon,
    LOCKER: LockIcon,
    EVENT_SPACE: EventIcon,
};

interface SpaceCardProps {
    space: SpaceWithAvailability;
    onBook: (space: SpaceWithAvailability) => void;
}

export function SpaceCard({ space, onBook }: SpaceCardProps) {
    const { t, i18n } = useTranslation();
    const isHe = i18n.language === 'he';

    const locationParts = [space.buildingName, space.floorName, space.areaName].filter(Boolean);
    const locationText = locationParts.join(' \u00b7 ');

    const TypeIcon = space.compassSpaceType ? SPACE_TYPE_ICONS[space.compassSpaceType] : null;

    // Use structured amenities if available, fall back to string array
    const amenityChips = space.structuredAmenities?.length > 0
        ? space.structuredAmenities.slice(0, 4).map((a) => ({
            key: a.id,
            label: isHe && a.nameHe ? a.nameHe : a.name,
        }))
        : space.compassAmenities.slice(0, 4).map((a) => ({
            key: a,
            label: a,
        }));

    return (
        <Card
            variant="outlined"
            sx={{
                mb: 1.5,
                opacity: space.available ? 1 : 0.6,
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {TypeIcon && (
                                <TypeIcon sx={{ fontSize: 18, color: 'primary.main' }} aria-label={t(`find.spaceType.${space.compassSpaceType}`)} />
                            )}
                            <Typography variant="subtitle1" fontWeight={600}>
                                {space.displayName}
                            </Typography>
                        </Box>

                        {/* Space type label */}
                        {space.compassSpaceType && (
                            <Typography variant="caption" color="text.secondary">
                                {t(`find.spaceType.${space.compassSpaceType}`)}
                            </Typography>
                        )}

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
                        size="medium"
                        disabled={!space.available}
                        onClick={() => onBook(space)}
                        sx={{ minWidth: 64, ml: 1 }}
                    >
                        {t('find.book')}
                    </Button>
                </Box>

                {/* Amenities */}
                {amenityChips.length > 0 && (
                    <Stack direction="row" gap={0.75} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        {amenityChips.map((chip) => (
                            <Chip key={chip.key} label={chip.label} size="small" variant="outlined" />
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
                        {' \u2014 '}
                        {space.friendsNearby.map((f) => f.displayName).join(', ')}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}
