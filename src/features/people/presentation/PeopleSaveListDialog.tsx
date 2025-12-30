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
import { usePeopleController } from '../application/usePeopleController';

interface PeopleSaveListDialogProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Save People List Dialog
 * Allows saving current people as a named list
 */
export function PeopleSaveListDialog({ open, onClose }: PeopleSaveListDialogProps) {
    const { t } = useTranslation();
    const peopleController = usePeopleController();
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        if (!name.trim()) {
            setError(t('validation.required'));
            return;
        }

        try {
            peopleController.savePeopleList(name.trim());
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
                        onChange={(e) => setName(e.target.value)}
                        error={!!error}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t('people.saveListDescription')}
                    </Typography>
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
