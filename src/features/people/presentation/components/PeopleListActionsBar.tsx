import { Paper, Stack, Button } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';

interface PeopleListActionsBarProps {
    activeListId: string | null;
    onManageLists: () => void;
    onSaveAsNew: () => void;
    onSaveChanges: () => void;
}

/**
 * PeopleListActionsBar - Bottom actions bar for list management
 */
export function PeopleListActionsBar({
    activeListId,
    onManageLists,
    onSaveAsNew,
    onSaveChanges,
}: PeopleListActionsBarProps) {
    const { t } = useTranslation();

    return (
        <Paper sx={{ mt: 2, p: 2 }}>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                gap={2}
            >
                {/* List Management */}
                <Stack direction="row" gap={1}>
                    <Button variant="outlined" startIcon={<FolderIcon />} onClick={onManageLists}>
                        {t('lists.manage')}
                    </Button>
                    <Button variant="outlined" startIcon={<SaveIcon />} onClick={onSaveAsNew}>
                        {t('lists.saveAsNew')}
                    </Button>
                    {activeListId && (
                        <Button
                            variant="outlined"
                            color="success"
                            startIcon={<SaveIcon />}
                            onClick={onSaveChanges}
                        >
                            {t('lists.saveChanges')}
                        </Button>
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
}
