import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, Stack,
    CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, MenuItem,
    FormControlLabel, Switch, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { ssoService, type SsoConfig, type SsoProtocol, type CreateSsoConfigPayload } from '@shared/infrastructure/services/ssoService';

const PROTOCOLS: { value: SsoProtocol; label: string }[] = [
    { value: 'SAML', label: 'SAML 2.0' },
    { value: 'OIDC', label: 'OpenID Connect' },
];

const PROVIDERS = ['Azure AD', 'Okta', 'Google Workspace', 'OneLogin', 'Auth0', 'Custom'];

export function CompassSsoTab() {
    const { t } = useTranslation();
    const { activeCompanyId } = useAuthStore();

    const [configs, setConfigs] = useState<SsoConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; error?: string; details?: Record<string, unknown> } | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Form state
    const [protocol, setProtocol] = useState<SsoProtocol>('SAML');
    const [provider, setProvider] = useState('Azure AD');
    const [domain, setDomain] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [forceSso, setForceSso] = useState(false);
    const [autoProvision, setAutoProvision] = useState(false);
    // SAML fields
    const [idpEntityId, setIdpEntityId] = useState('');
    const [ssoUrl, setSsoUrl] = useState('');
    const [sloUrl, setSloUrl] = useState('');
    const [x509Certificate, setX509Certificate] = useState('');
    // OIDC fields
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [discoveryUrl, setDiscoveryUrl] = useState('');
    const [scopes, setScopes] = useState('openid profile email');

    const fetchConfigs = useCallback(async () => {
        if (!activeCompanyId) return;
        try {
            setLoading(true);
            setError(null);
            const data = await ssoService.list(activeCompanyId);
            setConfigs(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load SSO configurations');
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId]);

    useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

    const resetForm = () => {
        setProtocol('SAML');
        setProvider('Azure AD');
        setDomain('');
        setIsActive(false);
        setForceSso(false);
        setAutoProvision(false);
        setIdpEntityId('');
        setSsoUrl('');
        setSloUrl('');
        setX509Certificate('');
        setClientId('');
        setClientSecret('');
        setDiscoveryUrl('');
        setScopes('openid profile email');
        setEditingId(null);
        setTestResult(null);
    };

    const handleAdd = () => {
        resetForm();
        setDialogOpen(true);
    };

    const handleEdit = (config: SsoConfig) => {
        setEditingId(config.id);
        setProtocol(config.protocol);
        setProvider(config.provider);
        setDomain(config.domain);
        setIsActive(config.isActive);
        setForceSso(config.forceSso);
        setAutoProvision(config.autoProvision);
        setIdpEntityId(config.idpEntityId || '');
        setSsoUrl(config.ssoUrl || '');
        setSloUrl(config.sloUrl || '');
        setX509Certificate(''); // Don't populate — it's masked
        setClientId(config.clientId || '');
        setClientSecret(''); // Don't populate secrets
        setDiscoveryUrl(config.discoveryUrl || '');
        setScopes(config.scopes || 'openid profile email');
        setDialogOpen(true);
    };

    const handleTestConnection = async () => {
        if (!activeCompanyId) return;
        setTesting(true);
        setTestResult(null);
        try {
            const result = await ssoService.testConnection(activeCompanyId, {
                protocol,
                ssoUrl: ssoUrl || undefined,
                idpEntityId: idpEntityId || undefined,
                x509Certificate: x509Certificate || undefined,
                discoveryUrl: discoveryUrl || undefined,
                clientId: clientId || undefined,
            });
            setTestResult(result);
        } catch (err: any) {
            setTestResult({ success: false, error: err.message || 'Test failed' });
        } finally {
            setTesting(false);
        }
    };

    const canTest = protocol === 'SAML' ? !!ssoUrl : !!discoveryUrl;

    const handleSave = async () => {
        if (!activeCompanyId) return;
        setSaving(true);
        try {
            const payload: CreateSsoConfigPayload = {
                protocol,
                provider,
                domain,
                isActive,
                forceSso,
                autoProvision,
            };

            if (protocol === 'SAML') {
                payload.idpEntityId = idpEntityId || undefined;
                payload.ssoUrl = ssoUrl || undefined;
                payload.sloUrl = sloUrl || undefined;
                if (x509Certificate) payload.x509Certificate = x509Certificate;
            } else {
                payload.clientId = clientId || undefined;
                if (clientSecret) payload.clientSecret = clientSecret;
                payload.discoveryUrl = discoveryUrl || undefined;
                payload.scopes = scopes || undefined;
            }

            if (editingId) {
                await ssoService.update(activeCompanyId, editingId, payload);
            } else {
                await ssoService.create(activeCompanyId, payload);
            }

            setDialogOpen(false);
            resetForm();
            fetchConfigs();
        } catch (err: any) {
            setError(err.message || 'Failed to save SSO configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!activeCompanyId || !confirmDeleteId) return;
        try {
            await ssoService.remove(activeCompanyId, confirmDeleteId);
            setConfirmDeleteId(null);
            fetchConfigs();
        } catch (err: any) {
            setError(err.message || 'Failed to delete SSO configuration');
            setConfirmDeleteId(null);
        }
    };

    const handleToggleActive = async (config: SsoConfig) => {
        if (!activeCompanyId) return;
        try {
            await ssoService.update(activeCompanyId, config.id, { isActive: !config.isActive });
            fetchConfigs();
        } catch (err: any) {
            setError(err.message || 'Failed to update SSO configuration');
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">{t('compass.sso.title', 'Single Sign-On')}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
                    {t('compass.sso.addConfig', 'Add SSO Config')}
                </Button>
            </Stack>

            {configs.length === 0 ? (
                <Alert severity="info">{t('compass.sso.noConfigs', 'No SSO configurations found. Add one to enable SSO for your organization.')}</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('compass.sso.provider', 'Provider')}</TableCell>
                                <TableCell>{t('compass.sso.protocol', 'Protocol')}</TableCell>
                                <TableCell>{t('compass.sso.domain', 'Domain')}</TableCell>
                                <TableCell>{t('compass.sso.status', 'Status')}</TableCell>
                                <TableCell>{t('compass.sso.forceSso', 'Force SSO')}</TableCell>
                                <TableCell>{t('compass.sso.autoProvision', 'Auto-Provision')}</TableCell>
                                <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {configs.map(config => (
                                <TableRow key={config.id}>
                                    <TableCell>{config.provider}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={config.protocol}
                                            size="small"
                                            color={config.protocol === 'SAML' ? 'primary' : 'secondary'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{config.domain}</TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={config.isActive}
                                            onChange={() => handleToggleActive(config)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={config.forceSso ? t('common.yes', 'Yes') : t('common.no', 'No')}
                                            size="small"
                                            color={config.forceSso ? 'warning' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={config.autoProvision ? t('common.yes', 'Yes') : t('common.no', 'No')}
                                            size="small"
                                            color={config.autoProvision ? 'success' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={t('common.edit', 'Edit')}>
                                            <IconButton size="small" onClick={() => handleEdit(config)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={t('common.delete', 'Delete')}>
                                            <IconButton size="small" color="error" onClick={() => setConfirmDeleteId(config.id)}>
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

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingId ? t('compass.sso.editConfig', 'Edit SSO Configuration') : t('compass.sso.addConfig', 'Add SSO Configuration')}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            select label={t('compass.sso.protocol', 'Protocol')}
                            value={protocol} onChange={e => setProtocol(e.target.value as SsoProtocol)}
                            fullWidth size="small"
                        >
                            {PROTOCOLS.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                        </TextField>

                        <TextField
                            select label={t('compass.sso.provider', 'Provider')}
                            value={provider} onChange={e => setProvider(e.target.value)}
                            fullWidth size="small"
                        >
                            {PROVIDERS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </TextField>

                        <TextField
                            label={t('compass.sso.domain', 'Email Domain')}
                            value={domain} onChange={e => setDomain(e.target.value)}
                            placeholder="company.com"
                            fullWidth size="small"
                            helperText={t('compass.sso.domainHelp', 'Users with this email domain will be redirected to SSO')}
                        />

                        <Stack direction="row" spacing={2}>
                            <FormControlLabel
                                control={<Switch checked={isActive} onChange={e => setIsActive(e.target.checked)} />}
                                label={t('compass.sso.active', 'Active')}
                            />
                            <FormControlLabel
                                control={<Switch checked={forceSso} onChange={e => setForceSso(e.target.checked)} />}
                                label={t('compass.sso.forceSso', 'Force SSO')}
                            />
                            <FormControlLabel
                                control={<Switch checked={autoProvision} onChange={e => setAutoProvision(e.target.checked)} />}
                                label={t('compass.sso.autoProvision', 'Auto-Provision')}
                            />
                        </Stack>

                        {protocol === 'SAML' ? (
                            <>
                                <Typography variant="subtitle2" color="text.secondary">
                                    {t('compass.sso.samlSettings', 'SAML Settings')}
                                </Typography>
                                <TextField
                                    label={t('compass.sso.idpEntityId', 'IdP Entity ID')}
                                    value={idpEntityId} onChange={e => setIdpEntityId(e.target.value)}
                                    fullWidth size="small"
                                />
                                <TextField
                                    label={t('compass.sso.ssoUrl', 'SSO URL (Login)')}
                                    value={ssoUrl} onChange={e => setSsoUrl(e.target.value)}
                                    fullWidth size="small"
                                />
                                <TextField
                                    label={t('compass.sso.sloUrl', 'SLO URL (Logout)')}
                                    value={sloUrl} onChange={e => setSloUrl(e.target.value)}
                                    fullWidth size="small"
                                />
                                <TextField
                                    label={t('compass.sso.x509Certificate', 'X.509 Certificate')}
                                    value={x509Certificate} onChange={e => setX509Certificate(e.target.value)}
                                    fullWidth size="small" multiline rows={3}
                                    placeholder={editingId ? t('compass.sso.leaveBlankKeep', 'Leave blank to keep existing') : ''}
                                />
                            </>
                        ) : (
                            <>
                                <Typography variant="subtitle2" color="text.secondary">
                                    {t('compass.sso.oidcSettings', 'OIDC Settings')}
                                </Typography>
                                <TextField
                                    label={t('compass.sso.discoveryUrl', 'Discovery URL')}
                                    value={discoveryUrl} onChange={e => setDiscoveryUrl(e.target.value)}
                                    fullWidth size="small"
                                    placeholder="https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration"
                                />
                                <TextField
                                    label={t('compass.sso.clientId', 'Client ID')}
                                    value={clientId} onChange={e => setClientId(e.target.value)}
                                    fullWidth size="small"
                                />
                                <TextField
                                    label={t('compass.sso.clientSecret', 'Client Secret')}
                                    value={clientSecret} onChange={e => setClientSecret(e.target.value)}
                                    fullWidth size="small" type="password"
                                    placeholder={editingId ? t('compass.sso.leaveBlankKeep', 'Leave blank to keep existing') : ''}
                                />
                                <TextField
                                    label={t('compass.sso.scopes', 'Scopes')}
                                    value={scopes} onChange={e => setScopes(e.target.value)}
                                    fullWidth size="small"
                                />
                            </>
                        )}
                        {/* Test Connection Result */}
                        {testResult && (
                            <Alert
                                severity={testResult.success ? 'success' : 'error'}
                                icon={testResult.success ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                            >
                                {testResult.success
                                    ? t('compass.sso.testSuccess', 'Connection test passed')
                                    : testResult.error || t('compass.sso.testFailed', 'Connection test failed')}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                    <Button
                        onClick={handleTestConnection}
                        disabled={testing || !canTest}
                        color="info"
                    >
                        {testing ? <CircularProgress size={20} /> : t('compass.sso.testConnection', 'Test Connection')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving || !domain || (testResult !== null && !testResult.success)}
                    >
                        {saving ? <CircularProgress size={20} /> : t('common.save', 'Save')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <Typography>{t('common.confirmDelete', 'Are you sure you want to delete this item?')}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</Button>
                    <Button color="error" onClick={handleDelete}>{t('common.confirm')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
