import { Box, Typography, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';
import { glassToolbarSx } from '@shared/presentation/styles/glassToolbar';

interface PeopleToolbarProps {
    totalPeople: number;
    canEdit: boolean;
    onAddPerson: () => void;
    onUploadCSV: () => void;
}

/**
 * PeopleToolbar - Header section with title and primary actions below it
 * Active list name is shown in PeopleListPanel instead.
 */
export function PeopleToolbar({
    totalPeople,
    canEdit,
    onAddPerson,
    onUploadCSV,
}: PeopleToolbarProps) {
    const { t } = useTranslation();

    return (
        <Stack direction="row" alignItems="center" gap={2} sx={{ mb: { xs: 2, sm: 2 }, display: 'var(--native-page-header-display, flex)' }}>
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: { xs: '1.25rem', sm: '2rem' }, mb: 0.5 }}>
                    {t('people.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('people.total')} - {totalPeople}
                </Typography>
            </Box>

            <Box sx={{ ...glassToolbarSx, display: { xs: 'none', md: 'inline-flex' } }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddPerson}
                    disabled={!canEdit}
                    sx={{ whiteSpace: 'nowrap' }}
                >
                    {t('people.addPerson')}
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    onClick={onUploadCSV}
                    disabled={!canEdit}
                    sx={{ whiteSpace: 'nowrap' }}
                >
                    {t('people.uploadCSV')}
                </Button>
            </Box>

            {/* Mobile: only show CSV upload (Add is via FAB) */}
            <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={onUploadCSV}
                disabled={!canEdit}
                sx={{
                    whiteSpace: 'nowrap',
                    display: { xs: 'inline-flex', md: 'none' },
                    px: { xs: 2, sm: 3 },
                }}
            >
                {t('people.uploadCSV')}
            </Button>
        </Stack>
    );
}
