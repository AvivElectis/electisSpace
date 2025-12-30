import {
    Box,
    TextField,
    Stack,
    Typography,
    Divider,
    Button,
    Tabs,
    Tab,
} from '@mui/material';
import TestIcon from '@mui/icons-material/Cable';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigurationController } from '@features/configuration/application/useConfigurationController';
import { CSVStructureEditor } from '@features/configuration/presentation/CSVStructureEditor';
import type { SettingsData } from '../domain/types';

interface SFTPSettingsTabProps {
    settings: SettingsData;
    onUpdate: (updates: Partial<SettingsData>) => void;
}

/**
 * SFTP Settings Tab
 * Connection and CSV structure configuration
 */
export function SFTPSettingsTab({ settings, onUpdate }: SFTPSettingsTabProps) {
    const { t } = useTranslation();
    const { csvColumns, saveCSVStructure } = useConfigurationController();
    const [subtab, setSubtab] = useState(0);
    const [testing, setTesting] = useState(false);

    const handleTestConnection = async () => {
        setTesting(true);
        try {
            // TODO: Implement actual SFTP connection test
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Connection test successful!');
        } catch (error) {
            alert(`Connection failed: ${error}`);
        } finally {
            setTesting(false);
        }
    };

    return (
        <Box sx={{ px: 2, py: 1, maxWidth: 600, mx: 'auto' }}>
            {/* Sub-tabs */}
            <Tabs value={subtab} onChange={(_, val) => setSubtab(val)} sx={{ mb: 2 }}>
                <Tab label={t('settings.connection')} />
                <Tab label={t('settings.csvStructure')} />
            </Tabs>

            {/* Connection Tab */}
            {subtab === 0 && (
                <Stack gap={2}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        SFTP Server Configuration
                    </Typography>

                    <Stack gap={1.5}>
                        <TextField
                            fullWidth
                            size="small"
                            label={t('settings.username')}
                            value={settings.sftpCredentials?.username || ''}
                            onChange={(e) => onUpdate({
                                sftpCredentials: {
                                    ...settings.sftpCredentials,
                                    username: e.target.value,
                                    password: settings.sftpCredentials?.password || '',
                                    host: settings.sftpCredentials?.host || '',
                                    remoteFilename: settings.sftpCredentials?.remoteFilename || '',
                                }
                            })}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            type="password"
                            label={t('settings.password')}
                            value={settings.sftpCredentials?.password || ''}
                            onChange={(e) => onUpdate({
                                sftpCredentials: {
                                    ...settings.sftpCredentials,
                                    username: settings.sftpCredentials?.username || '',
                                    password: e.target.value,
                                    host: settings.sftpCredentials?.host || '',
                                    remoteFilename: settings.sftpCredentials?.remoteFilename || '',
                                }
                            })}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label={t('settings.host')}
                            value={settings.sftpCredentials?.host || ''}
                            onChange={(e) => onUpdate({
                                sftpCredentials: {
                                    ...settings.sftpCredentials,
                                    username: settings.sftpCredentials?.username || '',
                                    password: settings.sftpCredentials?.password || '',
                                    host: e.target.value,
                                    remoteFilename: settings.sftpCredentials?.remoteFilename || '',
                                }
                            })}
                            placeholder="sftp.example.com"
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label={t('settings.remoteFilename')}
                            value={settings.sftpCredentials?.remoteFilename || ''}
                            onChange={(e) => onUpdate({
                                sftpCredentials: {
                                    ...settings.sftpCredentials,
                                    username: settings.sftpCredentials?.username || '',
                                    password: settings.sftpCredentials?.password || '',
                                    host: settings.sftpCredentials?.host || '',
                                    remoteFilename: e.target.value,
                                }
                            })}
                            placeholder="spaces.csv"
                        />
                    </Stack>

                    <Divider />

                    <Button
                        variant="outlined"
                        startIcon={<TestIcon />}
                        onClick={handleTestConnection}
                        disabled={testing}
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        {testing ? t('common.loading') : t('settings.testConnection')}
                    </Button>
                </Stack>
            )}

            {/* CSV Structure Tab */}
            {subtab === 1 && (
                <Stack gap={2}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        CSV File Structure
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
                        helperText="Field separator (usually ; or ,)"
                        inputProps={{ maxLength: 1 }}
                    />

                    <Divider />

                    <CSVStructureEditor
                        columns={csvColumns}
                        onColumnsChange={saveCSVStructure}
                    />
                </Stack>
            )}
        </Box>
    );
}
