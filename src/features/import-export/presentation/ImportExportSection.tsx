/**
 * Import/Export Section Component
 * Reusable section for settings import/export
 */

import {
    Box,
    Typography,
    Button,
    Alert,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useImportExportController } from '../application/useImportExportController';
import { ExportDialog } from './ExportDialog';
import { ImportDialog } from './ImportDialog';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

export function ImportExportSection() {
    const { t } = useTranslation();
    const { exportToFile } = useImportExportController();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [exportedFileData, setExportedFileData] = useState<any>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async (options: any) => {
        try {
            const result = await exportToFile(options);
            if (result) {
                setSuccess(t('importExport.exportSuccess'));
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (err: any) {
            setError(err.message || t('importExport.exportFailed'));
            setTimeout(() => setError(null), 5000);
            throw err;
        }
    };

    const handleImportClick = async () => {
        try {
            // Load the file first
            const fileAdapter = new (await import('../infrastructure/fileAdapter')).ImportExportFileAdapter();
            const exported = await fileAdapter.loadImport();

            if (!exported) {
                return; // User canceled file selection
            }

            // Store the file data and open dialog
            setExportedFileData(exported);
            setImportDialogOpen(true);
        } catch (err: any) {
            setError(err.message || t('importExport.importFailed'));
            setTimeout(() => setError(null), 5000);
        }
    };

    const handleImport = async (password?: string) => {
        try {
            if (!exportedFileData) {
                throw new Error('No file data available');
            }

            // Import using the stored file data
            const { importSettings } = await import('../domain/businessRules');
            const { validateSettings } = await import('@features/settings/domain/validation');
            const { useSettingsStore } = await import('@features/settings/infrastructure/settingsStore');

            const importedSettings = importSettings(exportedFileData, password);
            const settingsValidation = validateSettings(importedSettings);
            if (!settingsValidation.valid) {
                throw new Error('Imported settings are invalid');
            }

            useSettingsStore.getState().setSettings(importedSettings);

            setSuccess(t('importExport.importSuccess'));
            setExportedFileData(null); // Clear file data
            setImportDialogOpen(false);

            setTimeout(async () => {
                setSuccess(null);
                // Suggest restart
                const confirmed = await confirm({
                    title: t('common.dialog.info'),
                    message: t('importExport.restartRecommended'),
                    confirmLabel: t('common.yes'),
                    cancelLabel: t('common.no'),
                    severity: 'info'
                });

                if (confirmed) {
                    window.location.reload();
                }
            }, 2000);
        } catch (err: any) {
            setError(err.message || t('importExport.importFailed'));
            setTimeout(() => setError(null), 5000);
            throw err;
        }
    };

    return (
        <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                {t('importExport.title')}
            </Typography>

            <Alert severity="info" sx={{ mb: 1.5, py: 0, px: 2 }}>
                {t('importExport.description')}
            </Alert>

            {success && (
                <Alert severity="success" sx={{ mb: 1.5, py: 0, px: 2 }}>
                    {success}
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 1.5, py: 0, px: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 0 }}>
                <Button
                    variant="text"
                    startIcon={<FileDownloadIcon />}
                    onClick={() => setExportDialogOpen(true)}
                    sx={{ width: 'fit-content' }}
                >
                    {t('importExport.export')}
                </Button>
                <Button
                    variant="text"
                    startIcon={<FileUploadIcon />}
                    onClick={handleImportClick}
                    sx={{ width: 'fit-content' }}
                >
                    {t('importExport.import')}
                </Button>
            </Box>

            <ExportDialog
                open={exportDialogOpen}
                onClose={() => setExportDialogOpen(false)}
                onExport={handleExport}
            />

            <ImportDialog
                open={importDialogOpen}
                onClose={() => {
                    setImportDialogOpen(false);
                    setExportedFileData(null);
                }}
                onImport={handleImport}
                preview={null}
                isEncrypted={exportedFileData?.encrypted || false}
            />
            <ConfirmDialog />
        </Box>
    );
}
