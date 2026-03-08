/**
 * Wizard Step: Compass Configuration
 * Shown when compassEnabled is ON. Sets default booking rules.
 */
import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Paper,
    Stack,
    Alert,
    InputAdornment,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CompassConfig } from '../wizardTypes';

interface CompassConfigStepProps {
    config: CompassConfig;
    onUpdate: (config: CompassConfig) => void;
}

type DurationMode = 'minutes' | 'hours' | 'days' | 'fullDay';

export function CompassConfigStep({ config, onUpdate }: CompassConfigStepProps) {
    const { t } = useTranslation();

    // Duration mode derived from current value
    const getDurationMode = (minutes: number): DurationMode => {
        if (minutes >= 1440 && minutes % 1440 === 0) {
            return minutes === 1440 ? 'fullDay' : 'days';
        }
        if (minutes >= 60 && minutes % 60 === 0) return 'hours';
        return 'minutes';
    };

    const [durationMode, setDurationMode] = useState<DurationMode>(() => getDurationMode(config.maxDurationMinutes));

    // Sync duration mode when config changes externally (e.g. draft restore)
    useEffect(() => {
        const expected = getDurationMode(config.maxDurationMinutes);
        if (expected !== durationMode) setDurationMode(expected);
    }, [config.maxDurationMinutes]);

    const minValues: Record<string, number> = {
        maxDurationMinutes: 30,
        maxAdvanceBookingDays: 1,
        checkInWindowMinutes: 5,
        autoReleaseMinutes: 5,
        maxConcurrentBookings: 1,
    };

    const handleChange = (key: keyof CompassConfig, value: string) => {
        if (value === '') {
            onUpdate({ ...config, [key]: '' as unknown as number });
            return;
        }
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) return;
        const minVal = minValues[key] ?? 0;
        onUpdate({ ...config, [key]: Math.max(num, minVal) });
    };

    const handleDurationModeChange = (_: unknown, newMode: DurationMode | null) => {
        if (!newMode) return;
        setDurationMode(newMode);
        if (newMode === 'fullDay') {
            onUpdate({ ...config, maxDurationMinutes: 1440 });
        } else if (newMode === 'days') {
            const days = Math.max(1, Math.round(config.maxDurationMinutes / 1440));
            onUpdate({ ...config, maxDurationMinutes: days * 1440 });
        } else if (newMode === 'hours') {
            const hours = Math.max(1, Math.round(config.maxDurationMinutes / 60));
            onUpdate({ ...config, maxDurationMinutes: Math.min(hours, 24) * 60 });
        } else {
            // minutes — convert from larger units if needed
            if (config.maxDurationMinutes >= 1440) {
                onUpdate({ ...config, maxDurationMinutes: 480 });
            }
        }
    };

    const getDurationDisplayValue = (): number | string => {
        const val = config.maxDurationMinutes;
        if (val === '' as unknown as number) return '';
        if (durationMode === 'fullDay') return 1;
        if (durationMode === 'days') return Math.round(val / 1440);
        if (durationMode === 'hours') return Math.round(val / 60);
        return val;
    };

    const handleDurationValueChange = (value: string) => {
        if (value === '') {
            onUpdate({ ...config, maxDurationMinutes: '' as unknown as number });
            return;
        }
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) return;
        if (durationMode === 'days') {
            onUpdate({ ...config, maxDurationMinutes: Math.max(num, 1) * 1440 });
        } else if (durationMode === 'hours') {
            onUpdate({ ...config, maxDurationMinutes: Math.max(num, 1) * 60 });
        } else {
            onUpdate({ ...config, maxDurationMinutes: Math.max(num, 30) });
        }
    };

    const getDurationConstraints = () => {
        switch (durationMode) {
            case 'days': return { min: 1, max: 30, unit: t('settings.companies.compassDays') };
            case 'hours': return { min: 1, max: 24, unit: t('settings.companies.compassHours') };
            default: return { min: 30, max: 1440, unit: t('settings.companies.compassMinutes') };
        }
    };

    const otherFields: Array<{
        key: keyof CompassConfig;
        label: string;
        desc: string;
        unit: string;
        min: number;
        max: number;
    }> = [
        {
            key: 'maxAdvanceBookingDays',
            label: t('settings.companies.compassMaxAdvance'),
            desc: t('settings.companies.compassMaxAdvanceDesc'),
            unit: t('settings.companies.compassDays'),
            min: 1,
            max: 90,
        },
        {
            key: 'checkInWindowMinutes',
            label: t('settings.companies.compassCheckInWindow'),
            desc: t('settings.companies.compassCheckInWindowDesc'),
            unit: t('settings.companies.compassMinutes'),
            min: 5,
            max: 60,
        },
        {
            key: 'autoReleaseMinutes',
            label: t('settings.companies.compassAutoRelease'),
            desc: t('settings.companies.compassAutoReleaseDesc'),
            unit: t('settings.companies.compassMinutes'),
            min: 5,
            max: 120,
        },
        {
            key: 'maxConcurrentBookings',
            label: t('settings.companies.compassMaxConcurrent'),
            desc: t('settings.companies.compassMaxConcurrentDesc'),
            unit: t('settings.companies.compassBookings'),
            min: 1,
            max: 5,
        },
    ];

    const durationConstraints = getDurationConstraints();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" variant="outlined">
                {t('settings.companies.compassConfigInfo')}
            </Alert>

            <Stack spacing={2.5}>
                {/* Max Duration — special field with mode selector */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        {t('settings.companies.compassMaxDuration')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        {t('settings.companies.compassMaxDurationDesc')}
                    </Typography>

                    <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', gap: 2 }}>
                        <ToggleButtonGroup
                            value={durationMode}
                            exclusive
                            onChange={handleDurationModeChange}
                            size="small"
                            sx={{ direction: 'ltr' }}
                        >
                            <ToggleButton value="minutes">{t('settings.companies.compassMinutes')}</ToggleButton>
                            <ToggleButton value="hours">{t('settings.companies.compassHours')}</ToggleButton>
                            <ToggleButton value="days">{t('settings.companies.compassDays')}</ToggleButton>
                            <ToggleButton value="fullDay">{t('settings.companies.compassFullDay')}</ToggleButton>
                        </ToggleButtonGroup>

                        {durationMode !== 'fullDay' && (
                            <TextField
                                type="number"
                                size="small"
                                value={getDurationDisplayValue()}
                                onChange={(e) => handleDurationValueChange(e.target.value)}
                                onBlur={() => {
                                    const val = config.maxDurationMinutes;
                                    if (val === '' as unknown as number || val === undefined || val < 30) {
                                        const defaults: Record<string, number> = { days: 1440, hours: 60, minutes: 30 };
                                        onUpdate({ ...config, maxDurationMinutes: defaults[durationMode] ?? 30 });
                                    }
                                }}
                                helperText={t('settings.companies.compassDurationRange', {
                                    min: durationConstraints.min,
                                    max: durationConstraints.max,
                                })}
                                slotProps={{
                                    htmlInput: {
                                        min: durationConstraints.min,
                                        max: durationConstraints.max,
                                    },
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                {durationConstraints.unit}
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                sx={{ maxWidth: 200 }}
                            />
                        )}

                        {durationMode === 'fullDay' && (
                            <Typography variant="body2" color="text.secondary">
                                {t('settings.companies.compassFullDayDesc')}
                            </Typography>
                        )}
                    </Stack>
                </Paper>

                {/* Other fields */}
                {otherFields.map((field) => (
                    <Paper key={field.key} variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                            {field.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            {field.desc}
                        </Typography>
                        <TextField
                            type="number"
                            size="small"
                            value={config[field.key]}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            onBlur={() => {
                                const val = config[field.key] as number | string | undefined;
                                if (val === '' || val === undefined || (typeof val === 'number' && val < field.min)) {
                                    onUpdate({ ...config, [field.key]: field.min });
                                }
                            }}
                            helperText={t('settings.companies.minValue', { min: field.min })}
                            slotProps={{
                                htmlInput: { min: field.min, max: field.max },
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">{field.unit}</InputAdornment>
                                    ),
                                },
                            }}
                            sx={{ maxWidth: 200 }}
                        />
                    </Paper>
                ))}
            </Stack>
        </Box>
    );
}
