/**
 * SoluM Global Field Assignments Editor
 * 
 * Allows users to assign permanent values to fields that will apply to all articles
 * These fields won't appear in the article data but will be added automatically
 * Example use cases: NFC_URL, store name, etc.
 */

import { Box, Typography, TextField, IconButton, Button, Stack, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SolumGlobalFieldsEditorProps {
    articleFormatFields: string[];
    globalAssignments: { [fieldKey: string]: string };
    onChange: (assignments: { [fieldKey: string]: string }) => void;
    disabled?: boolean;
}

export function SolumGlobalFieldsEditor({
    articleFormatFields,
    globalAssignments,
    onChange,
    disabled = false,
}: SolumGlobalFieldsEditorProps) {
    const { t } = useTranslation();
    const [newFieldKey, setNewFieldKey] = useState('');
    const [newFieldValue, setNewFieldValue] = useState('');

    const handleAddAssignment = () => {
        if (newFieldKey && newFieldValue && articleFormatFields.includes(newFieldKey)) {
            onChange({
                ...globalAssignments,
                [newFieldKey]: newFieldValue,
            });
            setNewFieldKey('');
            setNewFieldValue('');
        }
    };

    const handleRemoveAssignment = (fieldKey: string) => {
        const updated = { ...globalAssignments };
        delete updated[fieldKey];
        onChange(updated);
    };

    const handleUpdateValue = (fieldKey: string, value: string) => {
        onChange({
            ...globalAssignments,
            [fieldKey]: value,
        });
    };

    // Filter out fields that are already assigned
    const availableFields = articleFormatFields.filter(
        field => !globalAssignments[field]
    );

    return (
        <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                {t('settings.globalFieldAssignments')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {t('settings.globalFieldAssignmentsHelp')}
            </Typography>
            {/* Existing Assignments */}
            <Stack gap={1} sx={{ mb: 2 }}>
                {Object.entries(globalAssignments).map(([fieldKey, value]) => (
                    <Paper key={fieldKey} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" gap={1} alignItems="center">
                            <Typography variant="body2" sx={{ minWidth: 150, fontWeight: 500 }}>
                                {fieldKey}
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                value={value}
                                onChange={(e) => handleUpdateValue(fieldKey, e.target.value)}
                                disabled={disabled}
                                placeholder={t('settings.globalFieldValue')}
                            />
                            <IconButton
                                size="small"
                                onClick={() => handleRemoveAssignment(fieldKey)}
                                disabled={disabled}
                                color="error"
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Paper>
                ))}
            </Stack>
            {/* Add New Assignment */}
            {availableFields.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                    <Stack direction="row" gap={1} alignItems="center">
                        <TextField
                            select
                            size="small"
                            value={newFieldKey}
                            onChange={(e) => setNewFieldKey(e.target.value)}
                            disabled={disabled}
                            sx={{ minWidth: 150 }}
                            slotProps={{
                                select: { native: true }
                            }}
                        >
                            <option value="">{t('settings.selectField')}</option>
                            {availableFields.map(field => (
                                <option key={field} value={field}>{field}</option>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            size="small"
                            value={newFieldValue}
                            onChange={(e) => setNewFieldValue(e.target.value)}
                            disabled={disabled}
                            placeholder={t('settings.globalFieldValue')}
                        />
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleAddAssignment}
                            disabled={disabled || !newFieldKey || !newFieldValue}
                            startIcon={<AddIcon />}
                        >
                            {t('common.add')}
                        </Button>
                    </Stack>
                </Paper>
            )}
            {availableFields.length === 0 && Object.keys(globalAssignments).length === 0 && (
                <Typography variant="caption" color="text.secondary">
                    {t('settings.noFieldsAvailable')}
                </Typography>
            )}
        </Box>
    );
}
