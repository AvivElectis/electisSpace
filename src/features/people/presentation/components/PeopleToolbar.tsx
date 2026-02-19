import { Box, Typography, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';

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
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            {/* Title row */}
            <Box sx={{ mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: { xs: '1.25rem', sm: '2rem' }, mb: 0.5 }}>
                    {t('people.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('people.total')} - {totalPeople}
                </Typography>
            </Box>

            {/* Action buttons row — under the header */}
            <Stack direction="row" gap={1.5} flexWrap="wrap">
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddPerson}
                    disabled={!canEdit}
                    sx={{
                        whiteSpace: 'nowrap',
                        display: { xs: 'none', md: 'inline-flex' },
                        minHeight: 44,
                        px: 3,
                    }}
                >
                    {t('people.addPerson')}
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    onClick={onUploadCSV}
                    disabled={!canEdit}
                    sx={{
                        whiteSpace: 'nowrap',
                        minHeight: { xs: 44, md: 44 },
                        px: { xs: 2, sm: 3 },
                    }}
                >
                    {t('people.uploadCSV')}
                </Button>
            </Stack>
        </Box>
    );
}
