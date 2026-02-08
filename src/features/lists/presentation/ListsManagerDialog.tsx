import { useEffect, useState } from 'react';
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
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';
import { useListsController } from '../application/useListsController';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

interface ListsManagerDialogProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Spaces Lists Manager Dialog
 * Lists are loaded from DB (shared between all users in the store).
 * Loading a list OVERWRITES the current spaces table.
 * NO AIMS sync - server sync intervals handle that.
 */
export function ListsManagerDialog({ open, onClose }: ListsManagerDialogProps) {
    const { t } = useTranslation();
    const { lists, activeListId, isLoading: controllerLoading, fetchLists, loadList, deleteList } = useListsController();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [isOperationLoading, setIsOperationLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch lists from DB when dialog opens
    useEffect(() => {
        if (open) {
            fetchLists();
        }
    }, [open, fetchLists]);

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
            setIsOperationLoading(true);
            setError(null);
            await loadList(id);
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.error?.message || err?.message || 'Failed to load list');
        } finally {
            setIsOperationLoading(false);
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
                setIsOperationLoading(true);
                setError(null);
                await deleteList(id);
            } catch (err: any) {
                setError(err?.response?.data?.error?.message || err?.message || 'Failed to delete list');
            } finally {
                setIsOperationLoading(false);
            }
        }
    };

    const isLoading = controllerLoading || isOperationLoading;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <UploadFileIcon />
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
                                    <ListItemButton onClick={() => handleLoad(list.id)} disabled={isLoading}>
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
                                                        label={`${list.itemCount ?? 0} ${t('lists.spacesCount')}`}
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
                                                        {new Date(list.updatedAt).toLocaleString()}
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
