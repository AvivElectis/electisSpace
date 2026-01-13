/**
 * useImportExportController Hook Tests
 * Phase 10.14 - Deep Testing System
 * 
 * Tests the import/export controller hook for settings import/export operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImportExportController } from '../application/useImportExportController';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import type { ExportedData, ImportPreview } from '../domain/types';

// Mock file adapter
const mockSaveExport = vi.fn();
const mockLoadImport = vi.fn();

vi.mock('../infrastructure/fileAdapter', () => ({
    ImportExportFileAdapter: class {
        saveExport = mockSaveExport;
        loadImport = mockLoadImport;
    },
}));

// Mock validation
vi.mock('../domain/validation', () => ({
    validateExportedData: vi.fn().mockReturnValue({ valid: true }),
}));

// Mock business rules
vi.mock('../domain/businessRules', () => ({
    exportSettings: vi.fn().mockReturnValue({
        version: '1.0.0',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: '{}',
        encrypted: false,
    } as ExportedData),
    importSettings: vi.fn().mockReturnValue({
        appName: 'Test App',
        workingMode: 'SFTP',
    }),
    generateImportPreview: vi.fn().mockReturnValue({
        appName: 'Test App',
        workingMode: 'SFTP',
        hasCredentials: false,
        hasLogos: false,
        timestamp: '2025-01-01T00:00:00.000Z',
    } as ImportPreview),
}));

// Mock settings validation
vi.mock('@features/settings/domain/validation', () => ({
    validateSettings: vi.fn().mockReturnValue({ valid: true }),
}));

// Mock logger
vi.mock('@shared/infrastructure/services/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('useImportExportController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset settings store
        useSettingsStore.setState({
            settings: {
                appName: 'Original App',
                workingMode: 'SOLUM_API',
            },
        });
    });

    describe('initialization', () => {
        it('should expose all required functions', () => {
            const { result } = renderHook(() => useImportExportController());

            expect(typeof result.current.exportToFile).toBe('function');
            expect(typeof result.current.importFromFile).toBe('function');
            expect(typeof result.current.getImportPreview).toBe('function');
        });

        it('should maintain function references across renders (useCallback)', () => {
            const { result, rerender } = renderHook(() => useImportExportController());

            const firstExport = result.current.exportToFile;
            const firstImport = result.current.importFromFile;
            const firstPreview = result.current.getImportPreview;

            rerender();

            // These should be stable due to useCallback
            expect(result.current.exportToFile).toBe(firstExport);
            expect(result.current.importFromFile).toBe(firstImport);
            expect(result.current.getImportPreview).toBe(firstPreview);
        });
    });

    describe('exportToFile', () => {
        it('should export settings successfully', async () => {
            mockSaveExport.mockResolvedValue('/path/to/export.json');

            const { result } = renderHook(() => useImportExportController());

            let exportResult: boolean = false;
            await act(async () => {
                exportResult = await result.current.exportToFile({
                    includeCredentials: false,
                });
            });

            expect(exportResult).toBe(true);
        });

        it('should return false when save is cancelled', async () => {
            mockSaveExport.mockResolvedValue(null);

            const { result } = renderHook(() => useImportExportController());

            let exportResult: boolean = true;
            await act(async () => {
                exportResult = await result.current.exportToFile({
                    includeCredentials: false,
                });
            });

            expect(exportResult).toBe(false);
        });

        it('should pass includeCredentials option', async () => {
            mockSaveExport.mockResolvedValue('/path/to/export.json');
            const { exportSettings } = await import('../domain/businessRules');

            const { result } = renderHook(() => useImportExportController());

            await act(async () => {
                await result.current.exportToFile({
                    includeCredentials: true,
                    password: 'secret',
                });
            });

            expect(exportSettings).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    includeCredentials: true,
                    password: 'secret',
                })
            );
        });

        it('should throw error when export fails', async () => {
            mockSaveExport.mockRejectedValue(new Error('Save failed'));

            const { result } = renderHook(() => useImportExportController());

            await expect(
                result.current.exportToFile({ includeCredentials: false })
            ).rejects.toThrow('Save failed');
        });
    });

    describe('importFromFile', () => {
        it('should import settings successfully', async () => {
            mockLoadImport.mockResolvedValue({
                version: '1.0.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: '{}',
                encrypted: false,
            });

            const { result } = renderHook(() => useImportExportController());

            let importResult: boolean = false;
            await act(async () => {
                importResult = await result.current.importFromFile();
            });

            expect(importResult).toBe(true);
        });

        it('should return false when user cancels file selection', async () => {
            mockLoadImport.mockResolvedValue(null);

            const { result } = renderHook(() => useImportExportController());

            let importResult: boolean = true;
            await act(async () => {
                importResult = await result.current.importFromFile();
            });

            expect(importResult).toBe(false);
        });

        it('should throw error when validation fails', async () => {
            mockLoadImport.mockResolvedValue({
                version: '1.0.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: '{}',
                encrypted: false,
            });

            const { validateExportedData } = await import('../domain/validation');
            vi.mocked(validateExportedData).mockReturnValueOnce({
                valid: false,
                error: 'Invalid file format',
            });

            const { result } = renderHook(() => useImportExportController());

            await expect(
                result.current.importFromFile()
            ).rejects.toThrow('Invalid file format');
        });

        it('should throw error when imported settings are invalid', async () => {
            mockLoadImport.mockResolvedValue({
                version: '1.0.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: '{}',
                encrypted: false,
            });

            const { validateSettings } = await import('@features/settings/domain/validation');
            vi.mocked(validateSettings).mockReturnValueOnce({ valid: false });

            const { result } = renderHook(() => useImportExportController());

            await expect(
                result.current.importFromFile()
            ).rejects.toThrow('Imported settings are invalid');
        });

        it('should pass password for encrypted files', async () => {
            mockLoadImport.mockResolvedValue({
                version: '1.0.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: 'encrypted-data',
                encrypted: true,
            });

            const { importSettings } = await import('../domain/businessRules');

            const { result } = renderHook(() => useImportExportController());

            await act(async () => {
                await result.current.importFromFile('mypassword');
            });

            expect(importSettings).toHaveBeenCalledWith(
                expect.any(Object),
                'mypassword'
            );
        });
    });

    describe('getImportPreview', () => {
        it('should return preview data', async () => {
            mockLoadImport.mockResolvedValue({
                version: '1.0.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: '{}',
                encrypted: false,
            });

            const { result } = renderHook(() => useImportExportController());

            let preview: ImportPreview | null = null;
            await act(async () => {
                preview = await result.current.getImportPreview();
            });

            expect(preview).toEqual({
                appName: 'Test App',
                workingMode: 'SFTP',
                hasCredentials: false,
                hasLogos: false,
                timestamp: '2025-01-01T00:00:00.000Z',
            });
        });

        it('should return null when user cancels file selection', async () => {
            mockLoadImport.mockResolvedValue(null);

            const { result } = renderHook(() => useImportExportController());

            let preview: ImportPreview | null = { appName: 'test' } as ImportPreview;
            await act(async () => {
                preview = await result.current.getImportPreview();
            });

            expect(preview).toBeNull();
        });

        it('should throw error when file validation fails', async () => {
            mockLoadImport.mockResolvedValue({
                version: '1.0.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: '{}',
                encrypted: false,
            });

            const { validateExportedData } = await import('../domain/validation');
            vi.mocked(validateExportedData).mockReturnValueOnce({
                valid: false,
                error: 'Corrupt file',
            });

            const { result } = renderHook(() => useImportExportController());

            await expect(
                result.current.getImportPreview()
            ).rejects.toThrow('Corrupt file');
        });

        it('should pass password for encrypted file preview', async () => {
            mockLoadImport.mockResolvedValue({
                version: '1.0.0',
                timestamp: '2025-01-01T00:00:00.000Z',
                data: 'encrypted-data',
                encrypted: true,
            });

            const { generateImportPreview } = await import('../domain/businessRules');

            const { result } = renderHook(() => useImportExportController());

            await act(async () => {
                await result.current.getImportPreview('secret');
            });

            expect(generateImportPreview).toHaveBeenCalledWith(
                expect.any(Object),
                'secret'
            );
        });
    });

    describe('error handling', () => {
        it('should handle fileAdapter errors gracefully', async () => {
            mockLoadImport.mockRejectedValue(new Error('File read error'));

            const { result } = renderHook(() => useImportExportController());

            await expect(
                result.current.importFromFile()
            ).rejects.toThrow('File read error');
        });

        it('should handle export business rule errors', async () => {
            const { exportSettings } = await import('../domain/businessRules');
            vi.mocked(exportSettings).mockImplementationOnce(() => {
                throw new Error('Export processing failed');
            });

            const { result } = renderHook(() => useImportExportController());

            await expect(
                result.current.exportToFile({ includeCredentials: false })
            ).rejects.toThrow('Export processing failed');
        });
    });
});
