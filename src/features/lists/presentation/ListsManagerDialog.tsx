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
    Chip
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

export function ListsManagerDialog({ open, onClose }: ListsManagerDialogProps) {
    const { t } = useTranslation();
    const { lists, loadList, deleteList } = useListsController();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    const handleLoad = async (id: string) => {
        try {
            await loadList(id);
            onClose();
        } catch (error) {
            console.error('Failed to load list', error);
            // Show error notification
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
            deleteList(id);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <UploadFileIcon />
                    {t('lists.manageLists')}
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {lists.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <Typography color="text.secondary">
                            {t('lists.noListsFound')}
                        </Typography>
                    </Box>
                ) : (
                    <List>
                        {lists.map((list) => (
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
                                    boxShadow: '0 0 3px 1px rgba(0, 0, 0, 0.16)',
                                    borderRadius: 1,
                                    mb: 0,
                                }}
                            >
                                <ListItemButton onClick={() => handleLoad(list.id)}>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" justifyContent="flex-start" gap={2}>
                                                <Typography variant="h5" component="span" fontWeight="medium">
                                                    {list.name}
                                                </Typography>
                                                <Chip
                                                    label={`${list.spaces.length} ${t('lists.spacesCount')}`}
                                                    size="medium"
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        bgcolor: 'primary.light',
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
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.close')}</Button>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    );
}
