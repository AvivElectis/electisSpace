import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItemButton,
    ListItemText,
    Typography,
    Box,
    Chip,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';

interface SpaceSelectionDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (spaceId: string) => void;
    personId: string;
    personName?: string;
}

interface SpaceOption {
    id: string;
    taken: boolean;
    assignedTo?: string;
}

/**
 * Space Selection Dialog
 * Shows a list of all spaces with availability status
 * Allows user to select an available space for assignment
 */
export function SpaceSelectionDialog({
    open,
    onClose,
    onSelect,
    personId,
    personName,
}: SpaceSelectionDialogProps) {
    const { t, i18n } = useTranslation();
    const settings = useSettingsStore((state) => state.settings);
    const people = usePeopleStore((state) => state.people);

    const totalSpaces = settings.peopleManagerConfig?.totalSpaces || 0;
    const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

    // Determine text direction based on language
    const isRtl = i18n.language === 'he';

    // Build space options with availability info
    const spaceOptions = useMemo((): SpaceOption[] => {
        if (totalSpaces === 0) return [];

        // Get all assigned space IDs (except for the current person being edited)
        const assignedSpaces = new Map<string, string>();
        people.forEach(person => {
            if (person.assignedSpaceId && person.id !== personId) {
                // Find person's display name for tooltip
                const displayName = Object.values(person.data)[0] || person.id;
                assignedSpaces.set(person.assignedSpaceId, displayName);
            }
        });

        const options: SpaceOption[] = [];
        for (let i = 1; i <= totalSpaces; i++) {
            const spaceId = String(i);
            const assignedTo = assignedSpaces.get(spaceId);
            options.push({
                id: spaceId,
                taken: !!assignedTo,
                assignedTo,
            });
        }

        return options;
    }, [totalSpaces, people, personId]);

    // Get available spaces count
    const availableCount = useMemo(() => {
        return spaceOptions.filter(opt => !opt.taken).length;
    }, [spaceOptions]);

    const handleSelect = () => {
        if (selectedSpaceId) {
            onSelect(selectedSpaceId);
            setSelectedSpaceId(null);
        }
    };

    const handleClose = () => {
        setSelectedSpaceId(null);
        onClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            maxWidth="xs" 
            fullWidth
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            <DialogTitle sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                {t('people.selectSpace')}
            </DialogTitle>
            <DialogContent>
                {personName && (
                    <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                            mb: 2,
                            textAlign: isRtl ? 'right' : 'left'
                        }}
                    >
                        {t('people.assigningSpaceTo', { name: personName })}
                    </Typography>
                )}

                <Typography 
                    variant="body2" 
                    sx={{ 
                        mb: 1,
                        textAlign: isRtl ? 'right' : 'left'
                    }}
                >
                    {t('people.availableSpaces', { count: availableCount })}
                </Typography>

                {totalSpaces === 0 ? (
                    <Typography color="error" sx={{ textAlign: isRtl ? 'right' : 'left' }}>
                        {t('people.noSpacesConfigured')}
                    </Typography>
                ) : (
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                        <List dense>
                            {spaceOptions.map((option) => (
                                <ListItemButton
                                    key={option.id}
                                    selected={selectedSpaceId === option.id}
                                    onClick={() => !option.taken && setSelectedSpaceId(option.id)}
                                    disabled={option.taken}
                                    sx={{
                                        opacity: option.taken ? 0.5 : 1,
                                        borderRadius: 1,
                                        mb: 0.5,
                                        flexDirection: isRtl ? 'row-reverse' : 'row',
                                    }}
                                >
                                    <ListItemText
                                        primary={`${t('people.space')} ${option.id}`}
                                        sx={{
                                            textDecoration: option.taken ? 'line-through' : 'none',
                                            textAlign: isRtl ? 'right' : 'left',
                                        }}
                                    />
                                    {option.taken && (
                                        <Chip
                                            label={option.assignedTo}
                                            size="small"
                                            color="default"
                                            sx={{ 
                                                ml: isRtl ? 0 : 1,
                                                mr: isRtl ? 1 : 0,
                                            }}
                                        />
                                    )}
                                    {!option.taken && selectedSpaceId === option.id && (
                                        <Chip
                                            label={t('common.selected')}
                                            size="small"
                                            color="primary"
                                            sx={{ 
                                                ml: isRtl ? 0 : 1,
                                                mr: isRtl ? 1 : 0,
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            ))}
                        </List>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                <Button onClick={handleClose}>
                    {t('common.cancel')}
                </Button>
                <Button
                    onClick={handleSelect}
                    variant="contained"
                    disabled={!selectedSpaceId}
                >
                    {t('people.assignSpace')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
