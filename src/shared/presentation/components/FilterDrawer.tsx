import { Drawer, Box, Typography, IconButton, Divider, FormControl, InputLabel, Select, MenuItem, Button, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import type { SelectChangeEvent } from '@mui/material';

export interface FilterOption {
    label: string;
    value: string | number;
}

export interface FilterField {
    id: string;
    label: string;
    options: FilterOption[];
    value: string | number | string[];
    multiple?: boolean;
}

interface FilterDrawerProps {
    open: boolean;
    onClose: () => void;
    filters: FilterField[];
    onFilterChange: (filterId: string, value: string | number | string[]) => void;
    onApply: () => void;
    onReset: () => void;
}

/**
 * FilterDrawer Component
 * 
 * Reusable filter sidebar for data tables.
 * Supports single and multi-select filters.
 * 
 * @example
 * <FilterDrawer
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   filters={filterConfig}
 *   onFilterChange={handleFilterChange}
 *   onApply={applyFilters}
 *   onReset={resetFilters}
 * />
 */
export function FilterDrawer({ open, onClose, filters, onFilterChange, onApply, onReset }: FilterDrawerProps) {
    const handleSelectChange = (filterId: string, event: SelectChangeEvent<string | number | string[]>) => {
        onFilterChange(filterId, event.target.value);
    };

    const activeFilterCount = filters.filter(f => {
        if (Array.isArray(f.value)) {
            return f.value.length > 0;
        }
        return f.value !== '' && f.value !== 'all';
    }).length;

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                '& .MuiDrawer-paper': {
                    width: 320,
                    p: 3,
                },
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterListIcon color="primary" />
                    <Typography variant="h6">Filters</Typography>
                    {activeFilterCount > 0 && (
                        <Chip
                            label={activeFilterCount}
                            size="small"
                            color="primary"
                            sx={{ height: 20, minWidth: 20 }}
                        />
                    )}
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Filter Fields */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 3 }}>
                {filters.map((filter) => (
                    <FormControl key={filter.id} fullWidth size="small">
                        <InputLabel>{filter.label}</InputLabel>
                        <Select
                            value={filter.value}
                            label={filter.label}
                            onChange={(e) => handleSelectChange(filter.id, e)}
                            multiple={filter.multiple}
                        >
                            {!filter.multiple && (
                                <MenuItem value="all">
                                    <em>All</em>
                                </MenuItem>
                            )}
                            {filter.options.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ))}
            </Box>

            {/* Actions */}
            <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                    variant="contained"
                    fullWidth
                    onClick={onApply}
                    disabled={activeFilterCount === 0}
                >
                    Apply Filters
                </Button>
                <Button
                    variant="outlined"
                    fullWidth
                    onClick={onReset}
                    disabled={activeFilterCount === 0}
                >
                    Reset All
                </Button>
            </Box>
        </Drawer>
    );
}
