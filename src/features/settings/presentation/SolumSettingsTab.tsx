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
} from '@mui/material';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { useState } from 'react';
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
    const [fetchingSchema, setFetchingSchema] = useState(false);

    const handleFetchSchema = async () => {
        setFetchingSchema(true);
        try {
            // TODO: Implement actual schema fetching from SoluM API
            await new Promise(resolve => setTimeout(resolve, 1500));
            alert('Schema fetched successfully!');
        } catch (error) {
            alert(`Failed to fetch schema: ${error}`);
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
                        SoluM API Configuration
                    </Typography>
                    <Stack spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel>API Cluster</InputLabel>
                            <Select
                                value={settings.solumConfig?.baseUrl || ''}
                                label="API Cluster"
                                onChange={(e) => onUpdate({
                                    solumConfig: {
                                        ...settings.solumConfig,
                                        companyName: settings.solumConfig?.companyName || '',
                                        username: settings.solumConfig?.username || '',
                                        password: settings.solumConfig?.password || '',
                                        storeNumber: settings.solumConfig?.storeNumber || '',
                                        baseUrl: e.target.value,
                                        syncInterval: settings.solumConfig?.syncInterval || 60,
                                    }
                                })}
                            >
                                <MenuItem value="https://common.solumesl.com">Common (Cluster 1)</MenuItem>
                                <MenuItem value="https://cluster2.solumesl.com">Cluster 2</MenuItem>
                                <MenuItem value="https://cluster3.solumesl.com">Cluster 3</MenuItem>
                                <MenuItem value="https://cluster4.solumesl.com">Cluster 4</MenuItem>
                                <MenuItem value="custom">Custom URL</MenuItem>
                            </Select>
                        </FormControl>

                        {settings.solumConfig?.baseUrl === 'custom' && (
                            <TextField
                                fullWidth
                                label="Custom API Base URL"
                                value={settings.solumConfig?.customBaseUrl || ''}
                                onChange={(e) => onUpdate({
                                    solumConfig: {
                                        ...settings.solumConfig,
                                        companyName: settings.solumConfig?.companyName || '',
                                        username: settings.solumConfig?.username || '',
                                        password: settings.solumConfig?.password || '',
                                        storeNumber: settings.solumConfig?.storeNumber || '',
                                        baseUrl: 'custom',
                                        customBaseUrl: e.target.value,
                                        syncInterval: settings.solumConfig?.syncInterval || 60,
                                    }
                                })}
                                placeholder="https://your-cluster.solumesl.com"
                                helperText="Enter custom SoluM API cluster URL"
                            />
                        )}
                    </Stack>
                </Box>

                <Divider />

                {/* Credentials */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Authentication
                    </Typography>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="Company Code"
                            value={settings.solumConfig?.companyName || ''}
                            onChange={(e) => onUpdate({
                                solumConfig: {
                                    ...settings.solumConfig,
                                    companyName: e.target.value,
                                    username: settings.solumConfig?.username || '',
                                    password: settings.solumConfig?.password || '',
                                    storeNumber: settings.solumConfig?.storeNumber || '',
                                    baseUrl: settings.solumConfig?.baseUrl || '',
                                    syncInterval: settings.solumConfig?.syncInterval || 60,
                                }
                            })}
                            helperText="Your SoluM company identifier"
                        />

                        <TextField
                            fullWidth
                            label="Store Number"
                            value={settings.solumConfig?.storeNumber || ''}
                            onChange={(e) => onUpdate({
                                solumConfig: {
                                    ...settings.solumConfig,
                                    companyName: settings.solumConfig?.companyName || '',
                                    username: settings.solumConfig?.username || '',
                                    password: settings.solumConfig?.password || '',
                                    storeNumber: e.target.value,
                                    baseUrl: settings.solumConfig?.baseUrl || '',
                                    syncInterval: settings.solumConfig?.syncInterval || 60,
                                }
                            })}
                            helperText="Store identifier"
                        />

                        <TextField
                            fullWidth
                            label="Username"
                            value={settings.solumConfig?.username || ''}
                            onChange={(e) => onUpdate({
                                solumConfig: {
                                    ...settings.solumConfig,
                                    companyName: settings.solumConfig?.companyName || '',
                                    username: e.target.value,
                                    password: settings.solumConfig?.password || '',
                                    storeNumber: settings.solumConfig?.storeNumber || '',
                                    baseUrl: settings.solumConfig?.baseUrl || '',
                                    syncInterval: settings.solumConfig?.syncInterval || 60,
                                }
                            })}
                            helperText="SoluM API username"
                        />

                        <TextField
                            fullWidth
                            type="password"
                            label="Password"
                            value={settings.solumConfig?.password || ''}
                            onChange={(e) => onUpdate({
                                solumConfig: {
                                    ...settings.solumConfig,
                                    companyName: settings.solumConfig?.companyName || '',
                                    username: settings.solumConfig?.username || '',
                                    password: e.target.value,
                                    storeNumber: settings.solumConfig?.storeNumber || '',
                                    baseUrl: settings.solumConfig?.baseUrl || '',
                                    syncInterval: settings.solumConfig?.syncInterval || 60,
                                }
                            })}
                            helperText="SoluM API password"
                        />
                    </Stack>
                </Box>

                <Divider />

                {/* Sync Settings */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Synchronization
                    </Typography>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="body2" gutterBottom>
                                Sync Interval: {settings.solumConfig?.syncInterval || 60} seconds
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
                                        baseUrl: settings.solumConfig?.baseUrl || '',
                                        syncInterval: value as number,
                                    }
                                })}
                                min={30}
                                max={600}
                                step={30}
                                marks={[
                                    { value: 30, label: '30s' },
                                    { value: 300, label: '5m' },
                                    { value: 600, label: '10m' },
                                ]}
                            />
                        </Box>

                        <FormControlLabel
                            control={<Switch />}
                            label="Simple Conference Mode"
                        />

                        <Typography variant="caption" color="text.secondary">
                            When enabled, conference rooms show only Occupied/Available toggle
                        </Typography>
                    </Stack>
                </Box>

                <Divider />

                {/* Schema */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Article Format Schema
                    </Typography>

                    <Button
                        variant="outlined"
                        startIcon={<CloudSyncIcon />}
                        onClick={handleFetchSchema}
                        disabled={fetchingSchema}
                        fullWidth
                    >
                        {fetchingSchema ? 'Fetching Schema...' : 'Fetch Article Schema from SoluM'}
                    </Button>

                    <Typography variant="caption" color="info.main" sx={{ mt: 1, display: 'block' }}>
                        Fetches the current article format configuration from SoluM API
                    </Typography>
                </Box>
            </Stack>
        </Box>
    );
}
