/**
 * Import/Export Feature Validation
 */

export function validateExportedData(data: any): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid file format' };
    }

    if (!data.version || !data.timestamp || !data.data) {
        return { valid: false, error: 'Missing required fields' };
    }

    if (typeof data.encrypted !== 'boolean') {
        return { valid: false, error: 'Invalid encryption flag' };
    }

    return { valid: true };
}
