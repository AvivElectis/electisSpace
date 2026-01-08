/**
 * CSV Structure Editor Component
 * 
 * Allows configuration of CSV columns for SFTP mode:
 * - Add/remove/edit columns
 * - Up/down button reordering
 * - Field type selection
 * - Mandatory field configuration
 */

import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    Checkbox,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import type { CSVColumn, FieldType } from '../domain/types';

interface CSVStructureEditorProps {
    columns: CSVColumn[];
    onColumnsChange: (columns: CSVColumn[]) => boolean;
}

/**
 * CSV Structure Configuration Editor
 * 
 * Features:
 * - Table-based column configuration
 * - Up/down button reordering
 * - Add/remove columns
 * - Field type selection
 * - Mandatory field checkbox
 */
export function CSVStructureEditor({ columns, onColumnsChange }: CSVStructureEditorProps) {
    const { t } = useTranslation();
    const [editingColumns, setEditingColumns] = useState<CSVColumn[]>(columns);

    // Sync local state with props when columns change externally
    useEffect(() => {
        setEditingColumns(columns);
    }, [columns]);

    // Button reordering
    const handleMoveUp = (index: number) => {
        if (index === 0) return;

        const updated = [...editingColumns];
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];

        // Re-index
        updated.forEach((col, i) => {
            col.index = i;
        });

        setEditingColumns(updated);
    };

    const handleMoveDown = (index: number) => {
        if (index === editingColumns.length - 1) return;

        const updated = [...editingColumns];
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];

        // Re-index
        updated.forEach((col, i) => {
            col.index = i;
        });

        setEditingColumns(updated);
    };

    // Add new column
    const handleAddColumn = () => {
        const newColumn: CSVColumn = {
            index: editingColumns.length,
            aimsValue: '',
            headerEn: '',
            headerHe: '',
            type: 'text',
            mandatory: false,
        };
        setEditingColumns([...editingColumns, newColumn]);
    };

    // Update column field
    const handleUpdateColumn = (index: number, field: keyof CSVColumn, value: any) => {
        const updated = editingColumns.map((col, i) =>
            i === index ? { ...col, [field]: value } : col
        );
        setEditingColumns(updated);
    };

    // Remove column
    const handleRemoveColumn = (index: number) => {
        const updated = editingColumns.filter((_, i) => i !== index);
        // Re-index after removal
        updated.forEach((col, i) => {
            col.index = i;
        });
        setEditingColumns(updated);
    };

    // Save changes
    const handleSave = () => {
        onColumnsChange(editingColumns);
    };

    return (
        <Stack gap={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddColumn}
                >
                    {t('settings.addColumn')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={editingColumns.length === 0}
                >
                    {t('common.save')}
                </Button>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 800 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 60 }}>{t('settings.columnOrder')}</TableCell>
                            <TableCell sx={{ width: 150 }}>{t('settings.fieldName')}</TableCell>
                            <TableCell sx={{ width: 150 }}>{t('settings.headerEn')}</TableCell>
                            <TableCell sx={{ width: 150 }}>{t('settings.headerHe')}</TableCell>
                            <TableCell sx={{ width: 120 }}>{t('settings.type')}</TableCell>
                            <TableCell sx={{ width: 70 }}>{t('settings.required')}</TableCell>
                            <TableCell sx={{ width: 120 }}>{t('common.actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {editingColumns.map((col, index) => (
                            <TableRow key={`${col.aimsValue}-${index}`}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={col.aimsValue}
                                        onChange={(e) =>
                                            handleUpdateColumn(index, 'aimsValue', e.target.value)
                                        }
                                        placeholder="fieldName"
                                        fullWidth
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={col.headerEn}
                                        onChange={(e) =>
                                            handleUpdateColumn(index, 'headerEn', e.target.value)
                                        }
                                        placeholder="English Header"
                                        fullWidth
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={col.headerHe}
                                        onChange={(e) =>
                                            handleUpdateColumn(index, 'headerHe', e.target.value)
                                        }
                                        placeholder="כותרת עברית"
                                        fullWidth
                                    />
                                </TableCell>
                                <TableCell>
                                    <FormControl size="small" fullWidth>
                                        <Select
                                            value={col.type || 'text'}
                                            onChange={(e) =>
                                                handleUpdateColumn(
                                                    index,
                                                    'type',
                                                    e.target.value as FieldType
                                                )
                                            }
                                        >
                                            <MenuItem value="text">{t('settings.typeText')}</MenuItem>
                                            <MenuItem value="number">{t('settings.typeNumber')}</MenuItem>
                                            <MenuItem value="email">{t('settings.typeEmail')}</MenuItem>
                                            <MenuItem value="phone">{t('settings.typePhone')}</MenuItem>
                                            <MenuItem value="url">{t('settings.typeUrl')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                    <Checkbox
                                        checked={col.mandatory || false}
                                        onChange={(e) =>
                                            handleUpdateColumn(index, 'mandatory', e.target.checked)
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleMoveUp(index)}
                                            disabled={index === 0}
                                            title={t('settings.moveUp')}
                                        >
                                            <ArrowUpwardIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleMoveDown(index)}
                                            disabled={index === editingColumns.length - 1}
                                            title={t('settings.moveDown')}
                                        >
                                            <ArrowDownwardIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveColumn(index)}
                                            title={t('settings.removeColumn')}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>

            {editingColumns.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    {t('settings.noColumnsConfigured')}
                </Box>
            )}
        </Stack>
    );
}
