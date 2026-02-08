import { useState, useCallback } from 'react';
import {
    Paper,
    Stack,
    Typography,
    Button,
    Alert,
    Chip,
    Box,
    Collapse,
    IconButton,
    CircularProgress,
} from '@mui/material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SaveIcon from '@mui/icons-material/Save';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningIcon from '@mui/icons-material/Warning';
import { useTranslation } from 'react-i18next';
import { usePeopleStore } from '../../infrastructure/peopleStore';
import { peopleApi } from '@shared/infrastructure/services/peopleApi';
import { logger } from '@shared/infrastructure/services/logger';

interface PeopleListPanelProps {
    onManageLists: () => void;
    onSaveAsNew: () => void;
}

/**
 * PeopleListPanel - List management panel for saving/loading people lists.
 * Lists are saved to DB (shared between all users in the store).
 * Save Changes updates the DB with current table state.
 */
export function PeopleListPanel({
    onManageLists,
    onSaveAsNew,
}: PeopleListPanelProps) {
    const { t } = useTranslation();
    const activeListId = usePeopleStore(state => state.activeListId);
    const activeListName = usePeopleStore(state => state.activeListName);
    const pendingChanges = usePeopleStore(state => state.pendingChanges);
    const people = usePeopleStore(state => state.people);
    const clearPendingChanges = usePeopleStore(state => state.clearPendingChanges);

    const [expanded, setExpanded] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loadedListMetadata = activeListId && activeListName ? {
        name: activeListName,
    } : undefined;

    /**
     * Handle saving changes to current list - updates DB with current people state
     */
    const handleSaveChanges = useCallback(async () => {
        if (!activeListId) return;

        setIsSaving(true);
        setError(null);

        try {
            // Build updated content snapshot
            const content = people.map(p => ({
                id: p.id,
                virtualSpaceId: p.virtualSpaceId,
                data: p.data,
                assignedSpaceId: p.assignedSpaceId,
                listMemberships: p.listMemberships,
            }));

            // Update list in DB
            await peopleApi.lists.update(activeListId, { content });
            clearPendingChanges();

            setSuccessMessage(t('people.listSaved'));
            setTimeout(() => setSuccessMessage(null), 3000);

            logger.info('PeopleListPanel', 'List changes saved to DB', {
                listId: activeListId,
                peopleCount: content.length,
            });
        } catch (err: any) {
            logger.error('PeopleListPanel', 'Failed to save list changes', { error: err?.message || err });
            setError(err?.response?.data?.error?.message || err?.message || t('people.saveListFailed'));
        } finally {
            setIsSaving(false);
        }
    }, [activeListId, people, clearPendingChanges, t]);

    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            {/* Header with toggle */}
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 2, py: 1, bgcolor: 'action.hover', cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}
            >
                <Stack direction="row" alignItems="center" gap={1}>
                    <ListAltIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">
                        {t('people.listManagement')}
                    </Typography>
                    {loadedListMetadata && (
                        <Chip
                            label={loadedListMetadata.name}
                            size="small"
                            color="info"
                            variant="filled"
                            sx={{ p: 1 }}
                        />
                    )}
                    {pendingChanges && (
                        <Chip
                            icon={<WarningIcon fontSize="small" />}
                            label={t('people.unsavedChanges')}
                            size="small"
                            color="warning"
                            sx={{ p: 1, paddingInlineStart: 1}}
                        />
                    )}
                </Stack>
                <IconButton size="small">
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Stack>

            <Collapse in={expanded}>
                <Box sx={{ p: 2 }}>
                    {/* Error/Success Messages */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}
                    {successMessage && (
                        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
                            {successMessage}
                        </Alert>
                    )}

                    {/* Current List Info */}
                    {loadedListMetadata && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                                {t('people.loadedList', { name: loadedListMetadata.name })}
                            </Typography>
                        </Alert>
                    )}

                    {/* Actions */}
                    <Stack
                        direction={{ xs: 'row', sm: 'row' }}
                        gap={1}
                        flexWrap="wrap"
                    >
                        {/* Manage Lists */}
                        <Button
                            variant="outlined"
                            startIcon={<ListAltIcon />}
                            onClick={onManageLists}
                        >
                            {t('lists.manage')}
                        </Button>

                        {/* Save as New */}
                        <Button
                            variant="text"
                            startIcon={<SaveIcon />}
                            onClick={onSaveAsNew}
                        >
                            {t('lists.saveAsNew')}
                        </Button>

                        {/* Save Changes (only when list is loaded and has pending changes) */}
                        {activeListId && (
                            <Button
                                variant="text"
                                color="success"
                                startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                                onClick={handleSaveChanges}
                                disabled={!pendingChanges || isSaving}
                            >
                                {t('lists.saveChanges')}
                            </Button>
                        )}
                    </Stack>

                    {/* Note about lists */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t('people.listsSharedInStore') || 'Lists are shared between all users in this store.'}
                    </Typography>
                </Box>
            </Collapse>
        </Paper>
    );
}
