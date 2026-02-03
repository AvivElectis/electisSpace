import {
    Autocomplete,
    TextField,
    Chip,
    Box,
    Typography,
} from '@mui/material';
import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePeopleStore } from '../infrastructure/peopleStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';

interface SpaceSelectorProps {
    value: string | undefined;
    onChange: (spaceId: string | undefined) => void;
    error?: boolean;
    helperText?: string;
    excludePersonId?: string; // Exclude current person's assignment from "taken" list
    size?: 'small' | 'medium';
    disabled?: boolean;
    fullWidth?: boolean;
}

interface SpaceOption {
    id: string;
    label: string;
    taken: boolean;
    assignedTo?: string;
}

/**
 * Space Selector Component
 * Shows a dropdown with available space numbers (1 to totalSpaces)
 * Marks taken spaces and allows selection of available ones
 */
export function SpaceSelector({
    value,
    onChange,
    error,
    helperText,
    excludePersonId,
    size = 'medium',
    disabled = false,
    fullWidth = true,
}: SpaceSelectorProps) {
    const { t, i18n } = useTranslation();
    const settings = useSettingsStore((state) => state.settings);
    const people = usePeopleStore((state) => state.people);
    const { getLabel } = useSpaceTypeLabels();

    // Helper for translations with space type
    const tWithSpaceType = useCallback((key: string, options?: Record<string, unknown>) => {
        return t(key, {
            ...options,
            spaceTypeSingular: getLabel('singular').toLowerCase(),
            spaceTypeSingularDef: getLabel('singularDef').toLowerCase(),
            spaceTypePlural: getLabel('plural').toLowerCase(),
            spaceTypePluralDef: getLabel('pluralDef').toLowerCase(),
        });
    }, [t, getLabel]);

    const totalSpaces = settings.peopleManagerConfig?.totalSpaces || 0;

    // Determine text direction based on language
    const isRtl = i18n.language === 'he';

    // Build space options with availability info
    const spaceOptions = useMemo((): SpaceOption[] => {
        if (totalSpaces === 0) return [];

        // Get all assigned space IDs (except for the current person being edited)
        const assignedSpaces = new Map<string, string>();
        people.forEach(person => {
            if (person.assignedSpaceId && person.id !== excludePersonId) {
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
                label: `${tWithSpaceType('people.space')} ${spaceId}`,
                taken: !!assignedTo,
                assignedTo,
            });
        }

        return options;
    }, [totalSpaces, people, excludePersonId, t]);

    // Find current selection
    const selectedOption = useMemo(() => {
        if (!value) return null;
        return spaceOptions.find(opt => opt.id === value) || null;
    }, [value, spaceOptions]);

    // Get available spaces count for helper text
    const availableCount = useMemo(() => {
        return spaceOptions.filter(opt => !opt.taken).length;
    }, [spaceOptions]);

    if (totalSpaces === 0) {
        return (
            <TextField
                label={tWithSpaceType('people.assignedSpace')}
                value=""
                disabled
                helperText={tWithSpaceType('people.noSpacesConfigured')}
                error
                fullWidth={fullWidth}
                size={size}
            />
        );
    }

    return (
        <Autocomplete
            value={selectedOption}
            onChange={(_, newValue) => {
                onChange(newValue?.id || undefined);
            }}
            options={spaceOptions}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionDisabled={(option) => option.taken}
            disabled={disabled}
            fullWidth={fullWidth}
            size={size}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={tWithSpaceType('people.assignedSpace')}
                    error={error}
                    helperText={helperText || tWithSpaceType('people.availableSpaces', { count: availableCount })}
                />
            )}
            renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                    <Box
                        component="li"
                        key={key}
                        {...otherProps}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: option.taken ? 0.5 : 1,
                            flexDirection: isRtl ? 'row-reverse' : 'row',
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                textDecoration: option.taken ? 'line-through' : 'none',
                            }}
                        >
                            {option.label}
                        </Typography>
                        {option.taken && (
                            <Chip
                                label={option.assignedTo}
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ p: 1, ml: isRtl ? 0 : 1, mr: isRtl ? 1 : 0 }}
                            />
                        )}
                    </Box>
                );
            }}
            clearOnEscape
            openOnFocus
        />
    );
}
