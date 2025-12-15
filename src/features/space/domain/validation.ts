import type { Space, ValidationResult, ValidationError, CSVConfig } from '@shared/domain/types';

/**
 * Space Domain Validation
 */

/**
 * Validate a space entity
 * @param space - Space to validate
 * @param csvConfig - CSV configuration for required fields
 * @returns Validation result
 */
export function validateSpace(space: Partial<Space>, csvConfig: CSVConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate ID
    if (!space.id || space.id.trim() === '') {
        errors.push({
            field: 'id',
            message: 'ID is required',
        });
    }

    // Validate room name
    if (!space.roomName || space.roomName.trim() === '') {
        errors.push({
            field: 'roomName',
            message: 'Room name is required',
        });
    }

    // Validate required CSV fields
    if (space.data) {
        for (const column of csvConfig.columns) {
            if (column.required) {
                const value = space.data[column.name];
                if (!value || value.trim() === '') {
                    errors.push({
                        field: column.name,
                        message: `${column.name} is required`,
                    });
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate space list name
 * @param name - Space list name
 * @returns Validation result
 */
export function validateSpaceListName(name: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!name || name.trim() === '') {
        errors.push({
            field: 'name',
            message: 'Space list name is required',
        });
    }

    if (name.length > 50) {
        errors.push({
            field: 'name',
            message: 'Space list name must be 50 characters or less',
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Check if space ID is unique
 * @param id - Space ID to check
 * @param spaces - Existing spaces list
 * @param excludeId - Optional ID to exclude from check (for updates)
 * @returns true if ID is unique
 */
export function isSpaceIdUnique(
    id: string,
    spaces: Space[],
    excludeId?: string
): boolean {
    return !spaces.some(s => s.id === id && s.id !== excludeId);
}
