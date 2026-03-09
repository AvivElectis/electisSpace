import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, Stack,
    CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, MenuItem,
    FormControlLabel, Switch, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { integrationService, type Integration, type Provider, type IntegrationType } from '@shared/infrastructure/services/integrationService';

const PROVIDERS: { value: Provider; label: string }[] = [
    { value: 'MICROSOFT_365', label: 'Microsoft 365' },
    { value: 'GOOGLE_WORKSPACE', label: 'Google Workspace' },
    { value: 'OKTA', label: 'Okta' },
    { value: 'LDAP', label: 'LDAP' },
];

const CREDENTIAL_FIELDS: Record<Provider, string[]> = {
    MICROSOFT_365: ['tenantId', 'clientId', 'clientSecret'],
    GOOGLE_WORKSPACE: ['serviceAccountJson', 'adminEmail', 'domain'],
    OKTA: ['domain', 'apiToken'],
    LDAP: ['url', 'bindDn', 'bindPassword', 'searchBase', 'searchFilter'],
};

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    SUCCESS: 'success',
    PARTIAL: 'warning',
    FAILED: 'error',
};

export function CompassIntegrationsTab() {
    const { t } = useTranslation();
    const { activeCompanyId } = useAuthStore();

    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState<string | null>(null);

    // Add dialog state
    const [addOpen, setAddOpen] = useState(false);
    const [provider, setProvider] = useState<Provider>('MICROSOFT_365');
    const [intType, setIntType] = useState<IntegrationType>('USER_DIRECTORY');
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [syncInterval, setSyncInterval] = useState(1440);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Integration | null>(null);

    const fetchIntegrations = useCallback(async () => {
        if (!activeCompanyId) return;
        try {
            const data = await integrationService.list(activeCompanyId);
            setIntegrations(data);
            setError(null);
        } catch {
            setError(t('errors.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, t]);

    useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

    const handleTestConnection = async () => {
        if (!activeCompanyId) return;
        setTesting(true);
        setTestResult(null);
        try {
            const result = await integrationService.testConnection(activeCompanyId, provider, credentials);
            setTestResult(result);
        } catch (err: any) {
            setTestResult({ success: false, error: err.message || 'Test failed' });
        } finally {
            setTesting(false);
        }
    };

    const handleAdd = async () => {
        if (!activeCompanyId) return;
        setSaving(true);
        try {
            await integrationService.create(activeCompanyId, {
                provider,
                type: intType,
                credentials,
                syncIntervalMinutes: syncInterval,
            });
            setAddOpen(false);
            setCredentials({});
            setTestResult(null);
            fetchIntegrations();
        } catch {
            setError(t('errors.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (integration: Integration) => {
        if (!activeCompanyId) return;
        try {
            await integrationService.update(activeCompanyId, integration.id, {
                isActive: !integration.isActive,
            });
            fetchIntegrations();
        } catch {
            setError(t('errors.saveFailed'));
        }
    };

    const handleSync = async (integration: Integration, fullSync = false) => {
        if (!activeCompanyId) return;
        setSyncing(integration.id);
        try {
            const result = await integrationService.triggerSync(activeCompanyId, integration.id, fullSync);
            setError(null);
            // Show brief success message
            setError(null);
            fetchIntegrations();
            // Use a temp success notification
            const msg = `${t('compass.integrations.syncComplete')}: ${result.created} ${t('common.create').toLowerCase()}, ${result.updated} ${t('common.update', 'updated').toLowerCase()}, ${result.deactivated} ${t('compass.integrations.deactivated', 'deactivated').toLowerCase()}`;
            setError(msg); // We'll show as info below
            setTimeout(() => setError(null), 5000);
        } catch (err: any) {
            setError(err?.response?.data?.message || t('errors.saveFailed'));
        } finally {
            setSyncing(null);
        }
    };

    const handleDelete = async () => {
        if (!activeCompanyId || !deleteTarget) return;
        try {
            await integrationService.remove(activeCompanyId, deleteTarget.id);
            setDeleteTarget(null);
            fetchIntegrations();
        } catch {
            setError(t('errors.saveFailed'));
        }
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return '-';
        return new Date(iso).toLocaleString();
    };

    const providerLabel = (p: string) => PROVIDERS.find(pr => pr.value === p)?.label || p;

    const hasRoomSync = provider !== 'OKTA' && provider !== 'LDAP';
    const credFields = CREDENTIAL_FIELDS[provider] || [];
    const canSave = credFields.every(f => credentials[f]?.trim());

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {error && (
                <Alert
                    severity={error.includes(t('compass.integrations.syncComplete')) ? 'success' : 'error'}
                    sx={{ mb: 2 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            <Stack direction="row" gap={2} sx={{ mb: 2 }} alignItems="center">
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                    {t('compass.integrations.add', 'Add Integration')}
                </Button>
                <Typography variant="body2" color="text.secondary">
                    {integrations.length} {t('compass.integrations.title', 'integrations').toLowerCase()}
                </Typography>
            </Stack>

            {integrations.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">{t('compass.integrations.empty', 'No integrations configured yet')}</Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('compass.integrations.provider', 'Provider')}</TableCell>
                                <TableCell>{t('compass.integrations.type', 'Type')}</TableCell>
                                <TableCell>{t('common.status.title')}</TableCell>
                                <TableCell>{t('compass.integrations.lastSync', 'Last Sync')}</TableCell>
                                <TableCell>{t('compass.integrations.syncStatus', 'Sync Status')}</TableCell>
                                <TableCell>{t('compass.integrations.interval', 'Interval')}</TableCell>
                                <TableCell align="right">{t('common.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {integrations.map((int) => (
                                <TableRow key={int.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {providerLabel(int.provider)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={int.type.replace('_', ' ')} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    size="small"
                                                    checked={int.isActive}
                                                    onChange={() => handleToggleActive(int)}
                                                />
                                            }
                                            label={int.isActive ? t('common.active') : t('common.inactive')}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption">{formatDate(int.lastSyncAt)}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {int.lastSyncStatus ? (
                                            <Tooltip title={int.lastSyncError || ''}>
                                                <Chip
                                                    label={int.lastSyncStatus}
                                                    size="small"
                                                    color={statusColors[int.lastSyncStatus] || 'default'}
                                                />
                                            </Tooltip>
                                        ) : '-'}
                                        {int.lastSyncStats && (
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                +{int.lastSyncStats.created} / ~{int.lastSyncStats.updated} / -{int.lastSyncStats.deactivated}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {int.syncIntervalMinutes >= 1440
                                            ? `${Math.round(int.syncIntervalMinutes / 1440)}d`
                                            : `${int.syncIntervalMinutes}m`}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={t('compass.integrations.syncNow', 'Sync Now')}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleSync(int)}
                                                disabled={!int.isActive || syncing === int.id}
                                            >
                                                {syncing === int.id ? <CircularProgress size={16} /> : <SyncIcon fontSize="small" />}
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={t('common.delete')}>
                                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(int)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add Integration Dialog */}
            <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('compass.integrations.add')}</DialogTitle>
                <DialogContent>
                    <Stack gap={2} sx={{ mt: 1 }}>
                        <TextField
                            select fullWidth size="small"
                            label={t('compass.integrations.provider')}
                            value={provider}
                            onChange={(e) => { setProvider(e.target.value as Provider); setCredentials({}); }}
                        >
                            {PROVIDERS.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                        </TextField>

                        <TextField
                            select fullWidth size="small"
                            label={t('compass.integrations.type')}
                            value={intType}
                            onChange={(e) => setIntType(e.target.value as IntegrationType)}
                        >
                            <MenuItem value="USER_DIRECTORY">{t('settings.companies.userDirectory', 'User Directory')}</MenuItem>
                            {hasRoomSync && <MenuItem value="CALENDAR_ROOMS">{t('settings.companies.calendarRooms', 'Calendar / Rooms')}</MenuItem>}
                            {hasRoomSync && <MenuItem value="BOTH">{t('settings.companies.both', 'Both')}</MenuItem>}
                        </TextField>

                        <TextField
                            fullWidth size="small" type="number"
                            label={t('compass.integrations.interval')}
                            value={syncInterval}
                            onChange={(e) => setSyncInterval(parseInt(e.target.value, 10) || 1440)}
                            helperText={t('compass.integrations.intervalHelp', 'Minutes between syncs (min 15, default 1440 = 24h)')}
                            slotProps={{ htmlInput: { min: 15, max: 10080 } }}
                        />

                        <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('settings.companies.credentials', 'Credentials')}</Typography>
                        {credFields.map(field => (
                            <TextField
                                key={field}
                                fullWidth size="small"
                                label={field}
                                value={credentials[field] || ''}
                                onChange={(e) => setCredentials(prev => ({ ...prev, [field]: e.target.value }))}
                                type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('password') || field.toLowerCase().includes('token') || field.toLowerCase().includes('json') ? 'password' : 'text'}
                                multiline={field === 'serviceAccountJson'}
                                rows={field === 'serviceAccountJson' ? 4 : undefined}
                            />
                        ))}

                        {/* Test Connection Result */}
                        {testResult && (
                            <Alert
                                severity={testResult.success ? 'success' : 'error'}
                                icon={testResult.success ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                            >
                                {testResult.success
                                    ? t('compass.integrations.testSuccess', 'Connection test passed')
                                    : testResult.error || t('compass.integrations.testFailed', 'Connection test failed')}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setAddOpen(false); setTestResult(null); }}>{t('common.cancel')}</Button>
                    <Button
                        onClick={handleTestConnection}
                        disabled={testing || !canSave}
                        color="info"
                    >
                        {testing ? <CircularProgress size={20} /> : t('compass.integrations.testConnection', 'Test Connection')}
                    </Button>
                    <Button variant="contained" onClick={handleAdd} disabled={!canSave || saving || (testResult !== null && !testResult.success)}>
                        {saving ? <CircularProgress size={20} /> : t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('compass.integrations.confirmDelete', 'Are you sure you want to delete this integration?')}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
                    <Button color="error" onClick={handleDelete}>{t('common.delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
