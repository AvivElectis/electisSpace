import { useState, useEffect } from 'react';
import { logger } from '@shared/infrastructure/services/logger';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    IconButton,
    Typography,
    Box,
    Chip,
    CircularProgress,
    Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useTranslation } from 'react-i18next';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { peopleApi, type PeopleListItem } from '@shared/infrastructure/services/peopleApi';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

interface PeopleListsManagerDialogProps {
    open: boolean;
    onClose: () => void;
}

/**
 * People Lists Manager Dialog
 * Lists are loaded from DB (shared between all users in the store).
 * Loading a list OVERWRITES the current table with the list's snapshot data.
 * NO direct AIMS sync - server sync intervals handle that.
 */
export function PeopleListsManagerDialog({ open, onClose }: PeopleListsManagerDialogProps) {
    const { t } = useTranslation();
    const peopleStore = usePeopleStore();
    const activeStoreId = useAuthStore(state => state.activeStoreId);
    const activeListId = usePeopleStore((state) => state.activeListId);
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [isLoading, setIsLoading] = useState(false);
    const [lists, setLists] = useState<PeopleListItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Fetch lists from DB when dialog opens
    useEffect(() => {
        if (open && activeStoreId) {
            setIsLoading(true);
            setError(null);
            peopleApi.lists.list(activeStoreId)
                .then((result) => {
                    setLists(result.data);
                })
                .catch((err) => {
                    logger.error('PeopleListsManagerDialog', 'Failed to fetch lists', { error: err.message });
                    setError(t('lists.fetchFailed') || 'Failed to fetch lists');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [open, activeStoreId, t]);

    const handleLoad = async (id: string) => {
        if (id === activeListId) {
            onClose();
            return;
        }

        // Prompt user that loading will overwrite the table
        const isConfirmed = await confirm({
            title: t('lists.loadList'),
            message: t('lists.loadListOverwriteWarning') || 'Loading this list will overwrite the current table with the list data. All current unsaved changes will be lost. Continue?',
            confirmLabel: t('common.confirm'),
            cancelLabel: t('common.cancel'),
            severity: 'warning',
        });

        if (!isConfirmed) return;

        try {
            setIsLoading(true);
            setError(null);

            // Use server-side load: atomically replaces all people in the store
            // with the list's snapshot and queues AIMS sync
            const result = await peopleApi.lists.load(id);
            const { list } = result.data;

            // Refetch fresh people from server (they were just replaced)
            await peopleStore.fetchPeople();

            // Update list tracking
            peopleStore.setActiveListId(id);
            peopleStore.setActiveListName(list.name);
            peopleStore.clearPendingChanges();
            peopleStore.updateSpaceAllocation();

            logger.info('PeopleListsManagerDialog', 'List loaded via server', {
                listId: id,
                name: list.name,
                peopleCount: peopleStore.people.length,
            });

            onClose();
        } catch (err: any) {
            logger.error('PeopleListsManagerDialog', 'Failed to load list', { error: err?.message || err });
            setError(err?.message || t('common.unknownError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const isConfirmed = await confirm({
            title: t('common.dialog.delete'),
            message: t('lists.confirmDelete'),
            confirmLabel: t('common.delete'),
            cancelLabel: t('common.cancel'),
            severity: 'error'
        });

        if (isConfirmed) {
            try {
                setIsLoading(true);
                await peopleApi.lists.delete(id);
                setLists(prev => prev.filter(l => l.id !== id));

                // Clear active list if it was the deleted one
                if (activeListId === id) {
                    peopleStore.setActiveListId(undefined);
                    peopleStore.setActiveListName(undefined);
                    peopleStore.clearPendingChanges();
                }

                logger.info('PeopleListsManagerDialog', 'List deleted', { listId: id });
            } catch (err: any) {
                logger.error('PeopleListsManagerDialog', 'Failed to delete list', { error: err?.message || err });
                setError(err?.message || 'Failed to delete list');
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <ListAltIcon />
                    {t('lists.manageLists')}
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {isLoading && lists.length === 0 ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : lists.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <Typography color="text.secondary">
                            {t('lists.noListsFound')}
                        </Typography>
                    </Box>
                ) : (
                    <List>
                        {lists.map((list) => {
                            const isActive = list.id === activeListId;
                            return (
                                <ListItem
                                    key={list.id}
                                    component="div"
                                    disablePadding
                                    secondaryAction={
                                        <IconButton
                                            edge="end"
                                            aria-label="delete"
                                            onClick={(e) => handleDelete(list.id, e)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    }
                                    sx={{
                                        boxShadow: isActive ? '0 0 5px 2px rgba(25, 118, 210, 0.3)' : '0 0 3px 1px rgba(0, 0, 0, 0.16)',
                                        borderRadius: 1,
                                        mb: 1,
                                        bgcolor: isActive ? 'action.hover' : 'inherit',
                                        border: isActive ? '1px solid' : '1px solid transparent',
                                        borderColor: isActive ? 'primary.main' : 'transparent',
                                    }}
                                >
                                    <ListItemButton
                                        onClick={() => handleLoad(list.id)}
                                        disabled={isLoading}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center" justifyContent="flex-start" gap={2}>
                                                    <Typography variant="h5" component="span" fontWeight={isActive ? "bold" : "medium"} color={isActive ? "primary.main" : "text.primary"}>
                                                        {list.name}
                                                    </Typography>
                                                    {isActive && (
                                                        <Chip
                                                            label={t('lists.loaded')}
                                                            size="small"
                                                            color="success"
                                                            variant="filled"
                                                            sx={{ borderRadius: 1, fontWeight: 'bold' }}
                                                        />
                                                    )}
                                                    <Chip
                                                        label={`${list.itemCount ?? 0} ${t('people.peopleCount')}`}
                                                        size="medium"
                                                        color={isActive ? "primary" : "default"}
                                                        variant="outlined"
                                                        sx={{
                                                            borderRadius: 1,
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            bgcolor: isActive ? 'primary.light' : 'transparent',
                                                        }}
                                                    />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(list.updatedAt || list.createdAt).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                )}
                {isLoading && lists.length > 0 && (
                    <Box display="flex" justifyContent="center" alignItems="center" py={2}>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        <Typography color="text.secondary">{t('common.loading')}</Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.close')}</Button>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    );
}
