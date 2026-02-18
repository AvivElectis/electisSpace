import { useState, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    LinearProgress,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTranslation } from 'react-i18next';
import { usePeopleController } from '../application/usePeopleController';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';

interface CSVUploadDialogProps {
    open: boolean;
    onClose: () => void;
}

/**
 * CSV Upload Dialog
 * Allows drag-and-drop or file selection for importing people data
 */
export function CSVUploadDialog({ open, onClose }: CSVUploadDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const settings = useSettingsStore((state) => state.settings);
    const peopleController = usePeopleController();

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<Array<Record<string, string>>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    // Get expected columns from article format (all data columns including global fields, excluding auto-generated ID)
    const getExpectedColumns = useCallback(() => {
        if (!settings.solumArticleFormat) return [];

        const articleIdField = settings.solumArticleFormat.mappingInfo?.articleId || 'ARTICLE_ID';

        // Include all article data columns (including global fields), only exclude auto-generated ID
        return settings.solumArticleFormat.articleData.filter(
            fieldKey => fieldKey !== articleIdField
        );
    }, [settings.solumArticleFormat]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileSelect = async (file: File) => {
        setError(null);
        setPreviewData([]);

        // Validate file type
        if (!file.name.endsWith('.csv')) {
            setError(t('people.csvOnly'));
            return;
        }

        setSelectedFile(file);
        setLoading(true);

        try {
            // Read and parse for preview - store content for later import
            const content = await file.text();
            setFileContent(content);
            const lines = content.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                setError(t('people.csvEmpty'));
                setLoading(false);
                return;
            }

            const delimiter = settings.solumArticleFormat?.delimeter || ';';
            const expectedColumns = getExpectedColumns();

            // Generate preview (first 5 data rows)
            const preview: Array<Record<string, string>> = [];
            for (let i = 1; i < Math.min(lines.length, 6); i++) {
                const values = lines[i].split(delimiter).map(v => v.trim());
                const row: Record<string, string> = {};
                expectedColumns.forEach((col, idx) => {
                    row[col] = values[idx] || '';
                });
                preview.push(row);
            }

            setPreviewData(preview);
        } catch (err) {
            setError(t('people.csvParseError'));
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!selectedFile || !fileContent) return;

        setLoading(true);
        setError(null);

        try {
            // Use stored content instead of re-reading file
            await peopleController.loadPeopleFromContent(fileContent);
            onClose();
            handleReset();
        } catch (err: any) {
            setError(err.message || t('people.importFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setFileContent(null);
        setPreviewData([]);
        setError(null);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const expectedColumns = getExpectedColumns();

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMobile}>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <UploadFileIcon />
                    {t('people.uploadCSV')}
                </Box>
            </DialogTitle>
            <DialogContent>
                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Expected Format Info */}
                <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        <strong>{t('people.expectedFormat')}:</strong> {t('people.csvFormatDescription', {
                            delimiter: settings.solumArticleFormat?.delimeter || ';'
                        })}
                    </Typography>
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                        <strong>{t('people.columns')}:</strong> {expectedColumns.join('; ')}
                    </Typography>
                </Alert>

                {/* Drag & Drop Zone */}
                {!selectedFile && (
                    <Box
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        sx={{
                            border: '2px dashed',
                            borderColor: dragActive ? 'primary.main' : 'grey.400',
                            borderRadius: 2,
                            p: 4,
                            textAlign: 'center',
                            bgcolor: dragActive ? 'action.hover' : 'background.default',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                        }}
                        onClick={() => document.getElementById('csv-file-input')?.click()}
                    >
                        <input
                            id="csv-file-input"
                            type="file"
                            accept=".csv"
                            style={{ display: 'none' }}
                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        />
                        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h6" gutterBottom>
                            {t('people.dragDropCSV')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('people.orClickToSelect')}
                        </Typography>
                    </Box>
                )}

                {/* Loading */}
                {loading && <LinearProgress sx={{ my: 2 }} />}

                {/* Selected File Info */}
                {selectedFile && !loading && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            {t('people.selectedFile')}: <strong>{selectedFile.name}</strong>
                        </Typography>
                        <Button size="small" onClick={handleReset}>
                            {t('people.selectDifferent')}
                        </Button>
                    </Box>
                )}

                {/* Preview Table */}
                {previewData.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            {t('people.preview')} ({previewData.length} {t('people.rows')})
                        </Typography>
                        <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        {expectedColumns.map(col => (
                                            <TableCell key={col} sx={{ fontWeight: 600 }}>
                                                {col}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previewData.map((row, idx) => (
                                        <TableRow key={idx}>
                                            {expectedColumns.map(col => (
                                                <TableCell key={col}>
                                                    {row[col] || '-'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    {t('common.cancel')}
                </Button>
                <Button
                    onClick={handleImport}
                    variant="contained"
                    disabled={!selectedFile || loading}
                    startIcon={<UploadFileIcon />}
                >
                    {t('people.import')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
