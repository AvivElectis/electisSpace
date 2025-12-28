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
import { useListsController } from '../application/useListsController';

interface SaveListDialogProps {
    open: boolean;
    onClose: () => void;
}

export function SaveListDialog({ open, onClose }: SaveListDialogProps) {
    const { t } = useTranslation();
    const { saveCurrentSpacesAsList } = useListsController();
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        if (!name.trim()) {
            setError(t('validation.required'));
            return;
        }

        try {
            saveCurrentSpacesAsList(name);
            setName('');
            setError(null);
            onClose();
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message); // Should map to translated strings in real app
            } else {
                setError(t('common.unknownError'));
            }
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
                        {t('lists.saveListDescription')}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.cancel')}</Button>
                <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
                    {t('common.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
