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
    IconButton,
    Paper,
} from '@mui/material';
import TestIcon from '@mui/icons-material/Cable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigurationController } from '@features/configuration/application/useConfigurationController';
import { CSVStructureEditor } from '@features/configuration/presentation/CSVStructureEditor';
import { testConnection, downloadFile } from '@shared/infrastructure/services/sftpApiClient';
import { extractHeadersFromCSV } from '@shared/infrastructure/services/csvService';
import { logger } from '@shared/infrastructure/services/logger';
import type { SettingsData } from '../domain/types';
import type { SFTPCredentials } from '@shared/domain/types';
import type { CSVColumn } from '@features/configuration/domain/types';
import type { CSVColumnMapping, EnhancedCSVConfig } from '@shared/infrastructure/services/csvService';
import { parseCSVEnhanced } from '@shared/infrastructure/services/csvService';

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
    
    // Global field assignment state
    const [newGlobalFieldKey, setNewGlobalFieldKey] = useState('');
    const [newGlobalFieldValue, setNewGlobalFieldValue] = useState('');
    
    // Get global field assignments from settings
    const globalFieldAssignments = settings.sftpCsvConfig?.globalFieldAssignments || {};

    // Transform CSVColumnMapping[] to CSVColumn[] for the editor
    const editorColumns = useMemo((): CSVColumn[] => {
        return (csvColumns as CSVColumnMapping[]).map((col, idx) => ({
            index: col.csvColumn ?? idx,
            aimsValue: col.fieldName,
            headerEn: col.friendlyName,
            headerHe: col.friendlyName,  // Use same name for both
            type: 'text' as const,
            mandatory: col.required,
        }));
    }, [csvColumns]);
    
    // Helper to create full sftpCsvConfig with all fields preserved
    const buildSftpCsvConfig = (overrides: Partial<EnhancedCSVConfig>): EnhancedCSVConfig => ({
        hasHeader: settings.sftpCsvConfig?.hasHeader ?? true,
        delimiter: (settings.sftpCsvConfig?.delimiter || ';') as ',' | ';' | '\t',
        columns: settings.sftpCsvConfig?.columns || [],
        idColumn: settings.sftpCsvConfig?.idColumn || 'id',
        conferenceEnabled: settings.sftpCsvConfig?.conferenceEnabled ?? false,
        conferenceMapping: settings.sftpCsvConfig?.conferenceMapping,
        globalFieldAssignments: settings.sftpCsvConfig?.globalFieldAssignments,
        ...overrides,
    });
    
    // Update global field assignments
    const updateGlobalFieldAssignments = (assignments: { [key: string]: string }) => {
        onUpdate({
            sftpCsvConfig: buildSftpCsvConfig({ globalFieldAssignments: assignments })
        });
    };
    
    const handleAddGlobalField = () => {
        if (newGlobalFieldKey.trim() && newGlobalFieldValue.trim()) {
            updateGlobalFieldAssignments({
                ...globalFieldAssignments,
                [newGlobalFieldKey.trim()]: newGlobalFieldValue.trim(),
            });
            setNewGlobalFieldKey('');
            setNewGlobalFieldValue('');
        }
    };
    
    const handleRemoveGlobalField = (fieldKey: string) => {
        const updated = { ...globalFieldAssignments };
        delete updated[fieldKey];
        updateGlobalFieldAssignments(updated);
    };
    
    const handleUpdateGlobalFieldValue = (fieldKey: string, value: string) => {
        updateGlobalFieldAssignments({
            ...globalFieldAssignments,
            [fieldKey]: value,
        });
    };

    // Check if credentials are filled
    const hasCredentials = Boolean(
        settings.sftpCredentials?.username &&
        settings.sftpCredentials?.password &&
        settings.sftpCredentials?.host &&
        settings.sftpCredentials?.remoteFilename
    );

    // Track SFTP connected state from credentials
    const isConnected = Boolean(settings.sftpCredentials?.isConnected);

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
            
            if (result === true) {
                setTestResult({ success: true, message: t('settings.connectionSuccess') });
                logger.info('Settings', 'SFTP connection test successful');
            } else {
                setTestResult({ success: false, message: t('settings.connectionFailed') });
                logger.error('Settings', 'SFTP connection test failed');
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
        if (!settings.sftpCredentials) {
            return;
        }
        
        setConnecting(true);
        logger.info('Settings', 'Connecting to SFTP server');

        try {
            const result = await testConnection(settings.sftpCredentials);
            
            if (result === true) {
                // Connection successful - now download file, extract headers, and parse data
                let extractedColumns: CSVColumnMapping[] = [];
                let csvContent: string | null = null;
                
                try {
                    csvContent = await downloadFile(settings.sftpCredentials);
                    const delimiter = settings.sftpCsvConfig?.delimiter || ';';
                    logger.info('Settings', 'CSV content downloaded', { 
                        length: csvContent?.length,
                        delimiter
                    });
                    if (csvContent && (settings.sftpCsvConfig?.hasHeader ?? true)) {
                        extractedColumns = extractHeadersFromCSV(csvContent, delimiter);
                        logger.info('Settings', 'Extracted CSV headers', { count: extractedColumns.length });
                    }
                } catch (downloadError) {
                    // Don't fail connection if file download fails - just log it
                    logger.warn('Settings', 'Could not download file for header extraction', { 
                        error: downloadError instanceof Error ? downloadError.message : 'Unknown error' 
                    });
                }
                
                // Build the new sftpCsvConfig with extracted columns
                const delimiter = (settings.sftpCsvConfig?.delimiter || ';') as ',' | ';' | '\t';
                const newSftpCsvConfig: EnhancedCSVConfig = {
                    hasHeader: settings.sftpCsvConfig?.hasHeader ?? true,
                    delimiter,
                    columns: extractedColumns.length > 0 ? extractedColumns : (settings.sftpCsvConfig?.columns || []),
                    idColumn: extractedColumns.length > 0 ? (extractedColumns[0]?.fieldName || 'id') : (settings.sftpCsvConfig?.idColumn || 'id'),
                    conferenceEnabled: settings.sftpCsvConfig?.conferenceEnabled ?? false,
                    globalFieldAssignments: settings.sftpCsvConfig?.globalFieldAssignments,
                };
                
                // Update settings with connection status and extracted columns
                const updates: Partial<SettingsData> = {
                    sftpCredentials: {
                        ...settings.sftpCredentials,
                        isConnected: true,
                    },
                    sftpCsvConfig: newSftpCsvConfig,
                };
                
                onUpdate(updates);
                
                // If we have CSV content and columns, parse and populate the spaces store
                if (csvContent && newSftpCsvConfig.columns.length > 0) {
                    try {
                        const { useSpacesStore } = await import('@features/space/infrastructure/spacesStore');
                        const parsed = parseCSVEnhanced(csvContent, newSftpCsvConfig);
                        useSpacesStore.getState().setSpaces(parsed.spaces);
                        logger.info('Settings', 'Spaces populated from SFTP', { count: parsed.spaces.length });
                    } catch (parseError) {
                        logger.warn('Settings', 'Could not parse CSV content', { 
                            error: parseError instanceof Error ? parseError.message : 'Unknown error' 
                        });
                    }
                }
                
                logger.info('Settings', 'SFTP connected successfully', { 
                    columnsExtracted: extractedColumns.length 
                });
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Connection failed';
            setTestResult({ success: false, message });
            logger.error('Settings', 'SFTP connection error', { error: message });
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        logger.info('Settings', 'Disconnecting from SFTP server');
        
        // Clear all data stores (same as SoluM disconnect)
        try {
            const { useSpacesStore } = await import('@features/space/infrastructure/spacesStore');
            const { usePeopleStore } = await import('@features/people/infrastructure/peopleStore');
            const { useConferenceStore } = await import('@features/conference/infrastructure/conferenceStore');
            
            useSpacesStore.getState().clearAllData();
            usePeopleStore.getState().clearAllData();
            useConferenceStore.getState().clearAllData();
            
            logger.info('Settings', 'All data stores cleared');
        } catch (error) {
            logger.error('Settings', 'Failed to clear data stores', { error });
        }
        
        // Mark as disconnected (preserve credentials for reconnection)
        if (settings.sftpCredentials) {
            onUpdate({
                sftpCredentials: {
                    ...settings.sftpCredentials,
                    isConnected: false,
                },
            });
        }
        setTestResult(null);
    };

    const updateCredentials = (updates: Partial<SFTPCredentials>) => {
        onUpdate({
            sftpCredentials: {
                username: settings.sftpCredentials?.username || '',
                password: settings.sftpCredentials?.password || '',
                host: settings.sftpCredentials?.host || '',
                port: settings.sftpCredentials?.port || 22,
                remoteFilename: settings.sftpCredentials?.remoteFilename || 'esl.csv',
                isConnected: settings.sftpCredentials?.isConnected || false,
                ...updates,
            }
        });
        // Clear test result when credentials change
        setTestResult(null);
    };

    return (
        <Box sx={{ px: 2, py: 0, mx: 'auto' }}>
            {/* Sub-tabs */}
            <Tabs 
                value={subtab} 
                onChange={(_, val) => setSubtab(val)} 
                sx={{
                    borderBottom: 0,
                    pb: 2,
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
                }}>
                <Tab label={t('settings.connection')} />
                <Tab label={t('settings.csvStructure')} />
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
                                sx={{paddingInlineStart: 1}}
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
                            disabled={connecting || isConnected}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label={t('settings.port')}
                            type="number"
                            value={settings.sftpCredentials?.port || 22}
                            onChange={(e) => updateCredentials({ port: parseInt(e.target.value) || 22 })}
                            placeholder="22"
                            disabled={connecting || isConnected}
                            inputProps={{ min: 1, max: 65535 }}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label={t('settings.username')}
                            value={settings.sftpCredentials?.username || ''}
                            onChange={(e) => updateCredentials({ username: e.target.value })}
                            disabled={connecting || isConnected}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            type="password"
                            label={t('settings.password')}
                            value={settings.sftpCredentials?.password || ''}
                            onChange={(e) => updateCredentials({ password: e.target.value })}
                            disabled={connecting || isConnected}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label={t('settings.remoteFilename')}
                            value={settings.sftpCredentials?.remoteFilename || ''}
                            onChange={(e) => updateCredentials({ remoteFilename: e.target.value })}
                            placeholder="esl.csv"
                            helperText={t('settings.remoteFilenameHelp')}
                            disabled={connecting || isConnected}
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

                    <Divider />

                    {/* Auto-Sync Configuration */}
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
                        value={settings.sftpCsvConfig?.delimiter || ';'}
                        onChange={(e) => onUpdate({
                            sftpCsvConfig: buildSftpCsvConfig({ 
                                delimiter: (e.target.value || ';') as ',' | ';' | '\t' 
                            })
                        })}
                        helperText={t('settings.suggestedDelimiter')}
                        inputProps={{ maxLength: 1 }}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.sftpCsvConfig?.hasHeader ?? true}
                                onChange={(e) => onUpdate({
                                    sftpCsvConfig: buildSftpCsvConfig({ hasHeader: e.target.checked })
                                })}
                            />
                        }
                        label={t('settings.csvHasHeader')}
                    />

                    <Divider />

                    {/* Global Field Assignments */}
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.globalFieldAssignments')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        {t('settings.globalFieldAssignmentsHelp')}
                    </Typography>
                    
                    {/* Existing global field assignments */}
                    <Stack gap={1} sx={{ mb: 2 }}>
                        {Object.entries(globalFieldAssignments).map(([fieldKey, value]) => (
                            <Paper key={fieldKey} variant="outlined" sx={{ p: 1.5 }}>
                                <Stack direction="row" gap={1} alignItems="center">
                                    <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 500 }}>
                                        {fieldKey}
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={value}
                                        onChange={(e) => handleUpdateGlobalFieldValue(fieldKey, e.target.value)}
                                        placeholder={t('settings.globalFieldValue')}
                                    />
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleRemoveGlobalField(fieldKey)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                    
                    {/* Add new global field */}
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" gap={1} alignItems="center">
                            <TextField
                                size="small"
                                value={newGlobalFieldKey}
                                onChange={(e) => setNewGlobalFieldKey(e.target.value)}
                                placeholder={t('settings.fieldName')}
                                sx={{ minWidth: 120 }}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                value={newGlobalFieldValue}
                                onChange={(e) => setNewGlobalFieldValue(e.target.value)}
                                placeholder={t('settings.globalFieldValue')}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={handleAddGlobalField}
                                disabled={!newGlobalFieldKey.trim() || !newGlobalFieldValue.trim()}
                            >
                                {t('common.add')}
                            </Button>
                        </Stack>
                    </Paper>

                    <Divider />

                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        {t('settings.csvStructureNote')}
                    </Typography>

                    <CSVStructureEditor
                        columns={editorColumns}
                        onColumnsChange={saveCSVStructure}
                    />
                </Stack>
            )}
        </Box>
    );
}
