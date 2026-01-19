/**
 * CSV Structure Editor Component
 * 
 * Allows configuration of CSV columns for SFTP mode:
 * - Add/remove/edit columns
 * - Up/down button reordering
 * - Visible field configuration
 * - Lock icon for fields used as global assignments or ID column
 * - Unsaved changes detection and warning
 */

import { useState, useEffect, useMemo } from 'react';
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
    Checkbox,
    Tooltip,
    Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import WarningIcon from '@mui/icons-material/Warning';
import { useTranslation } from 'react-i18next';
import type { CSVColumn } from '../domain/types';

interface CSVStructureEditorProps {
    columns: CSVColumn[];
    onColumnsChange: (columns: CSVColumn[]) => boolean;
    /** Field names that are locked (used as global fields) */
    lockedFields?: string[];
    /** The field name selected as unique ID column */
    idColumn?: string;
    /** Callback to check if navigation should be blocked (returns true if has unsaved changes) */
    onHasUnsavedChanges?: (hasChanges: boolean) => void;
}

/**
 * CSV Structure Configuration Editor
 * 
 * Features:
 * - Table-based column configuration
 * - Up/down button reordering
 * - Add/remove columns
 * - Field type selection
 * - Visible field checkbox
 * - Lock icon for fields used as global assignments or as ID column
 */
export function CSVStructureEditor({ columns, onColumnsChange, lockedFields = [], idColumn, onHasUnsavedChanges }: CSVStructureEditorProps) {
    const { t } = useTranslation();
    const [editingColumns, setEditingColumns] = useState<CSVColumn[]>(columns);
    const [originalColumns, setOriginalColumns] = useState<CSVColumn[]>(columns);
    
    // Helper to check if a field is locked (global field or ID column)
    const isFieldLocked = (fieldName: string) => lockedFields.includes(fieldName) || fieldName === idColumn;
    
    // Helper to check if field is the ID column
    const isIdColumn = (fieldName: string) => fieldName === idColumn;
    
    // Check if there are unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        if (editingColumns.length !== originalColumns.length) return true;
        
        return editingColumns.some((col, index) => {
            const original = originalColumns[index];
            if (!original) return true;
            return (
                col.aimsValue !== original.aimsValue ||
                col.headerEn !== original.headerEn ||
                col.headerHe !== original.headerHe ||
                col.visible !== original.visible ||
                col.index !== original.index
            );
        });
    }, [editingColumns, originalColumns]);
    
    // Notify parent about unsaved changes
    useEffect(() => {
        onHasUnsavedChanges?.(hasUnsavedChanges);
    }, [hasUnsavedChanges, onHasUnsavedChanges]);

    // Sync local state with props when columns change externally
    // Use JSON comparison to avoid resetting on reference changes
    useEffect(() => {
        const columnsJson = JSON.stringify(columns);
        const originalJson = JSON.stringify(originalColumns);
        
        // Only reset if the external columns actually changed (content, not just reference)
        if (columnsJson !== originalJson) {
            setEditingColumns(columns);
            setOriginalColumns(columns);
        }
    }, [columns, originalColumns]);

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
            visible: true,
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
        const success = onColumnsChange(editingColumns);
        if (success) {
            // Update original to match current after successful save
            setOriginalColumns([...editingColumns]);
        }
    };

    return (
        <Stack gap={2}>
            {/* Unsaved changes warning */}
            {hasUnsavedChanges && (
                <Alert 
                    severity="warning" 
                    icon={<WarningIcon />}
                    sx={{ py: 0.5 }}
                >
                    {t('settings.unsavedChangesNotice')}
                </Alert>
            )}
            
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
                    disabled={editingColumns.length === 0 || !hasUnsavedChanges}
                >
                    {t('common.save')}
                </Button>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 650 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 60 }}>{t('settings.columnOrder')}</TableCell>
                            <TableCell sx={{ width: 150 }}>{t('settings.fieldName')}</TableCell>
                            <TableCell sx={{ width: 150 }}>{t('settings.headerEn')}</TableCell>
                            <TableCell sx={{ width: 150 }}>{t('settings.headerHe')}</TableCell>
                            <TableCell sx={{ width: 70 }}>{t('settings.visible')}</TableCell>
                            <TableCell sx={{ width: 120 }}>{t('common.actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {editingColumns.map((col, index) => {
                            const locked = isFieldLocked(col.aimsValue);
                            const isId = isIdColumn(col.aimsValue);
                            const lockTooltip = isId 
                                ? t('settings.fieldLockedAsId') 
                                : t('settings.fieldLockedAsGlobal');
                            return (
                            <TableRow 
                                key={`${col.aimsValue}-${index}`}
                                sx={locked ? { 
                                    backgroundColor: isId ? 'primary.50' : 'action.hover',
                                    opacity: 0.9
                                } : undefined}
                            >
                                <TableCell>
                                    {locked ? (
                                        <Tooltip title={lockTooltip}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <LockIcon fontSize="small" color={isId ? 'primary' : 'action'} />
                                                {index + 1}
                                            </Box>
                                        </Tooltip>
                                    ) : (
                                        index + 1
                                    )}
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        size="small"
                                        value={col.aimsValue}
                                        onChange={(e) =>
                                            handleUpdateColumn(index, 'aimsValue', e.target.value)
                                        }
                                        placeholder="fieldName"
                                        fullWidth
                                        disabled={locked}
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
                                        disabled={locked}
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
                                        disabled={locked}
                                    />
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                    {locked ? (
                                        <Tooltip title={lockTooltip}>
                                            <span>
                                                <Checkbox
                                                    checked={isId ? true : false}
                                                    disabled={true}
                                                />
                                            </span>
                                        </Tooltip>
                                    ) : (
                                        <Checkbox
                                            checked={col.visible ?? true}
                                            onChange={(e) =>
                                                handleUpdateColumn(index, 'visible', e.target.checked)
                                            }
                                        />
                                    )}
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
                                            disabled={locked}
                                            title={t('settings.removeColumn')}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                            );
                        })}
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
