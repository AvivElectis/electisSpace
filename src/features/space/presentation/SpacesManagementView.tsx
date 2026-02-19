import { logger } from '@shared/infrastructure/services/logger';
import {
    Box,
    Typography,
    Button,
    Paper,
    IconButton,
    Stack,
    TextField,
    InputAdornment,
    Tooltip,
    Skeleton,
    Card,
    CardContent,
    Collapse,
    useMediaQuery,
    useTheme,
    Fab,
    Badge,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import SaveIcon from '@mui/icons-material/Save';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';
import React, { useState, useEffect, useMemo, useCallback, useDeferredValue, lazy, Suspense } from 'react';
import { List as VirtualList } from 'react-window';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@shared/presentation/hooks/useDebounce';
import { useSpaceController } from '../application/useSpaceController';
import { useBackendSyncContext } from '@features/sync/application/SyncContext';
import { useListsController } from '@features/lists/application/useListsController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import type { Space } from '@shared/domain/types';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { useUnsavedListGuard } from '@shared/presentation/hooks/useUnsavedListGuard';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';

// Lazy load dialogs - not needed on initial render
const SpaceDialog = lazy(() => import('./SpaceDialog').then(m => ({ default: m.SpaceDialog })));
const ListsManagerDialog = lazy(() => import('@features/lists/presentation/ListsManagerDialog').then(m => ({ default: m.ListsManagerDialog })));
const SaveListDialog = lazy(() => import('@features/lists/presentation/SaveListDialog').then(m => ({ default: m.SaveListDialog })));

// ======================
// Desktop Virtualized Table Sub-components
// ======================

const ROW_HEIGHT = 48;

const headerCellSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: 1,
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    userSelect: 'none',
    '&:hover': { color: 'primary.main' },
} as const;

const cellSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: 1,
    overflow: 'hidden',
} as const;

function SortIndicator({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
    if (!active) return null;
    return direction === 'asc'
        ? <ArrowUpwardIcon sx={{ fontSize: 16, ml: 0.5, color: 'primary.main' }} />
        : <ArrowDownwardIcon sx={{ fontSize: 16, ml: 0.5, color: 'primary.main' }} />;
}

interface VisibleField {
    key: string;
    labelEn: string;
    labelHe: string;
}

interface SpacesDesktopTableProps {
    spaces: Space[];
    isFetching: boolean;
    visibleFields: VisibleField[];
    nameFieldKey?: string;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    searchQuery: string;
    canEdit: boolean;
    onSort: (key: string) => void;
    onEdit: (space: Space) => void;
    onDelete: (id: string) => void;
}

function SpacesDesktopTable({
    spaces, isFetching, visibleFields, nameFieldKey,
    sortConfig, searchQuery, canEdit, onSort, onEdit, onDelete,
}: SpacesDesktopTableProps) {
    const { t, i18n } = useTranslation();
    const { getLabel } = useSpaceTypeLabels();

    const VirtualRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
        const space = spaces[index];
        if (!space) return null;
        return (
            <Box
                style={style}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'action.hover' },
                    boxSizing: 'border-box',
                }}
            >
                {/* ID */}
                <Box sx={{ ...cellSx, width: 120, flexShrink: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                        {space.externalId || space.id}
                    </Typography>
                </Box>
                {/* Name */}
                {nameFieldKey && (
                    <Box sx={{ ...cellSx, flex: 1, minWidth: 100 }}>
                        <Typography variant="body2" noWrap>{space.data[nameFieldKey] || '-'}</Typography>
                    </Box>
                )}
                {/* Dynamic fields */}
                {visibleFields.map(field => (
                    <Box key={field.key} sx={{ ...cellSx, flex: 1, minWidth: 80 }}>
                        <Typography variant="body2" noWrap>{space.data[field.key] || '-'}</Typography>
                    </Box>
                ))}
                {/* Actions */}
                <Box sx={{ ...cellSx, width: 100, flexShrink: 0 }}>
                    <Stack direction="row" gap={0.5} justifyContent="center">
                        <Tooltip title={t('common.edit')}>
                            <span>
                            <IconButton size="small" color="primary" disabled={!canEdit} onClick={() => onEdit(space)}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                            <span>
                            <IconButton size="small" color="error" disabled={!canEdit} onClick={() => onDelete(space.id)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                </Box>
            </Box>
        );
    }, [spaces, visibleFields, nameFieldKey, t, onEdit, onDelete]);

    const listHeight = Math.min(spaces.length * ROW_HEIGHT, window.innerHeight * 0.65);
    const TypedVirtualList = VirtualList as any;

    return (
        <Paper sx={{ overflow: 'hidden' }}>
            {/* Sticky Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'grey.100',
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                    py: 1,
                    minHeight: 42,
                }}
            >
                {/* ID */}
                <Box sx={{ ...headerCellSx, width: 120, flexShrink: 0 }} onClick={() => onSort('id')}>
                    {t('spaces.id')}
                    <SortIndicator active={sortConfig?.key === 'id'} direction={sortConfig?.key === 'id' ? sortConfig.direction : 'asc'} />
                </Box>
                {/* Name */}
                {nameFieldKey && (
                    <Box sx={{ ...headerCellSx, flex: 1, minWidth: 100 }} onClick={() => onSort(nameFieldKey)}>
                        {t('spaces.name')}
                        <SortIndicator active={sortConfig?.key === nameFieldKey} direction={sortConfig?.key === nameFieldKey ? sortConfig.direction : 'asc'} />
                    </Box>
                )}
                {/* Dynamic fields */}
                {visibleFields.map(field => (
                    <Box key={field.key} sx={{ ...headerCellSx, flex: 1, minWidth: 80 }} onClick={() => onSort(field.key)}>
                        {i18n.language === 'he' ? field.labelHe : field.labelEn}
                        <SortIndicator active={sortConfig?.key === field.key} direction={sortConfig?.key === field.key ? sortConfig.direction : 'asc'} />
                    </Box>
                ))}
                {/* Actions */}
                <Box sx={{ ...headerCellSx, width: 100, flexShrink: 0, cursor: 'default' }}>
                    {t('spaces.actions')}
                </Box>
            </Box>

            {/* Virtualized Body */}
            {isFetching ? (
                <Box sx={{ p: 2 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', py: 1, gap: 2 }}>
                            <Skeleton variant="text" width="15%" />
                            <Skeleton variant="text" width="25%" />
                            {visibleFields.map(field => (
                                <Skeleton key={field.key} variant="text" width="15%" />
                            ))}
                            <Stack direction="row" gap={1}>
                                <Skeleton variant="circular" width={32} height={32} />
                                <Skeleton variant="circular" width={32} height={32} />
                            </Stack>
                        </Box>
                    ))}
                </Box>
            ) : spaces.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        {searchQuery
                            ? t('spaces.noSpacesMatching', { spaces: getLabel('plural').toLowerCase() }) + ` "${searchQuery}"`
                            : t('spaces.noSpacesYet', { spaces: getLabel('plural').toLowerCase(), button: `"${getLabel('add')}"` })}
                    </Typography>
                </Box>
            ) : (
                <TypedVirtualList
                    rowCount={spaces.length}
                    rowHeight={ROW_HEIGHT}
                    rowComponent={VirtualRow}
                    rowProps={{}}
                    style={{ height: listHeight, maxHeight: '65vh' }}
                />
            )}
        </Paper>
    );
}

/**
 * Spaces Management View - Extracted from SpacesPage
 * This component handles the original space management functionality
 */
export function SpacesManagementView() {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isAppReady = useAuthStore((state) => state.isAppReady);
    const activeStoreId = useAuthStore((state) => state.activeStoreId);
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
    const { push } = useBackendSyncContext();
    
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
    const { hasStoreRole } = useAuthContext();
    const canEdit = hasStoreRole('STORE_EMPLOYEE');

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const deferredSearchQuery = useDeferredValue(debouncedSearchQuery);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSpace, setEditingSpace] = useState<Space | undefined>(undefined);

    // Sort Config State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Lists Dialogs State
    const [listsManagerOpen, setListsManagerOpen] = useState(false);
    const [saveListOpen, setSaveListOpen] = useState(false);
    const [listsPanelExpanded, setListsPanelExpanded] = useState(!isMobile);
    const [searchOpen, setSearchOpen] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    // Fetch spaces from Server DB when app is ready or store changes
    useEffect(() => {
        if (isAppReady && activeStoreId) {
            logger.info('SpacesManagementView', 'App ready - fetching spaces from Server DB');
            spaceController.fetchSpaces?.().catch(err => {
                logger.error('SpacesManagementView', 'Failed to fetch spaces from server', { err });
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId]);

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
        const query = deferredSearchQuery.toLowerCase();
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
    }, [spaceController.spaces, deferredSearchQuery, sortConfig]);

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
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                gap={1}
                sx={{ mb: { xs: 2, sm: 3 } }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h4" sx={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: { xs: '1.25rem', sm: '2rem' }, mb: 0.5 }}>
                        {getLabel('plural')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('spaces.total')} {getLabel('plural')} - {spaceController.spaces.length}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAdd}
                    disabled={!canEdit}
                    size="small"
                    sx={{ flexShrink: 0, whiteSpace: 'nowrap', display: { xs: 'none', md: 'inline-flex' } }}
                >
                    {getLabel('add')}
                </Button>
            </Stack>
            {/* List Management Panel — beneath header */}
            <Paper sx={{ mb: 2, overflow: 'hidden' }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: 2, py: 1, bgcolor: 'action.hover', cursor: 'pointer' }}
                    onClick={() => setListsPanelExpanded(!listsPanelExpanded)}
                >
                    <Stack direction="row" alignItems="center" gap={1}>
                        <ListAltIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2">{t('lists.manage')}</Typography>
                    </Stack>
                    <IconButton size="small">
                        {listsPanelExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Stack>
                <Collapse in={listsPanelExpanded}>
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                    }}>
                        <Stack direction="row" gap={1} flexWrap="wrap">
                            <Button
                                variant="outlined"
                                startIcon={<FolderIcon />}
                                onClick={() => setListsManagerOpen(true)}
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
                        </Stack>

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
                </Collapse>
            </Paper>
            {/* Search — filter icon on mobile, inline on desktop */}
            {isMobile ? (
                <Box sx={{ mb: 2 }}>
                    <IconButton
                        onClick={() => setSearchOpen(!searchOpen)}
                        color={searchQuery ? 'primary' : 'default'}
                    >
                        <Badge badgeContent={searchQuery ? 1 : 0} color="primary">
                            <FilterListIcon />
                        </Badge>
                    </IconButton>
                    <Collapse in={searchOpen}>
                        <TextField
                            fullWidth
                            placeholder={t('spaces.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="small"
                            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                        />
                    </Collapse>
                </Box>
            ) : (
                <TextField
                    fullWidth
                    placeholder={t('spaces.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                        mb: 3,
                        maxWidth: 400,
                        '& .MuiOutlinedInput-root': { borderRadius: 4 }
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
            )}
            {/* Spaces Table / Mobile Card View */}
            {isMobile ? (
                /* Mobile Card View — tap to expand */
                (<Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                    {spaceController.isFetching ? (
                        <Stack gap={1}>
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Card key={`skeleton-${index}`} variant="outlined">
                                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                        <Skeleton variant="text" width="60%" height={20} />
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
                        <Stack gap={0.5}>
                            {filteredAndSortedSpaces.map((space, index) => {
                                const isExpanded = expandedCardId === space.id;
                                return (
                                    <Card
                                        key={`${space.id}-${index}`}
                                        variant="outlined"
                                        sx={{ transition: 'background-color 0.15s' }}
                                    >
                                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                            {/* Compact row — always visible */}
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                onClick={() => setExpandedCardId(prev => prev === space.id ? null : space.id)}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <Stack direction="row" alignItems="center" gap={1}>
                                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                                        {space.externalId || space.id}
                                                    </Typography>
                                                    {nameFieldKey && space.data[nameFieldKey] && (
                                                        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
                                                            {space.data[nameFieldKey]}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Stack>

                                            {/* Expanded details */}
                                            {isExpanded && (
                                                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1, fontSize: '0.8rem' }}>
                                                        {visibleFields.slice(0, 3).map((field, i) => (
                                                            <span key={field.key}>
                                                                {i > 0 && ' • '}
                                                                {space.data[field.key] || '-'}
                                                            </span>
                                                        ))}
                                                    </Typography>
                                                    <Stack direction="row" gap={1} justifyContent="flex-end">
                                                        <Tooltip title={t('common.edit')}>
                                                            <span>
                                                            <IconButton size="medium" color="primary" disabled={!canEdit} onClick={() => handleEdit(space)}>
                                                                <EditIcon />
                                                            </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title={t('common.delete')}>
                                                            <span>
                                                            <IconButton size="medium" color="error" disabled={!canEdit} onClick={() => handleDelete(space.id)}>
                                                                <DeleteIcon />
                                                            </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Stack>
                    )}
                </Box>)
            ) : (
                /* Desktop Virtualized Table */
                (<SpacesDesktopTable
                    spaces={filteredAndSortedSpaces}
                    isFetching={spaceController.isFetching}
                    visibleFields={visibleFields}
                    nameFieldKey={nameFieldKey}
                    sortConfig={sortConfig}
                    searchQuery={searchQuery}
                    canEdit={canEdit}
                    onSort={handleSort}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />)
            )}
            {/* Mobile FAB — Add Space */}
            {isMobile && (
                <Fab
                    color="primary"
                    variant="extended"
                    onClick={handleAdd}
                    disabled={!canEdit}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1050,
                        height: 64,
                        px: 3,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                    }}
                >
                    <AddIcon sx={{ mr: 1, fontSize: '1.5rem' }} />
                    {getLabel('add')}
                </Fab>
            )}
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
