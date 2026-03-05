/**
 * Wizard Step: Compass Configuration
 * Shown when compassEnabled is ON. Sets default booking rules.
 */
import {
    Box,
    Typography,
    TextField,
    Paper,
    Stack,
    Alert,
    InputAdornment,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CompassConfig } from '../wizardTypes';

interface CompassConfigStepProps {
    config: CompassConfig;
    onUpdate: (config: CompassConfig) => void;
}

export function CompassConfigStep({ config, onUpdate }: CompassConfigStepProps) {
    const { t } = useTranslation();

    const handleChange = (key: keyof CompassConfig, value: string) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) return;
        onUpdate({ ...config, [key]: num });
    };

    const fields: Array<{
        key: keyof CompassConfig;
        label: string;
        desc: string;
        unit: string;
        min: number;
        max: number;
    }> = [
        {
            key: 'maxDurationMinutes',
            label: t('settings.companies.compassMaxDuration'),
            desc: t('settings.companies.compassMaxDurationDesc'),
            unit: t('settings.companies.compassMinutes'),
            min: 30,
            max: 1440,
        },
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" variant="outlined">
                {t('settings.companies.compassConfigInfo')}
            </Alert>

            <Stack spacing={1.5}>
                {fields.map((field) => (
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
