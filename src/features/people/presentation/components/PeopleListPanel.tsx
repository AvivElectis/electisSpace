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
import { usePeopleLists } from '../../application/hooks/usePeopleLists';

interface PeopleListPanelProps {
    onManageLists: () => void;
    onSaveAsNew: () => void;
}

/**
 * PeopleListPanel - List management panel for saving/loading people lists
 * Lists are derived from AIMS data (_LIST_NAME_ field on synced people).
 * Save as New creates a list by setting listName on all people (sync to AIMS to persist).
 */
export function PeopleListPanel({
    onManageLists,
    onSaveAsNew,
}: PeopleListPanelProps) {
    const { t } = useTranslation();
    const {
        activeListId,
        loadedListMetadata,
        pendingChanges,
        updateCurrentList,
    } = usePeopleLists();

    const [expanded, setExpanded] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    /**
     * Handle saving changes to current list
     */
    const handleSaveChanges = useCallback(async () => {
        setIsSaving(true);
        setError(null);

        try {
            const result = updateCurrentList();
            if (result.success) {
                setSuccessMessage(t('people.listSaved'));
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(result.error || t('people.saveListFailed'));
            }
        } catch (err: any) {
            setError(err.message || t('people.saveListFailed'));
        } finally {
            setIsSaving(false);
        }
    }, [updateCurrentList, t]);

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
                        direction={{ xs: 'column', sm: 'row' }}
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
                        {t('people.listsFromAims')}
                    </Typography>
                </Box>
            </Collapse>
        </Paper>
    );
}
