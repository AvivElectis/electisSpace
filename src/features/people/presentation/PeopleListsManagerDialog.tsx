import { useState } from 'react';
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
    FormControlLabel,
    Checkbox,
    Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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
 * Enhanced with option to load without auto-applying assignments
 */
export function PeopleListsManagerDialog({ open, onClose }: PeopleListsManagerDialogProps) {
    const { t } = useTranslation();
    const peopleLists = usePeopleStore((state) => state.peopleLists);
    const activeListId = usePeopleStore((state) => state.activeListId);
    const peopleController = usePeopleController();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [isLoading, setIsLoading] = useState(false);
    const [autoApply, setAutoApply] = useState(false);

    const handleLoad = async (id: string) => {
        if (id === activeListId) {
            onClose();
            return;
        }
        
        // Show different confirmation based on autoApply setting
        const confirmMessage = autoApply 
            ? t('lists.loadListConfirmAutoApply')
            : t('lists.loadListConfirmNoApply');
        
        const isConfirmed = await confirm({
            title: t('lists.loadList'),
            message: confirmMessage,
            confirmLabel: t('common.confirm'),
            cancelLabel: t('common.cancel'),
        });

        if (!isConfirmed) {
            return;
        }

        try {
            setIsLoading(true);
            await peopleController.loadList(id, autoApply);
            onClose();
        } catch (error: any) {
            logger.error('PeopleListsManagerDialog', 'Failed to load list', { error: error?.message || error });
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
                {isLoading && (
                    <Box display="flex" justifyContent="center" alignItems="center" py={2}>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        <Typography color="text.secondary">{t('common.syncing')}</Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, pl: 1 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={autoApply}
                                onChange={(e) => setAutoApply(e.target.checked)}
                                size="small"
                            />
                        }
                        label={
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <Typography variant="body2">
                                    {t('lists.autoApplyAssignments')}
                                </Typography>
                                <Tooltip title={t('lists.autoApplyTooltip')}>
                                    <InfoOutlinedIcon fontSize="small" color="action" />
                                </Tooltip>
                            </Box>
                        }
                    />
                </Box>
                <Button onClick={onClose}>{t('common.close')}</Button>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    );
}
