import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Checkbox,
    Paper,
    Typography,
    Box,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Stack,
    Switch,
    FormControlLabel,
} from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SolumFieldMapping } from '../domain/types';

interface SolumFieldMappingTableProps {
    articleFormatFields: string[];
    mappings: { [fieldKey: string]: SolumFieldMapping };
    onChange: (mappings: { [fieldKey: string]: SolumFieldMapping }) => void;
    disabled?: boolean;
    excludeFields?: string[]; // Fields to exclude from table (e.g., globally assigned fields)
}

/**
 * Field Mapping Table Component
 * Allows users to configure friendly names and visibility for SoluM article fields
 */
export function SolumFieldMappingTable({
    articleFormatFields,
    mappings,
    onChange,
    disabled = false,
    excludeFields = [],
}: SolumFieldMappingTableProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Filter out globally assigned fields
    const visibleFields = articleFormatFields.filter(field => !excludeFields.includes(field));

    // Calculate selection state for "select all" checkbox
    const { allSelected, someSelected } = useMemo(() => {
        if (visibleFields.length === 0) return { allSelected: false, someSelected: false };

        const visibleCount = visibleFields.filter(fieldKey => {
            const mapping = mappings[fieldKey];
            return mapping?.visible !== false; // Default is true if not set
        }).length;

        return {
            allSelected: visibleCount === visibleFields.length,
            someSelected: visibleCount > 0 && visibleCount < visibleFields.length,
        };
    }, [visibleFields, mappings]);

    const handleToggleAll = () => {
        const newMappings = { ...mappings };
        // If any are selected (some or all), uncheck all. Otherwise, check all.
        const newVisibleState = !allSelected && !someSelected;

        visibleFields.forEach(fieldKey => {
            if (!newMappings[fieldKey]) {
                newMappings[fieldKey] = {
                    friendlyNameEn: fieldKey,
                    friendlyNameHe: fieldKey,
                    visible: newVisibleState,
                };
            } else {
                newMappings[fieldKey].visible = newVisibleState;
            }
        });
        onChange(newMappings);
    };

    const handleNameChange = (fieldKey: string, language: 'en' | 'he', value: string) => {
        const newMappings = { ...mappings };
        if (!newMappings[fieldKey]) {
            newMappings[fieldKey] = {
                friendlyNameEn: fieldKey,
                friendlyNameHe: fieldKey,
                visible: true,
            };
        }
        if (language === 'en') {
            newMappings[fieldKey].friendlyNameEn = value;
        } else {
            newMappings[fieldKey].friendlyNameHe = value;
        }
        onChange(newMappings);
    };

    const handleVisibilityChange = (fieldKey: string, visible: boolean) => {
        const newMappings = { ...mappings };
        if (!newMappings[fieldKey]) {
            newMappings[fieldKey] = {
                friendlyNameEn: fieldKey,
                friendlyNameHe: fieldKey,
                visible: true,
            };
        }
        newMappings[fieldKey].visible = visible;
        onChange(newMappings);
    };

    if (visibleFields.length === 0) {
        return (
            <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    {t('settings.fetchArticleSchemaFirst')}
                </Typography>
            </Box>
        );
    }

    if (isMobile) {
        return (
            <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, px: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight={600}>{t('settings.fieldMapping', 'Field Mapping')}</Typography>
                    <FormControlLabel
                        control={<Switch checked={allSelected || someSelected} onChange={handleToggleAll} disabled={disabled} size="small" />}
                        label={<Typography variant="caption">{t('settings.visible', 'Visible')}</Typography>}
                        labelPlacement="start"
                    />
                </Stack>
                {visibleFields.map((fieldKey) => {
                    const mapping = mappings[fieldKey] || {
                        friendlyNameEn: fieldKey,
                        friendlyNameHe: fieldKey,
                        visible: true,
                    };
                    return (
                        <Card key={fieldKey} variant="outlined" sx={{ mb: 1 }}>
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{fieldKey}</Typography>
                                    <Switch
                                        checked={mapping.visible}
                                        onChange={(e) => handleVisibilityChange(fieldKey, e.target.checked)}
                                        disabled={disabled}
                                        size="small"
                                    />
                                </Stack>
                                <Stack gap={1} sx={{ mt: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={t('settings.englishName')}
                                        value={mapping.friendlyNameEn}
                                        onChange={(e) => handleNameChange(fieldKey, 'en', e.target.value)}
                                        disabled={disabled}
                                        placeholder={fieldKey}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={t('settings.hebrewName')}
                                        value={mapping.friendlyNameHe}
                                        onChange={(e) => handleNameChange(fieldKey, 'he', e.target.value)}
                                        disabled={disabled}
                                        placeholder={fieldKey}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    );
                })}
            </Box>
        );
    }

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'background.default' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('settings.fieldKey')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('settings.englishName')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('settings.hebrewName')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <Checkbox
                                    checked={allSelected || someSelected}
                                    onChange={handleToggleAll}
                                    disabled={disabled}
                                    size="small"
                                    sx={{ p: 0 }}
                                />
                                {t('settings.visible')}
                            </Box>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {visibleFields.map((fieldKey) => {
                        const mapping = mappings[fieldKey] || {
                            friendlyNameEn: fieldKey,
                            friendlyNameHe: fieldKey,
                            visible: true,
                        };
                        return (
                            <TableRow key={fieldKey} hover>
                                <TableCell>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                        {fieldKey}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={mapping.friendlyNameEn}
                                        onChange={(e) => handleNameChange(fieldKey, 'en', e.target.value)}
                                        disabled={disabled}
                                        placeholder={fieldKey}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={mapping.friendlyNameHe}
                                        onChange={(e) => handleNameChange(fieldKey, 'he', e.target.value)}
                                        disabled={disabled}
                                        placeholder={fieldKey}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Checkbox
                                        checked={mapping.visible}
                                        onChange={(e) => handleVisibilityChange(fieldKey, e.target.checked)}
                                        disabled={disabled}
                                        size="small"
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
