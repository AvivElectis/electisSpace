/**
 * Floating notification for pending (non-dismissed) wizard drafts.
 * Shows a Snackbar at bottom-right with Continue/Dismiss actions.
 */
import { Snackbar, Button, Paper, Stack, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { useTranslation } from 'react-i18next';
import { useWizardDraftStore } from '../application/useWizardDraftStore';

interface Props {
    onContinue: (draftId: string) => void;
}

export function WizardPendingNotification({ onContinue }: Props) {
    const { t } = useTranslation();
    const drafts = useWizardDraftStore(s => s.drafts);
    const dismissedIds = useWizardDraftStore(s => s.dismissedIds);
    const dismissDraft = useWizardDraftStore(s => s.dismissDraft);

    // Find first non-dismissed pending draft
    const pendingDraft = Object.values(drafts).find(d => !dismissedIds.includes(d.id));

    if (!pendingDraft) return null;

    return (
        <Snackbar
            open
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            sx={{ mb: 3, mr: 3 }}
        >
            <Paper
                elevation={8}
                sx={{
                    p: 2.5,
                    minWidth: 360,
                    maxWidth: 420,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'primary.light',
                    borderLeft: '4px solid',
                    borderLeftColor: 'primary.main',
                }}
            >
                <Stack spacing={2}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <AutorenewIcon color="primary" />
                            <Typography variant="subtitle2" fontWeight={600}>
                                {t('settings.companies.wizardDraftPending')}
                            </Typography>
                        </Stack>
                        <IconButton
                            size="small"
                            onClick={() => dismissDraft(pendingDraft.id)}
                            sx={{ mt: -0.5, mr: -0.5 }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                        {t('settings.companies.wizardDraftFound')}
                    </Typography>

                    <Stack direction="row" gap={2} justifyContent="flex-end">
                        <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            onClick={() => dismissDraft(pendingDraft.id)}
                        >
                            {t('settings.companies.wizardDraftDiscard')}
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={() => onContinue(pendingDraft.id)}
                        >
                            {t('settings.companies.wizardDraftContinue')}
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </Snackbar>
    );
}
