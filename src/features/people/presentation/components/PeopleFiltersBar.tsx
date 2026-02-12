import { Stack, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';

interface PeopleFiltersBarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    assignmentFilter: 'all' | 'assigned' | 'unassigned';
    onAssignmentFilterChange: (value: 'all' | 'assigned' | 'unassigned') => void;
}

/**
 * PeopleFiltersBar - Search and filter controls
 */
export function PeopleFiltersBar({
    searchQuery,
    onSearchChange,
    assignmentFilter,
    onAssignmentFilterChange,
}: PeopleFiltersBarProps) {
    const { t } = useTranslation();

    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mb: 3 }}>
            <TextField
                placeholder={t('people.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 4,
                    },
                }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }
                }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 }, display: { xs: 'none', md: 'flex' } }}>
                <InputLabel>{t('people.filterStatus')}</InputLabel>
                <Select
                    value={assignmentFilter}
                    label={t('people.filterStatus')}
                    onChange={(e) => onAssignmentFilterChange(e.target.value as 'all' | 'assigned' | 'unassigned')}
                >
                    <MenuItem value="all">{t('people.all')}</MenuItem>
                    <MenuItem value="assigned">{t('people.assigned')}</MenuItem>
                    <MenuItem value="unassigned">{t('people.unassigned')}</MenuItem>
                </Select>
            </FormControl>
        </Stack>
    );
}
