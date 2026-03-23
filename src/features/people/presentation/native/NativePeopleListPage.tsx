import { useEffect, useMemo, useState, useDeferredValue, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { usePeopleStore } from '../../infrastructure/peopleStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { usePeopleFilters } from '../../application/usePeopleFilters';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';

import PeopleIcon from '@mui/icons-material/People';

import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeGroupedList } from '@shared/presentation/native/NativeGroupedList';
import { NativePersonItem } from '@shared/presentation/native/NativePersonItem';
import { NativeStatBar } from '@shared/presentation/native/NativeStatBar';
import { NativeSearchBar } from '@shared/presentation/native/NativeSearchBar';
import { NativeChipBar } from '@shared/presentation/native/NativeChipBar';
import { NativeEmptyState } from '@shared/presentation/native/NativeEmptyState';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';
import { nativeColors } from '@shared/presentation/themes/nativeTokens';

import type { Person, PeopleFilters } from '../../domain/types';

/**
 * NativePeopleListPage — Android-native People list with grouped sections (Assigned / Unassigned).
 * Mirrors the data logic of PeopleManagerView but renders using native shell components.
 */
export function NativePeopleListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Set app bar title
    useSetNativeTitle(t('navigation.people'));

    const isAppReady = useAuthStore((state) => state.isAppReady);
    const activeStoreId = useAuthStore((state) => state.activeStoreId);

    const people = usePeopleStore((state) => state.people);
    const fetchPeople = usePeopleStore((state) => state.fetchPeople);

    const settings = useSettingsStore((state) => state.settings);

    // Fetch people on mount / store switch (same pattern as PeopleManagerView)
    useEffect(() => {
        if (isAppReady && activeStoreId) {
            fetchPeople().catch(() => {
                // Swallow — store already tracks the error
            });
        }
        // fetchPeople is a Zustand store action (stable reference)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId]);

    // Search state with debounce (300ms) + deferred value
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearch = useDeferredValue(searchQuery);

    // Assignment filter chip state
    const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

    const filters: PeopleFilters = {
        searchQuery: deferredSearch,
        assignmentStatus: assignmentFilter,
    };

    const { filteredPeople, assignedCount, unassignedCount } = usePeopleFilters(people, filters);

    // Determine which field to use as display name (articleName mapping or first data key)
    const nameFieldKey = settings.solumMappingConfig?.mappingInfo?.articleName;

    const getDisplayName = (person: Person): string => {
        if (nameFieldKey && person.data[nameFieldKey]) {
            return person.data[nameFieldKey];
        }
        // Fall back to first data field value
        const firstValue = Object.values(person.data)[0];
        return firstValue || person.id;
    };

    const getSubtitle = (person: Person): string | undefined => {
        const entries = Object.entries(person.data);
        // Show second field (after name) if it exists
        if (nameFieldKey) {
            const nonNameEntries = entries.filter(([key]) => key !== nameFieldKey);
            return nonNameEntries[0]?.[1] || undefined;
        }
        return entries[1]?.[1] || undefined;
    };

    // Split filtered people into assigned / unassigned sections
    const assignedPeople = useMemo(
        () => filteredPeople.filter((p) => !!p.assignedSpaceId),
        [filteredPeople]
    );
    const unassignedPeople = useMemo(
        () => filteredPeople.filter((p) => !p.assignedSpaceId),
        [filteredPeople]
    );

    // Stat bar items
    const stats = useMemo(() => [
        { label: t('people.total', { defaultValue: 'Total' }), value: people.length },
        { label: t('people.assigned'), value: assignedCount, color: nativeColors.status.success },
        { label: t('people.unassigned'), value: unassignedCount, color: nativeColors.status.warning },
    ], [t, people.length, assignedCount, unassignedCount]);

    // Filter chips
    const filterChips = useMemo(() => [
        { label: t('people.all'), value: 'all' },
        { label: t('people.assigned'), value: 'assigned' },
        { label: t('people.unassigned'), value: 'unassigned' },
    ], [t]);

    // Grouped list sections
    const sections = useMemo(() => [
        {
            title: t('people.assigned'),
            count: assignedPeople.length,
            color: 'success' as const,
            items: assignedPeople,
        },
        {
            title: t('people.unassigned'),
            count: unassignedPeople.length,
            color: 'warning' as const,
            items: unassignedPeople,
        },
    ], [t, assignedPeople, unassignedPeople]);

    const handleFilterChange = useCallback((v: string) => {
        setAssignmentFilter(v as typeof assignmentFilter);
    }, []);

    const handleItemTap = useCallback((person: Person) => {
        navigate(`/people/${person.id}/edit`);
    }, [navigate]);

    const handleRefresh = useCallback(async () => {
        await fetchPeople();
    }, [fetchPeople]);

    return (
        <NativePage onRefresh={handleRefresh} noPadding>
            {/* Stat bar */}
            <NativeStatBar stats={stats} />

            {/* Search + filter row */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5,
                    gap: 1,
                }}
            >
                <NativeSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t('people.searchPlaceholder')}
                />
            </Box>

            {/* Assignment filter chips */}
            <NativeChipBar
                chips={filterChips}
                activeValue={assignmentFilter}
                onChange={handleFilterChange}
            />

            {/* Grouped list */}
            <NativeGroupedList<Person>
                sections={sections}
                renderItem={(person) => (
                    <NativePersonItem
                        name={getDisplayName(person)}
                        subtitle={getSubtitle(person)}
                        spaceBadge={person.assignedSpaceId ? `#${person.assignedSpaceId}` : undefined}
                        isAssigned={!!person.assignedSpaceId}
                    />
                )}
                onItemTap={handleItemTap}
                keyExtractor={(person) => person.id}
                emptyState={
                    <NativeEmptyState
                        icon={<PeopleIcon />}
                        title={
                            searchQuery || assignmentFilter !== 'all'
                                ? t('people.noResults')
                                : t('people.noPeopleYet')
                        }
                    />
                }
                fab={{ onClick: () => navigate('/people/new') }}
            />
        </NativePage>
    );
}
