import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string | ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'primary' | 'secondary' | 'error' | 'warning';
}

/**
 * Confirm Dialog Component
 * Reusable confirmation dialog for destructive or important actions
 */
export function ConfirmDialog({
    open,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'primary',
}: ConfirmDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                {title}
                <IconButton
                    aria-label="close"
                    onClick={onCancel}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {typeof message === 'string' ? <p>{message}</p> : message}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onCancel} variant="outlined">
                    {cancelText}
                </Button>
                <Button onClick={onConfirm} variant="contained" color={confirmColor}>
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
