import { Box, Typography, Button, Stack, Chip, Tooltip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ListAltIcon from '@mui/icons-material/ListAlt';
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
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            gap={1}
            sx={{ mb: { xs: 2, sm: 3 } }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: { xs: '1.25rem', sm: '2rem' } }}>
                        {t('people.title')}
                    </Typography>
                    {activeListName && (
                        <Chip
                            icon={<ListAltIcon />}
                            label={activeListName}
                            color="info"
                            variant="filled"
                            sx={{
                                paddingInlineStart: 1,
                                fontWeight: 600,
                                fontSize: { xs: '0.8rem', sm: '0.95rem' },
                                height: 32,
                                maxWidth: { xs: 120, sm: 'none' },
                            }}
                        />
                    )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    {t('people.total')} - {totalPeople}
                </Typography>
            </Box>
            <Stack direction="row" gap={{ xs: 0.5, sm: 2 }} flexShrink={0}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddPerson}
                    size="small"
                    sx={{ whiteSpace: 'nowrap' }}
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
