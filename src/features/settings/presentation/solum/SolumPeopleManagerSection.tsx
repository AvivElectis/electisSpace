import { Box, TextField, Stack, Typography, FormControlLabel, Switch } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface PeopleManagerConfig {
    totalSpaces: number;
}

interface SolumPeopleManagerSectionProps {
    enabled: boolean;
    config: Partial<PeopleManagerConfig>;
    onEnabledChange: (enabled: boolean) => void;
    onConfigChange: (config: Partial<PeopleManagerConfig>) => void;
}

/**
 * SolumPeopleManagerSection - People Manager mode toggle and configuration
 */
export function SolumPeopleManagerSection({
    enabled,
    config,
    onEnabledChange,
    onConfigChange,
}: SolumPeopleManagerSectionProps) {
    const { t } = useTranslation();

    return (
        <Box>
            <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}
            >
                {t('settings.peopleManager.title')}
            </Typography>
            <Stack gap={1.5}>
                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={enabled}
                            onChange={(e) => onEnabledChange(e.target.checked)}
                        />
                    }
                    label={
                        <Typography variant="body2">{t('settings.peopleManager.enable')}</Typography>
                    }
                />

                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: '-8px !important', ml: '38px !important' }}
                >
                    {t('settings.peopleManager.description')}
                </Typography>

                {enabled && (
                    <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label={t('settings.peopleManager.totalSpaces')}
                        value={config.totalSpaces || 0}
                        onChange={(e) =>
                            onConfigChange({
                                ...config,
                                totalSpaces: parseInt(e.target.value, 10) || 0,
                            })
                        }
                        helperText={t('settings.peopleManager.totalSpacesHelp')}
                        slotProps={{
                            htmlInput: { min: 0 }
                        }}
                    />
                )}
            </Stack>
        </Box>
    );
}
