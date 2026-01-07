import {
    Box,
    TextField,
    Stack,
    Typography,
    Divider,
    Button,
    Tabs,
    Tab,
    FormControlLabel,
    Switch,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    Chip,
} from '@mui/material';
import TestIcon from '@mui/icons-material/Cable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigurationController } from '@features/configuration/application/useConfigurationController';
import { CSVStructureEditor } from '@features/configuration/presentation/CSVStructureEditor';
import { testConnection } from '@shared/infrastructure/services/sftpApiClient';
import { logger } from '@shared/infrastructure/services/logger';
import type { SettingsData } from '../domain/types';
import type { SFTPCredentials } from '@shared/domain/types';

interface SFTPSettingsTabProps {
    settings: SettingsData;
    onUpdate: (updates: Partial<SettingsData>) => void;
}

/** Auto-sync interval options (in seconds) */
const AUTO_SYNC_INTERVALS = [
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' },
];

/**
 * SFTP Settings Tab
 * Connection and CSV structure configuration
 */
export function SFTPSettingsTab({ settings, onUpdate }: SFTPSettingsTabProps) {
    const { t } = useTranslation();
    const { csvColumns, saveCSVStructure } = useConfigurationController();
    const [subtab, setSubtab] = useState(0);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [connecting, setConnecting] = useState(false);

    // Check if credentials are filled
    const hasCredentials = Boolean(
        settings.sftpCredentials?.username &&
        settings.sftpCredentials?.password &&
        settings.sftpCredentials?.host &&
        settings.sftpCredentials?.remoteFilename
    );

    // Track SFTP connected state
    const isConnected = Boolean(settings.sftpCredentials && hasCredentials);

    const handleTestConnection = async () => {
        if (!settings.sftpCredentials) {
            setTestResult({ success: false, message: t('settings.fillCredentials') });
            return;
        }

        setTesting(true);
        setTestResult(null);
        logger.info('Settings', 'Testing SFTP connection', { host: settings.sftpCredentials.host });

        try {
            const result = await testConnection(settings.sftpCredentials);
            
            if (result.success) {
                setTestResult({ success: true, message: t('settings.connectionSuccess') });
                logger.info('Settings', 'SFTP connection test successful');
            } else {
                setTestResult({ success: false, message: result.error || t('settings.connectionFailed') });
                logger.error('Settings', 'SFTP connection test failed', { error: result.error });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : t('settings.connectionFailed');
            setTestResult({ success: false, message });
            logger.error('Settings', 'SFTP connection test error', { error: message });
        } finally {
            setTesting(false);
        }
    };

    const handleConnect = async () => {
        if (!settings.sftpCredentials) return;
        
        setConnecting(true);
        logger.info('Settings', 'Connecting to SFTP server');

        try {
            const result = await testConnection(settings.sftpCredentials);
            
            if (result.success) {
                // Mark as connected by ensuring credentials are saved
                logger.info('Settings', 'SFTP connected successfully');
            } else {
                throw new Error(result.error || 'Connection failed');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Connection failed';
            setTestResult({ success: false, message });
            logger.error('Settings', 'SFTP connection error', { error: message });
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = () => {
        logger.info('Settings', 'Disconnecting from SFTP server');
        // Clear credentials to disconnect
        onUpdate({
            sftpCredentials: undefined,
        });
        setTestResult(null);
    };

    const updateCredentials = (updates: Partial<SFTPCredentials>) => {
        onUpdate({
            sftpCredentials: {
                username: settings.sftpCredentials?.username || '',
                password: settings.sftpCredentials?.password || '',
                host: settings.sftpCredentials?.host || '',
                remoteFilename: settings.sftpCredentials?.remoteFilename || 'esl.csv',
                ...updates,
            }
        });
        // Clear test result when credentials change
        setTestResult(null);
    };

    return (
        <Box sx={{ px: 2, py: 1, maxWidth: 600, mx: 'auto' }}>
            {/* Sub-tabs */}
            <Tabs value={subtab} onChange={(_, val) => setSubtab(val)} sx={{ mb: 2 }}>
                <Tab label={t('settings.connection')} />
                <Tab label={t('settings.csvStructure')} />
                <Tab label={t('settings.autoSync')} />
            </Tabs>

            {/* Connection Tab */}
            {subtab === 0 && (
                <Stack gap={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('settings.sftpServerConfig')}
                        </Typography>
                        {isConnected && (
                            <Chip 
                                icon={<CheckCircleIcon />} 
                                label={t('settings.connected')} 
                                color="success" 
                                size="small"
                            />
                        )}
                    </Box>

                    <Stack gap={1.5}>
                        <TextField
                            fullWidth
                            size="small"
                            label={t('settings.host')}
                            value={settings.sftpCredentials?.host || ''}
                            onChange={(e) => updateCredentials({ host: e.target.value })}
                            placeholder="sftp.example.com"
                            disabled={connecting}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label={t('settings.username')}
                            value={settings.sftpCredentials?.username || ''}
                            onChange={(e) => updateCredentials({ username: e.target.value })}
                            disabled={connecting}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            type="password"
                            label={t('settings.password')}
                            value={settings.sftpCredentials?.password || ''}
                            onChange={(e) => updateCredentials({ password: e.target.value })}
                            disabled={connecting}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label={t('settings.remoteFilename')}
                            value={settings.sftpCredentials?.remoteFilename || ''}
                            onChange={(e) => updateCredentials({ remoteFilename: e.target.value })}
                            placeholder="esl.csv"
                            helperText={t('settings.remoteFilenameHelp')}
                            disabled={connecting}
                        />
                    </Stack>

                    {/* Test Result Alert */}
                    {testResult && (
                        <Alert 
                            severity={testResult.success ? 'success' : 'error'}
                            icon={testResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
                        >
                            {testResult.message}
                        </Alert>
                    )}

                    <Divider />

                    {/* Connection Actions */}
                    <Stack direction="row" gap={1.5} flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={testing ? <CircularProgress size={16} /> : <TestIcon />}
                            onClick={handleTestConnection}
                            disabled={testing || connecting || !hasCredentials}
                        >
                            {testing ? t('common.testing') : t('settings.testConnection')}
                        </Button>

                        {isConnected ? (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<LinkOffIcon />}
                                onClick={handleDisconnect}
                                disabled={connecting}
                            >
                                {t('settings.disconnect')}
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                startIcon={connecting ? <CircularProgress size={16} /> : <LinkIcon />}
                                onClick={handleConnect}
                                disabled={connecting || !hasCredentials}
                            >
                                {connecting ? t('common.connecting') : t('settings.connect')}
                            </Button>
                        )}
                    </Stack>
                </Stack>
            )}

            {/* CSV Structure Tab */}
            {subtab === 1 && (
                <Stack gap={2}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.csvFileStructure')}
                    </Typography>

                    <TextField
                        fullWidth
                        size="small"
                        label={t('settings.delimiter')}
                        value={settings.csvConfig.delimiter}
                        onChange={(e) => onUpdate({
                            csvConfig: {
                                ...settings.csvConfig,
                                delimiter: e.target.value,
                            }
                        })}
                        helperText={t('settings.suggestedDelimiter')}
                        inputProps={{ maxLength: 1 }}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.sftpCsvConfig?.hasHeader ?? true}
                                onChange={(e) => onUpdate({
                                    sftpCsvConfig: {
                                        ...settings.sftpCsvConfig,
                                        hasHeader: e.target.checked,
                                        delimiter: settings.sftpCsvConfig?.delimiter || ',',
                                        columns: settings.sftpCsvConfig?.columns || [],
                                        mapping: settings.sftpCsvConfig?.mapping || {},
                                        conferenceEnabled: settings.sftpCsvConfig?.conferenceEnabled ?? false,
                                    }
                                })}
                            />
                        }
                        label={t('settings.csvHasHeader')}
                    />

                    <Divider />

                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        {t('settings.csvStructureNote')}
                    </Typography>

                    <CSVStructureEditor
                        columns={csvColumns}
                        onColumnsChange={saveCSVStructure}
                    />
                </Stack>
            )}

            {/* Auto-Sync Tab */}
            {subtab === 2 && (
                <Stack gap={2}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.autoSyncConfig')}
                    </Typography>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.autoSyncEnabled}
                                onChange={(e) => onUpdate({ autoSyncEnabled: e.target.checked })}
                            />
                        }
                        label={t('settings.enableAutoSync')}
                    />

                    {settings.autoSyncEnabled && (
                        <>
                            <FormControl fullWidth size="small">
                                <InputLabel>{t('settings.syncInterval')}</InputLabel>
                                <Select
                                    value={settings.autoSyncInterval}
                                    label={t('settings.syncInterval')}
                                    onChange={(e) => onUpdate({ autoSyncInterval: e.target.value as number })}
                                >
                                    {AUTO_SYNC_INTERVALS.map((interval) => (
                                        <MenuItem key={interval.value} value={interval.value}>
                                            {interval.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                                {t('settings.autoSyncInfo')}
                            </Alert>
                        </>
                    )}
                </Stack>
            )}
        </Box>
    );
}
