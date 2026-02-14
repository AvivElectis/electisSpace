import { Box, Typography, Button, Stack, Tooltip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';

interface PeopleToolbarProps {
    totalPeople: number;
    onAddPerson: () => void;
    onUploadCSV: () => void;
}

/**
 * PeopleToolbar - Header section with title and primary actions
 * Active list name is shown in PeopleListPanel instead.
 */
export function PeopleToolbar({
    totalPeople,
    onAddPerson,
    onUploadCSV,
}: PeopleToolbarProps) {
    const { t } = useTranslation();

    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            gap={1}
            sx={{ mb: { xs: 2, sm: 3 } }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h4" sx={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: { xs: '1.25rem', sm: '2rem' }, mb: 0.5 }}>
                    {t('people.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('people.total')} - {totalPeople}
                </Typography>
            </Box>
            <Stack direction="row" gap={{ xs: 0.5, sm: 2 }} flexShrink={0}>
                {/* Add Person — hidden on mobile (replaced by FAB) */}
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddPerson}
                    size="small"
                    sx={{ whiteSpace: 'nowrap', display: { xs: 'none', md: 'inline-flex' } }}
                >
                    {t('people.addPerson')}
                </Button>
                <Button
                    variant="text"
                    startIcon={<UploadFileIcon />}
                    onClick={onUploadCSV}
                    size="small"
                    sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' } }}
                >
                    {t('people.uploadCSV')}
                </Button>
                <Tooltip title={t('people.uploadCSV')}>
                    <IconButton
                        onClick={onUploadCSV}
                        size="small"
                        sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                    >
                        <UploadFileIcon />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Stack>
    );
}
