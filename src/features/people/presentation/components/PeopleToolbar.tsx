import { Box, Typography, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';

interface PeopleToolbarProps {
    activeListName: string | null;
    totalPeople: number;
    onAddPerson: () => void;
    onUploadCSV: () => void;
}

/**
 * PeopleToolbar - Header section with title and primary actions
 */
export function PeopleToolbar({
    activeListName,
    totalPeople,
    onAddPerson,
    onUploadCSV,
}: PeopleToolbarProps) {
    const { t } = useTranslation();

    return (
        <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            gap={2}
            sx={{ mb: 3 }}
        >
            <Box>
                <Stack direction="row" alignItems="center" mb={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                        {t('people.title')}
                    </Typography>
                    {activeListName && (
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                borderRadius: 0.5,
                                px: 1,
                                py: 0,
                                mx: 2,
                            }}
                        >
                            {activeListName}
                        </Typography>
                    )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    {t('people.total')} - {totalPeople}
                </Typography>
            </Box>
            <Stack direction="row" gap={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button
                    variant="text"
                    startIcon={<UploadFileIcon />}
                    onClick={onUploadCSV}
                >
                    {t('people.uploadCSV')}
                </Button>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddPerson}
                >
                    {t('people.addPerson')}
                </Button>
            </Stack>
        </Stack>
    );
}
