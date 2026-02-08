/**
 * AIMS Credentials Dialog
 * 
 * Shown to company/store admins when their company doesn't have AIMS credentials configured.
 * Allows them to enter AIMS credentials directly after store selection.
 */

import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Typography,
    Alert,
    CircularProgress,
    MenuItem,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from 'react-i18next';
import api from '@shared/infrastructure/services/apiClient';

interface AimsCredentialsDialogProps {
    open: boolean;
    companyId: string;
    companyName: string;
    companyCode: string;
    onSuccess: () => void;
    onCancel: () => void;
}

const CLUSTER_OPTIONS = [
    { value: 'common', label: 'Common (Cluster 1)' },
    { value: 'c1', label: 'C1 (Cluster 2)' },
    { value: 'c2', label: 'Cluster 3' },
    { value: 'c3', label: 'Cluster 4' },
];

export function AimsCredentialsDialog({
    open,
    companyId,
    companyName,
    companyCode,
    onSuccess,
    onCancel,
}: AimsCredentialsDialogProps) {
    const { t } = useTranslation();
    const [baseUrl, setBaseUrl] = useState('https://eu.common.solumesl.com');
    const [cluster, setCluster] = useState('common');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!baseUrl || !username || !password) {
            setError(t('auth.aimsCredentials.fillAllFields', 'Please fill in all required fields'));
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Save AIMS config
            await api.patch(`/companies/${companyId}/aims`, {
                baseUrl,
                cluster,
                username,
                password,
            });

            // Test connection
            const testResult = await api.post(`/companies/${companyId}/aims/test`);
            if (testResult.data?.connected) {
                onSuccess();
            } else {
                setError(testResult.data?.error || t('auth.aimsCredentials.connectionFailed', 'Connection failed. Please check your credentials.'));
            }
        } catch (err: any) {
            const msg = err.response?.data?.error?.message || err.message || t('auth.aimsCredentials.saveFailed', 'Failed to save AIMS configuration');
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon color="primary" />
                {t('auth.aimsCredentials.title', 'Configure AIMS Connection')}
            </DialogTitle>
            <DialogContent>
                <Stack gap={2} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {t('auth.aimsCredentials.description', 'Company "{{company}}" ({{code}}) does not have AIMS credentials configured. Please provide the AIMS API credentials to enable label synchronization.', {
                            company: companyName,
                            code: companyCode,
                        })}
                    </Typography>

                    {error && (
                        <Alert severity="error" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        label={t('settings.companies.aimsBaseUrl', 'AIMS Base URL')}
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        fullWidth
                        size="small"
                        helperText={t('settings.baseUrlHelper', 'SoluM API base URL (e.g., https://eu.common.solumesl.com)')}
                        disabled={isLoading}
                    />

                    <TextField
                        select
                        label={t('settings.apiCluster', 'API Cluster')}
                        value={cluster}
                        onChange={(e) => setCluster(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                    >
                        {CLUSTER_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label={t('settings.companies.aimsUsername', 'AIMS Username')}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                    />

                    <TextField
                        label={t('settings.companies.aimsPassword', 'AIMS Password')}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isLoading}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} disabled={isLoading}>
                    {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isLoading || !baseUrl || !username || !password}
                    startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
                >
                    {isLoading
                        ? t('common.connecting', 'Connecting...')
                        : t('auth.aimsCredentials.connectAndSave', 'Connect & Save')
                    }
                </Button>
            </DialogActions>
        </Dialog>
    );
}
