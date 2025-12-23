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
    Slider,
    Alert,
} from '@mui/material';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@shared/infrastructure/store/rootStore';
import { useSettingsController } from '../application/useSettingsController';
import { useConfigurationController } from '@features/configuration/application/useConfigurationController';
import { ArticleFormatEditor } from '@features/configuration/presentation/ArticleFormatEditor';
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
        <Box sx={{ px: 3 }}>
            <Stack spacing={3}>
                {/* API Configuration */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.solumApiConfig')}
                    </Typography>
                    <Stack spacing={2}>
                        <FormControl fullWidth>
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
                            helperText={t('settings.baseUrlHelper')}
                        />
                    </Stack>
                </Box>

                <Divider />

                {/* Credentials */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.authentication')}
                    </Typography>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
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
                            helperText={t('settings.companyCodeHelper')}
                        />

                        <TextField
                            fullWidth
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
                            helperText={t('settings.storeNumberHelper')}
                        />

                        <TextField
                            fullWidth
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
                            helperText={t('settings.usernameHelper')}
                        />

                        <TextField
                            fullWidth
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
                            helperText={t('settings.passwordHelper')}
                        />

                        {settings.solumConfig?.isConnected ? (
                            <>
                                <Alert severity="success" sx={{ mb: 1 }}>
                                    {t('settings.connectedToSolum')}
                                </Alert>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={() => {
                                        disconnectFromSolum();
                                        showSuccess(t('settings.disconnected'));
                                    }}
                                    fullWidth
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
                                fullWidth
                            >
                                {connecting ? t('settings.connecting') : t('settings.connect')}
                            </Button>
                        )}
                    </Stack>
                </Box>

                <Divider />

                {/* Sync Settings */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.synchronization')}
                    </Typography>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="body2" gutterBottom>
                                {t('settings.syncIntervalLabel', { interval: settings.solumConfig?.syncInterval || 60 })}
                            </Typography>
                            <Slider
                                value={settings.solumConfig?.syncInterval || 60}
                                onChange={(_, value) => onUpdate({
                                    solumConfig: {
                                        ...settings.solumConfig,
                                        companyName: settings.solumConfig?.companyName || '',
                                        username: settings.solumConfig?.username || '',
                                        password: settings.solumConfig?.password || '',
                                        storeNumber: settings.solumConfig?.storeNumber || '',
                                        cluster: settings.solumConfig?.cluster || 'common',
                                        baseUrl: settings.solumConfig?.baseUrl || '',
                                        syncInterval: value as number,
                                    }
                                })}
                                min={30}
                                max={180}
                                step={15}
                                marks={[
                                    { value: 30, label: '30s' },
                                    { value: 60, label: '1m' },
                                    { value: 120, label: '2m' },
                                    { value: 180, label: '3m' },
                                ]}
                            />
                        </Box>

                        <FormControlLabel
                            control={
                                <Switch
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
                            label={t('settings.simpleConferenceMode')}
                        />

                        <Typography variant="caption" color="text.secondary">
                            {t('settings.simpleConferenceModeDesc')}
                        </Typography>
                    </Stack>
                </Box>

                <Divider />

                {/* Schema */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('settings.articleFormatSchema')}
                    </Typography>

                    <Button
                        variant="outlined"
                        startIcon={<CloudSyncIcon />}
                        onClick={handleFetchSchema}
                        disabled={fetchingSchema || !settings.solumConfig?.isConnected}
                        fullWidth
                        sx={{ mb: 2 }}
                    >
                        {fetchingSchema ? t('settings.fetchingSchema') : t('settings.fetchArticleSchema')}
                    </Button>

                    <Typography variant="caption" color="info.main" sx={{ mb: 2, display: 'block' }}>
                        {t('settings.fetchesConfig')}
                    </Typography>

                    <ArticleFormatEditor
                        schema={articleFormat}
                        onSave={saveArticleFormat}
                        readOnly={false}
                    />
                </Box>
            </Stack>
        </Box>
    );
}
