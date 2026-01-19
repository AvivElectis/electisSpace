import { Box, Typography, Button, Stack, CircularProgress, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useTranslation } from 'react-i18next';

interface PeopleToolbarProps {
    activeListName: string | null;
    totalPeople: number;
    isSendingToAims?: boolean;
    onAddPerson: () => void;
    onUploadCSV: () => void;
    onSendAllToAims: () => void;
}

/**
 * PeopleToolbar - Header section with title and primary actions
 */
export function PeopleToolbar({
    activeListName,
    totalPeople,
    isSendingToAims = false,
    onAddPerson,
    onUploadCSV,
    onSendAllToAims,
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
                        <Chip
                            icon={<ListAltIcon />}
                            label={activeListName}
                            color="info"
                            variant="filled"
                            sx={{
                                mx: 2,
                                paddingInlineStart: 1,
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                height: 32,
                            }}
                        />
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
                    variant="text"
                    color="success"
                    startIcon={isSendingToAims ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                    onClick={onSendAllToAims}
                    disabled={isSendingToAims}
                >
                    {t('people.sendAllToAims')}
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
