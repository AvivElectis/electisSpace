import { Stack, Button } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslation } from 'react-i18next';

interface PeopleAimsActionsBarProps {
    isSyncing: boolean;
    assignedCount: number;
    isConnected: boolean;
    onSyncFromAims: () => void;
    onCancelAllAssignments: () => void;
}

/**
 * PeopleAimsActionsBar - AIMS sync and action buttons
 */
export function PeopleAimsActionsBar({
    isSyncing,
    assignedCount,
    isConnected,
    onSyncFromAims,
    onCancelAllAssignments,
}: PeopleAimsActionsBarProps) {
    const { t } = useTranslation();

    return (
        <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
            <Button
                variant="text"
                color="primary"
                startIcon={
                    isSyncing ? (
                        <SyncIcon
                            sx={{
                                animation: 'spin 1s linear infinite',
                                '@keyframes spin': {
                                    from: { transform: 'rotate(0deg)' },
                                    to: { transform: 'rotate(360deg)' },
                                },
                            }}
                        />
                    ) : (
                        <SyncIcon />
                    )
                }
                onClick={onSyncFromAims}
                disabled={isSyncing || !isConnected}
            >
                {isSyncing ? t('common.syncing') : t('people.syncFromAims')}
            </Button>
            <Button
                variant="text"
                color="error"
                startIcon={<CancelIcon />}
                onClick={onCancelAllAssignments}
                disabled={assignedCount === 0}
            >
                {t('people.cancelAllAssignments')}
            </Button>
        </Stack>
    );
}
