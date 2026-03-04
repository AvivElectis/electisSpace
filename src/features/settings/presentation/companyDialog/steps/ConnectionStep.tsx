/**
 * Wizard Step 1: AIMS Connection + Company Info
 */
import {
    Box,
    TextField,
    Typography,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Button,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudIcon from '@mui/icons-material/Cloud';
import { useTranslation } from 'react-i18next';
import type { WizardFormData } from '../wizardTypes';

interface ConnectionStepProps {
    formData: WizardFormData;
    onUpdate: (data: Partial<WizardFormData>) => void;
    onConnectionTest: () => Promise<boolean>;
    connectionStatus: 'idle' | 'testing' | 'connected' | 'failed';
    connectionError: string | null;
    codeAvailable: boolean | null;
    codeChecking: boolean;
    codeError: string | null;
}

export function ConnectionStep({
    formData,
    onUpdate,
    onConnectionTest,
    connectionStatus,
    connectionError,
    codeAvailable,
    codeChecking,
    codeError,
}: ConnectionStepProps) {
    const { t } = useTranslation();

    const handleCodeChange = (value: string) => {
        onUpdate({ companyCode: value.toUpperCase().replace(/[^A-Z]/g, '') });
    };

    const handleClusterChange = (cluster: string) => {
        const baseUrl = cluster === 'common'
            ? 'https://eu.common.solumesl.com/common'
            : 'https://eu.common.solumesl.com/c1/common';
        onUpdate({ aimsCluster: cluster, aimsBaseUrl: baseUrl });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('settings.companies.wizardStep1Info')}
            </Typography>

            {/* Company Code — always LTR (uppercase letters only) */}
            <TextField
                label={t('settings.companies.codeLabel')}
                value={formData.companyCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                required
                error={!!codeError}
                helperText={codeError || t('settings.companies.codeHelp')}
                InputProps={{
                    endAdornment: formData.companyCode.length >= 3 && (
                        <InputAdornment position="end">
                            {codeChecking ? (
                                <CircularProgress size={20} />
                            ) : codeAvailable === true ? (
                                <CheckCircleIcon color="success" />
                            ) : codeAvailable === false ? (
                                <ErrorIcon color="error" />
                            ) : null}
                        </InputAdornment>
                    ),
                }}
                inputProps={{ maxLength: 10, style: { textTransform: 'uppercase', fontFamily: 'monospace', direction: 'ltr' } }}
            />

            {/* Company Name */}
            <TextField
                label={t('settings.companies.nameLabel')}
                value={formData.companyName}
                onChange={(e) => onUpdate({ companyName: e.target.value })}
                required
                inputProps={{ maxLength: 100 }}
            />

            {/* Location */}
            <TextField
                label={t('settings.companies.locationLabel')}
                value={formData.location}
                onChange={(e) => onUpdate({ location: e.target.value })}
                placeholder={t('settings.companies.locationPlaceholder')}
                inputProps={{ maxLength: 255 }}
            />

            <Divider sx={{ my: 1 }}>
                <Chip icon={<CloudIcon />} label={t('settings.companies.aimsConfig')} size="small" />
            </Divider>

            {/* Cluster */}
            <FormControl fullWidth>
                <InputLabel>{t('settings.companies.aimsCluster')}</InputLabel>
                <Select
                    value={formData.aimsCluster || 'c1'}
                    label={t('settings.companies.aimsCluster')}
                    onChange={(e) => handleClusterChange(e.target.value)}
                >
                    <MenuItem value="c1">C1 (eu.common.solumesl.com/c1/common)</MenuItem>
                    <MenuItem value="common">Common (eu.common.solumesl.com/common)</MenuItem>
                </Select>
            </FormControl>

            {/* Username */}
            <TextField
                label={t('settings.companies.aimsUsername')}
                value={formData.aimsUsername}
                onChange={(e) => onUpdate({ aimsUsername: e.target.value })}
                placeholder="admin@company.com"
                required
            />

            {/* Password — visibility toggle outside input for better RTL support */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <TextField
                    label={t('settings.companies.aimsPassword')}
                    type={formData.showPassword ? 'text' : 'password'}
                    value={formData.aimsPassword}
                    onChange={(e) => onUpdate({ aimsPassword: e.target.value })}
                    required
                    fullWidth
                />
                <IconButton
                    onClick={() => onUpdate({ showPassword: !formData.showPassword })}
                    size="small"
                    sx={{ mt: 1 }}
                >
                    {formData.showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
            </Box>

            {/* Test Connection button */}
            <Button
                variant="outlined"
                onClick={onConnectionTest}
                disabled={connectionStatus === 'testing' || !formData.companyCode || !formData.aimsUsername || !formData.aimsPassword}
                startIcon={connectionStatus === 'testing' ? <CircularProgress size={16} /> : <CloudIcon />}
                color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'failed' ? 'error' : 'primary'}
            >
                {connectionStatus === 'testing'
                    ? t('settings.companies.connectionTesting')
                    : connectionStatus === 'connected'
                    ? t('settings.companies.connectionSuccess')
                    : connectionStatus === 'failed'
                    ? t('settings.companies.connectionFailed')
                    : t('settings.companies.testConnection')}
            </Button>

            {connectionError && (
                <Alert severity="error">{connectionError}</Alert>
            )}

            {connectionStatus === 'connected' && (
                <Alert severity="success">{t('settings.companies.connectionSuccess')}</Alert>
            )}
        </Box>
    );
}
