import { Box, Typography, Button } from '@mui/material';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@shared/infrastructure/store/rootStore';
import { useConfigurationController } from '@features/configuration/application/useConfigurationController';
import { ArticleFormatEditor } from '@features/configuration/presentation/ArticleFormatEditor';
import type { ArticleFormat } from '@features/configuration/domain/types';

interface SolumSchemaEditorSectionProps {
    articleFormat: ArticleFormat | null;
    isConnected: boolean;
}

/**
 * SolumSchemaEditorSection - Article schema fetching and editing
 */
export function SolumSchemaEditorSection({
    articleFormat,
    isConnected,
}: SolumSchemaEditorSectionProps) {
    const { t } = useTranslation();
    const { showSuccess, showError } = useNotifications();
    const { fetchArticleFormat, saveArticleFormat } = useConfigurationController();
    const [fetchingSchema, setFetchingSchema] = useState(false);

    const handleFetchSchema = async () => {
        setFetchingSchema(true);
        try {
            await fetchArticleFormat();
            showSuccess(t('settings.schemaFetchedSuccess'));
        } catch (error) {
            showError(t('settings.schemaFetchedError', { error: String(error) }));
        } finally {
            setFetchingSchema(false);
        }
    };

    return (
        <Box>
            <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}
            >
                {t('settings.articleFormatSchema')}
            </Typography>

            <Button
                variant="outlined"
                startIcon={<CloudSyncIcon />}
                onClick={handleFetchSchema}
                disabled={fetchingSchema || !isConnected}
                sx={{ mb: 1, width: 'fit-content' }}
            >
                {fetchingSchema ? t('settings.fetchingSchema') : t('settings.fetchArticleSchema')}
            </Button>

            <Typography variant="caption" color="info.main" sx={{ mb: 1, display: 'block' }}>
                {t('settings.fetchesConfig')}
            </Typography>

            <ArticleFormatEditor schema={articleFormat} onSave={saveArticleFormat} readOnly={false} />
        </Box>
    );
}
