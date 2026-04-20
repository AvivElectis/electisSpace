import { Box, Typography, Button, Stack, IconButton, Badge, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useTranslation } from 'react-i18next';
import { glassToolbarSx } from '@shared/presentation/styles/glassToolbar';
import { usePeopleTypeLabels } from '@features/settings/hooks/usePeopleTypeLabels';

interface PeopleToolbarProps {
    totalPeople: number;
    canEdit: boolean;
    onAddPerson: () => void;
    onUploadCSV: () => void;
    /** Mobile-only: filter trigger props. When supplied, a filter icon is
     *  rendered at the opposite end of the title row so the search affordance
     *  lives in the header line, not above the filter bar. */
    filtersOpen?: boolean;
    onFiltersToggle?: () => void;
    activeFilterCount?: number;
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
    filtersOpen = false,
    onFiltersToggle,
    activeFilterCount = 0,
}: PeopleToolbarProps) {
    const { t } = useTranslation();
    const { getLabel } = usePeopleTypeLabels();

    return (
        <Stack direction="row" alignItems="center" gap={2} sx={{ mb: { xs: 2, sm: 2 }, display: 'var(--native-page-header-display, flex)' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h4" sx={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: { xs: '1.25rem', sm: '2rem' }, mb: 0.5 }}>
                    {getLabel('plural')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('people.total')} - {totalPeople}
                </Typography>
            </Box>

            {/* Mobile: filter trigger sits at the opposite end of the title row */}
            {onFiltersToggle && (
                <Tooltip title={t('common.search')}>
                    <IconButton
                        onClick={onFiltersToggle}
                        color={filtersOpen || activeFilterCount > 0 ? 'primary' : 'default'}
                        sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                    >
                        <Badge badgeContent={activeFilterCount} color="primary">
                            <FilterListIcon />
                        </Badge>
                    </IconButton>
                </Tooltip>
            )}

            <Box sx={{ ...glassToolbarSx, display: { xs: 'none', md: 'inline-flex' } }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddPerson}
                    disabled={!canEdit}
                    sx={{ whiteSpace: 'nowrap' }}
                >
                    {getLabel('add')}
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
