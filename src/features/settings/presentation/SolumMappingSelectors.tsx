import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Typography,
    Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface SolumMappingSelectorsProps {
    articleFormatFields: string[];
    uniqueIdField: string;
    conferenceMapping: {
        meetingName: string;
        meetingTime: string;
        participants: string;
    };
    onUniqueIdChange: (field: string) => void;
    onConferenceMappingChange: (mapping: {
        meetingName: string;
        meetingTime: string;
        participants: string;
    }) => void;
    mappingInfo?: import('@features/configuration/domain/types').MappingInfo;
    onMappingInfoChange?: (mappingInfo: import('@features/configuration/domain/types').MappingInfo) => void;
    disabled?: boolean;
}

/**
 * Selectors Component
 * Allows users to select unique ID field and configure conference field mappings
 */
export function SolumMappingSelectors({
    articleFormatFields,
    uniqueIdField,
    conferenceMapping,
    onUniqueIdChange,
    onConferenceMappingChange,
    mappingInfo,
    onMappingInfoChange,
    disabled = false,
}: SolumMappingSelectorsProps) {
    const { t } = useTranslation();

    if (articleFormatFields.length === 0) {
        return (
            <Alert severity="info">
                {t('settings.fetchArticleSchemaFirst')}
            </Alert>
        );
    }

    return (
        <Stack gap={3}>
            {/* Unique ID Field Selector */}
            <FormControl fullWidth size="small">
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                    <InputLabel id="unique-id-selector-label" shrink sx={{ position: 'static', transform: 'none', color: 'text.secondary', fontWeight: 600 }}>
                        {t('settings.uniqueIdField')}
                    </InputLabel>
                    {mappingInfo?.articleId === uniqueIdField && (
                        <Typography variant="caption" sx={{ color: 'black', fontWeight: 700, px: 1, bgcolor: 'success.light', borderRadius: 1, opacity: 0.8 }}>
                            {t('settings.autoMapped')}
                        </Typography>
                    )}
                </Box>
                <Select
                    labelId="unique-id-selector-label"
                    value={uniqueIdField}
                    onChange={(e) => onUniqueIdChange(e.target.value)}
                    disabled={disabled}
                >
                    {articleFormatFields.map((field) => (
                        <MenuItem key={field} value={field}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                {field}
                                {mappingInfo?.articleId === field && (
                                    <Typography variant="caption" color="success.main" sx={{ ml: 1, fontWeight: 600 }}>
                                        (SoluM Article ID)
                                    </Typography>
                                )}
                            </Box>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Article Name Field Selector */}
            <FormControl fullWidth size="small">
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                    <InputLabel id="article-name-selector-label" shrink sx={{ position: 'static', transform: 'none', color: 'text.secondary', fontWeight: 600 }}>
                        {t('settings.articleNameField')}
                    </InputLabel>
                    {mappingInfo?.articleName && (
                        <Typography variant="caption" sx={{ color: 'black', fontWeight: 700, px: 1, bgcolor: 'success.light', borderRadius: 1, opacity: 0.8 }}>
                            {t('settings.autoMapped')}
                        </Typography>
                    )}
                </Box>
                <Select
                    labelId="article-name-selector-label"
                    value={mappingInfo?.articleName || ''}
                    onChange={(e) => {
                        if (onMappingInfoChange && mappingInfo) {
                            onMappingInfoChange({
                                ...mappingInfo,
                                articleName: e.target.value,
                            });
                        }
                    }}
                    disabled={disabled || !onMappingInfoChange}
                >
                    <MenuItem value="">
                        <em>{t('settings.notSelected')}</em>
                    </MenuItem>
                    {articleFormatFields.map((field) => (
                        <MenuItem key={field} value={field}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                {field}
                                {mappingInfo?.articleName === field && (
                                    <Typography variant="caption" color="success.main" sx={{ ml: 1, fontWeight: 600 }}>
                                        (Room Name)
                                    </Typography>
                                )}
                            </Box>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* NFC URL Field Selector */}
            <FormControl fullWidth size="small">
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                    <InputLabel id="nfc-url-selector-label" shrink sx={{ position: 'static', transform: 'none', color: 'text.secondary', fontWeight: 600 }}>
                        {t('settings.nfcUrlField')}
                    </InputLabel>
                    {mappingInfo?.nfcUrl && (
                        <Typography variant="caption" sx={{ color: 'black', fontWeight: 700, px: 1, bgcolor: 'info.light', borderRadius: 1, opacity: 0.8 }}>
                            {t('settings.optional')}
                        </Typography>
                    )}
                </Box>
                <Select
                    labelId="nfc-url-selector-label"
                    value={mappingInfo?.nfcUrl || ''}
                    onChange={(e) => {
                        if (onMappingInfoChange && mappingInfo) {
                            onMappingInfoChange({
                                ...mappingInfo,
                                nfcUrl: e.target.value || undefined,
                            });
                        }
                    }}
                    disabled={disabled || !onMappingInfoChange}
                >
                    <MenuItem value="">
                        <em>{t('settings.notSelected')}</em>
                    </MenuItem>
                    {articleFormatFields.map((field) => (
                        <MenuItem key={field} value={field}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                {field}
                                {mappingInfo?.nfcUrl === field && (
                                    <Typography variant="caption" color="info.main" sx={{ ml: 1, fontWeight: 600 }}>
                                        (NFC URL)
                                    </Typography>
                                )}
                            </Box>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Conference Field Mapping */}
            <Stack gap={2}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {t('settings.conferenceFieldMapping')}
                </Typography>

                <FormControl fullWidth size="small">
                    <InputLabel>{t('settings.meetingNameField')}</InputLabel>
                    <Select
                        value={conferenceMapping.meetingName}
                        label={t('settings.meetingNameField')}
                        onChange={(e) =>
                            onConferenceMappingChange({
                                ...conferenceMapping,
                                meetingName: e.target.value,
                            })
                        }
                        disabled={disabled}
                    >
                        {articleFormatFields.map((field) => (
                            <MenuItem key={field} value={field}>
                                {field}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                    <InputLabel>{t('settings.meetingTimeField')}</InputLabel>
                    <Select
                        value={conferenceMapping.meetingTime}
                        label={t('settings.meetingTimeField')}
                        onChange={(e) =>
                            onConferenceMappingChange({
                                ...conferenceMapping,
                                meetingTime: e.target.value,
                            })
                        }
                        disabled={disabled}
                    >
                        {articleFormatFields.map((field) => (
                            <MenuItem key={field} value={field}>
                                {field}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                    <InputLabel>{t('settings.participantsField')}</InputLabel>
                    <Select
                        value={conferenceMapping.participants}
                        label={t('settings.participantsField')}
                        onChange={(e) =>
                            onConferenceMappingChange({
                                ...conferenceMapping,
                                participants: e.target.value,
                            })
                        }
                        disabled={disabled}
                    >
                        {articleFormatFields.map((field) => (
                            <MenuItem key={field} value={field}>
                                {field}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Typography variant="caption" color="text.secondary">
                    {t('settings.conferenceFieldMappingHelp')}
                </Typography>
            </Stack>
        </Stack>
    );
}
