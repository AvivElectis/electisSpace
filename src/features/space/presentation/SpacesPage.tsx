import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Stack,
    TextField,
    InputAdornment,
    Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { useState } from 'react';
import { useSpaceController } from '../application/useSpaceController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { SpaceDialog } from './SpaceDialog';
import type { Space } from '@shared/domain/types';

/**
 * Spaces Page - Clean and Responsive Design
 */
export function SpacesPage() {
    const settingsController = useSettingsController();
    const spaceController = useSpaceController({
        csvConfig: settingsController.settings.csvConfig,
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSpace, setEditingSpace] = useState<Space | undefined>(undefined);

    // Filter spaces based on search query
    const filteredSpaces = spaceController.spaces.filter((space) => {
        const query = searchQuery.toLowerCase();
        return (
            space.id.toLowerCase().includes(query) ||
            space.roomName.toLowerCase().includes(query) ||
            Object.values(space.data).some((value) =>
                value.toLowerCase().includes(query)
            )
        );
    });

    // Get space type label
    const spaceTypeLabels: Record<string, string> = {
        'office': 'Office',
        'room': 'Room',
        'chair': 'Chair',
        'person-tag': 'Person Tag',
    };
    const spaceTypeLabel = spaceTypeLabels[settingsController.settings.spaceType] || 'Space';

    const handleDelete = async (id: string) => {
        if (window.confirm(`Are you sure you want to delete this ${spaceTypeLabel.toLowerCase()}?`)) {
            try {
                await spaceController.deleteSpace(id);
            } catch (error) {
                alert(`Failed to delete ${spaceTypeLabel.toLowerCase()}: ${error}`);
            }
        }
    };

    const handleAdd = () => {
        setEditingSpace(undefined);
        setDialogOpen(true);
    };

    const handleEdit = (space: Space) => {
        setEditingSpace(space);
        setDialogOpen(true);
    };

    const handleSave = async (spaceData: Partial<Space>) => {
        if (editingSpace) {
            await spaceController.updateSpace(editingSpace.id, spaceData);
        } else {
            await spaceController.addSpace(spaceData);
        }
    };

    return (
        <Box>
            {/* Header Section */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5 }}>
                        {spaceTypeLabel} Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage and monitor all {spaceTypeLabels[settingsController.settings.spaceType]?.toLowerCase()}s
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAdd}
                    sx={{ minWidth: { xs: '100%', sm: '140px' } }}
                >
                    Add {spaceTypeLabel}
                </Button>
            </Stack>

            {/* Stats Cards */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mb: 3 }}
            >
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">
                            Total {spaceTypeLabel}s
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 500, color: 'primary.main' }}>
                            {spaceController.spaces.length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">
                            With Labels
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 500, color: 'success.main' }}>
                            {spaceController.spaces.filter(s => s.labelCode).length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">
                            Without Labels
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 500, color: 'warning.main' }}>
                            {spaceController.spaces.filter(s => !s.labelCode).length}
                        </Typography>
                    </CardContent>
                </Card>
            </Stack>

            {/* Search Bar */}
            <TextField
                fullWidth
                placeholder={`Search ${spaceTypeLabel.toLowerCase()}s...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 3 }}
            />

            {/* Spaces Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'background.default' }}>
                            <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Label Code</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Template</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredSpaces.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {searchQuery
                                            ? `No ${spaceTypeLabel.toLowerCase()}s found matching "${searchQuery}"`
                                            : `No ${spaceTypeLabel.toLowerCase()}s yet. Click "Add ${spaceTypeLabel}" to get started.`}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSpaces.map((space) => (
                                <TableRow
                                    key={space.id}
                                    sx={{
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                        },
                                    }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {space.id}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{space.roomName}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {space.labelCode ? (
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <QrCodeIcon fontSize="small" color="primary" />
                                                <Typography variant="body2">{space.labelCode}</Typography>
                                            </Stack>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {space.templateName || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={space.labelCode ? 'Active' : 'Inactive'}
                                            color={space.labelCode ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <Tooltip title="Edit">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleEdit(space)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(space.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <SpaceDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
                space={editingSpace}
                csvConfig={settingsController.settings.csvConfig}
                spaceTypeLabel={spaceTypeLabel}
            />
        </Box>
    );
}
