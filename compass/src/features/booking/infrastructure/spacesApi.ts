import compassApi from '@shared/api/compassApi';
import type { SpaceWithAvailability, Building, SpaceFilters, AmenityInfo } from '../domain/types';

export const spacesApi = {
    list: (filters?: SpaceFilters) => {
        // Convert amenityIds array to comma-separated string for query params
        const params: Record<string, unknown> = { ...filters };
        if (filters?.amenityIds?.length) {
            params.amenityIds = filters.amenityIds.join(',');
        }
        return compassApi.get<{ spaces: SpaceWithAvailability[] }>('/spaces', { params });
    },

    getById: (id: string) =>
        compassApi.get<{ space: SpaceWithAvailability }>(`/spaces/${id}`),

    getBuildings: () =>
        compassApi.get<{ buildings: Building[] }>('/buildings'),

    getAmenities: () =>
        compassApi.get<{ amenities: AmenityInfo[] }>('/amenities'),
};
