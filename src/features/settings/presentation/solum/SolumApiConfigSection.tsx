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
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { SolumConfig } from '@shared/domain/types';
import { 
    AUTO_SYNC_MIN_INTERVAL, 
    AUTO_SYNC_MAX_INTERVAL, 
    AUTO_SYNC_DEFAULT_INTERVAL 
} from '@features/sync/infrastructure/syncStore';

interface SolumApiConfigSectionProps {
    solumConfig: Partial<SolumConfig>;
    autoSyncEnabled: boolean;
    autoSyncInterval?: number;
    isLocked: boolean;
    onConfigChange: (config: Partial<SolumConfig>) => void;
    onAutoSyncChange: (enabled: boolean) => void;
    onAutoSyncIntervalChange?: (interval: number) => void;
}

/**
 * SolumApiConfigSection - API cluster, base URL, and sync interval settings
 */
export function SolumApiConfigSection({
    solumConfig,
    autoSyncEnabled,
    autoSyncInterval = AUTO_SYNC_DEFAULT_INTERVAL,
    isLocked,
    onConfigChange,
    onAutoSyncChange,
    onAutoSyncIntervalChange,
}: SolumApiConfigSectionProps) {
    const { t } = useTranslation();
    
    // Local state for interval input to allow free typing
    const [localInterval, setLocalInterval] = useState<string>(String(autoSyncInterval));
    
    // Sync local state when prop changes (e.g., from store)
    useEffect(() => {
        setLocalInterval(String(autoSyncInterval));
    }, [autoSyncInterval]);

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

    // Handle typing - allow free input
    const handleIntervalInputChange = (value: string) => {
        setLocalInterval(value);
    };
    
    // Validate and save on blur
    const handleIntervalBlur = () => {
        const numValue = Number(localInterval);
        // Validate: minimum 10 seconds, maximum 3600 seconds
        const validatedInterval = Math.max(
            AUTO_SYNC_MIN_INTERVAL, 
            Math.min(AUTO_SYNC_MAX_INTERVAL, isNaN(numValue) ? AUTO_SYNC_DEFAULT_INTERVAL : numValue)
        );
        setLocalInterval(String(validatedInterval));
        onAutoSyncIntervalChange?.(validatedInterval);
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
                            data-testid="auto-sync-toggle"
                        />
                    }
                    label={<Typography variant="body2">{t('settings.enableAutoSync')}</Typography>}
                />

                {autoSyncEnabled && (
                    <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label={t('settings.autoSyncInterval')}
                        value={localInterval}
                        onChange={(e) => handleIntervalInputChange(e.target.value)}
                        onBlur={handleIntervalBlur}
                        helperText={t('settings.autoSyncIntervalHelp', { 
                            min: AUTO_SYNC_MIN_INTERVAL, 
                            max: AUTO_SYNC_MAX_INTERVAL,
                            default: AUTO_SYNC_DEFAULT_INTERVAL 
                        })}
                        slotProps={{
                            input: { 
                                inputProps: { 
                                    min: AUTO_SYNC_MIN_INTERVAL, 
                                    max: AUTO_SYNC_MAX_INTERVAL 
                                } 
                            }
                        }}
                        id="sync-interval"
                        name="syncInterval"
                    />
                )}
            </Stack>
        </Box>
    );
}
