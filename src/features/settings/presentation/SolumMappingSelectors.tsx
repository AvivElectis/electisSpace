import {
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
        <Stack spacing={3}>
            {/* Unique ID Field Selector */}
            <FormControl fullWidth size="small">
                <InputLabel>{t('settings.uniqueIdField')}</InputLabel>
                <Select
                    value={uniqueIdField}
                    label={t('settings.uniqueIdField')}
                    onChange={(e) => onUniqueIdChange(e.target.value)}
                    disabled={disabled}
                >
                    {articleFormatFields.map((field) => (
                        <MenuItem key={field} value={field}>
                            {field}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Conference Field Mapping */}
            <Stack spacing={2}>
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
