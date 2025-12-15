import { useState, useMemo, useCallback } from 'react';
import type { Person } from '@shared/domain/types';
import type { PersonnelFilters, FilterOptions } from '../domain/types';
import { filterPersonnel, getUniqueFieldValues } from '../domain/businessRules';

/**
 * Personnel Filters Hook
 * Manages filtering and search for personnel list
 */

interface UsePersonnelFiltersProps {
    personnel: Person[];
    filterableFields?: string[];  // Fields that can be filtered (from CSV config)
}

export function usePersonnelFilters({
    personnel,
    filterableFields = [],
}: UsePersonnelFiltersProps) {
    const [filters, setFilters] = useState<PersonnelFilters>({});

    /**
     * Get available filter options
     */
    const filterOptions = useMemo((): FilterOptions => {
        const options: FilterOptions = {
            rooms: getUniqueFieldValues(personnel, 'roomName'),
        };

        // Add dynamic field options
        for (const field of filterableFields) {
            options[field] = getUniqueFieldValues(personnel, field);
        }

        return options;
    }, [personnel, filterableFields]);

    /**
     * Get filtered personnel
     */
    const filteredPersonnel = useMemo((): Person[] => {
        const { searchQuery, ...otherFilters } = filters;
        return filterPersonnel(personnel, searchQuery, otherFilters);
    }, [personnel, filters]);

    /**
     * Update filters
     */
    const updateFilters = useCallback((newFilters: Partial<PersonnelFilters>): void => {
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
        filteredPersonnel,
        updateFilters,
        resetFilters,
        setSearchQuery,
    };
}
