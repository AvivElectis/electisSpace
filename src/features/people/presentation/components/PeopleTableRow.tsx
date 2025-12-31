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
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import type { Person } from '../../domain/types';
import { getPersonListNames, toDisplayName } from '../../domain/types';

interface VisibleField {
    key: string;
    labelEn: string;
    labelHe: string;
}

interface PeopleTableRowProps {
    person: Person;
    visibleFields: VisibleField[];
    isSelected: boolean;
    onSelect: (id: string, checked: boolean) => void;
    onEdit: (person: Person) => void;
    onDelete: (id: string) => void;
    onAssignSpace: (person: Person) => void;
    onUnassignSpace: (person: Person) => void;
}

/**
 * PeopleTableRow - Single row in the people table
 */
export function PeopleTableRow({
    person,
    visibleFields,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onAssignSpace,
    onUnassignSpace,
}: PeopleTableRowProps) {
    const { t } = useTranslation();
    const { getLabel } = useSpaceTypeLabels();

    // Helper for translations with space type
    const tWithSpaceType = useCallback(
        (key: string, options?: Record<string, unknown>) => {
            return t(key, {
                ...options,
                spaceTypeSingular: getLabel('singular').toLowerCase(),
                spaceTypeSingularDef: getLabel('singularDef').toLowerCase(),
                spaceTypePlural: getLabel('plural').toLowerCase(),
                spaceTypePluralDef: getLabel('pluralDef').toLowerCase(),
            });
        },
        [t, getLabel]
    );

    // Render AIMS status icon
    const renderAimsStatus = () => {
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
                    <Tooltip title={t('people.syncedToAims')}>
                        <CheckCircleIcon color="success" fontSize="small" />
                    </Tooltip>
                );
            case 'pending':
                return (
                    <Tooltip title={t('people.syncPending')}>
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
                    <Tooltip title={t('people.syncError')}>
                        <ErrorIcon color="error" fontSize="small" />
                    </Tooltip>
                );
            default:
                return (
                    <Tooltip title={t('people.notSynced')}>
                        <SyncIcon color="disabled" fontSize="small" />
                    </Tooltip>
                );
        }
    };

    // Render space assignment chip
    const renderSpaceChip = () => {
        if (person.assignedSpaceId) {
            return <Chip label={person.assignedSpaceId} size="small" color="success" />;
        }

        if (person.virtualSpaceId?.startsWith('POOL-')) {
            return (
                <Tooltip title={`Virtual: ${person.virtualSpaceId}`}>
                    <Chip
                        label={t('people.unassigned')}
                        size="small"
                        variant="outlined"
                        sx={{ px: 1 }}
                        icon={<SyncIcon fontSize="small" />}
                    />
                </Tooltip>
            );
        }

        return <Chip label={t('people.unassigned')} size="small" variant="outlined" sx={{ px: 1 }} />;
    };

    // Render lists chip (shows which lists this person belongs to)
    const renderListsChip = () => {
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
                    label={t('people.inLists', { count: listNames.length })} 
                    size="small" 
                    variant="outlined"
                    color="info"
                    sx={{px: .5}}
                    icon={<ListAltIcon fontSize="small" />}
                />
            </Tooltip>
        );
    };

    return (
        <TableRow hover selected={isSelected}>
            <TableCell padding="checkbox">
                <Checkbox checked={isSelected} onChange={(e) => onSelect(person.id, e.target.checked)} />
            </TableCell>
            {visibleFields.map((field) => (
                <TableCell key={field.key} sx={{ textAlign: 'start' }}>
                    <Typography variant="body2">{person.data[field.key] || '-'}</Typography>
                </TableCell>
            ))}
            <TableCell sx={{ textAlign: 'start' }}>{renderSpaceChip()}</TableCell>
            <TableCell sx={{ textAlign: 'start' }}>{renderListsChip()}</TableCell>
            <TableCell sx={{ textAlign: 'start' }}>{renderAimsStatus()}</TableCell>
            <TableCell sx={{ textAlign: 'start' }}>
                <Stack direction="row" gap={0.5} justifyContent="flex-start">
                    {!person.assignedSpaceId && (
                        <Tooltip title={tWithSpaceType('people.assignSpace')}>
                            <IconButton size="small" color="success" onClick={() => onAssignSpace(person)}>
                                <AssignmentIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {person.assignedSpaceId && (
                        <Tooltip title={tWithSpaceType('people.unassignSpace')}>
                            <IconButton size="small" color="warning" onClick={() => onUnassignSpace(person)}>
                                <PersonRemoveIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title={t('common.edit')}>
                        <IconButton size="small" color="primary" onClick={() => onEdit(person)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                        <IconButton size="small" color="error" onClick={() => onDelete(person.id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </TableCell>
        </TableRow>
    );
}
