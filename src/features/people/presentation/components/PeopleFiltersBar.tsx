import { Stack, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, IconButton, Badge, Collapse, Box, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CancelIcon from '@mui/icons-material/Cancel';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PeopleFiltersBarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    assignmentFilter: 'all' | 'assigned' | 'unassigned';
    onAssignmentFilterChange: (value: 'all' | 'assigned' | 'unassigned') => void;
    onCancelAllAssignments?: () => void;
    assignedCount?: number;
}

/**
 * PeopleFiltersBar - Search and filter controls
 * Mobile: collapsed behind a filter icon button
 * Desktop: always visible inline
 */
export function PeopleFiltersBar({
    searchQuery,
    onSearchChange,
    assignmentFilter,
    onAssignmentFilterChange,
    onCancelAllAssignments,
    assignedCount = 0,
}: PeopleFiltersBarProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Count active filters for badge
    const activeFilterCount = (searchQuery ? 1 : 0) + (assignmentFilter !== 'all' ? 1 : 0);

    // Mobile: filter icon + cancel-all on same row, collapsible panel below
    if (isMobile) {
        return (
            <Box sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <IconButton
                        onClick={() => setFiltersOpen(!filtersOpen)}
                        color={activeFilterCount > 0 ? 'primary' : 'default'}
                        size="small"
                    >
                        <Badge badgeContent={activeFilterCount} color="primary">
                            <FilterListIcon />
                        </Badge>
                    </IconButton>

                    {onCancelAllAssignments && (
                        <Tooltip title={t('people.cancelAllAssignments')}>
                            <span>
                                <IconButton
                                    color="error"
                                    onClick={onCancelAllAssignments}
                                    disabled={assignedCount === 0}
                                    size="small"
                                >
                                    <CancelIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                </Stack>

                <Collapse in={filtersOpen}>
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
