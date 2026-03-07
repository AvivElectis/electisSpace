/**
 * Wizard Step 3: Article Format — Fetch & Confirm
 * Two view modes: Visual summary or JSON editor with edit support.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import {
    Box,
    Typography,
    Chip,
    TextField,
    CircularProgress,
    Alert,
    Button,
    Paper,
    ToggleButtonGroup,
    ToggleButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewListIcon from '@mui/icons-material/ViewList';
import CodeIcon from '@mui/icons-material/Code';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTranslation } from 'react-i18next';
import type { ArticleFormat } from '@features/configuration/domain/types';

// Lazy load the heavy JSON editor (~1MB vanilla-jsoneditor)
const ArticleFormatEditor = lazy(() =>
    import('@features/configuration/presentation/ArticleFormatEditor').then(m => ({ default: m.ArticleFormatEditor }))
);

interface ArticleFormatStepProps {
    articleFormat: ArticleFormat | null;
    loading: boolean;
    error: string | null;
    onFetch: () => Promise<void>;
    onUpdate: (format: ArticleFormat) => void;
    compassEnabled?: boolean;
    readOnly?: boolean;
    onPushToAims?: (format: ArticleFormat) => Promise<{ success: boolean; error?: string }>;
}

export function ArticleFormatStep({
    articleFormat,
    loading,
    error,
    onFetch,
    onUpdate,
    compassEnabled,
    readOnly,
    onPushToAims,
}: ArticleFormatStepProps) {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
    const [pushConfirmOpen, setPushConfirmOpen] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [pushResult, setPushResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Auto-fetch on mount if not yet loaded
    useEffect(() => {
        if (!articleFormat && !loading && !error) {
            onFetch();
        }
    }, [articleFormat, loading, error, onFetch]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                <CircularProgress />
                <Typography color="text.secondary">
                    {t('settings.companies.fetchingArticleFormat')}
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="error">{error}</Alert>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onFetch}>
                    {t('common.retry', 'Retry')}
                </Button>
            </Box>
        );
    }

    if (!articleFormat) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography color="text.secondary">
                    {t('settings.companies.fetchingArticleFormat')}
                </Typography>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onFetch}>
                    {t('common.retry', 'Retry')}
                </Button>
            </Box>
        );
    }

    const handleJsonSave = async (newFormat: ArticleFormat): Promise<boolean> => {
        onUpdate(newFormat);
        return true;
    };

    const handlePushConfirm = async () => {
        if (!articleFormat || !onPushToAims) return;
        setPushConfirmOpen(false);
        setPushing(true);
        setPushResult(null);
        try {
            const result = await onPushToAims(articleFormat);
            if (result.success) {
                setPushResult({ type: 'success', message: t('settings.companies.articleFormatPushSuccess') });
                onFetch(); // Refresh from AIMS
            } else {
                setPushResult({ type: 'error', message: result.error || t('settings.companies.articleFormatPushError') });
            }
        } catch {
            setPushResult({ type: 'error', message: t('settings.companies.articleFormatPushError') });
        } finally {
            setPushing(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {readOnly ? (
                <Alert severity="info" sx={{ mb: 1 }}>
                    {t('settings.companies.compassArticleFormatInfo')}
                </Alert>
            ) : (
                <Alert severity="success" sx={{ mb: 1 }}>
                    {t('settings.companies.articleFormatFetched')}
                </Alert>
            )}

            {pushResult && (
                <Alert severity={pushResult.type} onClose={() => setPushResult(null)}>
                    {pushResult.message}
                </Alert>
            )}

            {/* View mode toggle + actions (hidden in read-only mode) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, v) => v && setViewMode(v)}
                    size="small"
                    sx={{ direction: 'ltr' }}
                >
                    <ToggleButton value="visual">
                        <ViewListIcon sx={{ mr: 0.5 }} fontSize="small" />
                        {t('settings.companies.visualView')}
                    </ToggleButton>
                    <ToggleButton value="json">
                        <CodeIcon sx={{ mr: 0.5 }} fontSize="small" />
                        {t('settings.companies.jsonView')}
                    </ToggleButton>
                </ToggleButtonGroup>

                {!readOnly && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {onPushToAims && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={pushing ? <CircularProgress size={14} /> : <CloudUploadIcon />}
                                onClick={() => setPushConfirmOpen(true)}
                                disabled={pushing}
                            >
                                {pushing ? t('settings.companies.articleFormatPushing') : t('settings.companies.saveToAims', 'Save to AIMS')}
                            </Button>
                        )}
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<RefreshIcon />}
                            onClick={onFetch}
                        >
                            {t('settings.companies.refetchArticleFormat')}
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Push confirmation dialog */}
            <Dialog open={pushConfirmOpen} onClose={() => setPushConfirmOpen(false)}>
                <DialogTitle>{t('settings.companies.articleFormatConfirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('settings.companies.articleFormatPermanentWarning')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPushConfirmOpen(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handlePushConfirm} variant="contained" color="warning">
                        {t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>

            {viewMode === 'visual' ? (
                /* ===== Visual View ===== */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Basic info: extension and delimiter */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            label={t('settings.companies.fileExtension')}
                            value={articleFormat.fileExtension || ''}
                            size="small"
                            slotProps={{ input: { readOnly: true } }}
                            sx={{ width: 120 }}
                        />
                        <TextField
                            label={t('settings.companies.delimiter')}
                            value={articleFormat.delimeter || ''}
                            size="small"
                            slotProps={{ input: { readOnly: true } }}
                            sx={{ width: 120 }}
                        />
                    </Box>

                    {/* Basic info fields */}
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                            {t('settings.companies.basicInfoFields')}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {articleFormat.articleBasicInfo?.map((field) => (
                                <Chip key={field} label={field} size="small" variant="outlined" color="primary" />
                            ))}
                        </Box>
                    </Paper>

                    {/* Data fields */}
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                            {t('settings.companies.dataFields')} ({articleFormat.articleData?.length || 0})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {articleFormat.articleData?.map((field) => (
                                <Chip key={field} label={field} size="small" variant="outlined" />
                            ))}
                        </Box>
                    </Paper>

                    {/* Mapping info */}
                    {articleFormat.mappingInfo && (
                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                {t('settings.companies.mappingInfoTitle')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {Object.entries(articleFormat.mappingInfo).map(([key, value]) => (
                                    <Chip
                                        key={key}
                                        label={`${key}: ${value}`}
                                        size="small"
                                        variant="outlined"
                                        color="info"
                                    />
                                ))}
                            </Box>
                        </Paper>
                    )}
                </Box>
            ) : (
                /* ===== JSON Editor View ===== */
                <Box sx={{ mx: { xs: -2, sm: 0 } }}>
                    <Suspense fallback={
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    }>
                        <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
                            {t('settings.companies.jsonEditHint')}
                        </Alert>
                        <ArticleFormatEditor
                            schema={articleFormat}
                            onSave={handleJsonSave}
                            readOnly={!!readOnly}
                            initialOpen
                        />
                    </Suspense>
                </Box>
            )}
        </Box>
    );
}
