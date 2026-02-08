/**
 * useUnsavedListGuard
 *
 * Guards against losing unsaved list changes when:
 *   1. The user navigates via tabs / sidebar (global navigation guard checked by MainLayout)
 *   2. The user closes/refreshes the browser tab (beforeunload)
 *
 * Renders a save/discard/cancel dialog for in-app navigation.
 * For browser close/refresh, the native browser prompt is shown.
 *
 * NOTE: Does NOT use react-router useBlocker (requires data router).
 * Instead uses a global guard callback that MainLayout checks before navigate().
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { registerNavigationGuard, unregisterNavigationGuard } from '../navigationGuard';

interface UnsavedListGuardOptions {
    /** Whether a list is currently active */
    hasActiveList: boolean;
    /** Whether there are unsaved changes */
    hasPendingChanges: boolean;
    /** Called when the user chooses to save */
    onSave: () => Promise<void>;
    /** Called when the user chooses to discard — should clear pending flag */
    onDiscard: () => void;
}

export function useUnsavedListGuard({
    hasActiveList,
    hasPendingChanges,
    onSave,
    onDiscard,
}: UnsavedListGuardOptions) {
    const { t } = useTranslation();
    const shouldBlock = hasActiveList && hasPendingChanges;

    const [dialogOpen, setDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const resolverRef = useRef<((proceed: boolean) => void) | null>(null);

    // Keep callbacks in refs so the guard closure always sees latest values
    const onSaveRef = useRef(onSave);
    const onDiscardRef = useRef(onDiscard);
    useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
    useEffect(() => { onDiscardRef.current = onDiscard; }, [onDiscard]);

    // ── 1. Browser close / refresh ─────────────────────────────────
    useEffect(() => {
        if (!shouldBlock) return;

        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [shouldBlock]);

    // ── 2. Global navigation guard (checked by MainLayout) ─────────
    useEffect(() => {
        if (!shouldBlock) {
            unregisterNavigationGuard();
            return;
        }

        const unregister = registerNavigationGuard(async () => {
            setDialogOpen(true);
            return new Promise<boolean>((resolve) => {
                resolverRef.current = resolve;
            });
        });

        return unregister;
    }, [shouldBlock]);

    // ── Dialog handlers ────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            await onSaveRef.current();
            setDialogOpen(false);
            setIsSaving(false);
            resolverRef.current?.(true);
            resolverRef.current = null;
        } catch {
            // Save failed — keep dialog open, stay on page
            setIsSaving(false);
        }
    }, []);

    const handleDiscard = useCallback(() => {
        onDiscardRef.current();
        setDialogOpen(false);
        resolverRef.current?.(true);
        resolverRef.current = null;
    }, []);

    const handleCancel = useCallback(() => {
        setDialogOpen(false);
        resolverRef.current?.(false);
        resolverRef.current = null;
    }, []);

    // ── 3. Dialog component ────────────────────────────────────────
    const UnsavedChangesDialog = useCallback(() => (
        <Dialog
            open={dialogOpen}
            onClose={handleCancel}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <WarningAmberIcon color="warning" />
                    {t('lists.unsavedChangesTitle')}
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography>
                    {t('lists.unsavedChangesMessage')}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={handleCancel} color="inherit">
                    {t('common.cancel')}
                </Button>
                <Button
                    onClick={handleDiscard}
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                >
                    {t('lists.discardChanges')}
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    disabled={isSaving}
                >
                    {isSaving ? t('common.saving') : t('lists.saveChanges')}
                </Button>
            </DialogActions>
        </Dialog>
    ), [dialogOpen, handleCancel, handleDiscard, handleSave, isSaving, t]);

    return { UnsavedChangesDialog };
}
