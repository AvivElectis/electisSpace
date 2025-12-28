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
    Stack,
    TextField,
    InputAdornment,
    Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpaceController } from '../application/useSpaceController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { SpaceDialog } from './SpaceDialog';
import type { Space } from '@shared/domain/types';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';

/**
 * Spaces Page - Clean and Responsive Design with Dynamic Labels
 */
export function SpacesPage() {
    const { t, i18n } = useTranslation();
    const settingsController = useSettingsController();
    const { confirm, ConfirmDialog } = useConfirmDialog();

    // Get SoluM access token if available (same pattern as ConferencePage)
    const solumToken = settingsController.settings.solumConfig?.tokens?.accessToken;

    const spaceController = useSpaceController({
        csvConfig: settingsController.settings.csvConfig,
        solumConfig: settingsController.settings.solumConfig,
        solumToken,
        solumMappingConfig: settingsController.settings.solumMappingConfig,
    });
    const { getLabel } = useSpaceTypeLabels();

    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSpace, setEditingSpace] = useState<Space | undefined>(undefined);

    // Fetch spaces from AIMS on mount when in SoluM mode
    useEffect(() => {
        if (
            settingsController.settings.workingMode === 'SOLUM_API' &&
            solumToken &&
            settingsController.settings.solumMappingConfig
        ) {
            spaceController.fetchFromSolum().catch((error) => {
                console.error('Failed to fetch spaces from AIMS:', error);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Get visible fields from mapping config for dynamic table columns
    // Exclude ID fields since we have a dedicated ID column
    const visibleFields = useMemo(() => {
        if (!settingsController.settings.solumMappingConfig?.fields) return [];

        const idFieldKey = settingsController.settings.solumMappingConfig.mappingInfo?.articleId;

        return Object.entries(settingsController.settings.solumMappingConfig.fields)
            .filter(([fieldKey, config]) => {
                // Exclude the ID field since we show it in the dedicated ID column
                if (idFieldKey && fieldKey === idFieldKey) return false;
                // Only show visible fields
                return config.visible;
            })
            .map(([fieldKey, config]) => ({
                key: fieldKey,
                labelEn: config.friendlyNameEn,
                labelHe: config.friendlyNameHe
            }));
    }, [settingsController.settings.solumMappingConfig]);

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

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: `${t('common.dialog.delete')} ${getLabel('singular').toLowerCase()}`,
            message: `${t('common.dialog.areYouSure')} `,
            confirmLabel: t('common.dialog.delete'),
            cancelLabel: t('common.dialog.cancel'),
            severity: 'error'
        });

        if (confirmed) {
            try {
                await spaceController.deleteSpace(id);
            } catch (error) {
                await confirm({
                    title: t('common.error'),
                    message: `Failed to delete ${getLabel('singular').toLowerCase()}: ${error}`,
                    confirmLabel: t('common.close'),
                    severity: 'error',
                    showCancel: false
                });
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
                        {getLabel('plural')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('spaces.manage')}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAdd}
                    sx={{ minWidth: { xs: '100%', sm: '140px' } }}
                >
                    {getLabel('add')}
                </Button>
            </Stack>

            {/* Stats Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="body2" color="text.secondary">
                        {t('spaces.total')} {getLabel('plural')}
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 500, color: 'primary.main' }}>
                        {spaceController.spaces.length}
                    </Typography>
                </CardContent>
            </Card>

            {/* Search Bar */}
            <TextField
                fullWidth
                placeholder={t('spaces.searchPlaceholder')}
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
                            <TableCell sx={{ fontWeight: 600 }} align="center">{t('spaces.id')}</TableCell>
                            {visibleFields.map(field => (
                                <TableCell key={field.key} sx={{ fontWeight: 600 }} align="center">
                                    {i18n.language === 'he' ? field.labelHe : field.labelEn}
                                </TableCell>
                            ))}
                            <TableCell sx={{ fontWeight: 600 }} align="center">{t('spaces.actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredSpaces.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={visibleFields.length + 2} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {searchQuery
                                            ? t('spaces.noSpacesMatching', { spaces: getLabel('plural').toLowerCase() }) + ` "${searchQuery}"`
                                            : t('spaces.noSpacesYet', { spaces: getLabel('plural').toLowerCase(), button: `"${getLabel('add')}"` })}
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
                                    <TableCell align="center">
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {space.id}
                                        </Typography>
                                    </TableCell>
                                    {visibleFields.map(field => (
                                        <TableCell key={field.key} align="center">
                                            <Typography variant="body2">
                                                {space.data[field.key] || '-'}
                                            </Typography>
                                        </TableCell>
                                    ))}
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
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
                workingMode={settingsController.settings.workingMode}
                solumMappingConfig={settingsController.settings.solumMappingConfig}
                csvConfig={settingsController.settings.csvConfig}
                spaceTypeLabel={getLabel('singular')}
            />
            <ConfirmDialog />
        </Box>
    );
}
