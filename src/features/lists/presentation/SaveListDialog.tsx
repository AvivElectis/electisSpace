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
    Typography,
    CircularProgress,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import { useListsController } from '../application/useListsController';

interface SaveListDialogProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Save Spaces List Dialog
 * Saves current spaces to DB (shared between all users in the store).
 * Unique name per store enforced by server.
 * NO AIMS sync - server sync intervals handle that.
 */
export function SaveListDialog({ open, onClose }: SaveListDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { saveCurrentSpacesAsList } = useListsController();
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            setError(t('validation.required'));
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await saveCurrentSpacesAsList(name.trim());
            setName('');
            setError(null);
            onClose();
        } catch (err: any) {
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

    const handleClose = () => {
        if (isSaving) return;
        setName('');
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
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
                        onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
                        error={!!error}
                        disabled={isSaving}
                        slotProps={{
                            htmlInput: { maxLength: 100 }
                        }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t('lists.saveListDescription') || 'Lists are shared between all users in this store.'}
                    </Typography>
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
