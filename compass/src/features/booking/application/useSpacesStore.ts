import { create } from 'zustand';
import type { SpaceWithAvailability, Building, SpaceFilters, AmenityInfo } from '../domain/types';
import { spacesApi } from '../infrastructure/spacesApi';

interface SpacesState {
    spaces: SpaceWithAvailability[];
    buildings: Building[];
    amenities: AmenityInfo[];
    filters: SpaceFilters;
    isLoading: boolean;
    error: string | null;
}

interface SpacesActions {
    fetchSpaces: (filters?: SpaceFilters) => Promise<void>;
    fetchBuildings: () => Promise<void>;
    fetchAmenities: () => Promise<void>;
    setFilters: (filters: Partial<SpaceFilters>) => void;
    clearFilters: () => void;
    updateSpaceFromSocket: (spaceId: string, available: boolean) => void;
}

const defaultFilters: SpaceFilters = {};

export const useSpacesStore = create<SpacesState & SpacesActions>((set, get) => ({
    spaces: [],
    buildings: [],
    amenities: [],
    filters: defaultFilters,
    isLoading: false,
    error: null,

    fetchSpaces: async (filters) => {
        const effectiveFilters = filters ?? get().filters;
        set({ isLoading: true, error: null });
        try {
            const { data } = await spacesApi.list(effectiveFilters);
            let spaces = data.spaces ?? [];

            // Client-side search filter
            const search = effectiveFilters.search?.toLowerCase();
            if (search) {
                spaces = spaces.filter((s) =>
                    s.displayName.toLowerCase().includes(search)
                    || s.buildingName?.toLowerCase().includes(search)
                    || s.floorName?.toLowerCase().includes(search)
                    || s.areaName?.toLowerCase().includes(search),
                );
            }

            // Client-side sorting
            const sort = effectiveFilters.sort;
            if (sort === 'name') {
                spaces = [...spaces].sort((a, b) => a.displayName.localeCompare(b.displayName));
            } else if (sort === 'floor') {
                spaces = [...spaces].sort((a, b) =>
                    (a.floorSortOrder ?? 999) - (b.floorSortOrder ?? 999)
                    || a.displayName.localeCompare(b.displayName),
                );
            } else if (sort === 'nearFriends') {
                spaces = [...spaces].sort((a, b) =>
                    b.friendsNearby.length - a.friendsNearby.length
                    || a.displayName.localeCompare(b.displayName),
                );
            }

            set({ spaces, isLoading: false });
        } catch (error: any) {
            set({
                error: error?.response?.data?.error?.message || 'Failed to load spaces',
                isLoading: false,
            });
        }
    },

    fetchBuildings: async () => {
        try {
            const { data } = await spacesApi.getBuildings();
            set({ buildings: data.buildings ?? [] });
        } catch {
            // Silently fail for building hierarchy
        }
    },

    fetchAmenities: async () => {
        try {
            const { data } = await spacesApi.getAmenities();
            set({ amenities: data.amenities ?? [] });
        } catch {
            // Silently fail for amenities
        }
    },

    setFilters: (partial) => {
        const newFilters = { ...get().filters, ...partial };
        set({ filters: newFilters });
        get().fetchSpaces(newFilters);
    },

    clearFilters: () => {
        set({ filters: defaultFilters });
        get().fetchSpaces(defaultFilters);
    },

    updateSpaceFromSocket: (spaceId, available) => {
        set((state) => ({
            spaces: state.spaces.map((s) =>
                s.id === spaceId ? { ...s, available } : s,
            ),
        }));
    },
}));
