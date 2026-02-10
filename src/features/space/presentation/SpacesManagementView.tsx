import { logger } from '@shared/infrastructure/services/logger';
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
    Skeleton,
    Card,
    CardContent,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import SaveIcon from '@mui/icons-material/Save';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@shared/presentation/hooks/useDebounce';
import { useSpaceController } from '../application/useSpaceController';
import { useSyncContext } from '@features/sync/application/SyncContext';
import { useListsController } from '@features/lists/application/useListsController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import type { Space } from '@shared/domain/types';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { useUnsavedListGuard } from '@shared/presentation/hooks/useUnsavedListGuard';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

// Lazy load dialogs - not needed on initial render
const SpaceDialog = lazy(() => import('./SpaceDialog').then(m => ({ default: m.SpaceDialog })));
const ListsManagerDialog = lazy(() => import('@features/lists/presentation/ListsManagerDialog').then(m => ({ default: m.ListsManagerDialog })));
const SaveListDialog = lazy(() => import('@features/lists/presentation/SaveListDialog').then(m => ({ default: m.SaveListDialog })));

/**
 * Spaces Management View - Extracted from SpacesPage
 * This component handles the original space management functionality
 */
export function SpacesManagementView() {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isAppReady = useAuthStore((state) => state.isAppReady);
    const settingsController = useSettingsController();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const activeListName = useSpacesStore((state) => state.activeListName);
    const activeListId = useSpacesStore((state) => state.activeListId);
    const pendingChanges = useSpacesStore((state) => state.pendingChanges);
    const clearPendingChanges = useSpacesStore((state) => state.clearPendingChanges);

    // Use Lists Controller for saving changes and recovering ID
    const { lists, saveListChanges } = useListsController();

    // Unsaved list guard — prompts save/discard on navigation or browser close
    const { UnsavedChangesDialog } = useUnsavedListGuard({
        hasActiveList: !!activeListId,
        hasPendingChanges: pendingChanges,
        onSave: async () => {
            if (!activeListId) return;
            await saveListChanges(activeListId);
            clearPendingChanges();
        },
        onDiscard: () => {
            clearPendingChanges();
        },
    });

    // Auto-recover activeListId if name exists but ID is missing (fix for persistence mismatch)
    useEffect(() => {
        if (activeListName && !activeListId) {
            const list = lists.find(l => l.name === activeListName);
            if (list) {
                logger.info('SpacesManagementView', 'Recovered missing activeListId', { listId: list.id });
                useSpacesStore.getState().setActiveListId(list.id);
            }
        }
    }, [activeListName, activeListId, lists]);

    // Get sync context for triggering push after CRUD operations
    const { push } = useSyncContext();
    
    // Push pending queue items to AIMS after each CRUD operation
    const handleSync = useCallback(async () => {
        await push();
    }, [push]);

    const spaceController = useSpaceController({
        onSync: handleSync,
        csvConfig: settingsController.settings.csvConfig,
        solumMappingConfig: settingsController.settings.solumMappingConfig,
    });

    const { getLabel } = useSpaceTypeLabels();

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSpace, setEditingSpace] = useState<Space | undefined>(undefined);

    // Sort Config State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Lists Dialogs State
    const [listsManagerOpen, setListsManagerOpen] = useState(false);
    const [saveListOpen, setSaveListOpen] = useState(false);

    // Fetch spaces from Server DB when app is ready (Source of Truth for Cloud Persistence)
    useEffect(() => {
        if (isAppReady) {
            logger.info('SpacesManagementView', 'App ready - fetching spaces from Server DB');
            spaceController.fetchSpaces?.().catch(err => {
                logger.error('SpacesManagementView', 'Failed to fetch spaces from server', { err });
            });
        }
    }, [isAppReady]);

    // The articleName mapped field key (shown as dedicated "Name" column)
    const nameFieldKey = settingsController.settings.solumMappingConfig?.mappingInfo?.articleName;

    // Get visible fields from mapping config for dynamic table columns
    const visibleFields = useMemo(() => {
        // SoluM API Mode: use solumMappingConfig.fields
        if (!settingsController.settings.solumMappingConfig?.fields) return [];

        const idFieldKey = settingsController.settings.solumMappingConfig.mappingInfo?.articleId;
        const globalAssignments = settingsController.settings.solumMappingConfig.globalFieldAssignments || {};
        const globalFieldKeys = Object.keys(globalAssignments);

        return Object.entries(settingsController.settings.solumMappingConfig.fields)
            .filter(([fieldKey, config]) => {
                if (idFieldKey && fieldKey === idFieldKey) return false;
                if (nameFieldKey && fieldKey === nameFieldKey) return false; // Exclude name field (dedicated column)
                if (globalFieldKeys.includes(fieldKey)) return false; // Exclude global fields
                return config.visible !== false; // undefined = visible by default
            })
            .map(([fieldKey, config]) => {
                // Use friendly names if they exist and are not just the field key itself
                // (default config sets friendly names to field key, which is not user-friendly)
                const labelEn = (config.friendlyNameEn && config.friendlyNameEn !== fieldKey)
                    ? config.friendlyNameEn
                    : fieldKey;
                const labelHe = (config.friendlyNameHe && config.friendlyNameHe !== fieldKey)
                    ? config.friendlyNameHe
                    : fieldKey;

                return {
                    key: fieldKey,
                    labelEn,
                    labelHe,
                };
            });
    }, [settingsController.settings.solumMappingConfig, nameFieldKey]);

    // Handle sort request
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter AND Sort spaces
    const filteredAndSortedSpaces = useMemo(() => {
        const query = debouncedSearchQuery.toLowerCase();
        let result = spaceController.spaces;

        // 1. Filter by search query
        if (query) {
            result = result.filter((space) => {
                return (
                    (space.externalId || space.id).toLowerCase().includes(query) ||
                    Object.values(space.data).some((value) =>
                        value.toLowerCase().includes(query)
                    )
                );
            });
        }

        // 2. Sort
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                let aValue: any = '';
                let bValue: any = '';

                if (sortConfig.key === 'id') {
                    aValue = a.externalId || a.id;
                    bValue = b.externalId || b.id;
                } else {
                    aValue = a.data[sortConfig.key] || '';
                    bValue = b.data[sortConfig.key] || '';
                }

                const isNumeric = !isNaN(Number(aValue)) && !isNaN(Number(bValue)) && aValue !== '' && bValue !== '';

                if (isNumeric) {
                    return sortConfig.direction === 'asc'
                        ? Number(aValue) - Number(bValue)
                        : Number(bValue) - Number(aValue);
                }

                const aString = String(aValue).toLowerCase();
                const bString = String(bValue).toLowerCase();

                if (aString < bString) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aString > bString) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [spaceController.spaces, debouncedSearchQuery, sortConfig]);

    // Memoized event handlers
    const handleDelete = useCallback(async (id: string) => {
        const confirmed = await confirm({
            title: `${t('common.dialog.delete')} ${getLabel('singular').toLowerCase()}`,
            message: `${t('common.dialog.areYouSure')} `,
            confirmLabel: t('common.dialog.delete'),
            cancelLabel: t('common.dialog.cancel'),
            severity: 'error'
        });

        if (confirmed) {
            try {
                await spaceController.deleteSpace(id);
            } catch (error) {
                await confirm({
                    title: t('common.error'),
                    message: `Failed to delete ${getLabel('singular').toLowerCase()}: ${error}`,
                    confirmLabel: t('common.close'),
                    severity: 'error',
                    showCancel: false
                });
            }
        }
    }, [confirm, t, getLabel, spaceController]);

    const handleAdd = useCallback(() => {
        setEditingSpace(undefined);
        setDialogOpen(true);
    }, []);

    const handleEdit = useCallback((space: Space) => {
        setEditingSpace(space);
        setDialogOpen(true);
    }, []);

    const handleSave = useCallback(async (spaceData: Partial<Space>) => {
        if (editingSpace) {
            await spaceController.updateSpace(editingSpace.id, spaceData);
        } else {
            await spaceController.addSpace(spaceData);
        }
    }, [editingSpace, spaceController]);

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
                            {getLabel('plural')}
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
                        {t('spaces.total')} {getLabel('plural')} - {spaceController.spaces.length}
                    </Typography>
                </Box>
                <Stack direction="row" gap={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAdd}
                    >
                        {getLabel('add')}
                    </Button>
                </Stack>
            </Stack>
            {/* Search Bar */}
            <TextField
                fullWidth
                placeholder={t('spaces.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                    mb: 3,
                    maxWidth: { xs: '100%', sm: 400 },
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 4,
                    }
                }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }
                }}
            />
            {/* Spaces Table / Mobile Card View */}
            {isMobile ? (
                /* Mobile Card View */
                (<Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                    {spaceController.isFetching ? (
                        <Stack gap={1}>
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Card key={`skeleton-${index}`} variant="outlined">
                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Skeleton variant="text" width="60%" height={24} />
                                        <Skeleton variant="text" width="80%" height={20} />
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    ) : filteredAndSortedSpaces.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                {searchQuery
                                    ? t('spaces.noSpacesMatching', { spaces: getLabel('plural').toLowerCase() }) + ` "${searchQuery}"`
                                    : t('spaces.noSpacesYet', { spaces: getLabel('plural').toLowerCase(), button: `"${getLabel('add')}"` })}
                            </Typography>
                        </Paper>
                    ) : (
                        <Stack gap={1}>
                            {filteredAndSortedSpaces.map((space, index) => (
                                <Card key={`${space.id}-${index}`} variant="outlined">
                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        {/* Row 1: ID + Name + Actions */}
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                                            <Stack direction="row" alignItems="center" gap={1}>
                                                <Typography variant="subtitle2" fontWeight={600}>
                                                    {space.externalId || space.id}
                                                </Typography>
                                                {nameFieldKey && space.data[nameFieldKey] && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        {space.data[nameFieldKey]}
                                                    </Typography>
                                                )}
                                            </Stack>
                                            <Stack direction="row" gap={0.5}>
                                                <Tooltip title={t('common.edit')}>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleEdit(space)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={t('common.delete')}>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(space.id)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </Stack>
                                        {/* Row 2: Fields (stacked) */}
                                        <Typography variant="body2" color="text.secondary" noWrap>
                                            {visibleFields.slice(0, 3).map((field, i) => (
                                                <span key={field.key}>
                                                    {i > 0 && ' • '}
                                                    {space.data[field.key] || '-'}
                                                </span>
                                            ))}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </Box>)
            ) : (
                /* Desktop Table View */
                (<TableContainer component={Paper} sx={{ maxHeight: { xs: '55vh', sm: '65vh', md: '70vh' } }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'background.default' }}>
                                <TableCell sx={{ fontWeight: 600 }} align="center">
                                    <TableSortLabel
                                        active={sortConfig?.key === 'id'}
                                        direction={sortConfig?.key === 'id' ? sortConfig.direction : 'asc'}
                                        onClick={() => handleSort('id')}
                                    >
                                        {t('spaces.id')}
                                    </TableSortLabel>
                                </TableCell>
                                {nameFieldKey && (
                                    <TableCell sx={{ fontWeight: 600 }} align="center">
                                        <TableSortLabel
                                            active={sortConfig?.key === nameFieldKey}
                                            direction={sortConfig?.key === nameFieldKey ? sortConfig.direction : 'asc'}
                                            onClick={() => handleSort(nameFieldKey)}
                                        >
                                            {t('spaces.name')}
                                        </TableSortLabel>
                                    </TableCell>
                                )}
                                {visibleFields.map(field => (
                                    <TableCell key={field.key} sx={{ fontWeight: 600 }} align="center">
                                        <TableSortLabel
                                            active={sortConfig?.key === field.key}
                                            direction={sortConfig?.key === field.key ? sortConfig.direction : 'asc'}
                                            onClick={() => handleSort(field.key)}
                                        >
                                            {i18n.language === 'he' ? field.labelHe : field.labelEn}
                                        </TableSortLabel>
                                    </TableCell>
                                ))}
                                <TableCell sx={{ fontWeight: 600 }} align="center">{t('spaces.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {spaceController.isFetching ? (
                                // Show skeleton rows while fetching
                                (Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={`skeleton-${index}`}>
                                        <TableCell align="center">
                                            <Skeleton variant="text" width="80%" />
                                        </TableCell>
                                        {nameFieldKey && (
                                            <TableCell align="center">
                                                <Skeleton variant="text" width="70%" />
                                            </TableCell>
                                        )}
                                        {visibleFields.map(field => (
                                            <TableCell key={field.key} align="center">
                                                <Skeleton variant="text" width="70%" />
                                            </TableCell>
                                        ))}
                                        <TableCell align="center">
                                            <Stack direction="row" gap={1} justifyContent="center">
                                                <Skeleton variant="circular" width={32} height={32} />
                                                <Skeleton variant="circular" width={32} height={32} />
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                )))
                            ) : filteredAndSortedSpaces.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleFields.length + (nameFieldKey ? 3 : 2)} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {searchQuery
                                                ? t('spaces.noSpacesMatching', { spaces: getLabel('plural').toLowerCase() }) + ` "${searchQuery}"`
                                                : t('spaces.noSpacesYet', { spaces: getLabel('plural').toLowerCase(), button: `"${getLabel('add')}"` })}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAndSortedSpaces.map((space, index) => (
                                    <TableRow
                                        key={`${space.id}-${index}`}
                                        sx={{
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                        }}
                                    >
                                        <TableCell align="center">
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {space.externalId || space.id}
                                            </Typography>
                                        </TableCell>
                                        {nameFieldKey && (
                                            <TableCell align="center">
                                                <Typography variant="body2">
                                                    {space.data[nameFieldKey] || '-'}
                                                </Typography>
                                            </TableCell>
                                        )}
                                        {visibleFields.map(field => (
                                            <TableCell key={field.key} align="center">
                                                <Typography variant="body2">
                                                    {space.data[field.key] || '-'}
                                                </Typography>
                                            </TableCell>
                                        ))}
                                        <TableCell align="center">
                                            <Stack direction="row" gap={1} justifyContent="center">
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleEdit(space)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(space.id)}
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
                </TableContainer>)
            )}
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
                        disabled={!pendingChanges}
                        onClick={() => {
                            if (activeListId) {
                                saveListChanges(activeListId);
                            }
                        }}
                    >
                        {t('lists.saveChanges')}
                    </Button>
                )}
            </Box>
            {/* Add/Edit Dialog - Lazy loaded */}
            <Suspense fallback={null}>
                {dialogOpen && (
                    <SpaceDialog
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                        onSave={handleSave}
                        space={editingSpace}
                        workingMode={settingsController.settings.workingMode}
                        solumMappingConfig={settingsController.settings.solumMappingConfig}
                        csvConfig={settingsController.settings.csvConfig}
                        spaceTypeLabel={getLabel('singular')}
                        existingIds={spaceController.spaces.map(s => s.id)}
                    />
                )}
            </Suspense>
            <ConfirmDialog />
            <UnsavedChangesDialog />
            {/* Lists Dialogs - Lazy loaded */}
            <Suspense fallback={null}>
                {listsManagerOpen && (
                    <ListsManagerDialog
                        open={listsManagerOpen}
                        onClose={() => setListsManagerOpen(false)}
                    />
                )}
                {saveListOpen && (
                    <SaveListDialog
                        open={saveListOpen}
                        onClose={() => setSaveListOpen(false)}
                    />
                )}
            </Suspense>
        </Box>
    );
}
