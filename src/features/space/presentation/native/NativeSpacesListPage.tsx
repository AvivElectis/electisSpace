import { useEffect, useMemo, useState, useDeferredValue, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

import BusinessIcon from '@mui/icons-material/Business';

import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeGroupedList } from '@shared/presentation/native/NativeGroupedList';
import { NativeSpaceItem } from '@shared/presentation/native/NativeSpaceItem';
import { NativeStatBar } from '@shared/presentation/native/NativeStatBar';
import { NativeSearchBar } from '@shared/presentation/native/NativeSearchBar';
import { NativeChipBar } from '@shared/presentation/native/NativeChipBar';
import { NativeEmptyState } from '@shared/presentation/native/NativeEmptyState';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';
import { nativeColors } from '@shared/presentation/themes/nativeTokens';

import type { Space } from '@shared/domain/types';

type AssignmentFilter = 'all' | 'assigned' | 'unassigned';

/**
 * NativeSpacesListPage — Android-native Spaces list.
 * Groups spaces by assigned/unassigned, with link status indicator.
 * Mirrors data logic of SpacesManagementView.
 */
export function NativeSpacesListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { getLabel } = useSpaceTypeLabels();

    useSetNativeTitle(getLabel('plural'));

    const isAppReady = useAuthStore((state) => state.isAppReady);
    const activeStoreId = useAuthStore((state) => state.activeStoreId);

    const spaces = useSpacesStore((state) => state.spaces);
    const fetchSpaces = useSpacesStore((state) => state.fetchSpaces);
    const settings = useSettingsStore((state) => state.settings);

    // Fetch on mount / store switch
    useEffect(() => {
        if (isAppReady && activeStoreId) {
            fetchSpaces().catch(() => {
                // Store tracks the error
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId]);

    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearch = useDeferredValue(searchQuery);
    const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');

    // Determine name field from config (mirrors SpacesManagementView)
    const nameFieldKey = useMemo(() => {
        if (settings.workingMode === 'SOLUM_API') {
            return settings.solumMappingConfig?.mappingInfo?.articleName;
        }
        return 'roomName';
    }, [settings.workingMode, settings.solumMappingConfig]);

    const getDisplayName = (space: Space): string => {
        if (nameFieldKey && space.data[nameFieldKey]) return space.data[nameFieldKey];
        const firstValue = Object.values(space.data)[0];
        return firstValue || space.externalId || space.id;
    };

    // Filter spaces
    const filteredSpaces = useMemo(() => {
        let result = [...spaces];
        if (deferredSearch) {
            const q = deferredSearch.toLowerCase();
            result = result.filter((s) => {
                const displayId = (s.externalId || s.id).toLowerCase();
                const name = getDisplayName(s).toLowerCase();
                return displayId.includes(q) || name.includes(q);
            });
        }
        if (assignmentFilter === 'assigned') {
            result = result.filter((s) => !!s.labelCode || (s.assignedLabels && s.assignedLabels.length > 0));
        } else if (assignmentFilter === 'unassigned') {
            result = result.filter((s) => !s.labelCode && (!s.assignedLabels || s.assignedLabels.length === 0));
        }
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spaces, deferredSearch, assignmentFilter, nameFieldKey]);

    const linkedSpaces = useMemo(
        () => filteredSpaces.filter((s) => !!s.labelCode || (s.assignedLabels && s.assignedLabels.length > 0)),
        [filteredSpaces]
    );
    const unlinkedSpaces = useMemo(
        () => filteredSpaces.filter((s) => !s.labelCode && (!s.assignedLabels || s.assignedLabels.length === 0)),
        [filteredSpaces]
    );

    const linkedCount = useMemo(
        () => spaces.filter((s) => !!s.labelCode || (s.assignedLabels && s.assignedLabels.length > 0)).length,
        [spaces]
    );
    const unlinkedCount = spaces.length - linkedCount;

    const stats = useMemo(() => [
        { label: t('spaces.total'), value: spaces.length },
        { label: t('spaces.withLabels'), value: linkedCount, color: nativeColors.status.success },
        { label: t('spaces.withoutLabels'), value: unlinkedCount, color: nativeColors.status.warning },
    ], [t, spaces.length, linkedCount, unlinkedCount]);

    const filterChips = useMemo(() => [
        { label: t('spaces.native.all', 'All'), value: 'all' },
        { label: t('spaces.withLabels'), value: 'assigned' },
        { label: t('spaces.withoutLabels'), value: 'unassigned' },
    ], [t]);

    const sections = useMemo(() => [
        {
            title: t('spaces.withLabels'),
            count: linkedSpaces.length,
            color: 'success' as const,
            items: linkedSpaces,
        },
        {
            title: t('spaces.withoutLabels'),
            count: unlinkedSpaces.length,
            color: 'warning' as const,
            items: unlinkedSpaces,
        },
    ], [t, linkedSpaces, unlinkedSpaces]);

    const handleFilterChange = useCallback((v: string) => {
        setAssignmentFilter(v as AssignmentFilter);
    }, []);

    const handleItemTap = useCallback((space: Space) => {
        navigate(`/spaces/${space.id}/edit`);
    }, [navigate]);

    const handleRefresh = useCallback(async () => {
        await fetchSpaces();
    }, [fetchSpaces]);

    const renderSpaceItem = useCallback((space: Space) => (
        <NativeSpaceItem
            spaceId={space.externalId || space.id}
            spaceType={settings.solumMappingConfig?.uniqueIdField
                ? getLabel('singular')
                : undefined}
            assignedPerson={getDisplayName(space) !== (space.externalId || space.id)
                ? getDisplayName(space)
                : undefined}
            isLinked={!!space.labelCode || (space.assignedLabels && space.assignedLabels.length > 0)}
        />
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [settings.solumMappingConfig, nameFieldKey, getLabel]);

    return (
        <NativePage onRefresh={handleRefresh} noPadding>
            {/* Stat bar */}
            <NativeStatBar stats={stats} />

            {/* Search row */}
            <Box sx={{ px: 1, py: 0.5 }}>
                <NativeSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t('spaces.searchPlaceholder')}
                />
            </Box>

            {/* Filter chips */}
            <NativeChipBar
                chips={filterChips}
                activeValue={assignmentFilter}
                onChange={handleFilterChange}
            />

            {/* Grouped list */}
            <NativeGroupedList<Space>
                sections={sections}
                renderItem={renderSpaceItem}
                onItemTap={handleItemTap}
                keyExtractor={(space) => space.id}
                emptyState={
                    <NativeEmptyState
                        icon={<BusinessIcon />}
                        title={
                            searchQuery || assignmentFilter !== 'all'
                                ? t('spaces.noResults')
                                : t('spaces.noSpacesYet', {
                                    spaces: getLabel('plural').toLowerCase(),
                                    button: `"${getLabel('add')}"`,
                                })
                        }
                    />
                }
                fab={{ onClick: () => navigate('/spaces/new') }}
            />
        </NativePage>
    );
}
