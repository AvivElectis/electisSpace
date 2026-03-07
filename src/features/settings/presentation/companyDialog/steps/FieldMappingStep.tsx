/**
 * Wizard Step 4: Field Mapping
 * Maps AIMS article fields to display names & visibility, plus conference mapping.
 */
import { useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Switch,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Divider,
    Chip,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ArticleFormat } from '@features/configuration/domain/types';
import type { SolumMappingConfig, SolumFieldMapping } from '@features/settings/domain/types';

interface FieldMappingStepProps {
    articleFormat: ArticleFormat | null;
    fieldMapping: SolumMappingConfig | null;
    onUpdate: (mapping: SolumMappingConfig) => void;
}

/** Generate initial mapping from article format data fields */
function generateInitialMapping(articleFormat: ArticleFormat): SolumMappingConfig {
    const fields: Record<string, SolumFieldMapping> = {};
    for (const field of articleFormat.articleData || []) {
        fields[field] = {
            friendlyNameEn: field,
            friendlyNameHe: field,
            visible: true,
        };
    }
    return {
        uniqueIdField: articleFormat.mappingInfo?.articleId || articleFormat.articleData?.[0] || '',
        fields,
        conferenceMapping: {
            meetingName: '',
            meetingTime: '',
            participants: '',
        },
        mappingInfo: articleFormat.mappingInfo,
    };
}

export function FieldMappingStep({
    articleFormat,
    fieldMapping,
    onUpdate,
}: FieldMappingStepProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Auto-generate if no mapping exists and persist it back to form data
    const mapping = fieldMapping || (articleFormat ? generateInitialMapping(articleFormat) : null);

    useEffect(() => {
        if (!fieldMapping && mapping) {
            onUpdate(mapping);
        }
    }, [fieldMapping, mapping, onUpdate]);

    if (!mapping) return null;

    const fieldKeys = Object.keys(mapping.fields);
    const allFieldOptions = articleFormat?.articleData || fieldKeys;

    const handleFieldChange = (fieldKey: string, prop: keyof SolumFieldMapping, value: string | boolean) => {
        const updatedFields = {
            ...mapping.fields,
            [fieldKey]: { ...mapping.fields[fieldKey], [prop]: value },
        };
        onUpdate({ ...mapping, fields: updatedFields });
    };

    const handleUniqueIdChange = (value: string) => {
        onUpdate({ ...mapping, uniqueIdField: value });
    };

    const handleConferenceMappingChange = (field: 'meetingName' | 'meetingTime' | 'participants', value: string) => {
        onUpdate({
            ...mapping,
            conferenceMapping: { ...mapping.conferenceMapping, [field]: value },
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
                {t('settings.companies.fieldMappingTitle')}
            </Typography>

            {/* Unique ID Field */}
            <FormControl fullWidth size="small">
                <InputLabel>{t('settings.companies.uniqueIdField')}</InputLabel>
                <Select
                    value={mapping.uniqueIdField}
                    label={t('settings.companies.uniqueIdField')}
                    onChange={(e) => handleUniqueIdChange(e.target.value)}
                >
                    {allFieldOptions.map((f) => (
                        <MenuItem key={f} value={f}>{f}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Field mapping table */}
            <Paper variant="outlined" sx={{ p: 1 }}>
                {!isMobile && (
                    <Box sx={{ display: 'flex', gap: 1, px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" fontWeight={600} sx={{ flex: 1 }}>
                            {t('settings.companies.aimsField')}
                        </Typography>
                        <Typography variant="caption" fontWeight={600} sx={{ flex: 1 }}>
                            {t('settings.companies.displayName')}
                        </Typography>
                        <Typography variant="caption" fontWeight={600} sx={{ width: 60, textAlign: 'center' }}>
                            {t('settings.companies.visible')}
                        </Typography>
                    </Box>
                )}
                <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
                    {fieldKeys.map((fieldKey) => {
                        const fm = mapping.fields[fieldKey];
                        return isMobile ? (
                            <Box
                                key={fieldKey}
                                sx={{
                                    px: 1,
                                    py: 1,
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    '&:last-child': { borderBottom: 0 },
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                        {fieldKey}
                                    </Typography>
                                    <Switch
                                        checked={fm.visible}
                                        onChange={(e) => handleFieldChange(fieldKey, 'visible', e.target.checked)}
                                        size="small"
                                    />
                                </Box>
                                <TextField
                                    value={fm.friendlyNameEn}
                                    onChange={(e) => handleFieldChange(fieldKey, 'friendlyNameEn', e.target.value)}
                                    size="small"
                                    variant="outlined"
                                    fullWidth
                                    placeholder={t('settings.companies.displayName')}
                                    slotProps={{ htmlInput: { style: { fontSize: '0.85rem' } } }}
                                />
                            </Box>
                        ) : (
                            <Box
                                key={fieldKey}
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                    px: 1,
                                    py: 0.5,
                                    alignItems: 'center',
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }} noWrap>
                                    {fieldKey}
                                </Typography>
                                <TextField
                                    value={fm.friendlyNameEn}
                                    onChange={(e) => handleFieldChange(fieldKey, 'friendlyNameEn', e.target.value)}
                                    size="small"
                                    variant="standard"
                                    sx={{ flex: 1 }}
                                    slotProps={{ htmlInput: { style: { fontSize: '0.85rem' } } }}
                                />
                                <Box sx={{ width: 60, display: 'flex', justifyContent: 'center' }}>
                                    <Switch
                                        checked={fm.visible}
                                        onChange={(e) => handleFieldChange(fieldKey, 'visible', e.target.checked)}
                                        size="small"
                                    />
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Paper>

            <Divider>
                <Chip label={t('settings.companies.conferenceMappingTitle')} size="small" />
            </Divider>

            {/* Conference mapping */}
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>{t('settings.companies.meetingNameField')}</InputLabel>
                    <Select
                        value={mapping.conferenceMapping.meetingName}
                        label={t('settings.companies.meetingNameField')}
                        onChange={(e) => handleConferenceMappingChange('meetingName', e.target.value)}
                    >
                        <MenuItem value="">—</MenuItem>
                        {allFieldOptions.map((f) => (
                            <MenuItem key={f} value={f}>{f}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>{t('settings.companies.meetingTimeField')}</InputLabel>
                    <Select
                        value={mapping.conferenceMapping.meetingTime}
                        label={t('settings.companies.meetingTimeField')}
                        onChange={(e) => handleConferenceMappingChange('meetingTime', e.target.value)}
                    >
                        <MenuItem value="">—</MenuItem>
                        {allFieldOptions.map((f) => (
                            <MenuItem key={f} value={f}>{f}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>{t('settings.companies.participantsField')}</InputLabel>
                    <Select
                        value={mapping.conferenceMapping.participants}
                        label={t('settings.companies.participantsField')}
                        onChange={(e) => handleConferenceMappingChange('participants', e.target.value)}
                    >
                        <MenuItem value="">—</MenuItem>
                        {allFieldOptions.map((f) => (
                            <MenuItem key={f} value={f}>{f}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        </Box>
    );
}
