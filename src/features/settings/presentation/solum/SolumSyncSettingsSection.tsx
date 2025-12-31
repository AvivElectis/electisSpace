import { Box, Stack, Typography, FormControlLabel, Switch } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CSVConfig } from '@shared/domain/types';

interface SolumSyncSettingsSectionProps {
    csvConfig: Partial<CSVConfig>;
    onConfigChange: (config: CSVConfig) => void;
}

/**
 * SolumSyncSettingsSection - Synchronization settings like conference mode
 */
export function SolumSyncSettingsSection({
    csvConfig,
    onConfigChange,
}: SolumSyncSettingsSectionProps) {
    const { t } = useTranslation();

    const handleConferenceModeChange = (enabled: boolean) => {
        onConfigChange({
            delimiter: csvConfig.delimiter || ',',
            columns: csvConfig.columns || [],
            mapping: csvConfig.mapping || {},
            conferenceEnabled: enabled,
        });
    };

    return (
        <Box>
            <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}
            >
                {t('settings.synchronization')}
            </Typography>
            <Stack gap={1.5}>
                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={csvConfig.conferenceEnabled || false}
                            onChange={(e) => handleConferenceModeChange(e.target.checked)}
                        />
                    }
                    label={<Typography variant="body2">{t('settings.simpleConferenceMode')}</Typography>}
                />

                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: '-8px !important', ml: '38px !important' }}
                >
                    {t('settings.simpleConferenceModeDesc')}
                </Typography>
            </Stack>
        </Box>
    );
}
