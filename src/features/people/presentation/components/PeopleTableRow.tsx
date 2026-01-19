import {
    TableRow,
    TableCell,
    Checkbox,
    Typography,
    Chip,
    Tooltip,
    IconButton,
    Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';
import ListAltIcon from '@mui/icons-material/ListAlt';
import React, { useCallback, useMemo, memo } from 'react';
import type { Person } from '../../domain/types';
import { getPersonListNames, toDisplayName } from '../../domain/types';

interface VisibleField {
    key: string;
    labelEn: string;
    labelHe: string;
}

// Pre-computed translations passed from parent
export interface PeopleTableTranslations {
    syncedToAims: string;
    syncPending: string;
    syncError: string;
    notSynced: string;
    unassigned: string;
    inListsFormat: (count: number) => string;
    assignSpace: string;
    unassignSpace: string;
    edit: string;
    delete: string;
}

interface PeopleTableRowProps {
    index: number;
    person: Person;
    visibleFields: VisibleField[];
    isSelected: boolean;
    translations: PeopleTableTranslations;
    onSelect: (id: string, checked: boolean) => void;
    onEdit: (person: Person) => void;
    onDelete: (id: string) => void;
    onAssignSpace: (person: Person) => void;
    onUnassignSpace: (person: Person) => void;
}

/**
 * PeopleTableRow - Single row in the people table
 * Wrapped with React.memo for performance optimization
 */
function PeopleTableRowComponent({
    index,
    person,
    visibleFields,
    isSelected,
    translations,
    onSelect,
    onEdit,
    onDelete,
    onAssignSpace,
    onUnassignSpace,
}: PeopleTableRowProps) {
    // Memoized AIMS status icon
    const aimsStatusElement = useMemo(() => {
        if (!person.assignedSpaceId) {
            return (
                <Typography variant="body2" color="text.disabled">
                    -
                </Typography>
            );
        }

        switch (person.aimsSyncStatus) {
            case 'synced':
                return (
                    <Tooltip title={translations.syncedToAims}>
                        <CheckCircleIcon color="success" fontSize="small" />
                    </Tooltip>
                );
            case 'pending':
                return (
                    <Tooltip title={translations.syncPending}>
                        <SyncIcon
                            color="info"
                            fontSize="small"
                            sx={{
                                animation: 'spin 1s linear infinite',
                                '@keyframes spin': {
                                    from: { transform: 'rotate(0deg)' },
                                    to: { transform: 'rotate(360deg)' },
                                },
                            }}
                        />
                    </Tooltip>
                );
            case 'error':
                return (
                    <Tooltip title={translations.syncError}>
                        <ErrorIcon color="error" fontSize="small" />
                    </Tooltip>
                );
            default:
                return (
                    <Tooltip title={translations.notSynced}>
                        <SyncIcon color="disabled" fontSize="small" />
                    </Tooltip>
                );
        }
    }, [person.assignedSpaceId, person.aimsSyncStatus, translations]);

    // Memoized space assignment chip
    const spaceChipElement = useMemo(() => {
        if (person.assignedSpaceId) {
            return <Chip label={person.assignedSpaceId} size="small" color="success" />;
        }

        if (person.virtualSpaceId?.startsWith('POOL-')) {
            return (
                <Tooltip title={`Virtual: ${person.virtualSpaceId}`}>
                    <Chip
                        label={translations.unassigned}
                        size="small"
                        variant="outlined"
                        sx={{ px: 1 }}
                        icon={<SyncIcon fontSize="small" />}
                    />
                </Tooltip>
            );
        }

        return <Chip label={translations.unassigned} size="small" variant="outlined" sx={{ px: 1 }} />;
    }, [person.assignedSpaceId, person.virtualSpaceId, translations.unassigned]);

    // Memoized lists chip
    const listsChipElement = useMemo(() => {
        const listNames = getPersonListNames(person);
        
        if (listNames.length === 0) {
            return (
                <Typography variant="body2" color="text.disabled">
                    -
                </Typography>
            );
        }

        const displayNames = listNames.map(toDisplayName);
        
        if (listNames.length === 1) {
            return (
                <Chip 
                    label={displayNames[0]} 
                    size="small" 
                    variant="outlined"
                    sx={{px: .5}}
                    icon={<ListAltIcon fontSize="small" />}
                />
            );
        }

        // Multiple lists - show count with tooltip listing all
        return (
            <Tooltip title={displayNames.join(', ')}>
                <Chip 
                    label={translations.inListsFormat(listNames.length)} 
                    size="small" 
                    variant="outlined"
                    color="info"
                    sx={{px: .5}}
                    icon={<ListAltIcon fontSize="small" />}
                />
            </Tooltip>
        );
    }, [person, translations.inListsFormat]);

    // Stable callbacks
    const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onSelect(person.id, e.target.checked);
    }, [person.id, onSelect]);

    const handleEdit = useCallback(() => onEdit(person), [person, onEdit]);
    const handleDelete = useCallback(() => onDelete(person.id), [person.id, onDelete]);
    const handleAssignSpace = useCallback(() => onAssignSpace(person), [person, onAssignSpace]);
    const handleUnassignSpace = useCallback(() => onUnassignSpace(person), [person, onUnassignSpace]);

    return (
        <TableRow hover selected={isSelected}>
            <TableCell sx={{ textAlign: 'center', width: 50, color: 'text.secondary' }}>
                <Typography variant="body2">{index}</Typography>
            </TableCell>
            <TableCell padding="checkbox">
                <Checkbox checked={isSelected} onChange={handleSelect} />
            </TableCell>
            {visibleFields.map((field) => (
                <TableCell key={field.key} sx={{ textAlign: 'start' }}>
                    <Typography variant="body2">{person.data[field.key] || '-'}</Typography>
                </TableCell>
            ))}
            <TableCell sx={{ textAlign: 'start' }}>{spaceChipElement}</TableCell>
            <TableCell sx={{ textAlign: 'start' }}>{listsChipElement}</TableCell>
            <TableCell sx={{ textAlign: 'start' }}>{aimsStatusElement}</TableCell>
            <TableCell sx={{ textAlign: 'start' }}>
                <Stack direction="row" gap={0.5} justifyContent="flex-start">
                    {!person.assignedSpaceId && (
                        <Tooltip title={translations.assignSpace}>
                            <IconButton size="small" color="success" onClick={handleAssignSpace}>
                                <AssignmentIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {person.assignedSpaceId && (
                        <Tooltip title={translations.unassignSpace}>
                            <IconButton size="small" color="warning" onClick={handleUnassignSpace}>
                                <PersonRemoveIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title={translations.edit}>
                        <IconButton size="small" color="primary" onClick={handleEdit}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={translations.delete}>
                        <IconButton size="small" color="error" onClick={handleDelete}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </TableCell>
        </TableRow>
    );
}

// Custom comparison for React.memo - only re-render when actual data changes
function arePropsEqual(prevProps: PeopleTableRowProps, nextProps: PeopleTableRowProps): boolean {
    return (
        prevProps.index === nextProps.index &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.person.id === nextProps.person.id &&
        prevProps.person.assignedSpaceId === nextProps.person.assignedSpaceId &&
        prevProps.person.virtualSpaceId === nextProps.person.virtualSpaceId &&
        prevProps.person.aimsSyncStatus === nextProps.person.aimsSyncStatus &&
        prevProps.person.listMemberships?.length === nextProps.person.listMemberships?.length &&
        prevProps.visibleFields.length === nextProps.visibleFields.length &&
        // Compare data fields that are visible
        prevProps.visibleFields.every((field, i) => 
            field.key === nextProps.visibleFields[i]?.key &&
            prevProps.person.data[field.key] === nextProps.person.data[field.key]
        )
    );
}

export const PeopleTableRow = memo(PeopleTableRowComponent, arePropsEqual);