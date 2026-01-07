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
import { usePeopleLists } from '../application/hooks/usePeopleLists';
import { LIST_NAME_MAX_LENGTH } from '../domain/types';

interface PeopleSaveListDialogProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Save People List Dialog
 * Allows saving current people as a named list
 * Validates: max 20 chars, letters/numbers/spaces only
 * Auto-syncs to AIMS after saving for cross-device persistence
 */
export function PeopleSaveListDialog({ open, onClose }: PeopleSaveListDialogProps) {
    const { t } = useTranslation();
    const { savePeopleList, validateListName, saveListToAims } = usePeopleLists();
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        // Validate the name
        const validation = validateListName(name);
        if (!validation.valid) {
            setError(validation.error || t('validation.invalidInput'));
            return;
        }

        setIsSaving(true);
        try {
            // Step 1: Save list locally (updates _LIST_MEMBERSHIPS_ on all people)
            const result = savePeopleList(name.trim());
            if (!result.success) {
                setError(result.error || t('common.unknownError'));
                setIsSaving(false);
                return;
            }

            // Step 2: Sync to AIMS for cross-device persistence
            // Pass the updated people directly to avoid stale closure issue
            const aimsResult = await saveListToAims(result.updatedPeople);
            if (!aimsResult.success) {
                // List saved locally but AIMS sync failed - show warning
                setError(t('lists.savedLocallyAimsFailed', { error: aimsResult.error }) || 
                    `List saved locally but AIMS sync failed: ${aimsResult.error}`);
                setIsSaving(false);
                return;
            }

            setName('');
            setError(null);
            setIsSaving(false);
            onClose();
        } catch (err) {
            console.error('[SaveListDialog] Error:', err);
            setIsSaving(false);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(t('common.unknownError'));
            }
        }
    };

    const handleNameChange = (value: string) => {
        setName(value);
        // Clear error when user types
        if (error) {
            setError(null);
        }
    };

    const handleClose = () => {
        if (isSaving) return; // Prevent closing while saving
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
