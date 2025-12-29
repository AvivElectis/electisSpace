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
import FolderIcon from '@mui/icons-material/Folder';
import { useTranslation } from 'react-i18next';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { usePeopleController } from '../application/usePeopleController';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

interface PeopleListsManagerDialogProps {
    open: boolean;
    onClose: () => void;
}

/**
 * People Lists Manager Dialog
 * Displays saved people lists and allows loading/deleting them
 */
export function PeopleListsManagerDialog({ open, onClose }: PeopleListsManagerDialogProps) {
    const { t } = useTranslation();
    const peopleLists = usePeopleStore((state) => state.peopleLists);
    const activeListId = usePeopleStore((state) => state.activeListId);
    const peopleController = usePeopleController();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    const handleLoad = async (id: string) => {
        if (id === activeListId) {
            onClose();
            return;
        }
        try {
            peopleController.loadList(id);
            onClose();
        } catch (error) {
            // Error handling
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
            peopleController.deleteList(id);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <FolderIcon />
                    {t('lists.manageLists')}
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {peopleLists.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <Typography color="text.secondary">
                            {t('lists.noListsFound')}
                        </Typography>
                    </Box>
                ) : (
                    <List>
                        {peopleLists.map((list) => {
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
                                    <ListItemButton onClick={() => handleLoad(list.id)}>
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
                                                        label={`${list.people.length} ${t('people.peopleCount')}`}
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
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.close')}</Button>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    );
}
