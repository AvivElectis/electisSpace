import {
    Box,
    TextField,
    Stack,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SolumConfig } from '@shared/domain/types';

interface SolumApiConfigSectionProps {
    solumConfig: Partial<SolumConfig>;
    autoSyncEnabled: boolean;
    isLocked: boolean;
    onConfigChange: (config: Partial<SolumConfig>) => void;
    onAutoSyncChange: (enabled: boolean) => void;
}

/**
 * SolumApiConfigSection - API cluster, base URL, and sync interval settings
 */
export function SolumApiConfigSection({
    solumConfig,
    autoSyncEnabled,
    isLocked,
    onConfigChange,
    onAutoSyncChange,
}: SolumApiConfigSectionProps) {
    const { t } = useTranslation();

    const updateConfig = (updates: Partial<SolumConfig>) => {
        onConfigChange({
            ...solumConfig,
            companyName: solumConfig.companyName || '',
            username: solumConfig.username || '',
            password: solumConfig.password || '',
            storeNumber: solumConfig.storeNumber || '',
            cluster: solumConfig.cluster || 'common',
            baseUrl: solumConfig.baseUrl || '',
            syncInterval: solumConfig.syncInterval || 60,
            ...updates,
        });
    };

    return (
        <Box>
            <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}
            >
                {t('settings.solumApiConfig')}
            </Typography>
            <Stack gap={1.5}>
                <FormControl fullWidth size="small" disabled={isLocked}>
                    <InputLabel>{t('settings.apiCluster')}</InputLabel>
                    <Select
                        value={solumConfig.cluster || 'common'}
                        label={t('settings.apiCluster')}
                        onChange={(e) => updateConfig({ cluster: e.target.value as 'common' | 'c1' })}
                    >
                        <MenuItem value="common">{t('settings.commonCluster')}</MenuItem>
                        <MenuItem value="c1">{t('settings.c1Cluster')}</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    fullWidth
                    size="small"
                    label={t('settings.baseUrl')}
                    value={solumConfig.baseUrl || ''}
                    onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                    placeholder="https://eu.common.solumesl.com"
                    disabled={isLocked}
                />

                <FormControlLabel
                    control={
                        <Switch
                            size="small"
                            checked={autoSyncEnabled}
                            onChange={(e) => onAutoSyncChange(e.target.checked)}
                        />
                    }
                    label={<Typography variant="body2">{t('settings.enableAutoSync')}</Typography>}
                />

                {autoSyncEnabled && (
                    <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label={t('settings.syncInterval')}
                        value={solumConfig.syncInterval || 60}
                        onChange={(e) => updateConfig({ syncInterval: Math.max(60, Number(e.target.value)) })}
                        InputProps={{ inputProps: { min: 60 } }}
                        helperText={t('settings.syncIntervalHelp')}
                        disabled={isLocked}
                    />
                )}
            </Stack>
        </Box>
    );
}
