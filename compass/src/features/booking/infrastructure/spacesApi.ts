import compassApi from '@shared/api/compassApi';
import type { SpaceWithAvailability, Building, SpaceFilters } from '../domain/types';

export const spacesApi = {
    list: (filters?: SpaceFilters) =>
        compassApi.get<{ spaces: SpaceWithAvailability[] }>('/spaces', { params: filters }),

    getById: (id: string) =>
        compassApi.get<{ space: SpaceWithAvailability }>(`/spaces/${id}`),

    getBuildings: () =>
        compassApi.get<{ buildings: Building[] }>('/buildings'),
};
