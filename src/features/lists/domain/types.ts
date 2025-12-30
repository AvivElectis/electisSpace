import type { Space } from '@shared/domain/types';

/**
 * Lists Feature Domain Types
 */

export interface SavedList {
    id: string;
    name: string;
    spaces: Space[];
    createdAt: string;
    updatedAt: string;
}
