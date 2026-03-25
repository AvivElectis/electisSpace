import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Typography,
    Alert,
    LinearProgress,
    Button,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { usePeopleController } from '../../application/usePeopleController';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';

/**
 * NativePeopleImportPage — Android-native CSV import page for People.
 * Mirrors the logic of CSVUploadDialog but rendered as a routed NativeFormPage.
 * File is picked via a native <input type="file"> element.
 */
export function NativePeopleImportPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const settings = useSettingsStore((state) => state.settings);
    const peopleController = usePeopleController();

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Determine expected columns from article format (same logic as CSVUploadDialog)
    const getExpectedColumns = useCallback((): string[] => {
        if (!settings.solumArticleFormat) return [];
        const articleIdField = settings.solumArticleFormat.mappingInfo?.articleId || 'ARTICLE_ID';
        return settings.solumArticleFormat.articleData.filter((f: string) => f !== articleIdField);
    }, [settings.solumArticleFormat]);

    const expectedColumns = getExpectedColumns();

    const handleFileSelect = useCallback(async (file: File) => {
        setError(null);
        setPreviewRows([]);
        setFileContent(null);
        setSelectedFile(null);

        if (!file.name.endsWith('.csv')) {
            setError(t('people.csvOnly'));
            return;
        }

        setSelectedFile(file);
        setLoading(true);

        try {
            const content = await file.text();
            setFileContent(content);

            const lines = content.split('\n').filter((l) => l.trim());
            if (lines.length < 2) {
                setError(t('people.csvEmpty'));
                setLoading(false);
                return;
            }

            const delimiter = settings.solumArticleFormat?.delimeter || ';';
            const cols = getExpectedColumns();

            const preview: Array<Record<string, string>> = [];
            for (let i = 1; i < Math.min(lines.length, 6); i++) {
                const values = lines[i].split(delimiter).map((v) => v.trim());
                const row: Record<string, string> = {};
                cols.forEach((col: string, idx: number) => {
                    row[col] = values[idx] || '';
                });
                preview.push(row);
            }
            setPreviewRows(preview);
        } catch {
            setError(t('people.csvParseError'));
        } finally {
            setLoading(false);
        }
    }, [t, settings.solumArticleFormat, getExpectedColumns]);

    const handleImport = useCallback(async () => {
        if (!fileContent) return;
        setLoading(true);
        setError(null);
        try {
            await peopleController.loadPeopleFromContent(fileContent);
            navigate(-1);
        } catch (err: any) {
            setError(err.message || t('people.importFailed'));
            setLoading(false);
        }
    }, [fileContent, peopleController, navigate, t]);

    const handleReset = useCallback(() => {
        setSelectedFile(null);
        setFileContent(null);
        setPreviewRows([]);
        setError(null);
    }, []);

    return (
        <NativeFormPage
            title={t('people.uploadCSV')}
            onSave={handleImport}
            isSaving={loading}
            saveLabel={t('people.import')}
        >
            {/* Format info */}
            <NativeFormSection title={t('people.expectedFormat', 'Expected Format')}>
                <Alert severity="info" sx={{ mb: 1 }}>
                    <Typography variant="body2">
                        {t('people.csvFormatDescription', {
                            delimiter: settings.solumArticleFormat?.delimeter || ';',
                        })}
                    </Typography>
                    {expectedColumns.length > 0 && (
                        <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                            <strong>{t('people.columns')}:</strong> {expectedColumns.join('; ')}
                        </Typography>
                    )}
                </Alert>
            </NativeFormSection>

            {/* File picker */}
            <NativeFormSection title={t('people.selectFile', 'Select File')}>
                {error && (
                    <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading && <LinearProgress sx={{ mb: 1 }} />}

                {!selectedFile ? (
                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: 'primary.main',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            bgcolor: 'action.hover',
                        }}
                        onClick={() => document.getElementById('native-csv-input')?.click()}
                    >
                        <input
                            id="native-csv-input"
                            type="file"
                            accept=".csv"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                        />
                        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                            {t('people.orClickToSelect')}
                        </Typography>
                    </Box>
                ) : (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <UploadFileIcon color="primary" />
                            <Typography variant="body2" fontWeight={600}>
                                {selectedFile.name}
                            </Typography>
                        </Box>
                        <Button size="small" onClick={handleReset}>
                            {t('people.selectDifferent')}
                        </Button>
                    </Box>
                )}
            </NativeFormSection>

            {/* Preview */}
            {previewRows.length > 0 && (
                <NativeFormSection title={`${t('people.preview')} (${previewRows.length} ${t('people.rows')})`}>
                    <Box sx={{ overflowX: 'auto' }}>
                        {previewRows.map((row, rowIdx) => (
                            <Box
                                key={rowIdx}
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                    py: 0.5,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    flexWrap: 'wrap',
                                }}
                            >
                                {expectedColumns.map((col: string) => (
                                    <Typography key={col} variant="caption" sx={{ minWidth: 60 }}>
                                        <strong>{col}:</strong> {row[col] || '—'}
                                    </Typography>
                                ))}
                            </Box>
                        ))}
                    </Box>
                </NativeFormSection>
            )}
        </NativeFormPage>
    );
}
