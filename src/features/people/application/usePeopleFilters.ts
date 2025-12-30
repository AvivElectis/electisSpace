import { useMemo } from 'react';
import type { Person, PeopleFilters } from '../domain/types';

/**
 * People Filters Hook
 * Filters and sorts people based on search query and assignment status
 */
export function usePeopleFilters(people: Person[], filters: PeopleFilters) {
    const filteredPeople = useMemo(() => {
        let result = [...people];

        // Filter by search query
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(person => {
                // Search in all data fields
                return Object.values(person.data).some(value =>
                    value.toLowerCase().includes(query)
                ) || person.id.toLowerCase().includes(query);
            });
        }

        // Filter by assignment status
        if (filters.assignmentStatus && filters.assignmentStatus !== 'all') {
            if (filters.assignmentStatus === 'assigned') {
                result = result.filter(person => !!person.assignedSpaceId);
            } else if (filters.assignmentStatus === 'unassigned') {
                result = result.filter(person => !person.assignedSpaceId);
            }
        }

        return result;
    }, [people, filters]);

    return {
        filteredPeople,
        totalCount: people.length,
        filteredCount: filteredPeople.length,
        assignedCount: people.filter(p => p.assignedSpaceId).length,
        unassignedCount: people.filter(p => !p.assignedSpaceId).length,
    };
}
