import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    IconButton,
    Chip,
    Stack,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    CircularProgress,
    Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PhoneIcon from '@mui/icons-material/Phone';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import BusinessIcon from '@mui/icons-material/Business';
import LockIcon from '@mui/icons-material/Lock';
import EventIcon from '@mui/icons-material/Event';
import { useTranslation } from 'react-i18next';
import { useSpacesStore } from '../application/useSpacesStore';
import { SpaceCard } from './SpaceCard';
import { BookingDialog } from './BookingDialog';
import type { SpaceWithAvailability, CompassSpaceType } from '../domain/types';

const SPACE_TYPES: CompassSpaceType[] = [
    'DESK',
    'OFFICE',
    'MEETING_ROOM',
    'PHONE_BOOTH',
    'COLLABORATION_ZONE',
    'PARKING',
    'LOCKER',
    'EVENT_SPACE',
];

const SPACE_TYPE_ICONS: Record<CompassSpaceType, React.ElementType> = {
    DESK: LaptopMacIcon,
    OFFICE: BusinessIcon,
    MEETING_ROOM: MeetingRoomIcon,
    PHONE_BOOTH: PhoneIcon,
    COLLABORATION_ZONE: GroupsIcon,
    PARKING: LocalParkingIcon,
    LOCKER: LockIcon,
    EVENT_SPACE: EventIcon,
};

export function FindPage() {
    const { t } = useTranslation();
    const {
        spaces,
        buildings,
        amenities,
        filters,
        isLoading,
        error,
        fetchSpaces,
        fetchBuildings,
        fetchAmenities,
        setFilters,
    } = useSpacesStore();

    const [searchText, setSearchText] = useState('');
    const [selectedSpace, setSelectedSpace] = useState<SpaceWithAvailability | null>(null);
    const [showAmenityFilter, setShowAmenityFilter] = useState(false);

    useEffect(() => {
        fetchBuildings();
        fetchAmenities();
        fetchSpaces();
    }, [fetchBuildings, fetchAmenities, fetchSpaces]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchText !== (filters.search ?? '')) {
                setFilters({ search: searchText || undefined });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchText, filters.search, setFilters]);

    // Get floors for selected building
    const selectedBuilding = buildings.find((b) => b.id === filters.buildingId);
    const floors = selectedBuilding?.floors ?? [];

    // Group spaces by floor
    const spacesByFloor = spaces.reduce<Record<string, SpaceWithAvailability[]>>((acc, space) => {
        const key = space.floorName ?? t('find.unknownFloor');
        if (!acc[key]) acc[key] = [];
        acc[key].push(space);
        return acc;
    }, {});

    const handleSpaceTypeFilter = (type: CompassSpaceType | undefined) => {
        setFilters({ spaceType: type });
    };

    const handleAmenityToggle = (amenityId: string) => {
        const current = filters.amenityIds ?? [];
        const updated = current.includes(amenityId)
            ? current.filter((id) => id !== amenityId)
            : [...current, amenityId];
        setFilters({ amenityIds: updated.length > 0 ? updated : undefined });
    };

    const activeAmenityCount = filters.amenityIds?.length ?? 0;

    return (
        <Box sx={{ pb: 10 }}>
            <Box sx={{ px: 2, pt: 2 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    {t('find.title')}
                </Typography>

                {/* Search bar */}
                <TextField
                    fullWidth
                    placeholder={t('find.searchPlaceholder')}
                    type="search"
                    size="small"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            endAdornment: searchText ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearchText('')} edge="end">
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : undefined,
                        },
                    }}
                    sx={{ mb: 1.5 }}
                />

                {/* Filters row */}
                <Stack direction="row" gap={1.5} sx={{ mb: 1.5, overflowX: 'auto' }}>
                    {/* Building filter */}
                    {buildings.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>{t('find.building')}</InputLabel>
                            <Select
                                value={filters.buildingId ?? ''}
                                label={t('find.building')}
                                onChange={(e) =>
                                    setFilters({
                                        buildingId: e.target.value || undefined,
                                        floorId: undefined,
                                    })
                                }
                            >
                                <MenuItem value="">{t('find.all')}</MenuItem>
                                {buildings.map((b) => (
                                    <MenuItem key={b.id} value={b.id}>
                                        {b.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* Floor filter */}
                    {floors.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>{t('find.floor')}</InputLabel>
                            <Select
                                value={filters.floorId ?? ''}
                                label={t('find.floor')}
                                onChange={(e) =>
                                    setFilters({ floorId: e.target.value || undefined })
                                }
                            >
                                <MenuItem value="">{t('find.all')}</MenuItem>
                                {floors.map((f) => (
                                    <MenuItem key={f.id} value={f.id}>
                                        {f.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </Stack>

                {/* Space type filter chips */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                        gap: 0.75,
                        mb: 1.5,
                    }}
                >
                    <Chip
                        label={t('find.all')}
                        size="small"
                        variant={!filters.spaceType ? 'filled' : 'outlined'}
                        color={!filters.spaceType ? 'primary' : 'default'}
                        onClick={() => handleSpaceTypeFilter(undefined)}
                    />
                    {SPACE_TYPES.map((type) => {
                        const Icon = SPACE_TYPE_ICONS[type];
                        return (
                            <Chip
                                key={type}
                                icon={<Icon sx={{ fontSize: 16 }} />}
                                label={t(`find.spaceType.${type}`)}
                                size="small"
                                variant={filters.spaceType === type ? 'filled' : 'outlined'}
                                color={filters.spaceType === type ? 'primary' : 'default'}
                                onClick={() => handleSpaceTypeFilter(type)}
                            />
                        );
                    })}
                </Box>

                {/* Amenity filter toggle */}
                {amenities.length > 0 && (
                    <>
                        <Chip
                            icon={<FilterListIcon sx={{ fontSize: 16 }} />}
                            label={
                                activeAmenityCount > 0
                                    ? t('find.amenitiesFilterActive', { count: activeAmenityCount })
                                    : t('find.amenitiesFilter')
                            }
                            size="small"
                            variant={activeAmenityCount > 0 ? 'filled' : 'outlined'}
                            color={activeAmenityCount > 0 ? 'secondary' : 'default'}
                            onClick={() => setShowAmenityFilter(!showAmenityFilter)}
                            sx={{ mb: 1 }}
                        />

                        {showAmenityFilter && (
                            <Stack
                                direction="row"
                                sx={{
                                    mb: 1.5,
                                    flexWrap: 'wrap',
                                    gap: 0.75,
                                }}
                            >
                                {amenities.map((amenity) => {
                                    const isSelected = filters.amenityIds?.includes(amenity.id) ?? false;
                                    return (
                                        <Chip
                                            key={amenity.id}
                                            label={amenity.name}
                                            size="small"
                                            variant={isSelected ? 'filled' : 'outlined'}
                                            color={isSelected ? 'secondary' : 'default'}
                                            onClick={() => handleAmenityToggle(amenity.id)}
                                        />
                                    );
                                })}
                            </Stack>
                        )}
                    </>
                )}

                {/* Sort chips */}
                <Stack direction="row" gap={0.75} sx={{ mb: 2, alignItems: 'center' }}>
                    <SortIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Chip
                        label={t('find.sortName')}
                        size="small"
                        variant={filters.sort === 'name' || !filters.sort ? 'filled' : 'outlined'}
                        onClick={() => setFilters({ sort: 'name' })}
                    />
                    <Chip
                        label={t('find.sortFloor')}
                        size="small"
                        variant={filters.sort === 'floor' ? 'filled' : 'outlined'}
                        onClick={() => setFilters({ sort: 'floor' })}
                    />
                    <Chip
                        label={t('find.sortNearFriends')}
                        size="small"
                        variant={filters.sort === 'nearFriends' ? 'filled' : 'outlined'}
                        onClick={() => setFilters({ sort: 'nearFriends' })}
                        color="secondary"
                    />
                </Stack>
            </Box>

            {/* Error */}
            {error && (
                <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
                    {error}
                </Alert>
            )}

            {/* Loading */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Space list grouped by floor */}
            {!isLoading && (
                <Box sx={{ px: 2 }}>
                    {spaces.length === 0 ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            textAlign="center"
                            sx={{ mt: 4 }}
                        >
                            {t('find.noSpaces')}
                        </Typography>
                    ) : (
                        Object.entries(spacesByFloor).map(([floorName, floorSpaces]) => (
                            <Box key={floorName} sx={{ mb: 2 }}>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                    sx={{ mb: 1 }}
                                >
                                    {floorName}{' '}
                                    ({t('find.availableCount', {
                                        count: floorSpaces.filter((s) => s.available).length,
                                    })})
                                </Typography>
                                {floorSpaces.map((space) => (
                                    <SpaceCard
                                        key={space.id}
                                        space={space}
                                        onBook={setSelectedSpace}
                                    />
                                ))}
                            </Box>
                        ))
                    )}
                </Box>
            )}

            {/* Booking dialog */}
            {selectedSpace && (
                <BookingDialog
                    space={selectedSpace}
                    onClose={() => setSelectedSpace(null)}
                />
            )}
        </Box>
    );
}
