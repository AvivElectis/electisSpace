import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Alert, Autocomplete, CircularProgress } from '@mui/material';

import { useLabelsStore } from '@features/labels/infrastructure/labelsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { labelsApi } from '@shared/infrastructure/services/labelsApi';
import { logger } from '@shared/infrastructure/services/logger';

import { NativeFormPage } from '@shared/presentation/native/NativeFormPage';
import { NativeFormSection } from '@shared/presentation/native/NativeFormSection';
import { NativeTextField } from '@shared/presentation/native/NativeTextField';

interface Article {
    id: string;
    name?: string;
    [key: string]: any;
}

/**
 * NativeLinkLabelPage — Android-native form to link a label to an article.
 * Mirrors logic from LinkLabelDialog.
 * Receives optional ?labelCode=... query param (from NativeLabelsPage tap).
 */
export function NativeLinkLabelPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const { activeStoreId } = useAuthStore();
    const { linkLabelToArticle } = useLabelsStore();

    const initialLabelCode = searchParams.get('labelCode') || '';

    const [labelCode, setLabelCode] = useState(initialLabelCode);
    const [articleId, setArticleId] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Articles autocomplete
    const [articles, setArticles] = useState<Article[]>([]);
    const [loadingArticles, setLoadingArticles] = useState(false);

    // Fetch articles for autocomplete
    useEffect(() => {
        if (!activeStoreId) return;
        setLoadingArticles(true);
        labelsApi.getArticles(activeStoreId)
            .then((result) => {
                const articleList: Article[] = result.data.map((a: any) => ({
                    id: a.articleId || a.id,
                    name: a.articleName || a.name || a.data?.NFC_URL || '',
                    ...a,
                }));
                setArticles(articleList);
            })
            .catch((err: any) => {
                logger.error('NativeLinkLabelPage', 'Failed to fetch articles', { error: err.message });
            })
            .finally(() => setLoadingArticles(false));
    }, [activeStoreId]);

    const handleSubmit = useCallback(async () => {
        setError(null);

        if (!labelCode.trim()) {
            setError(t('labels.link.labelRequired'));
            return;
        }
        if (!articleId.trim()) {
            setError(t('labels.link.articleRequired'));
            return;
        }
        if (!activeStoreId) return;

        setIsSubmitting(true);
        try {
            await linkLabelToArticle(
                activeStoreId,
                labelCode.trim(),
                articleId.trim(),
                templateName.trim() || undefined
            );
            navigate(-1);
        } catch (err: any) {
            setError(err.message || t('labels.link.error'));
        } finally {
            setIsSubmitting(false);
        }
    }, [labelCode, articleId, templateName, activeStoreId, linkLabelToArticle, navigate, t]);

    // Auto-submit when both fields are prefilled and article is valid
    const autoSubmittedRef = useRef(false);
    useEffect(() => {
        if (autoSubmittedRef.current || isSubmitting || !articles.length) return;
        if (!labelCode.trim() || !articleId.trim()) return;
        const validArticle = articles.some((a) => a.id === articleId.trim());
        if (validArticle) {
            autoSubmittedRef.current = true;
            handleSubmit();
        }
    }, [labelCode, articleId, articles, isSubmitting, handleSubmit]);

    const pageTitle = t('labels.link.title');

    return (
        <NativeFormPage
            title={pageTitle}
            onSave={handleSubmit}
            isSaving={isSubmitting}
            saveLabel={t('labels.link.linkButton')}
        >
            {error && (
                <Box sx={{ px: 2, pt: 1 }}>
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Box>
            )}

            {/* Label Code */}
            <NativeFormSection title={t('labels.table.labelCode')}>
                <NativeTextField
                    label={t('labels.link.labelCode')}
                    value={labelCode}
                    onChange={(e) => setLabelCode(e.target.value)}
                    placeholder={t('labels.link.labelCodeExample')}
                    helperText={t('labels.link.labelCodeHelp')}
                    autoFocus={!initialLabelCode}
                    disabled={isSubmitting}
                />
            </NativeFormSection>

            {/* Article */}
            <NativeFormSection title={t('labels.table.articleId')}>
                <Autocomplete
                    freeSolo
                    fullWidth
                    options={articles}
                    getOptionLabel={(option) => {
                        if (typeof option === 'string') return option;
                        return option.name ? `${option.id} - ${option.name}` : option.id;
                    }}
                    inputValue={articleId}
                    onInputChange={(_, value) => setArticleId(value)}
                    loading={loadingArticles}
                    disabled={isSubmitting}
                    renderInput={(params) => (
                        <NativeTextField
                            {...(params as any)}
                            label={t('labels.link.articleId')}
                            placeholder={t('labels.link.articleIdExample')}
                            helperText={t('labels.link.articleIdHelp')}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loadingArticles && <CircularProgress size={20} />}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                    renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                            <Box>
                                <Typography variant="body2">{option.id}</Typography>
                                {option.name && (
                                    <Typography variant="caption" color="text.secondary">
                                        {option.name}
                                    </Typography>
                                )}
                            </Box>
                        </li>
                    )}
                />
            </NativeFormSection>

            {/* Template (optional) */}
            <NativeFormSection title={t('labels.link.templateName')}>
                <NativeTextField
                    label={t('labels.link.templateName')}
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={t('labels.link.templateNameExample')}
                    helperText={t('labels.link.templateNameHelp')}
                    disabled={isSubmitting}
                />
            </NativeFormSection>
        </NativeFormPage>
    );
}
