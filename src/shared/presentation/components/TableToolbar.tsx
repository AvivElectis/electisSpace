import { Toolbar, Box, Typography, IconButton, Tooltip, TextField, InputAdornment, Checkbox } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ChangeEvent } from 'react';

interface TableToolbarProps {
    title: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    onFilterClick?: () => void;
    numSelected?: number;
    onDeleteSelected?: () => void;
    showSearch?: boolean;
    showFilter?: boolean;
    endActions?: React.ReactNode;
}

/**
 * TableToolbar Component
 * 
 * Reusable toolbar for data tables with:
 * - Title
 * - Search input
 * - Filter button
 * - Bulk selection actions
 * - Custom end actions
 * 
 * @example
 * <TableToolbar
 *   title="Spaces"
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   onFilterClick={() => setFilterOpen(true)}
 *   numSelected={selected.length}
 *   onDeleteSelected={handleDeleteSelected}
 * />
 */
export function TableToolbar({
    title,
    searchValue = '',
    onSearchChange,
    onFilterClick,
    numSelected = 0,
    onDeleteSelected,
    showSearch = true,
    showFilter = true,
    endActions,
}: TableToolbarProps) {
    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        onSearchChange?.(event.target.value);
    };

    return (
        <Toolbar
            sx={{
                pl: { sm: 2 },
                pr: { xs: 1, sm: 1 },
                ...(numSelected > 0 && {
                    bgcolor: (theme) =>
                        theme.palette.mode === 'light'
                            ? 'primary.lighter'
                            : 'primary.darker',
                }),
            }}
        >
            {numSelected > 0 ? (
                <>
                    {/* Selection Mode */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <Checkbox checked indeterminate={false} />
                        <Typography color="inherit" variant="subtitle1">
                            {numSelected} selected
                        </Typography>
                    </Box>
                    {onDeleteSelected && (
                        <Tooltip title="Delete selected">
                            <IconButton onClick={onDeleteSelected}>
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </>
            ) : (
                <>
                    {/* Normal Mode */}
                    <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 3 }}>
                        {title}
                    </Typography>

                    {showSearch && onSearchChange && (
                        <TextField
                            size="small"
                            placeholder="Search..."
                            value={searchValue}
                            onChange={handleSearchChange}
                            sx={{ minWidth: 250, mr: 2 }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    )}

                    <Box sx={{ flexGrow: 1 }} />

                    {showFilter && onFilterClick && (
                        <Tooltip title="Filter list">
                            <IconButton onClick={onFilterClick}>
                                <FilterListIcon />
                            </IconButton>
                        </Tooltip>
                    )}

                    {endActions}
                </>
            )}
        </Toolbar>
    );
}
