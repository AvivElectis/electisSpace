import { validateExportedData } from '../domain/validation';

/**
 * Tests for Import/Export Feature Validation
 * Covers exported data validation and edge cases
 */
describe('Import/Export Validation', () => {
    describe('validateExportedData', () => {
        describe('Valid Data', () => {
            it('should accept valid exported data', () => {
                const validData = {
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    encrypted: false,
                    data: {
                        solumApiUrl: 'https://api.example.com',
                    },
                };

                const result = validateExportedData(validData);
                expect(result.valid).toBe(true);
                expect(result.error).toBeUndefined();
            });

            it('should accept encrypted exported data', () => {
                const validData = {
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    encrypted: true,
                    data: 'encrypted-string-here',
                };

                const result = validateExportedData(validData);
                expect(result.valid).toBe(true);
            });

            it('should accept exported data with any version string', () => {
                const validData = {
                    version: '2.5.10',
                    timestamp: new Date().toISOString(),
                    encrypted: false,
                    data: {},
                };

                const result = validateExportedData(validData);
                expect(result.valid).toBe(true);
            });
        });

        describe('Invalid Data - Null/Undefined', () => {
            it('should reject null data', () => {
                const result = validateExportedData(null);
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid file format');
            });

            it('should reject undefined data', () => {
                const result = validateExportedData(undefined);
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid file format');
            });

            it('should reject non-object data', () => {
                expect(validateExportedData('string').valid).toBe(false);
                expect(validateExportedData(123).valid).toBe(false);
                expect(validateExportedData(true).valid).toBe(false);
            });
        });

        describe('Invalid Data - Missing Fields', () => {
            it('should reject data without version', () => {
                const invalidData = {
                    timestamp: new Date().toISOString(),
                    encrypted: false,
                    data: {},
                };

                const result = validateExportedData(invalidData);
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Missing required fields');
            });

            it('should reject data without timestamp', () => {
                const invalidData = {
                    version: '1.0.0',
                    encrypted: false,
                    data: {},
                };

                const result = validateExportedData(invalidData);
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Missing required fields');
            });

            it('should reject data without data field', () => {
                const invalidData = {
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    encrypted: false,
                };

                const result = validateExportedData(invalidData);
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Missing required fields');
            });

            it('should reject data without encrypted flag', () => {
                const invalidData = {
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    data: {},
                };

                const result = validateExportedData(invalidData);
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid encryption flag');
            });
        });

        describe('Invalid Data - Wrong Types', () => {
            it('should reject encrypted flag as string', () => {
                const invalidData = {
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    encrypted: 'true',
                    data: {},
                };

                const result = validateExportedData(invalidData);
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Invalid encryption flag');
            });

            it('should reject encrypted flag as number', () => {
                const invalidData = {
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    encrypted: 1,
                    data: {},
                };

                const result = validateExportedData(invalidData);
                expect(result.valid).toBe(false);
            });
        });

        describe('Edge Cases', () => {
            it('should accept empty data object', () => {
                const validData = {
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    encrypted: false,
                    data: {},
                };

                const result = validateExportedData(validData);
                expect(result.valid).toBe(true);
            });

            it('should accept additional unknown fields', () => {
                const validData = {
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    encrypted: false,
                    data: {},
                    unknownField: 'some value',
                    anotherField: 12345,
                };

                const result = validateExportedData(validData);
                expect(result.valid).toBe(true);
            });
        });
    });
});
