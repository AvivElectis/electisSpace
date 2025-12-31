import { Box, Stack, Divider, Typography, Tabs, Tab, Alert } from '@mui/material';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigurationController } from '@features/configuration/application/useConfigurationController';
import { SolumFieldMappingTable } from './SolumFieldMappingTable';
import { SolumMappingSelectors } from './SolumMappingSelectors';
import { SolumGlobalFieldsEditor } from './SolumGlobalFieldsEditor';

// Extracted components
import {
    SolumApiConfigSection,
    SolumCredentialsSection,
    SolumSyncSettingsSection,
    SolumPeopleManagerSection,
    SolumSchemaEditorSection,
} from './solum';

import type { SettingsData, SolumConfig, CSVConfig, PeopleManagerConfig } from '../domain/types';

interface SolumSettingsTabProps {
    settings: SettingsData;
    onUpdate: (updates: Partial<SettingsData>) => void;
}

/**
 * SoluM Settings Tab
 * SoluM API configuration - Refactored to use extracted sub-components
 */
export function SolumSettingsTab({ settings, onUpdate }: SolumSettingsTabProps) {
    const { t } = useTranslation();
    const { articleFormat } = useConfigurationController();
    const [subTab, setSubTab] = useState(0);

    // Extract field keys from article format (ONLY articleData, not articleBasicInfo)
    const articleFormatFields = useMemo(() => {
        if (!articleFormat) return [];
        return articleFormat.articleData || [];
    }, [articleFormat]);

    // Input locking for credentials: disable when connected
    const isCredentialsLocked = settings.solumConfig?.isConnected || false;
    const isMappingLocked = !settings.solumConfig?.isConnected;

    // Handlers for nested component updates
    const handleSolumConfigChange = (config: Partial<SolumConfig>) => {
        onUpdate({ solumConfig: config as SolumConfig });
    };

    const handleCsvConfigChange = (config: CSVConfig) => {
        onUpdate({ csvConfig: config });
    };

    const handlePeopleManagerEnabledChange = (enabled: boolean) => {
        onUpdate({ peopleManagerEnabled: enabled });
    };

    const handlePeopleManagerConfigChange = (config: Partial<PeopleManagerConfig>) => {
        onUpdate({ peopleManagerConfig: config });
    };

    return (
        <Box sx={{ px: 2, maxWidth: 800, mx: 'auto' }}>
            {/* Nested Tabs for Connection and Field Mapping */}
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
                TabIndicatorProps={{ sx: { display: 'none' } }}
            >
                <Tab label={t('settings.connectionTab')} />
                <Tab label={t('settings.fieldMappingTab')} disabled={!settings.solumConfig?.isConnected} />
            </Tabs>

            {/* Connection Tab */}
            {subTab === 0 && (
                <Stack gap={2}>
                    <SolumApiConfigSection
                        solumConfig={settings.solumConfig || {}}
                        autoSyncEnabled={settings.autoSyncEnabled}
                        isLocked={isCredentialsLocked}
                        onConfigChange={handleSolumConfigChange}
                        onAutoSyncChange={(enabled) => onUpdate({ autoSyncEnabled: enabled })}
                    />

                    <Divider />

                    <SolumCredentialsSection
                        solumConfig={settings.solumConfig || {}}
                        isConnected={settings.solumConfig?.isConnected || false}
                        isLocked={isCredentialsLocked}
                        onConfigChange={handleSolumConfigChange}
                    />

                    <Divider />

                    <SolumSyncSettingsSection
                        csvConfig={settings.csvConfig || {}}
                        onConfigChange={handleCsvConfigChange}
                    />

                    <Divider />

                    <SolumPeopleManagerSection
                        enabled={settings.peopleManagerEnabled || false}
                        config={settings.peopleManagerConfig || {}}
                        onEnabledChange={handlePeopleManagerEnabledChange}
                        onConfigChange={handlePeopleManagerConfigChange}
                    />
                </Stack>
            )}

            {/* Field Mapping Tab */}
            {subTab === 1 && (
                <Stack gap={2}>
                    <SolumSchemaEditorSection
                        articleFormat={articleFormat}
                        isConnected={settings.solumConfig?.isConnected || false}
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
                                        onUpdate({
                                            solumMappingConfig: {
                                                ...settings.solumMappingConfig,
                                                uniqueIdField: field,
                                                fields: settings.solumMappingConfig?.fields || {},
                                                conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                    meetingName: '',
                                                    meetingTime: '',
                                                    participants: '',
                                                },
                                            },
                                        })
                                    }
                                    onConferenceMappingChange={(mapping) =>
                                        onUpdate({
                                            solumMappingConfig: {
                                                ...settings.solumMappingConfig,
                                                uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                                fields: settings.solumMappingConfig?.fields || {},
                                                conferenceMapping: mapping,
                                            },
                                        })
                                    }
                                    mappingInfo={settings.solumMappingConfig?.mappingInfo}
                                    onMappingInfoChange={(newMappingInfo) =>
                                        onUpdate({
                                            solumMappingConfig: {
                                                ...settings.solumMappingConfig,
                                                uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                                fields: settings.solumMappingConfig?.fields || {},
                                                conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                    meetingName: '',
                                                    meetingTime: '',
                                                    participants: '',
                                                },
                                                mappingInfo: newMappingInfo,
                                            },
                                        })
                                    }
                                    disabled={isMappingLocked}
                                />

                                {/* Global Field Assignments */}
                                <Box sx={{ mt: 3 }}>
                                    <SolumGlobalFieldsEditor
                                        articleFormatFields={articleFormatFields}
                                        globalAssignments={settings.solumMappingConfig?.globalFieldAssignments || {}}
                                        onChange={(assignments) =>
                                            onUpdate({
                                                solumMappingConfig: {
                                                    ...settings.solumMappingConfig,
                                                    uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                                    fields: settings.solumMappingConfig?.fields || {},
                                                    conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                        meetingName: '',
                                                        meetingTime: '',
                                                        participants: '',
                                                    },
                                                    globalFieldAssignments: assignments,
                                                },
                                            })
                                        }
                                        disabled={isMappingLocked}
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
                                        excludeFields={Object.keys(settings.solumMappingConfig?.globalFieldAssignments || {})}
                                        onChange={(mappings) =>
                                            onUpdate({
                                                solumMappingConfig: {
                                                    ...settings.solumMappingConfig,
                                                    uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                                    conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                        meetingName: '',
                                                        meetingTime: '',
                                                        participants: '',
                                                    },
                                                    fields: mappings,
                                                },
                                            })
                                        }
                                        disabled={isMappingLocked}
                                    />
                                </Box>

                                {isMappingLocked && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        {t('settings.connectToEditMapping')}
                                    </Alert>
                                )}
                            </Box>
                        </>
                    )}
                </Stack>
            )}
        </Box>
    );
}
