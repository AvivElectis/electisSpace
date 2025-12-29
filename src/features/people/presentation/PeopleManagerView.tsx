import {
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Stack,
    TextField,
    InputAdornment,
    Tooltip,
    TableSortLabel,
    Chip,
    LinearProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SaveIcon from '@mui/icons-material/Save';
import FolderIcon from '@mui/icons-material/Folder';
import SendIcon from '@mui/icons-material/Send';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@shared/presentation/hooks/useDebounce';
import { usePeopleController } from '../application/usePeopleController';
import { usePeopleFilters } from '../application/usePeopleFilters';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { PersonDialog } from './PersonDialog';
import { CSVUploadDialog } from './CSVUploadDialog.tsx';
import { PeopleSaveListDialog } from './PeopleSaveListDialog';
import { PeopleListsManagerDialog } from './PeopleListsManagerDialog.tsx';
import type { Person, PeopleFilters } from '../domain/types';

/**
 * People Manager View - Main component for managing people and space assignments
 */
export function PeopleManagerView() {
    const { t, i18n } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const settings = useSettingsStore((state) => state.settings);

    // Store state
    const people = usePeopleStore((state) => state.people);
    const activeListName = usePeopleStore((state) => state.activeListName);
    const activeListId = usePeopleStore((state) => state.activeListId);

    // Single source of truth: totalSpaces from settings, assignedSpaces computed from people
    const totalSpaces = settings.peopleManagerConfig?.totalSpaces || 0;
    const assignedSpaces = useMemo(() => people.filter(p => p.assignedSpaceId).length, [people]);
    const availableSpaces = totalSpaces - assignedSpaces;

    // Controller
    const peopleController = usePeopleController();

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

    const filters: PeopleFilters = {
        searchQuery: debouncedSearchQuery,
        assignmentStatus: assignmentFilter,
    };

    const { filteredPeople, assignedCount, unassignedCount } = usePeopleFilters(people, filters);

    // Sort state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Selection state for bulk operations
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Dialog states
    const [personDialogOpen, setPersonDialogOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | undefined>(undefined);
    const [csvUploadOpen, setCSVUploadOpen] = useState(false);
    const [saveListOpen, setSaveListOpen] = useState(false);
    const [listsManagerOpen, setListsManagerOpen] = useState(false);

    // Get visible fields from mapping config for dynamic table columns
    const visibleFields = useMemo(() => {
        if (!settings.solumMappingConfig?.fields) return [];

        const idFieldKey = settings.solumMappingConfig.mappingInfo?.articleId;

        return Object.entries(settings.solumMappingConfig.fields)
            .filter(([fieldKey, config]) => {
                if (idFieldKey && fieldKey === idFieldKey) return false;
                return config.visible;
            })
            .map(([fieldKey, config]) => ({
                key: fieldKey,
                labelEn: config.friendlyNameEn,
                labelHe: config.friendlyNameHe
            }));
    }, [settings.solumMappingConfig]);

    // Handle sort
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Sort filtered people
    const sortedPeople = useMemo(() => {
        if (!sortConfig) return filteredPeople;

        return [...filteredPeople].sort((a, b) => {
            let aValue: string = '';
            let bValue: string = '';

            if (sortConfig.key === 'id') {
                aValue = a.id;
                bValue = b.id;
            } else if (sortConfig.key === 'assignedSpaceId') {
                aValue = a.assignedSpaceId || '';
                bValue = b.assignedSpaceId || '';
            } else {
                aValue = a.data[sortConfig.key] || '';
                bValue = b.data[sortConfig.key] || '';
            }

            const comparison = aValue.localeCompare(bValue);
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [filteredPeople, sortConfig]);

    // Selection handlers
    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(sortedPeople.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    }, [sortedPeople]);

    const handleSelectOne = useCallback((id: string, checked: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, []);

    // Action handlers
    const handleDelete = useCallback(async (id: string) => {
        const confirmed = await confirm({
            title: t('people.deletePerson'),
            message: t('common.dialog.areYouSure'),
            confirmLabel: t('common.dialog.delete'),
            cancelLabel: t('common.dialog.cancel'),
            severity: 'error'
        });

        if (confirmed) {
            peopleController.deletePerson(id);
        }
    }, [confirm, t, peopleController]);

    const handleEdit = useCallback((person: Person) => {
        setEditingPerson(person);
        setPersonDialogOpen(true);
    }, []);

    const handleAdd = useCallback(() => {
        setEditingPerson(undefined);
        setPersonDialogOpen(true);
    }, []);

    const handleAssignSpace = useCallback(async (personId: string) => {
        // Find next available space ID
        const nextSpaceId = String(assignedCount + 1);
        await peopleController.assignSpaceToPerson(personId, nextSpaceId, false);
    }, [assignedCount, peopleController]);

    const handleBulkAssign = useCallback(async () => {
        const selectedPeople = sortedPeople.filter(p => selectedIds.has(p.id) && !p.assignedSpaceId);
        if (selectedPeople.length === 0) return;

        const confirmed = await confirm({
            title: t('people.bulkAssign'),
            message: t('people.bulkAssignConfirm', { count: selectedPeople.length }),
            confirmLabel: t('common.confirm'),
            cancelLabel: t('common.cancel'),
        });

        if (confirmed) {
            let nextId = assignedCount + 1;
            const assignments = selectedPeople.map(p => ({
                personId: p.id,
                spaceId: String(nextId++)
            }));
            await peopleController.bulkAssignSpaces(assignments, false);
            setSelectedIds(new Set());
        }
    }, [sortedPeople, selectedIds, assignedCount, confirm, t, peopleController]);

    const handleBulkPostToAims = useCallback(async () => {
        const selectedPeople = sortedPeople.filter(p => selectedIds.has(p.id) && p.assignedSpaceId);
        if (selectedPeople.length === 0) return;

        const confirmed = await confirm({
            title: t('people.postToAims'),
            message: t('people.postToAimsConfirm', { count: selectedPeople.length }),
            confirmLabel: t('common.confirm'),
            cancelLabel: t('common.cancel'),
        });

        if (confirmed) {
            await peopleController.postSelectedToAims(selectedPeople.map(p => p.id));
            setSelectedIds(new Set());
        }
    }, [sortedPeople, selectedIds, confirm, t, peopleController]);

    // Space allocation progress
    const allocationProgress = totalSpaces > 0
        ? (assignedSpaces / totalSpaces) * 100
        : 0;

    return (
        <Box>
            {/* Header Section */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Stack direction="row" alignItems="center" mb={0.5}>
                        <Typography variant="h4" sx={{ fontWeight: 500 }}>
                            {t('people.title')}
                        </Typography>
                        {activeListName && (
                            <Typography variant="h6" sx={{
                                fontWeight: 600,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                borderRadius: .5,
                                px: 1,
                                py: 0,
                                mx: 2,
                            }}>
                                {activeListName}
                            </Typography>
                        )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        {t('people.total')} - {people.length}
                    </Typography>
                </Box>
                <Stack direction="row" gap={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Button
                        variant="text"
                        startIcon={<UploadFileIcon />}
                        onClick={() => setCSVUploadOpen(true)}
                    >
                        {t('people.uploadCSV')}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAdd}
                    >
                        {t('people.addPerson')}
                    </Button>
                </Stack>
            </Stack>

            {/* Space Allocation Panel */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={3} alignItems="center">
                    <TextField
                        label={t('people.totalSpaces')}
                        type="number"
                        size="small"
                        value={totalSpaces}
                        onChange={(e) => peopleController.setTotalSpaces(Number(e.target.value))}
                        sx={{ width: 150 }}
                        inputProps={{ min: 0 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Stack direction="row" justifyContent="space-between" gap={1} mb={0.5}>
                            <Typography variant="body2">
                                {t('people.spacesAssigned', { assigned: assignedCount, total: totalSpaces })}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {availableSpaces} {t('people.available')}
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={allocationProgress}
                            sx={{ height: 8, borderRadius: 4 }}
                            color={allocationProgress > 90 ? 'warning' : 'primary'}
                        />
                    </Box>
                    <Stack direction="row"  gap={1}>
                        <Chip
                            label={`${assignedCount} ${t('people.assigned')}`}
                            color="success"
                            size="small"
                        />
                        <Chip
                            label={`${unassignedCount} ${t('people.unassigned')}`}
                            color="default"
                            size="small"
                        />
                    </Stack>
                </Stack>
            </Paper>

            {/* Search and Filter Bar */}
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mb: 3 }}>
                <TextField
                    placeholder={t('people.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 4,
                        }
                    }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>{t('people.filterStatus')}</InputLabel>
                    <Select
                        value={assignmentFilter}
                        label={t('people.filterStatus')}
                        onChange={(e) => setAssignmentFilter(e.target.value as 'all' | 'assigned' | 'unassigned')}
                    >
                        <MenuItem value="all">{t('people.all')}</MenuItem>
                        <MenuItem value="assigned">{t('people.assigned')}</MenuItem>
                        <MenuItem value="unassigned">{t('people.unassigned')}</MenuItem>
                    </Select>
                </FormControl>
            </Stack>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'action.selected' }}>
                    <Stack direction="row" gap={2} alignItems="center">
                        <Typography variant="body2">
                            {t('people.selectedCount', { count: selectedIds.size })}
                        </Typography>
                        <Button
                            size="small"
                            startIcon={<AssignmentIcon />}
                            onClick={handleBulkAssign}
                        >
                            {t('people.assignSpaces')}
                        </Button>
                        <Button
                            size="small"
                            startIcon={<SendIcon />}
                            onClick={handleBulkPostToAims}
                            color="success"
                        >
                            {t('people.postToAims')}
                        </Button>
                    </Stack>
                </Paper>
            )}

            {/* People Table */}
            <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selectedIds.size > 0 && selectedIds.size < sortedPeople.length}
                                    checked={sortedPeople.length > 0 && selectedIds.size === sortedPeople.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                                <TableSortLabel
                                    active={sortConfig?.key === 'id'}
                                    direction={sortConfig?.key === 'id' ? sortConfig.direction : 'asc'}
                                    onClick={() => handleSort('id')}
                                >
                                    {t('people.id')}
                                </TableSortLabel>
                            </TableCell>
                            {visibleFields.map(field => (
                                <TableCell key={field.key} sx={{ fontWeight: 600 }}>
                                    <TableSortLabel
                                        active={sortConfig?.key === field.key}
                                        direction={sortConfig?.key === field.key ? sortConfig.direction : 'asc'}
                                        onClick={() => handleSort(field.key)}
                                    >
                                        {i18n.language === 'he' ? field.labelHe : field.labelEn}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                            <TableCell sx={{ fontWeight: 600 }}>
                                <TableSortLabel
                                    active={sortConfig?.key === 'assignedSpaceId'}
                                    direction={sortConfig?.key === 'assignedSpaceId' ? sortConfig.direction : 'asc'}
                                    onClick={() => handleSort('assignedSpaceId')}
                                >
                                    {t('people.assignedSpace')}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }} align="center">
                                {t('common.actions')}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedPeople.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={visibleFields.length + 4} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {searchQuery || assignmentFilter !== 'all'
                                            ? t('people.noResults')
                                            : t('people.noPeopleYet')}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedPeople.map((person) => (
                                <TableRow
                                    key={person.id}
                                    hover
                                    selected={selectedIds.has(person.id)}
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedIds.has(person.id)}
                                            onChange={(e) => handleSelectOne(person.id, e.target.checked)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {person.id}
                                        </Typography>
                                    </TableCell>
                                    {visibleFields.map(field => (
                                        <TableCell key={field.key}>
                                            <Typography variant="body2">
                                                {person.data[field.key] || '-'}
                                            </Typography>
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        {person.assignedSpaceId ? (
                                            <Chip
                                                label={person.assignedSpaceId}
                                                size="small"
                                                color="success"
                                            />
                                        ) : (
                                            <Chip
                                                label={t('people.unassigned')}
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" gap={0.5} justifyContent="center">
                                            {!person.assignedSpaceId && (
                                                <Tooltip title={t('people.assignSpace')}>
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() => handleAssignSpace(person.id)}
                                                    >
                                                        <AssignmentIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title={t('common.edit')}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleEdit(person)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={t('common.delete')}>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(person.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Bottom Actions Bar */}
            <Box sx={{
                mt: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 1,
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<FolderIcon />}
                        onClick={() => setListsManagerOpen(true)}
                        sx={{ mr: 2 }}
                    >
                        {t('lists.manage')}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        onClick={() => setSaveListOpen(true)}
                    >
                        {t('lists.saveAsNew')}
                    </Button>
                </Box>

                {activeListId && (
                    <Button
                        variant="outlined"
                        color="success"
                        startIcon={<SaveIcon />}
                        onClick={() => peopleController.updateCurrentList()}
                    >
                        {t('lists.saveChanges')}
                    </Button>
                )}
            </Box>

            {/* Dialogs */}
            <PersonDialog
                open={personDialogOpen}
                onClose={() => setPersonDialogOpen(false)}
                person={editingPerson}
            />

            <CSVUploadDialog
                open={csvUploadOpen}
                onClose={() => setCSVUploadOpen(false)}
            />

            <PeopleSaveListDialog
                open={saveListOpen}
                onClose={() => setSaveListOpen(false)}
            />

            <PeopleListsManagerDialog
                open={listsManagerOpen}
                onClose={() => setListsManagerOpen(false)}
            />

            <ConfirmDialog />
        </Box>
    );
}
