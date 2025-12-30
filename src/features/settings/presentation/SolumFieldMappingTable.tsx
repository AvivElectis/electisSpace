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
} from '@mui/material';
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

    // Filter out globally assigned fields
    const visibleFields = articleFormatFields.filter(field => !excludeFields.includes(field));

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

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'background.default' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('settings.fieldKey')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('settings.englishName')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('settings.hebrewName')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>
                            {t('settings.visible')}
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
