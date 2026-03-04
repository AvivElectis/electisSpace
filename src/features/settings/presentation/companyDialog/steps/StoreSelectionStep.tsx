/**
 * Wizard Step 2: Multi-Store Selection from AIMS
 */
import {
    Box,
    TextField,
    Typography,
    Paper,
    Checkbox,
    Chip,
    Autocomplete,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AimsStoreInfo } from '@shared/infrastructure/services/companyService';
import type { WizardStoreData } from '../wizardTypes';

// Common timezones
const TIMEZONES = [
    'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
    'Asia/Jerusalem', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Australia/Sydney', 'Pacific/Auckland',
];

interface StoreSelectionStepProps {
    aimsStores: AimsStoreInfo[];
    selectedStores: WizardStoreData[];
    onUpdate: (stores: WizardStoreData[]) => void;
}

export function StoreSelectionStep({
    aimsStores,
    selectedStores,
    onUpdate,
}: StoreSelectionStepProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const isSelected = (code: string) => selectedStores.some(s => s.code === code);

    const handleToggle = (store: AimsStoreInfo) => {
        if (isSelected(store.code)) {
            onUpdate(selectedStores.filter(s => s.code !== store.code));
        } else {
            onUpdate([
                ...selectedStores,
                {
                    code: store.code,
                    name: store.name || store.code,
                    timezone: 'UTC',
                    labelCount: store.labelCount,
                    gatewayCount: store.gatewayCount,
                    selected: true,
                },
            ]);
        }
    };

    const handleFieldUpdate = (code: string, field: keyof WizardStoreData, value: string) => {
        onUpdate(
            selectedStores.map(s =>
                s.code === code ? { ...s, [field]: value } : s
            )
        );
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
                {t('settings.companies.selectAtLeastOneStore')}
            </Typography>

            <Typography variant="subtitle2" fontWeight={600}>
                {t('settings.companies.selectStore')} ({aimsStores.length})
            </Typography>

            <Box sx={{ maxHeight: 400, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                {aimsStores.map((store) => {
                    const selected = isSelected(store.code);
                    const storeData = selectedStores.find(s => s.code === store.code);

                    return (
                        <Paper
                            key={store.code}
                            elevation={0}
                            sx={{
                                p: 1.5,
                                borderBottom: 1,
                                borderColor: 'divider',
                                bgcolor: selected ? 'action.selected' : 'transparent',
                                '&:last-child': { borderBottom: 0 },
                            }}
                        >
                            {/* Store header row — clickable to toggle */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: isMobile ? 'flex-start' : 'center',
                                    gap: 1.5,
                                    cursor: 'pointer',
                                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                                }}
                                onClick={() => handleToggle(store)}
                            >
                                <Checkbox checked={selected} size="small" sx={{ p: 0, mt: isMobile ? 0.5 : 0 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={600} noWrap>
                                        {store.name || store.code}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {t('settings.companies.storeCode')}: {store.code}
                                        {store.city && ` · ${store.city}`}
                                        {store.country && `, ${store.country}`}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, ...(isMobile && { ms: 4, mt: 0.5 }) }}>
                                    <Chip size="small" label={`${store.labelCount} ${t('settings.companies.labelCount')}`} variant="outlined" />
                                    <Chip size="small" label={`${store.gatewayCount} ${t('settings.companies.gatewayCount')}`} variant="outlined" />
                                </Box>
                            </Box>

                            {/* Inline fields when selected */}
                            {selected && storeData && (
                                <Box sx={{
                                    mt: 1.5,
                                    ms: isMobile ? 0 : 4,
                                    display: 'flex',
                                    flexDirection: isMobile ? 'column' : 'row',
                                    gap: 1.5,
                                }}>
                                    <TextField
                                        label={t('settings.companies.storeName')}
                                        value={storeData.name}
                                        onChange={(e) => handleFieldUpdate(store.code, 'name', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1, minWidth: isMobile ? undefined : 180 }}
                                        inputProps={{ maxLength: 100 }}
                                    />
                                    <Autocomplete
                                        value={storeData.timezone}
                                        onChange={(_, v) => v && handleFieldUpdate(store.code, 'timezone', v)}
                                        options={TIMEZONES}
                                        size="small"
                                        sx={{ minWidth: isMobile ? undefined : 200 }}
                                        renderInput={(params) => (
                                            <TextField {...params} label={t('settings.companies.storeTimezone')} />
                                        )}
                                        freeSolo
                                        disableClearable
                                    />
                                </Box>
                            )}
                        </Paper>
                    );
                })}
            </Box>

            {selectedStores.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                    {t('settings.companies.storeSelected', { count: selectedStores.length })}
                </Typography>
            )}
        </Box>
    );
}
