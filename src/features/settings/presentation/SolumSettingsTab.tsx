import { Box, Stack, Divider, Typography, Tabs, Tab, Alert, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, Button, CircularProgress } from '@mui/material';
import { useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigurationController } from '@features/configuration/application/useConfigurationController';
import { useSyncContext } from '@features/sync/application/SyncContext';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { SolumFieldMappingTable } from './SolumFieldMappingTable';
import { SolumMappingSelectors } from './SolumMappingSelectors';
import { SolumGlobalFieldsEditor } from './SolumGlobalFieldsEditor';
import RefreshIcon from '@mui/icons-material/Refresh';

// Extracted components
import {
    SolumSyncSettingsSection,
    SolumPeopleManagerSection,
    SolumSchemaEditorSection,
} from './solum';

import type { SettingsData, SolumMappingConfig } from '../domain/types';
import type { CSVConfig } from '@shared/domain/types';

interface SolumSettingsTabProps {
    settings: SettingsData;
    onUpdate: (updates: Partial<SettingsData>) => void;
}

/**
 * SoluM Settings Tab
 * SoluM API configuration - AIMS credentials and field mappings are managed in Company Settings
 * This tab only contains: Auto-sync, Conference mode, People mode, and Field Mapping
 */
export function SolumSettingsTab({ settings, onUpdate }: SolumSettingsTabProps) {
    const { t } = useTranslation();
    const { articleFormat, fetchArticleFormat } = useConfigurationController();
    const { sync } = useSyncContext();
    const { activeCompanyId, reconnectToSolum } = useAuthStore();
    const { isCompanyAdmin, isPlatformAdmin } = useAuthContext();
    const { saveCompanySettingsToServer, saveFieldMappingsToServer } = useSettingsStore();
    const canManageCompanySettings = isCompanyAdmin || isPlatformAdmin;
    const [subTab, setSubTab] = useState(0);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectError, setReconnectError] = useState<string | null>(null);

    // Extract field keys from article format (ONLY articleData, not articleBasicInfo)
    const articleFormatFields = useMemo(() => {
        if (!articleFormat) return [];
        return articleFormat.articleData || [];
    }, [articleFormat]);

    // Debounced auto-save for field mappings to server
    const saveFieldMappingsDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveFieldMappings = useCallback(() => {
        if (saveFieldMappingsDebounceRef.current) {
            clearTimeout(saveFieldMappingsDebounceRef.current);
        }
        saveFieldMappingsDebounceRef.current = setTimeout(() => {
            saveFieldMappingsToServer();
        }, 1000); // 1 second debounce
    }, [saveFieldMappingsToServer]);

    // Helper: update field mappings locally AND trigger debounced server save
    const updateFieldMappings = useCallback((config: SolumMappingConfig) => {
        onUpdate({ solumMappingConfig: config });
        // Schedule debounced save (timeout will use latest store state)
        autoSaveFieldMappings();
    }, [onUpdate, autoSaveFieldMappings]);

    // Connection status is now server-managed
    // The solumConfig.isConnected is set by autoConnectToSolum in authStore after login
    const isConnected = settings.solumConfig?.isConnected || false;
    
    // All settings locked when not connected
    const isLocked = !isConnected;

    // Callback for initial sync after successful connection
    // Fetches schema first (if not already fetched) to populate field mappings, then syncs
    const handleConnectionEstablished = useCallback(async () => {
        // Fetch article format schema to get field mappings
        // This populates solumMappingConfig.fields which is needed for displaying columns
        if (!settings.solumMappingConfig?.fields || Object.keys(settings.solumMappingConfig.fields).length === 0) {
            await fetchArticleFormat();
        }
        // Now sync the data
        await sync();
    }, [sync, fetchArticleFormat, settings.solumMappingConfig?.fields]);

    // Handlers for nested component updates
    const handleCsvConfigChange = (config: CSVConfig) => {
        onUpdate({ csvConfig: config });
        // Conference mode is company-level - save to company settings
        saveCompanySettingsToServer({ csvConfig: config });
    };

    const handlePeopleManagerEnabledChange = (enabled: boolean) => {
        onUpdate({ peopleManagerEnabled: enabled });
        // People manager mode is company-level
        saveCompanySettingsToServer({ peopleManagerEnabled: enabled });
    };

    const handlePeopleManagerConfigChange = (config: Partial<{ totalSpaces: number }>) => {
        const updatedConfig = { 
            totalSpaces: config.totalSpaces ?? settings.peopleManagerConfig?.totalSpaces ?? 0 
        };
        onUpdate({ peopleManagerConfig: updatedConfig });
        // People manager config is company-level
        saveCompanySettingsToServer({ peopleManagerConfig: updatedConfig });
    };

    const handleAutoSyncChange = (enabled: boolean) => {
        onUpdate({ autoSyncEnabled: enabled });
        // Auto-sync is company-level
        saveCompanySettingsToServer({ autoSyncEnabled: enabled });
    };

    const handleAutoSyncIntervalChange = (interval: number) => {
        onUpdate({ autoSyncInterval: interval });
        // Auto-sync interval is company-level
        saveCompanySettingsToServer({ autoSyncInterval: interval });
    };

    // Handle reconnect to SOLUM
    const handleReconnect = useCallback(async () => {
        setIsReconnecting(true);
        setReconnectError(null);
        try {
            // Check if we have a store selected, if not try to auto-select one
            let { activeStoreId, user, setActiveStore } = useAuthStore.getState();
            
            if (!activeStoreId && user?.stores && user.stores.length > 0) {
                // Auto-select the first available store
                const firstStoreId = user.stores[0].id;
                await setActiveStore(firstStoreId);
                // setActiveStore calls autoConnectToSolum internally
                // Wait for settings to propagate
                await new Promise(resolve => setTimeout(resolve, 1000));
                // The parent component will re-fetch settings on store change
                // Check if connection is now established
                const { settings: newSettings } = useSettingsStore.getState();
                if (newSettings.solumConfig?.isConnected) {
                    // Successfully connected after auto-selecting store
                    return;
                }
                // Auto-connect attempt completed but not connected - show error
                setReconnectError(t('settings.reconnectFailed', 'Failed to connect. Please check AIMS credentials in Company Settings.'));
                return;
            }
            
            if (!activeStoreId) {
                // Still no store - user has no stores available
                setReconnectError(t('settings.noStoreSelected', 'No store selected. Please select a store from the header menu.'));
                return;
            }
            
            const success = await reconnectToSolum();
            if (!success) {
                setReconnectError(t('settings.reconnectFailed', 'Failed to connect. Please check AIMS credentials in Company Settings.'));
            }
        } catch {
            setReconnectError(t('settings.reconnectFailed', 'Failed to connect. Please check AIMS credentials in Company Settings.'));
        } finally {
            setIsReconnecting(false);
        }
    }, [reconnectToSolum, t]);

    // Auto-sync interval options: 10-60 seconds in 10s gaps, then minute gaps up to 5 minutes
    const syncIntervalOptions = [
        { value: 10, label: '10 ' + t('settings.seconds', 'seconds') },
        { value: 20, label: '20 ' + t('settings.seconds', 'seconds') },
        { value: 30, label: '30 ' + t('settings.seconds', 'seconds') },
        { value: 40, label: '40 ' + t('settings.seconds', 'seconds') },
        { value: 50, label: '50 ' + t('settings.seconds', 'seconds') },
        { value: 60, label: '1 ' + t('settings.minute', 'minute') },
        { value: 120, label: '2 ' + t('settings.minutes', 'minutes') },
        { value: 180, label: '3 ' + t('settings.minutes', 'minutes') },
        { value: 240, label: '4 ' + t('settings.minutes', 'minutes') },
        { value: 300, label: '5 ' + t('settings.minutes', 'minutes') },
    ];

    return (
        <Box sx={{ px: 2, maxWidth: 800, mx: 'auto' }}>
            {/* Connection Status Alert - always visible */}
            {isConnected ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {t('settings.connectedToSolumServer', 'Connected to AIMS via server. Credentials and field mappings are managed in Company Settings.')}
                </Alert>
            ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {t('settings.notConnectedToSolum', 'Not connected to AIMS. Please configure AIMS credentials in Company Settings and re-login. Settings are locked until connected.')}
                </Alert>
            )}

            {/* Nested Tabs for Settings and Field Mapping */}
            <Tabs
                value={subTab}
                onChange={(_, newValue) => setSubTab(newValue)}
                sx={{
                    borderBottom: 0,
                    '& .MuiTab-root': {
                        border: '1px solid transparent',
                        borderRadius: 2,
                        '&.Mui-selected': {
                            border: '1px solid',
                            borderColor: 'primary',
                            boxShadow: '2px 0 1px 1px rgba(68, 68, 68, 0.09)',
                        },
                    },
                }}
                slotProps={{
                    indicator: { sx: { display: 'none' } }
                }}
            >
                <Tab label={t('settings.connectionTab')} disabled={isLocked} />
                {canManageCompanySettings && (
                    <Tab label={t('settings.fieldMappingTab')} disabled={isLocked} />
                )}
            </Tabs>

            {/* Locked overlay message when not connected */}
            {isLocked && (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.solumSettingsLocked', 'SoluM settings are locked. Connect to AIMS to enable configuration.')}
                    </Typography>
                    
                    <Button
                        variant="contained"
                        startIcon={isReconnecting ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                        onClick={handleReconnect}
                        disabled={isReconnecting}
                    >
                        {isReconnecting 
                            ? t('settings.connecting', 'Connecting...') 
                            : t('settings.retryConnection', 'Retry Connection')}
                    </Button>
                    
                    {reconnectError && (
                        <Alert severity="error" sx={{ mt: 2, mx: 'auto', maxWidth: 400 }}>
                            {reconnectError}
                        </Alert>
                    )}
                </Box>
            )}

            {/* Connection/Settings Tab - only show when connected */}
            {!isLocked && subTab === 0 && (
                <Stack gap={2} sx={{ mt: 2 }}>
                    {/* Auto Sync Setting */}
                    <Box>
                        <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}
                        >
                            {t('settings.syncSettings', 'Sync Settings')}
                        </Typography>
                        <Stack gap={2}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.autoSyncEnabled || false}
                                        onChange={(e) => handleAutoSyncChange(e.target.checked)}
                                    />
                                }
                                label={t('settings.enableAutoSync')}
                            />
                            
                            {settings.autoSyncEnabled && (
                                <FormControl size="small" sx={{ minWidth: 200 }}>
                                    <InputLabel>{t('settings.syncInterval', 'Sync Interval')}</InputLabel>
                                    <Select
                                        value={settings.autoSyncInterval || 10}
                                        label={t('settings.syncInterval', 'Sync Interval')}
                                        onChange={(e) => handleAutoSyncIntervalChange(Number(e.target.value))}
                                    >
                                        {syncIntervalOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Conference Mode - Company admins only */}
                    {canManageCompanySettings && (
                        <SolumSyncSettingsSection
                            csvConfig={settings.csvConfig || {}}
                            onConfigChange={handleCsvConfigChange}
                        />
                    )}

                    <Divider />

                    {/* People Manager Mode */}
                    <SolumPeopleManagerSection
                        enabled={settings.peopleManagerEnabled || false}
                        config={settings.peopleManagerConfig || {}}
                        articleFormat={articleFormat}
                        onEnabledChange={handlePeopleManagerEnabledChange}
                        onConfigChange={handlePeopleManagerConfigChange}
                    />
                </Stack>
            )}

            {/* Field Mapping Tab - only show when connected and user is company admin */}
            {!isLocked && canManageCompanySettings && subTab === 1 && (
                <Stack gap={2} sx={{ mt: 2 }}>
                    <SolumSchemaEditorSection
                        articleFormat={articleFormat}
                        isConnected={isConnected}
                    />

                    {/* Data Mapping - shown only when article format exists */}
                    {articleFormatFields.length > 0 && (
                        <>
                            <Divider />

                            <Box>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                    sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}
                                >
                                    {t('settings.dataMapping')}
                                </Typography>

                                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                    {t('settings.dataMappingHelp')}
                                </Typography>

                                {/* Field Mapping Selectors */}
                                <SolumMappingSelectors
                                    articleFormatFields={articleFormatFields}
                                    uniqueIdField={settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0]}
                                    conferenceMapping={
                                        settings.solumMappingConfig?.conferenceMapping || {
                                            meetingName: articleFormatFields[0] || '',
                                            meetingTime: articleFormatFields[0] || '',
                                            participants: articleFormatFields[0] || '',
                                        }
                                    }
                                    onUniqueIdChange={(field) =>
                                        updateFieldMappings({
                                            ...settings.solumMappingConfig,
                                            uniqueIdField: field,
                                            fields: settings.solumMappingConfig?.fields || {},
                                            conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                meetingName: '',
                                                meetingTime: '',
                                                participants: '',
                                            },
                                        })
                                    }
                                    onConferenceMappingChange={(mapping) =>
                                        updateFieldMappings({
                                            ...settings.solumMappingConfig,
                                            uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                            fields: settings.solumMappingConfig?.fields || {},
                                            conferenceMapping: mapping,
                                        })
                                    }
                                    mappingInfo={settings.solumMappingConfig?.mappingInfo}
                                    onMappingInfoChange={(newMappingInfo) =>
                                        updateFieldMappings({
                                            ...settings.solumMappingConfig,
                                            uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                            fields: settings.solumMappingConfig?.fields || {},
                                            conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                meetingName: '',
                                                meetingTime: '',
                                                participants: '',
                                            },
                                            mappingInfo: newMappingInfo,
                                        })
                                    }
                                    disabled={false}
                                />

                                {/* Global Field Assignments */}
                                <Box sx={{ mt: 3 }}>
                                    <SolumGlobalFieldsEditor
                                        articleFormatFields={articleFormatFields}
                                        globalAssignments={settings.solumMappingConfig?.globalFieldAssignments || {}}
                                        onChange={(assignments) =>
                                            updateFieldMappings({
                                                ...settings.solumMappingConfig,
                                                uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                                fields: settings.solumMappingConfig?.fields || {},
                                                conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                    meetingName: '',
                                                    meetingTime: '',
                                                    participants: '',
                                                },
                                                globalFieldAssignments: assignments,
                                            })
                                        }
                                        disabled={false}
                                    />
                                </Box>

                                {/* Field Mapping Table */}
                                <Box sx={{ mt: 3 }}>
                                    <Typography
                                        variant="subtitle2"
                                        color="text.secondary"
                                        sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}
                                    >
                                        {t('settings.fieldFriendlyNames')}
                                    </Typography>
                                    <SolumFieldMappingTable
                                        articleFormatFields={articleFormatFields}
                                        mappings={settings.solumMappingConfig?.fields || {}}
                                        excludeFields={[
                                            ...Object.keys(settings.solumMappingConfig?.globalFieldAssignments || {}),
                                            ...(settings.solumMappingConfig?.mappingInfo?.articleId ? [settings.solumMappingConfig.mappingInfo.articleId] : []),
                                            ...(settings.solumMappingConfig?.mappingInfo?.articleName ? [settings.solumMappingConfig.mappingInfo.articleName] : []),
                                        ]}
                                        onChange={(mappings) =>
                                            updateFieldMappings({
                                                ...settings.solumMappingConfig,
                                                uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                                conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                    meetingName: '',
                                                    meetingTime: '',
                                                    participants: '',
                                                },
                                                fields: mappings,
                                            })
                                        }
                                        disabled={false}
                                    />
                                </Box>
                            </Box>
                        </>
                    )}
                </Stack>
            )}
        </Box>
    );
}
