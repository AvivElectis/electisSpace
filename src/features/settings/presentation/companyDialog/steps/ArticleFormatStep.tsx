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
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewListIcon from '@mui/icons-material/ViewList';
import CodeIcon from '@mui/icons-material/Code';
import { useTranslation } from 'react-i18next';
import type { ArticleFormat } from '@features/configuration/domain/types';

// Lazy load the heavy JSON editor (~1MB vanilla-jsoneditor)
const ArticleFormatEditor = lazy(() =>
    import('@features/configuration/presentation/ArticleFormatEditor').then(m => ({ default: m.ArticleFormatEditor }))
);

const COMPASS_ARTICLE_DATA_FIELDS = [
    'BUILDING_NAME', 'FLOOR_NAME', 'AREA_NAME',
    'SPACE_MODE', 'SPACE_CAPACITY', 'SPACE_AMENITIES', 'SPACE_TYPE',
    'BOOKING_STATUS', 'BOOKED_BY', 'BOOKING_TIME',
];

interface ArticleFormatStepProps {
    articleFormat: ArticleFormat | null;
    loading: boolean;
    error: string | null;
    onFetch: () => Promise<void>;
    onUpdate: (format: ArticleFormat) => void;
    compassEnabled?: boolean;
}

export function ArticleFormatStep({
    articleFormat,
    loading,
    error,
    onFetch,
    onUpdate,
    compassEnabled,
}: ArticleFormatStepProps) {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');

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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="success" sx={{ mb: 1 }}>
                {t('settings.companies.articleFormatFetched')}
            </Alert>

            {/* View mode toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                <Button
                    variant="text"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={onFetch}
                >
                    {t('settings.companies.refetchArticleFormat')}
                </Button>
            </Box>

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

                    {/* Compass fields info */}
                    {compassEnabled && (
                        <Alert severity="info" variant="outlined">
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                {t('compass.compassFormatInfo')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {COMPASS_ARTICLE_DATA_FIELDS.map((field) => (
                                    <Chip key={field} label={field} size="small" color="info" />
                                ))}
                            </Box>
                        </Alert>
                    )}

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
                            readOnly={false}
                            initialOpen
                        />
                    </Suspense>
                </Box>
            )}
        </Box>
    );
}
