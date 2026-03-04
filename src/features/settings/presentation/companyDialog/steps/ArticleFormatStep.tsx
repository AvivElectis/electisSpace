/**
 * Wizard Step 3: Article Format — Fetch & Confirm
 */
import { useEffect } from 'react';
import {
    Box,
    Typography,
    Chip,
    TextField,
    CircularProgress,
    Alert,
    Button,
    Paper,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import type { ArticleFormat } from '@features/configuration/domain/types';

interface ArticleFormatStepProps {
    articleFormat: ArticleFormat | null;
    loading: boolean;
    error: string | null;
    onFetch: () => Promise<void>;
}

export function ArticleFormatStep({
    articleFormat,
    loading,
    error,
    onFetch,
}: ArticleFormatStepProps) {
    const { t } = useTranslation();

    // Auto-fetch on mount if not yet loaded
    useEffect(() => {
        if (!articleFormat && !loading && !error) {
            onFetch();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="success" sx={{ mb: 1 }}>
                {t('settings.companies.articleFormatFetched')}
            </Alert>

            {/* Basic info: extension and delimiter */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                    label={t('settings.companies.fileExtension')}
                    value={articleFormat.fileExtension || ''}
                    size="small"
                    InputProps={{ readOnly: true }}
                    sx={{ width: 120 }}
                />
                <TextField
                    label={t('settings.companies.delimiter')}
                    value={articleFormat.delimeter || ''}
                    size="small"
                    InputProps={{ readOnly: true }}
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
                        Mapping Info
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
    );
}
