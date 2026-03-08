import compassApi from '@shared/api/compassApi';
import type { SpaceWithAvailability, Building, SpaceFilters, AmenityInfo } from '../domain/types';

export const spacesApi = {
    list: (filters?: SpaceFilters) => {
        // Convert amenityIds array to comma-separated 'amenities' param (server expects 'amenities')
        const params: Record<string, unknown> = { ...filters };
        if (filters?.amenityIds?.length) {
            params.amenities = filters.amenityIds.join(',');
            delete params.amenityIds;
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
