/**
 * Wizard Step: Building Hierarchy
 * Shown when compassEnabled is ON. Lets user define buildings and floors.
 * Areas are configured after company creation in the compass admin page.
 */
import { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    Paper,
    Stack,
    Alert,
    Collapse,
    Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { useTranslation } from 'react-i18next';
import type { WizardBuilding } from '../wizardTypes';

interface BuildingHierarchyStepProps {
    buildings: WizardBuilding[];
    onUpdate: (buildings: WizardBuilding[]) => void;
}

export function BuildingHierarchyStep({ buildings, onUpdate }: BuildingHierarchyStepProps) {
    const { t } = useTranslation();
    const [expandedBuilding, setExpandedBuilding] = useState<number | null>(
        buildings.length > 0 ? 0 : null,
    );
    const [newBuildingName, setNewBuildingName] = useState('');
    const [newFloorNames, setNewFloorNames] = useState<Record<string, string>>({});

    const isDuplicateBuilding = (name: string) =>
        buildings.some(b => b.name.toLowerCase() === name.trim().toLowerCase());

    const isDuplicateFloor = (buildingIndex: number, name: string) =>
        buildings[buildingIndex]?.floors.some(f => f.name.toLowerCase() === name.trim().toLowerCase());

    const handleAddBuilding = () => {
        const name = newBuildingName.trim();
        if (!name || isDuplicateBuilding(name)) return;
        const updated = [...buildings, { id: crypto.randomUUID(), name, floors: [] }];
        onUpdate(updated);
        setNewBuildingName('');
        setExpandedBuilding(updated.length - 1);
    };

    const handleRemoveBuilding = (index: number) => {
        const updated = buildings.filter((_, i) => i !== index);
        onUpdate(updated);
        if (expandedBuilding === index) setExpandedBuilding(null);
        else if (expandedBuilding !== null && expandedBuilding > index) {
            setExpandedBuilding(expandedBuilding - 1);
        }
    };

    const handleAddFloor = (buildingIndex: number, buildingId: string) => {
        const name = (newFloorNames[buildingId] || '').trim();
        if (!name || isDuplicateFloor(buildingIndex, name)) return;
        const updated = buildings.map((b, i) =>
            i === buildingIndex ? { ...b, floors: [...b.floors, { id: crypto.randomUUID(), name }] } : b,
        );
        onUpdate(updated);
        setNewFloorNames((prev) => ({ ...prev, [buildingId]: '' }));
    };

    const handleRemoveFloor = (buildingIndex: number, floorIndex: number) => {
        const updated = buildings.map((b, i) =>
            i === buildingIndex
                ? { ...b, floors: b.floors.filter((_, fi) => fi !== floorIndex) }
                : b,
        );
        onUpdate(updated);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" variant="outlined">
                {t('settings.companies.buildingHierarchyInfo')}
            </Alert>

            {/* Building list */}
            <Stack spacing={1.5}>
                {buildings.map((building, bi) => (
                    <Paper key={building.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                        {/* Building header */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1.5,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                            onClick={() => setExpandedBuilding(expandedBuilding === bi ? null : bi)}
                        >
                            <ApartmentIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                                {building.name}
                            </Typography>
                            <Chip
                                label={t('settings.companies.floorCount', { count: building.floors.length })}
                                size="small"
                                variant="outlined"
                            />
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveBuilding(bi);
                                }}
                                aria-label={t('common.delete')}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                            {expandedBuilding === bi ? (
                                <ExpandLessIcon fontSize="small" />
                            ) : (
                                <ExpandMoreIcon fontSize="small" />
                            )}
                        </Box>

                        {/* Floors list */}
                        <Collapse in={expandedBuilding === bi}>
                            <Box sx={{ px: 2, pb: 2 }}>
                                {building.floors.length > 0 && (
                                    <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                                        {building.floors.map((floor, fi) => (
                                            <Box
                                                key={floor.id}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    pl: 2,
                                                }}
                                            >
                                                <Typography variant="body2" sx={{ flex: 1 }}>
                                                    {floor.name}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRemoveFloor(bi, fi)}
                                                    aria-label={t('common.delete')}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}

                                {/* Add floor input */}
                                <Box sx={{ display: 'flex', gap: 1, pl: 2 }}>
                                    <TextField
                                        size="small"
                                        placeholder={t('settings.companies.floorNamePlaceholder')}
                                        value={newFloorNames[building.id] || ''}
                                        onChange={(e) =>
                                            setNewFloorNames((prev) => ({ ...prev, [building.id]: e.target.value }))
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddFloor(bi, building.id);
                                            }
                                        }}
                                        slotProps={{ htmlInput: { maxLength: 100 } }}
                                        error={isDuplicateFloor(bi, newFloorNames[building.id] || '')}
                                        helperText={isDuplicateFloor(bi, newFloorNames[building.id] || '') ? t('settings.companies.duplicateName', 'Name already exists') : undefined}
                                        sx={{ flex: 1 }}
                                    />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleAddFloor(bi, building.id)}
                                        disabled={!(newFloorNames[building.id] || '').trim()}
                                    >
                                        {t('settings.companies.addFloor')}
                                    </Button>
                                </Box>
                            </Box>
                        </Collapse>
                    </Paper>
                ))}
            </Stack>

            {/* Add building input */}
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    {t('settings.companies.addBuilding')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        size="small"
                        placeholder={t('settings.companies.buildingNamePlaceholder')}
                        value={newBuildingName}
                        onChange={(e) => setNewBuildingName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddBuilding();
                            }
                        }}
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                        error={isDuplicateBuilding(newBuildingName)}
                        helperText={isDuplicateBuilding(newBuildingName) ? t('settings.companies.duplicateName', 'Name already exists') : undefined}
                        sx={{ flex: 1 }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddBuilding}
                        disabled={!newBuildingName.trim()}
                    >
                        {t('common.add')}
                    </Button>
                </Box>
            </Paper>

            {buildings.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    {t('settings.companies.noBuildingsYet')}
                </Typography>
            )}
        </Box>
    );
}
