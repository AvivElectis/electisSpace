import { useState } from 'react';
import { Box, TextField, Stack, Typography, FormControlLabel, Switch, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useConfigurationController } from '@features/configuration/application/useConfigurationController';
import type { ArticleFormat } from '@features/configuration/domain/types';

/** Hidden field for list persistence in AIMS (JSON array of memberships) */
export const LIST_HIDDEN_FIELDS = ['_LIST_MEMBERSHIPS_'] as const;

interface PeopleManagerConfig {
    totalSpaces: number;
}

interface SolumPeopleManagerSectionProps {
    enabled: boolean;
    config: Partial<PeopleManagerConfig>;
    articleFormat: ArticleFormat | null;
    onEnabledChange: (enabled: boolean) => void;
    onConfigChange: (config: Partial<PeopleManagerConfig>) => void;
}

/**
 * Check if article format has the required list fields
 */
function hasListFields(articleFormat: ArticleFormat | null): boolean {
    if (!articleFormat?.articleData) return false;
    return LIST_HIDDEN_FIELDS.every(field => articleFormat.articleData.includes(field));
}

/**
 * Add list fields to article format
 */
function addListFields(articleFormat: ArticleFormat): ArticleFormat {
    const newArticleData = [...articleFormat.articleData];
    for (const field of LIST_HIDDEN_FIELDS) {
        if (!newArticleData.includes(field)) {
            newArticleData.push(field);
        }
    }
    return { ...articleFormat, articleData: newArticleData };
}

/**
 * Remove list fields from article format
 */
function removeListFields(articleFormat: ArticleFormat): ArticleFormat {
    return {
        ...articleFormat,
        articleData: articleFormat.articleData.filter(field => !LIST_HIDDEN_FIELDS.includes(field as typeof LIST_HIDDEN_FIELDS[number]))
    };
}

/**
 * SolumPeopleManagerSection - People Manager mode toggle and configuration
 * 
 * When enabled, automatically adds _LIST_MEMBERSHIPS_ field to article format.
 * When disabled, removes that field.
 */
export function SolumPeopleManagerSection({
    enabled,
    config,
    articleFormat,
    onEnabledChange,
    onConfigChange,
}: SolumPeopleManagerSectionProps) {
    const { t } = useTranslation();
    const { saveArticleFormat } = useConfigurationController();
    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = async (newEnabled: boolean) => {
        if (!articleFormat) {
            // No article format yet, just toggle the setting
            onEnabledChange(newEnabled);
            return;
        }

        setIsSaving(true);
        try {
            let updatedFormat: ArticleFormat;
            
            if (newEnabled) {
                // Enable: Add list fields if not present
                if (!hasListFields(articleFormat)) {
                    updatedFormat = addListFields(articleFormat);
                    await saveArticleFormat(updatedFormat);
                }
            } else {
                // Disable: Remove list fields if present
                if (hasListFields(articleFormat)) {
                    updatedFormat = removeListFields(articleFormat);
                    await saveArticleFormat(updatedFormat);
                }
            }
            
            onEnabledChange(newEnabled);
        } catch (error) {
            // Error is already handled by saveArticleFormat
            console.error('Failed to update article format:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Box>
            <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}
            >
                {t('settings.peopleManager.title')}
            </Typography>
            <Stack gap={1.5}>
                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={enabled}
                            disabled={isSaving}
                            onChange={(e) => handleToggle(e.target.checked)}
                        />
                    }
                    label={
                        <Stack direction="row" alignItems="center" gap={1}>
                            <Typography variant="body2">{t('settings.peopleManager.enable')}</Typography>
                            {isSaving && <CircularProgress size={14} />}
                        </Stack>
                    }
                />

                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: '-8px !important', ml: '38px !important' }}
                >
                    {t('settings.peopleManager.description')}
                </Typography>

                {enabled && (
                    <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label={t('settings.peopleManager.totalSpaces')}
                        value={config.totalSpaces || 0}
                        onChange={(e) =>
                            onConfigChange({
                                ...config,
                                totalSpaces: parseInt(e.target.value, 10) || 0,
                            })
                        }
                        helperText={t('settings.peopleManager.totalSpacesHelp')}
                        slotProps={{
                            htmlInput: { min: 0 }
                        }}
                    />
                )}
            </Stack>
        </Box>
    );
}
