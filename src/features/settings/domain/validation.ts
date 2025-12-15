import type { ValidationResult, ValidationError } from '@shared/domain/types';
import type { SettingsData } from './types';
import { MAX_LOGO_SIZE, ALLOWED_LOGO_FORMATS } from './types';

/**
 * Settings Domain Validation
 */

/**
 * Validate settings password
 * @param password - Password to validate
 * @returns Validation result
 */
export function validatePassword(password: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!password || password.trim() === '') {
        errors.push({
            field: 'password',
            message: 'Password is required',
        });
    }

    if (password.length < 4) {
        errors.push({
            field: 'password',
            message: 'Password must be at least 4 characters',
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate logo file
 * @param file - File to validate
 * @param logoIndex - Logo index (1 or 2)
 * @returns Validation result
 */
export function validateLogoFile(file: File, logoIndex: 1 | 2): ValidationResult {
    const errors: ValidationError[] = [];

    // Check file size
    if (file.size > MAX_LOGO_SIZE) {
        errors.push({
            field: `logo${logoIndex}`,
            message: `Logo ${logoIndex} must be less than 2MB`,
        });
    }

    // Check file format
    if (!ALLOWED_LOGO_FORMATS.includes(file.type)) {
        errors.push({
            field: `logo${logoIndex}`,
            message: `Logo ${logoIndex} must be PNG or JPEG format`,
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate app name
 * @param name - App name
 * @returns Validation result
 */
export function validateAppName(name: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!name || name.trim() === '') {
        errors.push({
            field: 'appName',
            message: 'App name is required',
        });
    }

    if (name.length > 50) {
        errors.push({
            field: 'appName',
            message: 'App name must be 50 characters or less',
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate settings data
 * @param settings - Settings to validate
 * @returns Validation result
 */
export function validateSettings(settings: Partial<SettingsData>): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate app name
    const nameValidation = validateAppName(settings.appName || '');
    if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
    }

    // Validate auto-sync interval
    if (settings.autoSyncEnabled && settings.autoSyncInterval !== undefined) {
        if (settings.autoSyncInterval < 30) {
            errors.push({
                field: 'autoSyncInterval',
                message: 'Auto-sync interval must be at least 30 seconds',
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
