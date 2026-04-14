import { Stack, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Collapse, Box, useMediaQuery, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';

interface PeopleFiltersBarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    assignmentFilter: 'all' | 'assigned' | 'unassigned';
    onAssignmentFilterChange: (value: 'all' | 'assigned' | 'unassigned') => void;
    /** Mobile-only: controls whether the collapsible search panel is open.
     *  The trigger lives in the page header (PeopleToolbar) so the icon can
     *  sit next to the title rather than above the filter bar itself. */
    open?: boolean;
}

/**
 * PeopleFiltersBar - Search and filter controls
 * Mobile: collapsed behind a filter icon button living in the page header
 * Desktop: always visible inline
 */
export function PeopleFiltersBar({
    searchQuery,
    onSearchChange,
    assignmentFilter,
    onAssignmentFilterChange,
    open = false,
}: PeopleFiltersBarProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Mobile: collapsible panel only — the trigger is owned by PeopleToolbar
    if (isMobile) {
        return (
            <Box sx={{ mb: open ? 2 : 0 }}>
                <Collapse in={open}>
                    <Stack gap={1.5}>
                        <TextField
                            placeholder={t('people.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: 2 },
                            }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                        />
                        <FormControl size="small" fullWidth>
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
                </Collapse>
            </Box>
        );
    }

    // Desktop: inline search + filter (unchanged)
    return (
        <Stack direction="row" gap={2} sx={{ mb: 3 }}>
            <TextField
                placeholder={t('people.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
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
            <FormControl size="small" sx={{ minWidth: 150 }}>
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
