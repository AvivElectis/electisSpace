import {
    Box,
    TextField,
    Stack,
    Typography,
    Divider,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Alert,
    Tabs,
    Tab,
} from '@mui/material';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@shared/infrastructure/store/rootStore';
import { useSettingsController } from '../application/useSettingsController';
import { useConfigurationController } from '@features/configuration/application/useConfigurationController';
import { ArticleFormatEditor } from '@features/configuration/presentation/ArticleFormatEditor';
import { SolumFieldMappingTable } from './SolumFieldMappingTable';
import { SolumMappingSelectors } from './SolumMappingSelectors';
import { SolumGlobalFieldsEditor } from './SolumGlobalFieldsEditor';
import type { SettingsData } from '../domain/types';

interface SolumSettingsTabProps {
    settings: SettingsData;
    onUpdate: (updates: Partial<SettingsData>) => void;
}

/**
 * SoluM Settings Tab
 * SoluM API configuration
 */
export function SolumSettingsTab({ settings, onUpdate }: SolumSettingsTabProps) {
    const { t } = useTranslation();
    const { showSuccess, showError } = useNotifications();
    const { articleFormat, fetchArticleFormat, saveArticleFormat } = useConfigurationController();
    const { connectToSolum, disconnectFromSolum } = useSettingsController();
    const [fetchingSchema, setFetchingSchema] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [subTab, setSubTab] = useState(0); // Nested tab state

    // Extract field keys from article format (ONLY articleData, not articleBasicInfo)
    const articleFormatFields = useMemo(() => {
        if (!articleFormat) return [];
        // Issue #4: Only show articleData fields, not articleBasicInfo
        return articleFormat.articleData || [];
    }, [articleFormat]);

    // Input locking for credentials: disable when connected
    // Issue #2: Field mapping should be EDITABLE when connected, NOT locked
    const isCredentialsLocked = settings.solumConfig?.isConnected || false;
    const isMappingLocked = !settings.solumConfig?.isConnected; // Opposite: locked when NOT connected

    const handleFetchSchema = async () => {
        setFetchingSchema(true);
        try {
            await fetchArticleFormat();
            showSuccess(t('settings.schemaFetchedSuccess'));
        } catch (error) {
            showError(t('settings.schemaFetchedError', { error: String(error) }));
        } finally {
            setFetchingSchema(false);
        }
    };

    return (
        <Box sx={{ px: 2, maxWidth: 800, mx: 'auto' }}>
            {/* Nested Tabs for Connection and Field Mapping */}
            <Tabs value={subTab} onChange={(_, newValue) => setSubTab(newValue)} sx={{ mb: 2 }}>
                <Tab label={t('settings.connectionTab')} />
                <Tab label={t('settings.fieldMappingTab')} disabled={!settings.solumConfig?.isConnected} />
            </Tabs>

            {/* Connection Tab */}
            {subTab === 0 && (
                <Stack spacing={2}>
                    {/* API Configuration */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('settings.solumApiConfig')}
                        </Typography>
                        <Stack spacing={1.5}>
                            <FormControl fullWidth size="small" disabled={isCredentialsLocked}>
                                <InputLabel>{t('settings.apiCluster')}</InputLabel>
                                <Select
                                    value={settings.solumConfig?.cluster || 'common'}
                                    label={t('settings.apiCluster')}
                                    onChange={(e) => onUpdate({
                                        solumConfig: {
                                            ...settings.solumConfig,
                                            companyName: settings.solumConfig?.companyName || '',
                                            username: settings.solumConfig?.username || '',
                                            password: settings.solumConfig?.password || '',
                                            storeNumber: settings.solumConfig?.storeNumber || '',
                                            cluster: e.target.value as 'common' | 'c1',
                                            baseUrl: settings.solumConfig?.baseUrl || '',
                                            syncInterval: settings.solumConfig?.syncInterval || 60,
                                        }
                                    })}
                                >
                                    <MenuItem value="common">{t('settings.commonCluster')}</MenuItem>
                                    <MenuItem value="c1">{t('settings.c1Cluster')}</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                size="small"
                                label={t('settings.baseUrl')}
                                value={settings.solumConfig?.baseUrl || ''}
                                onChange={(e) => onUpdate({
                                    solumConfig: {
                                        ...settings.solumConfig,
                                        companyName: settings.solumConfig?.companyName || '',
                                        username: settings.solumConfig?.username || '',
                                        password: settings.solumConfig?.password || '',
                                        storeNumber: settings.solumConfig?.storeNumber || '',
                                        cluster: settings.solumConfig?.cluster || 'common',
                                        baseUrl: e.target.value,
                                        syncInterval: settings.solumConfig?.syncInterval || 60,
                                    }
                                })}
                                placeholder="https://eu.common.solumesl.com"
                                disabled={isCredentialsLocked}
                            />
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Credentials */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('settings.authentication')}
                        </Typography>
                        <Stack spacing={1.5}>
                            <TextField
                                fullWidth
                                size="small"
                                label={t('settings.companyCode')}
                                value={settings.solumConfig?.companyName || ''}
                                onChange={(e) => onUpdate({
                                    solumConfig: {
                                        ...settings.solumConfig,
                                        companyName: e.target.value,
                                        username: settings.solumConfig?.username || '',
                                        password: settings.solumConfig?.password || '',
                                        storeNumber: settings.solumConfig?.storeNumber || '',
                                        cluster: settings.solumConfig?.cluster || 'common',
                                        baseUrl: settings.solumConfig?.baseUrl || '',
                                        syncInterval: settings.solumConfig?.syncInterval || 60,
                                    }
                                })}
                                disabled={isCredentialsLocked}
                            />

                            <TextField
                                fullWidth
                                size="small"
                                label={t('settings.storeNumber')}
                                value={settings.solumConfig?.storeNumber || ''}
                                onChange={(e) => onUpdate({
                                    solumConfig: {
                                        ...settings.solumConfig,
                                        companyName: settings.solumConfig?.companyName || '',
                                        username: settings.solumConfig?.username || '',
                                        password: settings.solumConfig?.password || '',
                                        storeNumber: e.target.value,
                                        cluster: settings.solumConfig?.cluster || 'common',
                                        baseUrl: settings.solumConfig?.baseUrl || '',
                                        syncInterval: settings.solumConfig?.syncInterval || 60,
                                    }
                                })}
                                disabled={isCredentialsLocked}
                            />

                            <TextField
                                fullWidth
                                size="small"
                                label={t('settings.username')}
                                value={settings.solumConfig?.username || ''}
                                onChange={(e) => onUpdate({
                                    solumConfig: {
                                        ...settings.solumConfig,
                                        companyName: settings.solumConfig?.companyName || '',
                                        username: e.target.value,
                                        password: settings.solumConfig?.password || '',
                                        storeNumber: settings.solumConfig?.storeNumber || '',
                                        cluster: settings.solumConfig?.cluster || 'common',
                                        baseUrl: settings.solumConfig?.baseUrl || '',
                                        syncInterval: settings.solumConfig?.syncInterval || 60,
                                    }
                                })}
                                disabled={isCredentialsLocked}
                            />

                            <TextField
                                fullWidth
                                size="small"
                                type="password"
                                label={t('settings.password')}
                                value={settings.solumConfig?.password || ''}
                                onChange={(e) => onUpdate({
                                    solumConfig: {
                                        ...settings.solumConfig,
                                        companyName: settings.solumConfig?.companyName || '',
                                        username: settings.solumConfig?.username || '',
                                        password: e.target.value,
                                        storeNumber: settings.solumConfig?.storeNumber || '',
                                        cluster: settings.solumConfig?.cluster || 'common',
                                        baseUrl: settings.solumConfig?.baseUrl || '',
                                        syncInterval: settings.solumConfig?.syncInterval || 60,
                                    }
                                })}
                                disabled={isCredentialsLocked}
                            />

                            {settings.solumConfig?.isConnected ? (
                                <>
                                    <Alert severity="success" sx={{ py: 0, px: 2, alignItems: 'center' }}>
                                        {t('settings.connectedToSolum')}
                                    </Alert>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => {
                                            disconnectFromSolum();
                                            showSuccess(t('settings.disconnected'));
                                        }}
                                        sx={{ width: 'fit-content' }}
                                    >
                                        {t('settings.disconnect')}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={async () => {
                                        setConnecting(true);
                                        try {
                                            await connectToSolum();
                                            showSuccess(t('settings.connectionSuccess'));
                                        } catch (error) {
                                            showError(t('settings.connectionError', {
                                                error: error instanceof Error ? error.message : String(error)
                                            }));
                                        } finally {
                                            setConnecting(false);
                                        }
                                    }}
                                    disabled={connecting}
                                    sx={{ width: 'fit-content' }}
                                >
                                    {connecting ? t('settings.connecting') : t('settings.connect')}
                                </Button>
                            )}
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Sync Settings */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('settings.synchronization')}
                        </Typography>
                        <Stack spacing={1.5}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="sync-interval-label">{t('settings.syncInterval')}</InputLabel>
                                <Select
                                    labelId="sync-interval-label"
                                    value={settings.solumConfig?.syncInterval || 60}
                                    label={t('settings.syncInterval')}
                                    onChange={(e) => onUpdate({
                                        solumConfig: {
                                            ...settings.solumConfig,
                                            companyName: settings.solumConfig?.companyName || '',
                                            username: settings.solumConfig?.username || '',
                                            password: settings.solumConfig?.password || '',
                                            storeNumber: settings.solumConfig?.storeNumber || '',
                                            cluster: settings.solumConfig?.cluster || 'common',
                                            baseUrl: settings.solumConfig?.baseUrl || '',
                                            syncInterval: Number(e.target.value),
                                        }
                                    })}
                                >
                                    <MenuItem value={30}>30s</MenuItem>
                                    <MenuItem value={60}>1m</MenuItem>
                                    <MenuItem value={300}>5m</MenuItem>
                                    <MenuItem value={600}>10m</MenuItem>
                                    <MenuItem value={1800}>30m</MenuItem>
                                    <MenuItem value={3600}>1h</MenuItem>
                                    <MenuItem value={10800}>3h</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControlLabel
                                control={
                                    <Switch
                                        size="small"
                                        checked={settings.csvConfig?.conferenceEnabled || false}
                                        onChange={(e) => onUpdate({
                                            csvConfig: {
                                                ...settings.csvConfig,
                                                delimiter: settings.csvConfig?.delimiter || ',',
                                                columns: settings.csvConfig?.columns || [],
                                                mapping: settings.csvConfig?.mapping || {},
                                                conferenceEnabled: e.target.checked,
                                            }
                                        })}
                                    />
                                }
                                label={<Typography variant="body2">{t('settings.simpleConferenceMode')}</Typography>}
                            />

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: '-8px !important', ml: '38px !important' }}>
                                {t('settings.simpleConferenceModeDesc')}
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>
            )}

            {/* Field Mapping Tab */}
            {subTab === 1 && (
                <Stack spacing={2}>
                    {/* Schema */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('settings.articleFormatSchema')}
                        </Typography>

                        <Button
                            variant="outlined"
                            startIcon={<CloudSyncIcon />}
                            onClick={handleFetchSchema}
                            disabled={fetchingSchema || !settings.solumConfig?.isConnected}
                            sx={{ mb: 1, width: 'fit-content' }}
                        >
                            {fetchingSchema ? t('settings.fetchingSchema') : t('settings.fetchArticleSchema')}
                        </Button>

                        <Typography variant="caption" color="info.main" sx={{ mb: 1, display: 'block' }}>
                            {t('settings.fetchesConfig')}
                        </Typography>

                        <ArticleFormatEditor
                            schema={articleFormat}
                            onSave={saveArticleFormat}
                            readOnly={false}
                        />
                    </Box>

                    {/* Data Mapping - shown only when article format exists */}
                    {articleFormatFields.length > 0 && (
                        <>
                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                                    {t('settings.dataMapping')}
                                </Typography>

                                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                    {t('settings.dataMappingHelp')}
                                </Typography>

                                {/* Field Mapping Selectors */}
                                <SolumMappingSelectors
                                    articleFormatFields={articleFormatFields}
                                    uniqueIdField={settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0]}
                                    conferenceMapping={settings.solumMappingConfig?.conferenceMapping || {
                                        meetingName: articleFormatFields[0] || '',
                                        meetingTime: articleFormatFields[0] || '',
                                        participants: articleFormatFields[0] || '',
                                    }}
                                    onUniqueIdChange={(field) => onUpdate({
                                        solumMappingConfig: {
                                            ...settings.solumMappingConfig,
                                            uniqueIdField: field,
                                            fields: settings.solumMappingConfig?.fields || {},
                                            conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                meetingName: '',
                                                meetingTime: '',
                                                participants: '',
                                            },
                                        }
                                    })}
                                    onConferenceMappingChange={(mapping) => onUpdate({
                                        solumMappingConfig: {
                                            ...settings.solumMappingConfig,
                                            uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                            fields: settings.solumMappingConfig?.fields || {},
                                            conferenceMapping: mapping,
                                        }
                                    })}
                                    disabled={isMappingLocked}
                                />

                                {/* Global Field Assignments */}
                                <Box sx={{ mt: 3 }}>
                                    <SolumGlobalFieldsEditor
                                        articleFormatFields={articleFormatFields}
                                        globalAssignments={settings.solumMappingConfig?.globalFieldAssignments || {}}
                                        onChange={(assignments) => onUpdate({
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
                                            }
                                        })}
                                        disabled={isMappingLocked}
                                    />
                                </Box>

                                {/* Field Mapping Table */}
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                                        {t('settings.fieldFriendlyNames')}
                                    </Typography>
                                    <SolumFieldMappingTable
                                        articleFormatFields={articleFormatFields}
                                        mappings={settings.solumMappingConfig?.fields || {}}
                                        excludeFields={Object.keys(settings.solumMappingConfig?.globalFieldAssignments || {})}
                                        onChange={(mappings) => onUpdate({
                                            solumMappingConfig: {
                                                ...settings.solumMappingConfig,
                                                uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                                conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                    meetingName: '',
                                                    meetingTime: '',
                                                    participants: '',
                                                },
                                                fields: mappings,
                                            }
                                        })}
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