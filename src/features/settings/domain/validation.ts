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

    // Validate app name only if it's explicitly provided (not undefined)
    if (settings.appName !== undefined) {
        const nameValidation = validateAppName(settings.appName || '');
        if (!nameValidation.valid) {
            errors.push(...nameValidation.errors);
        }
    }

    // Validate auto-sync interval
    if (settings.autoSyncEnabled && settings.autoSyncInterval !== undefined) {
        if (settings.autoSyncInterval < 10) {
            errors.push({
                field: 'autoSyncInterval',
                message: 'Auto-sync interval must be at least 10 seconds',
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate SoluM Mapping Configuration
 */
export function validateSolumMappingConfig(
    config: Partial<import('./types').SolumMappingConfig> | undefined,
    availableFields: string[]
): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config) {
        errors.push({ field: 'solumMappingConfig', message: 'SoluM mapping configuration is required' });
        return { valid: false, errors };
    }

    // Validate uniqueIdField
    if (!config.uniqueIdField || config.uniqueIdField.trim() === '') {
        errors.push({ field: 'uniqueIdField', message: 'Unique ID field is required' });
    } else if (!availableFields.includes(config.uniqueIdField)) {
        errors.push({ field: 'uniqueIdField', message: `Field "${config.uniqueIdField}" does not exist in article format` });
    }

    // Validate fields mapping
    if (!config.fields || Object.keys(config.fields).length === 0) {
        errors.push({ field: 'fields', message: 'At least one field mapping is required' });
    } else {
        Object.entries(config.fields).forEach(([fieldKey, mapping]) => {
            if (!availableFields.includes(fieldKey)) {
                errors.push({ field: `fields.${fieldKey}`, message: `Field "${fieldKey}" does not exist in article format` });
            }
            if (!mapping.friendlyNameEn || mapping.friendlyNameEn.trim() === '') {
                errors.push({ field: `fields.${fieldKey}.friendlyNameEn`, message: 'English name is required' });
            }
            if (!mapping.friendlyNameHe || mapping.friendlyNameHe.trim() === '') {
                errors.push({ field: `fields.${fieldKey}.friendlyNameHe`, message: 'Hebrew name is required' });
            }
        });
    }

    // Validate conference mapping
    if (config.conferenceMapping) {
        if (!config.conferenceMapping.meetingName || config.conferenceMapping.meetingName.trim() === '') {
            errors.push({ field: 'conferenceMapping.meetingName', message: 'Meeting name field is required' });
        } else if (!availableFields.includes(config.conferenceMapping.meetingName)) {
            errors.push({ field: 'conferenceMapping.meetingName', message: `Field "${config.conferenceMapping.meetingName}" does not exist` });
        }

        if (!config.conferenceMapping.meetingTime || config.conferenceMapping.meetingTime.trim() === '') {
            errors.push({ field: 'conferenceMapping.meetingTime', message: 'Meeting time field is required' });
        } else if (!availableFields.includes(config.conferenceMapping.meetingTime)) {
            errors.push({ field: 'conferenceMapping.meetingTime', message: `Field "${config.conferenceMapping.meetingTime}" does not exist` });
        }

        if (!config.conferenceMapping.participants || config.conferenceMapping.participants.trim() === '') {
            errors.push({ field: 'conferenceMapping.participants', message: 'Participants field is required' });
        } else if (!availableFields.includes(config.conferenceMapping.participants)) {
            errors.push({ field: 'conferenceMapping.participants', message: `Field "${config.conferenceMapping.participants}" does not exist` });
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
