/**
 * Barrel export for People Management hooks
 * 
 * These hooks are split from usePeopleController for better code organization:
 * - usePeopleCSV: CSV loading and parsing operations
 * - usePeopleAssignment: Space assignment operations
 * - usePeopleAIMS: AIMS synchronization operations
 * - usePeopleLists: People list management operations
 */

export { usePeopleCSV } from './usePeopleCSV';
export { usePeopleAssignment } from './usePeopleAssignment';
export { usePeopleAIMS } from './usePeopleAIMS';
export { usePeopleLists } from './usePeopleLists';
export { usePeopleListsSync } from './usePeopleListsSync';
