import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
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
import SortIcon from '@mui/icons-material/Sort';
import { useTranslation } from 'react-i18next';
import { useSpacesStore } from '../application/useSpacesStore';
import { SpaceCard } from './SpaceCard';
import { BookingDialog } from './BookingDialog';
import type { SpaceWithAvailability } from '../domain/types';

export function FindPage() {
    const { t } = useTranslation();
    const {
        spaces,
        buildings,
        filters,
        isLoading,
        error,
        fetchSpaces,
        fetchBuildings,
        setFilters,
    } = useSpacesStore();

    const [searchText, setSearchText] = useState('');
    const [selectedSpace, setSelectedSpace] = useState<SpaceWithAvailability | null>(null);

    useEffect(() => {
        fetchBuildings();
        fetchSpaces();
    }, [fetchBuildings, fetchSpaces]);

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
                        },
                    }}
                    sx={{ mb: 1.5 }}
                />

                {/* Filters row */}
                <Stack direction="row" spacing={1} sx={{ mb: 1.5, overflowX: 'auto' }}>
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

                {/* Sort chips */}
                <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                    <SortIcon sx={{ fontSize: 20, color: 'text.secondary', mt: 0.5 }} />
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
