import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Alert,
    CircularProgress
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import { LIST_NAME_MAX_LENGTH } from '../domain/types';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { peopleApi } from '@shared/infrastructure/services/peopleApi';
import { logger } from '@shared/infrastructure/services/logger';

interface PeopleSaveListDialogProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Save People List Dialog
 * Saves current people + assignments to DB for all users in the store.
 * NO direct AIMS sync - server sync intervals will handle that.
 */
export function PeopleSaveListDialog({ open, onClose }: PeopleSaveListDialogProps) {
    const { t } = useTranslation();
    const peopleStore = usePeopleStore();
    const activeStoreId = useAuthStore(state => state.activeStoreId);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError(t('validation.required'));
            return;
        }

        if (trimmedName.length > LIST_NAME_MAX_LENGTH) {
            setError(t('lists.nameTooLong', { max: LIST_NAME_MAX_LENGTH }));
            return;
        }

        if (!activeStoreId) {
            setError(t('common.noStoreSelected') || 'No store selected');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Build the content snapshot from current people
            const content = peopleStore.people.map(p => ({
                id: p.id,
                virtualSpaceId: p.virtualSpaceId,
                data: p.data,
                assignedSpaceId: p.assignedSpaceId,
                listMemberships: p.listMemberships,
            }));

            // Save to DB via API (shared between all users in the store)
            const result = await peopleApi.lists.create({
                storeId: activeStoreId,
                name: trimmedName,
                content,
            });

            // Set active list in local store
            const savedList = result.data;
            peopleStore.setActiveListId(savedList.id);
            peopleStore.setActiveListName(savedList.name);
            peopleStore.clearPendingChanges();

            logger.info('PeopleSaveListDialog', 'List saved to DB', {
                listId: savedList.id,
                name: savedList.name,
                peopleCount: content.length,
            });

            setName('');
            setError(null);
            onClose();
        } catch (err: any) {
            console.error('[PeopleSaveListDialog] Error:', err);
            if (err?.response?.status === 409) {
                setError(t('lists.nameExists') || 'A list with this name already exists');
            } else if (err?.response?.data?.error?.message) {
                setError(err.response.data.error.message);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(t('common.unknownError'));
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleNameChange = (value: string) => {
        setName(value);
        if (error) setError(null);
    };

    const handleClose = () => {
        if (isSaving) return;
        setName('');
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <SaveIcon />
                    {t('lists.saveList')}
                </Box>
            </DialogTitle>
            <DialogContent>
                <Box pt={1}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        autoFocus
                        margin="dense"
                        label={t('lists.listName')}
                        fullWidth
                        variant="outlined"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        error={!!error}
                        disabled={isSaving}
                        helperText={t('lists.nameRules', { max: LIST_NAME_MAX_LENGTH })}
                        slotProps={{
                            htmlInput: { maxLength: LIST_NAME_MAX_LENGTH }
                        }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={isSaving}>{t('common.cancel')}</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    disabled={isSaving || !name.trim()}
                    startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                >
                    {isSaving ? t('common.saving') : t('common.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
