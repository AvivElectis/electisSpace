import { useState } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useTranslation } from 'react-i18next';

interface NativeDeleteButtonProps {
    onDelete: () => void | Promise<void>;
    isDeleting?: boolean;
    itemName?: string;
    label?: string;
}

export function NativeDeleteButton({
    onDelete,
    isDeleting = false,
    itemName,
    label,
}: NativeDeleteButtonProps) {
    const { t } = useTranslation();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleOpen = () => setConfirmOpen(true);
    const handleClose = () => setConfirmOpen(false);

    const handleConfirm = async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch {
            // Haptics not available on web — ignore
        }
        setConfirmOpen(false);
        await onDelete();
    };

    return (
        <>
            <Button
                variant="outlined"
                color="error"
                fullWidth
                disabled={isDeleting}
                onClick={handleOpen}
                sx={{ mt: 3 }}
                startIcon={
                    isDeleting ? (
                        <CircularProgress size={18} color="error" />
                    ) : undefined
                }
            >
                {label ?? t('common.delete')}
            </Button>

            <Dialog open={confirmOpen} onClose={handleClose}>
                <DialogTitle>{t('common.dialog.areYouSure')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {itemName
                            ? t('native.deleteConfirm', { name: itemName })
                            : t('native.deleteConfirmGeneric')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="inherit">
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleConfirm} color="error" variant="contained" autoFocus>
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
