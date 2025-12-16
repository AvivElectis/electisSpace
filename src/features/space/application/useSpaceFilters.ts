import { useState, useMemo, useCallback } from 'react';
import type { Space } from '@shared/domain/types';
import type { SpaceFilters, FilterOptions } from '../domain/types';
import { filterSpaces, getUniqueFieldValues } from '../domain/businessRules';

/**
 * Space Filters Hook
 * Manages filtering and search for space list
 */

interface UseSpaceFiltersProps {
    spaces: Space[];
    filterableFields?: string[];  // Fields that can be filtered (from CSV config)
}

export function useSpaceFilters({
    spaces,
    filterableFields = [],
}: UseSpaceFiltersProps) {
    const [filters, setFilters] = useState<SpaceFilters>({});

    /**
     * Get available filter options
     */
    const filterOptions = useMemo((): FilterOptions => {
        const options: FilterOptions = {
            rooms: getUniqueFieldValues(spaces, 'roomName'),
        };

        // Add dynamic field options
        for (const field of filterableFields) {
            options[field] = getUniqueFieldValues(spaces, field);
        }

        return options;
    }, [spaces, filterableFields]);

    /**
     * Get filtered spaces
     */
    const filteredSpaces = useMemo((): Space[] => {
        const { searchQuery, ...otherFilters } = filters;
        // Filter out undefined values for strict type checking
        const cleanFilters: Record<string, string> = {};
        for (const [key, value] of Object.entries(otherFilters)) {
            if (value !== undefined) {
                cleanFilters[key] = value;
            }
        }
        return filterSpaces(spaces, searchQuery, cleanFilters);
    }, [spaces, filters]);

    /**
     * Update filters
     */
    const updateFilters = useCallback((newFilters: Partial<SpaceFilters>): void => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    /**
     * Reset all filters
     */
    const resetFilters = useCallback((): void => {
        setFilters({});
    }, []);

    /**
     * Set search query
     */
    const setSearchQuery = useCallback((query: string): void => {
        setFilters(prev => ({ ...prev, searchQuery: query }));
    }, []);

    return {
        filters,
        filterOptions,
        filteredSpaces,
        updateFilters,
        resetFilters,
        setSearchQuery,
    };
}
