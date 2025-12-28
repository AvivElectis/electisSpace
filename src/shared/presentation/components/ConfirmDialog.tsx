import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

export interface ConfirmDialogOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    severity?: 'default' | 'error' | 'warning' | 'info' | 'success';
    showCancel?: boolean;
}

interface ConfirmDialogProps {
    open: boolean;
    options: ConfirmDialogOptions;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({ open, options, onConfirm, onCancel }: ConfirmDialogProps) {
    const { t } = useTranslation();

    const {
        title = t('common.dialog.confirm'),
        message,
        confirmLabel = t('common.dialog.confirm'),
        cancelLabel = t('common.dialog.cancel'),
        severity = 'default',
        showCancel = true
    } = options;

    const getConfirmColor = () => {
        switch (severity) {
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            case 'success': return 'success';
            default: return 'primary';
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                elevation: 2,
                sx: { borderRadius: 2 }
            }}
        >
            <DialogTitle sx={{ pb: 1, pr: 6 }}>
                {title}
                <IconButton
                    aria-label="close"
                    onClick={onCancel}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <DialogContentText>{message}</DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 0, mb: 2 }}>
                {showCancel && (
                    <Button onClick={onCancel} color="inherit" variant="text">
                        {cancelLabel}
                    </Button>
                )}
                <Button
                    onClick={onConfirm}
                    variant="outlined"
                    color={getConfirmColor()}
                    autoFocus
                >
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
