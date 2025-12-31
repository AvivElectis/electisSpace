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
    Typography
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
 */
export function PeopleSaveListDialog({ open, onClose }: PeopleSaveListDialogProps) {
    const { t } = useTranslation();
    const { savePeopleList, validateListName } = usePeopleLists();
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        // Validate the name
        const validation = validateListName(name);
        if (!validation.valid) {
            setError(validation.error || t('validation.invalidInput'));
            return;
        }

        try {
            const result = savePeopleList(name.trim());
            if (!result.success) {
                setError(result.error || t('common.unknownError'));
                return;
            }
            setName('');
            setError(null);
            onClose();
        } catch (err) {
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
                        inputProps={{ maxLength: LIST_NAME_MAX_LENGTH }}
                        helperText={t('lists.nameRules', { max: LIST_NAME_MAX_LENGTH })}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{t('common.cancel')}</Button>
                <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
                    {t('common.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
