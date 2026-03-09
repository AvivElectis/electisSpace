/**
 * EditCompanyTabs - Edit mode with 6-7 tabs matching wizard sections:
 * 1. Basic Info (company details + AIMS connection)
 * 2. Stores (existing store list, link to StoresDialog)
 * 3. Article Format (display saved format, re-fetch from AIMS)
 * 4. Field Mapping (editable field mapping with save)
 * 5. Features (space type + feature toggles)
 * 6. Integrations (directory sync — Microsoft 365, Google Workspace, Okta)
 * 7. Work Hours (compass only — working days, hours, timezone)
 */
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Alert,
    CircularProgress,
    FormControlLabel,
    Switch,
    Tabs,
    Tab,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Stack,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Autocomplete,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import StoreIcon from '@mui/icons-material/Store';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TuneIcon from '@mui/icons-material/Tune';
import SyncIcon from '@mui/icons-material/Sync';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CloudIcon from '@mui/icons-material/Cloud';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { useCompanyDialogState } from './useCompanyDialogState';
import { settingsService } from '@shared/infrastructure/services/settingsService';
import { companyService, type CompanyStore, type WorkConfigDto } from '@shared/infrastructure/services/companyService';
import { integrationService, type Integration, type Provider, type IntegrationType } from '@shared/infrastructure/services/integrationService';
import type { ArticleFormat } from '@features/configuration/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';

const AIMSSettingsDialog = lazy(() => import('../AIMSSettingsDialog'));

function TabPanel({ children, value, index }: { children?: React.ReactNode; index: number; value: number }) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

type State = ReturnType<typeof useCompanyDialogState>;

interface Props {
    state: State;
    onClose: () => void;
}

export function EditCompanyTabs({ state, onClose }: Props) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [aimsDialogOpen, setAimsDialogOpen] = useState(false);

    // Stores tab state
    const [stores, setStores] = useState<CompanyStore[]>([]);
    const [storesLoading, setStoresLoading] = useState(false);

    // Article format tab state
    const [articleFormat, setArticleFormat] = useState<ArticleFormat | null>(null);
    const [articleFormatLoading, setArticleFormatLoading] = useState(false);
    const [articleFormatError, setArticleFormatError] = useState<string | null>(null);

    // Field mapping tab state
    const [fieldMapping, setFieldMapping] = useState<SolumMappingConfig | null>(null);
    const [fieldMappingSaving, setFieldMappingSaving] = useState(false);
    const [fieldMappingSaved, setFieldMappingSaved] = useState(false);

    // Integrations tab state
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [integrationsLoading, setIntegrationsLoading] = useState(false);
    const [showAddIntegration, setShowAddIntegration] = useState(false);
    const [newProvider, setNewProvider] = useState<Provider>('MICROSOFT_365');
    const [newType, setNewType] = useState<IntegrationType>('USER_DIRECTORY');
    const [newCredentials, setNewCredentials] = useState<Record<string, string>>({});
    const [newSyncInterval, setNewSyncInterval] = useState(1440);
    const [integrationSaving, setIntegrationSaving] = useState(false);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [confirmDeleteIntegration, setConfirmDeleteIntegration] = useState<string | null>(null);

    // Work Hours tab state
    const [workingDays, setWorkingDays] = useState<number[]>([0, 1, 2, 3, 4]);
    const [workingHoursStart, setWorkingHoursStart] = useState('08:00');
    const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00');
    const [defaultTimezone, setDefaultTimezone] = useState('UTC');
    const [workConfigLoading, setWorkConfigLoading] = useState(false);
    const [workConfigSaving, setWorkConfigSaving] = useState(false);
    const [workConfigSaved, setWorkConfigSaved] = useState(false);
    const [workConfigLoaded, setWorkConfigLoaded] = useState(false);

    // Fetch stores + settings on open
    useEffect(() => {
        if (!state.company?.id) return;
        const companyId = state.company.id;

        // Fetch stores
        setStoresLoading(true);
        companyService.getStores(companyId)
            .then(res => setStores(res.stores))
            .catch(() => {})
            .finally(() => setStoresLoading(false));

        // Fetch company settings (article format + field mapping)
        settingsService.getCompanySettings(companyId)
            .then(res => {
                if (res.settings.solumArticleFormat) {
                    setArticleFormat(res.settings.solumArticleFormat);
                }
                if (res.settings.solumMappingConfig) {
                    setFieldMapping(res.settings.solumMappingConfig);
                }
            })
            .catch(() => {});

        // Fetch integrations
        fetchIntegrations(companyId);
    }, [state.company?.id]);

    const fetchIntegrations = useCallback(async (companyId: string) => {
        setIntegrationsLoading(true);
        try {
            const list = await integrationService.list(companyId);
            setIntegrations(list);
        } catch {
            // Ignore — integrations might not be available for this user role
        } finally {
            setIntegrationsLoading(false);
        }
    }, []);

    // Re-fetch article format from AIMS
    const handleRefetchArticleFormat = useCallback(async () => {
        if (!state.company) return;
        setArticleFormatLoading(true);
        setArticleFormatError(null);
        try {
            const result = await companyService.fetchArticleFormat({
                baseUrl: state.company.aimsBaseUrl || '',
                cluster: state.company.aimsCluster || 'c1',
                username: state.company.aimsUsername || '',
                password: '', // Server will use stored password
                companyCode: state.company.code,
            });
            if (result.success && result.format) {
                setArticleFormat(result.format);
                // Save to company settings
                await settingsService.updateCompanySettings(state.company.id, {
                    solumArticleFormat: result.format,
                });
            } else {
                setArticleFormatError(result.error || t('settings.companies.articleFormatError'));
            }
        } catch (err: any) {
            setArticleFormatError(err.response?.data?.message || t('settings.companies.articleFormatError'));
        } finally {
            setArticleFormatLoading(false);
        }
    }, [state.company, t]);

    // Save field mapping
    const handleSaveFieldMapping = useCallback(async () => {
        if (!state.company?.id || !fieldMapping) return;
        setFieldMappingSaving(true);
        try {
            await settingsService.updateCompanySettings(state.company.id, {
                solumMappingConfig: fieldMapping,
            });
            setFieldMappingSaved(true);
            setTimeout(() => setFieldMappingSaved(false), 2000);
        } catch {
            state.setError(t('settings.companies.saveError'));
        } finally {
            setFieldMappingSaving(false);
        }
    }, [state.company?.id, fieldMapping, state, t]);

    // Integration handlers
    const handleAddIntegration = useCallback(async () => {
        if (!state.company?.id) return;
        setIntegrationSaving(true);
        try {
            await integrationService.create(state.company.id, {
                provider: newProvider,
                type: newType,
                credentials: newCredentials,
                syncIntervalMinutes: newSyncInterval,
            });
            setShowAddIntegration(false);
            setNewCredentials({});
            await fetchIntegrations(state.company.id);
        } catch (err: any) {
            state.setError(err.response?.data?.error?.message || t('errors.saveFailed'));
        } finally {
            setIntegrationSaving(false);
        }
    }, [state.company?.id, newProvider, newType, newCredentials, newSyncInterval, state, fetchIntegrations]);

    const handleDeleteIntegration = useCallback(async (id: string) => {
        if (!state.company?.id) return;
        try {
            await integrationService.remove(state.company.id, id);
            setIntegrations(prev => prev.filter(i => i.id !== id));
        } catch (err: any) {
            state.setError(err.response?.data?.error?.message || t('errors.saveFailed'));
        }
    }, [state]);

    const handleTriggerSync = useCallback(async (id: string, fullSync = false) => {
        if (!state.company?.id) return;
        setSyncingId(id);
        try {
            await integrationService.triggerSync(state.company.id, id, fullSync);
            await fetchIntegrations(state.company.id);
        } catch (err: any) {
            state.setError(err.response?.data?.error?.message || t('errors.saveFailed'));
        } finally {
            setSyncingId(null);
        }
    }, [state, fetchIntegrations]);

    const handleToggleIntegration = useCallback(async (id: string, isActive: boolean) => {
        if (!state.company?.id) return;
        try {
            await integrationService.update(state.company.id, id, { isActive });
            setIntegrations(prev => prev.map(i => i.id === id ? { ...i, isActive } : i));
        } catch (err: any) {
            state.setError(err.response?.data?.error?.message || t('errors.saveFailed'));
        }
    }, [state]);

    const getCredentialFields = (provider: Provider): string[] => {
        switch (provider) {
            case 'MICROSOFT_365': return ['tenantId', 'clientId', 'clientSecret'];
            case 'GOOGLE_WORKSPACE': return ['serviceAccountJson', 'adminEmail', 'domain'];
            case 'OKTA': return ['domain', 'apiToken'];
            case 'LDAP': return ['url', 'bindDn', 'bindPassword', 'searchBase', 'searchFilter'];
        }
    };

    const providerLabel = (provider: Provider): string => {
        switch (provider) {
            case 'MICROSOFT_365': return 'Microsoft 365';
            case 'GOOGLE_WORKSPACE': return 'Google Workspace';
            case 'OKTA': return 'Okta';
            case 'LDAP': return 'LDAP';
        }
    };

    // Load work config when Work Hours tab is selected
    useEffect(() => {
        if (!state.company?.id || workConfigLoaded) return;
        const isCompassEnabled = state.companyFeatures?.compassEnabled;
        if (!isCompassEnabled) return;
        // Only load when user switches to the Work Hours tab (index 6)
        if (state.activeTab !== 6) return;
        setWorkConfigLoading(true);
        companyService.getWorkConfig(state.company.id)
            .then((config: WorkConfigDto) => {
                if (config.workingDays) setWorkingDays(config.workingDays);
                if (config.workingHoursStart) setWorkingHoursStart(config.workingHoursStart);
                if (config.workingHoursEnd) setWorkingHoursEnd(config.workingHoursEnd);
                if (config.defaultTimezone) setDefaultTimezone(config.defaultTimezone);
                setWorkConfigLoaded(true);
            })
            .catch(() => {
                // Config may not exist yet — use defaults
                setWorkConfigLoaded(true);
            })
            .finally(() => setWorkConfigLoading(false));
    }, [state.company?.id, state.activeTab, state.companyFeatures?.compassEnabled, workConfigLoaded]);

    // Save work config handler
    const handleSaveWorkConfig = useCallback(async () => {
        if (!state.company?.id) return;
        setWorkConfigSaving(true);
        try {
            await companyService.updateWorkConfig(state.company.id, {
                workingDays,
                workingHoursStart,
                workingHoursEnd,
                defaultTimezone,
            });
            setWorkConfigSaved(true);
            setTimeout(() => setWorkConfigSaved(false), 2000);
        } catch {
            state.setError(t('errors.saveFailed'));
        } finally {
            setWorkConfigSaving(false);
        }
    }, [state.company?.id, workingDays, workingHoursStart, workingHoursEnd, defaultTimezone, state, t]);

    // Day labels for toggle buttons
    const dayLabels = [
        { value: 0, label: t('compass.workHours.sun') },
        { value: 1, label: t('compass.workHours.mon') },
        { value: 2, label: t('compass.workHours.tue') },
        { value: 3, label: t('compass.workHours.wed') },
        { value: 4, label: t('compass.workHours.thu') },
        { value: 5, label: t('compass.workHours.fri') },
        { value: 6, label: t('compass.workHours.sat') },
    ];

    // Field mapping helpers
    const articleDataFields = articleFormat?.articleData || [];

    return (
        <>
            <DialogTitle>{t('settings.companies.editTitle')}</DialogTitle>
            <DialogContent dividers>
                {state.error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => state.setError(null)}>
                        {state.error}
                    </Alert>
                )}
                <Tabs
                    value={state.activeTab}
                    onChange={(_, newValue) => state.setActiveTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                    variant={isMobile ? 'scrollable' : 'fullWidth'}
                    scrollButtons={isMobile ? 'auto' : false}
                >
                    <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.basicInfo')} sx={{ minHeight: 48 }} />
                    <Tab icon={<StoreIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.reviewStores', 'Stores')} sx={{ minHeight: 48 }} />
                    <Tab icon={<DescriptionIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.reviewArticleFormat', 'Article Format')} sx={{ minHeight: 48 }} />
                    <Tab icon={<AccountTreeIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.reviewFieldMapping', 'Field Mapping')} sx={{ minHeight: 48 }} />
                    <Tab icon={<TuneIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.featuresTab', 'Features')} sx={{ minHeight: 48 }} />
                    <Tab icon={<SyncIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.integrationsTab', 'Integrations')} sx={{ minHeight: 48 }} />
                    {state.companyFeatures.compassEnabled && (
                        <Tab icon={<ScheduleIcon fontSize="small" />} iconPosition="start" label={t('compass.workHours.title')} sx={{ minHeight: 48 }} />
                    )}
                </Tabs>

                {/* Tab 0: Basic Info */}
                <TabPanel value={state.activeTab} index={0}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label={t('settings.companies.codeLabel')}
                            value={state.code}
                            disabled
                            slotProps={{ htmlInput: { style: { textTransform: 'uppercase', fontFamily: 'monospace' } } }}
                        />
                        <TextField
                            label={t('settings.companies.nameLabel')}
                            value={state.name}
                            onChange={(e) => state.setName(e.target.value)}
                            required
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                        />
                        <TextField
                            label={t('settings.companies.locationLabel')}
                            value={state.location}
                            onChange={(e) => state.setLocation(e.target.value)}
                            placeholder={t('settings.companies.locationPlaceholder')}
                            slotProps={{ htmlInput: { maxLength: 255 } }}
                        />
                        <TextField
                            label={t('settings.companies.descriptionLabel')}
                            value={state.description}
                            onChange={(e) => state.setDescription(e.target.value)}
                            multiline
                            rows={3}
                            placeholder={t('settings.companies.descriptionPlaceholder')}
                        />
                        <FormControlLabel
                            control={<Switch checked={state.isActive} onChange={(e) => state.setIsActive(e.target.checked)} />}
                            label={t('settings.companies.activeLabel')}
                        />

                        {/* AIMS Settings Quick Access */}
                        <Divider />
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" alignItems="center" gap={1}>
                                <CloudIcon fontSize="small" color={state.isConnected ? 'success' : 'disabled'} />
                                <Typography variant="body2">
                                    {t('settings.aims.dialogTitle', 'AIMS Settings')}
                                </Typography>
                                {state.isConnected ? (
                                    <Chip label={t('settings.companies.connectedToAims')} size="small" color="success" variant="outlined" icon={<CheckCircleIcon />} />
                                ) : state.company?.aimsConfigured ? (
                                    <Chip label={t('settings.companies.aimsConfigured')} size="small" color="warning" variant="outlined" />
                                ) : (
                                    <Chip label={t('settings.companies.aimsNotConfigured')} size="small" variant="outlined" icon={<CloudOffIcon />} />
                                )}
                            </Stack>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<CloudIcon />}
                                onClick={() => setAimsDialogOpen(true)}
                            >
                                {t('settings.aims.configure', 'Configure')}
                            </Button>
                        </Stack>
                    </Box>
                </TabPanel>

                {/* Tab 1: Stores */}
                <TabPanel value={state.activeTab} index={1}>
                    {storesLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : stores.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            {t('settings.companies.noStoresYet', 'No stores configured yet.')}
                        </Typography>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('settings.companies.codeLabel')}</TableCell>
                                        <TableCell>{t('settings.companies.nameLabel')}</TableCell>
                                        <TableCell>{t('settings.companies.storeTimezone')}</TableCell>
                                        <TableCell align="center">{t('settings.companies.activeLabel')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stores.map((store) => (
                                        <TableRow key={store.id}>
                                            <TableCell>
                                                <Typography variant="body2" fontFamily="monospace">{store.code}</Typography>
                                            </TableCell>
                                            <TableCell>{store.name}</TableCell>
                                            <TableCell>{store.timezone}</TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    size="small"
                                                    label={store.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                                    color={store.isActive ? 'success' : 'default'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t('settings.companies.storesManageHint', 'Use the Stores dialog from the settings page to add, edit, or remove stores.')}
                    </Typography>
                </TabPanel>

                {/* Tab 2: Article Format */}
                <TabPanel value={state.activeTab} index={2}>
                    {articleFormatError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setArticleFormatError(null)}>
                            {articleFormatError}
                        </Alert>
                    )}
                    {articleFormat ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 120 }}>
                                    <Typography variant="caption" color="text.secondary">{t('settings.companies.fileExtension')}</Typography>
                                    <Typography variant="body1" fontWeight={600}>{articleFormat.fileExtension}</Typography>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 120 }}>
                                    <Typography variant="caption" color="text.secondary">{t('settings.companies.delimiter')}</Typography>
                                    <Typography variant="body1" fontWeight={600}>{articleFormat.delimeter || '—'}</Typography>
                                </Paper>
                                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 120 }}>
                                    <Typography variant="caption" color="text.secondary">{t('settings.companies.dataFields')}</Typography>
                                    <Typography variant="body1" fontWeight={600}>{articleFormat.articleData?.length || 0}</Typography>
                                </Paper>
                            </Stack>

                            {articleFormat.articleBasicInfo && articleFormat.articleBasicInfo.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t('settings.companies.basicInfoFields')}</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {articleFormat.articleBasicInfo.map((f) => (
                                            <Chip key={f} label={f} size="small" variant="outlined" />
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {articleFormat.articleData && articleFormat.articleData.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t('settings.companies.dataFields')}</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {articleFormat.articleData.map((f) => (
                                            <Chip key={f} label={f} size="small" />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            {t('settings.companies.noArticleFormat', 'No article format stored. Fetch from AIMS to configure.')}
                        </Typography>
                    )}
                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={articleFormatLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                            onClick={handleRefetchArticleFormat}
                            disabled={articleFormatLoading || !state.company?.aimsConfigured}
                        >
                            {articleFormatLoading
                                ? t('settings.companies.fetchingArticleFormat')
                                : t('settings.companies.refetchArticleFormat', 'Re-fetch from AIMS')}
                        </Button>
                    </Box>
                </TabPanel>

                {/* Tab 3: Field Mapping */}
                <TabPanel value={state.activeTab} index={3}>
                    {fieldMapping ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Unique ID field */}
                            <Autocomplete
                                size="small"
                                options={articleDataFields}
                                value={fieldMapping.uniqueIdField || ''}
                                onChange={(_, value) => {
                                    setFieldMapping(prev => prev ? { ...prev, uniqueIdField: value || '' } : prev);
                                    setFieldMappingSaved(false);
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} label={t('settings.companies.uniqueIdField')} />
                                )}
                            />

                            {/* Field table */}
                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('settings.companies.aimsField')}</TableCell>
                                            <TableCell>{t('settings.companies.displayName')}</TableCell>
                                            <TableCell align="center">{t('settings.companies.visible')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(fieldMapping.fields).map(([key, field]) => (
                                            <TableRow key={key}>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace" fontSize={12}>{key}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        variant="standard"
                                                        value={field.friendlyNameEn}
                                                        onChange={(e) => {
                                                            setFieldMapping(prev => {
                                                                if (!prev) return prev;
                                                                return {
                                                                    ...prev,
                                                                    fields: {
                                                                        ...prev.fields,
                                                                        [key]: { ...field, friendlyNameEn: e.target.value },
                                                                    },
                                                                };
                                                            });
                                                            setFieldMappingSaved(false);
                                                        }}
                                                        fullWidth
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Switch
                                                        size="small"
                                                        checked={field.visible}
                                                        onChange={(e) => {
                                                            setFieldMapping(prev => {
                                                                if (!prev) return prev;
                                                                return {
                                                                    ...prev,
                                                                    fields: {
                                                                        ...prev.fields,
                                                                        [key]: { ...field, visible: e.target.checked },
                                                                    },
                                                                };
                                                            });
                                                            setFieldMappingSaved(false);
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Conference mapping */}
                            {fieldMapping.conferenceMapping && (
                                <>
                                    <Typography variant="subtitle2">{t('settings.companies.conferenceMappingTitle')}</Typography>
                                    <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
                                        <Autocomplete
                                            size="small"
                                            options={articleDataFields}
                                            value={fieldMapping.conferenceMapping.meetingName || ''}
                                            onChange={(_, value) => {
                                                setFieldMapping(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        conferenceMapping: { ...prev.conferenceMapping!, meetingName: value || '' },
                                                    };
                                                });
                                                setFieldMappingSaved(false);
                                            }}
                                            renderInput={(params) => (
                                                <TextField {...params} label={t('settings.companies.meetingNameField')} />
                                            )}
                                            sx={{ flex: 1 }}
                                        />
                                        <Autocomplete
                                            size="small"
                                            options={articleDataFields}
                                            value={fieldMapping.conferenceMapping.meetingTime || ''}
                                            onChange={(_, value) => {
                                                setFieldMapping(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        conferenceMapping: { ...prev.conferenceMapping!, meetingTime: value || '' },
                                                    };
                                                });
                                                setFieldMappingSaved(false);
                                            }}
                                            renderInput={(params) => (
                                                <TextField {...params} label={t('settings.companies.meetingTimeField')} />
                                            )}
                                            sx={{ flex: 1 }}
                                        />
                                        <Autocomplete
                                            size="small"
                                            options={articleDataFields}
                                            value={fieldMapping.conferenceMapping.participants || ''}
                                            onChange={(_, value) => {
                                                setFieldMapping(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        conferenceMapping: { ...prev.conferenceMapping!, participants: value || '' },
                                                    };
                                                });
                                                setFieldMappingSaved(false);
                                            }}
                                            renderInput={(params) => (
                                                <TextField {...params} label={t('settings.companies.participantsField')} />
                                            )}
                                            sx={{ flex: 1 }}
                                        />
                                    </Stack>
                                </>
                            )}

                            {/* Save mapping button */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                {fieldMappingSaved && (
                                    <Chip label={t('common.saved', 'Saved')} color="success" size="small" icon={<CheckCircleIcon />} />
                                )}
                                <Button
                                    variant="outlined"
                                    startIcon={fieldMappingSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                                    onClick={handleSaveFieldMapping}
                                    disabled={fieldMappingSaving}
                                >
                                    {t('settings.companies.saveFieldMapping', 'Save Mapping')}
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            {t('settings.companies.noFieldsConfigured')}
                        </Typography>
                    )}
                </TabPanel>

                {/* Tab 4: Features */}
                <TabPanel value={state.activeTab} index={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>{t('settings.companies.spaceTypeLabel', 'Space Type')}</InputLabel>
                            <Select
                                value={state.spaceType}
                                label={t('settings.companies.spaceTypeLabel', 'Space Type')}
                                onChange={(e) => state.setSpaceType(e.target.value as any)}
                                disabled={state.companyFeatures.compassEnabled}
                            >
                                <MenuItem value="office">{t('settings.offices')}</MenuItem>
                                <MenuItem value="room">{t('settings.rooms')}</MenuItem>
                                <MenuItem value="chair">{t('settings.chairs')}</MenuItem>
                                <MenuItem value="person-tag">{t('settings.personTags')}</MenuItem>
                            </Select>
                        </FormControl>

                        <Divider />

                        <Typography variant="subtitle2">{t('settings.companies.enabledFeatures', 'Enabled Features')}</Typography>

                        {/* Compass — workspace booking mode */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={state.companyFeatures.compassEnabled}
                                    onChange={(e) => state.handleFeatureToggle('compassEnabled', e.target.checked)}
                                />
                            }
                            label={t('settings.companies.featureCompass')}
                        />

                        {/* Spaces / People — single toggle with mode selector */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={state.companyFeatures.spacesEnabled || state.companyFeatures.peopleEnabled}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                state.handleFeatureToggle('peopleEnabled', true);
                                            } else {
                                                state.handleFeatureToggle('spacesEnabled', false);
                                                state.handleFeatureToggle('peopleEnabled', false);
                                            }
                                        }}
                                        disabled={state.companyFeatures.compassEnabled}
                                    />
                                }
                                label={t('settings.companies.spacesOrPeopleLabel', 'Spaces / People')}
                                sx={{ minWidth: 180 }}
                            />
                            {(state.companyFeatures.spacesEnabled || state.companyFeatures.peopleEnabled) && (
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                    <Select
                                        value={state.companyFeatures.spacesEnabled ? 'spaces' : 'people'}
                                        onChange={(e) => {
                                            if (e.target.value === 'spaces') {
                                                state.handleFeatureToggle('spacesEnabled', true);
                                            } else {
                                                state.handleFeatureToggle('peopleEnabled', true);
                                            }
                                        }}
                                    >
                                        <MenuItem value="spaces">{t('navigation.spaces')}</MenuItem>
                                        <MenuItem value="people">{t('navigation.people')}</MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                        </Box>

                        {/* Conference — single toggle with mode selector */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={state.companyFeatures.conferenceEnabled}
                                        onChange={(e) => state.handleFeatureToggle('conferenceEnabled', e.target.checked)}
                                        disabled={state.companyFeatures.compassEnabled}
                                    />
                                }
                                label={t('navigation.conference')}
                                sx={{ minWidth: 180 }}
                            />
                            {state.companyFeatures.conferenceEnabled && (
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                    <Select
                                        value={state.companyFeatures.simpleConferenceMode ? 'simple' : 'standard'}
                                        onChange={(e) => state.handleFeatureToggle('simpleConferenceMode', e.target.value === 'simple')}
                                    >
                                        <MenuItem value="standard">{t('settings.companies.conferenceStandard', 'Standard')}</MenuItem>
                                        <MenuItem value="simple">{t('settings.companies.conferenceSimple', 'Simple')}</MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                        </Box>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={state.companyFeatures.labelsEnabled}
                                    onChange={(e) => state.handleFeatureToggle('labelsEnabled', e.target.checked)}
                                />
                            }
                            label={t('labels.title')}
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={state.companyFeatures.aimsManagementEnabled}
                                    onChange={(e) => state.handleFeatureToggle('aimsManagementEnabled', e.target.checked)}
                                />
                            }
                            label={t('settings.companies.aimsManagement', 'AIMS Management')}
                        />
                    </Box>
                </TabPanel>

                {/* Tab 5: Integrations */}
                <TabPanel value={state.activeTab} index={5}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {integrationsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress size={32} />
                            </Box>
                        ) : (
                            <>
                                {integrations.length === 0 && !showAddIntegration && (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                        {t('settings.companies.noIntegrations', 'No directory sync integrations configured.')}
                                    </Typography>
                                )}

                                {/* Existing integrations */}
                                {integrations.map((integration) => (
                                    <Paper key={integration.id} variant="outlined" sx={{ p: 2 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                            <Stack direction="row" alignItems="center" gap={1}>
                                                <Typography variant="subtitle2">{providerLabel(integration.provider)}</Typography>
                                                <Chip
                                                    size="small"
                                                    label={integration.type.replace('_', ' ')}
                                                    variant="outlined"
                                                />
                                                <Chip
                                                    size="small"
                                                    label={integration.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                                    color={integration.isActive ? 'success' : 'default'}
                                                    variant="outlined"
                                                />
                                            </Stack>
                                            <Stack direction="row" gap={0.5}>
                                                <Switch
                                                    size="small"
                                                    checked={integration.isActive}
                                                    onChange={(e) => handleToggleIntegration(integration.id, e.target.checked)}
                                                />
                                                <Button
                                                    size="small"
                                                    startIcon={syncingId === integration.id ? <CircularProgress size={14} /> : <SyncIcon />}
                                                    onClick={() => handleTriggerSync(integration.id)}
                                                    disabled={syncingId === integration.id || !integration.isActive}
                                                >
                                                    {t('settings.companies.syncNow', 'Sync')}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    startIcon={<DeleteIcon />}
                                                    onClick={() => setConfirmDeleteIntegration(integration.id)}
                                                >
                                                    {t('common.delete', 'Delete')}
                                                </Button>
                                            </Stack>
                                        </Stack>
                                        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                            <Typography variant="caption" color="text.secondary">
                                                {t('settings.companies.syncInterval', 'Interval')}: {integration.syncIntervalMinutes}m
                                            </Typography>
                                            {integration.lastSyncAt && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {t('settings.companies.lastSync', 'Last sync')}: {new Date(integration.lastSyncAt).toLocaleString()}
                                                </Typography>
                                            )}
                                            {integration.lastSyncStatus && (
                                                <Chip
                                                    size="small"
                                                    label={integration.lastSyncStatus}
                                                    color={integration.lastSyncStatus === 'SUCCESS' ? 'success' : integration.lastSyncStatus === 'PARTIAL' ? 'warning' : 'error'}
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                        {integration.lastSyncStats && (
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                {t('settings.companies.syncStats', 'Created')}: {integration.lastSyncStats.created},
                                                {' '}{t('settings.companies.syncUpdated', 'Updated')}: {integration.lastSyncStats.updated},
                                                {' '}{t('settings.companies.syncDeactivated', 'Deactivated')}: {integration.lastSyncStats.deactivated}
                                            </Typography>
                                        )}
                                        {integration.lastSyncError && (
                                            <Alert severity="error" sx={{ mt: 1 }}>
                                                {integration.lastSyncError}
                                            </Alert>
                                        )}
                                    </Paper>
                                ))}

                                {/* Add integration form */}
                                {showAddIntegration ? (
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                            {t('settings.companies.addIntegration', 'Add Integration')}
                                        </Typography>
                                        <Stack spacing={2}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>{t('settings.companies.provider', 'Provider')}</InputLabel>
                                                <Select
                                                    value={newProvider}
                                                    label={t('settings.companies.provider', 'Provider')}
                                                    onChange={(e) => {
                                                        const provider = e.target.value as Provider;
                                                        setNewProvider(provider);
                                                        setNewCredentials({});
                                                        if (provider === 'OKTA') setNewType('USER_DIRECTORY');
                                                    }}
                                                >
                                                    <MenuItem value="MICROSOFT_365">Microsoft 365</MenuItem>
                                                    <MenuItem value="GOOGLE_WORKSPACE">Google Workspace</MenuItem>
                                                    <MenuItem value="OKTA">Okta</MenuItem>
                                                    <MenuItem value="LDAP">LDAP</MenuItem>
                                                </Select>
                                            </FormControl>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>{t('settings.companies.integrationType', 'Type')}</InputLabel>
                                                <Select
                                                    value={newType}
                                                    label={t('settings.companies.integrationType', 'Type')}
                                                    onChange={(e) => setNewType(e.target.value as IntegrationType)}
                                                >
                                                    <MenuItem value="USER_DIRECTORY">{t('settings.companies.userDirectory', 'User Directory')}</MenuItem>
                                                    {newProvider !== 'OKTA' && newProvider !== 'LDAP' && (
                                                        <MenuItem value="CALENDAR_ROOMS">{t('settings.companies.calendarRooms', 'Calendar / Rooms')}</MenuItem>
                                                    )}
                                                    {newProvider !== 'OKTA' && newProvider !== 'LDAP' && (
                                                        <MenuItem value="BOTH">{t('settings.companies.both', 'Both')}</MenuItem>
                                                    )}
                                                </Select>
                                            </FormControl>
                                            <TextField
                                                size="small"
                                                label={t('settings.companies.syncIntervalMinutes', 'Sync Interval (minutes)')}
                                                type="number"
                                                value={newSyncInterval}
                                                onChange={(e) => setNewSyncInterval(Math.max(15, parseInt(e.target.value) || 1440))}
                                                slotProps={{ htmlInput: { min: 15, max: 10080 } }}
                                            />

                                            <Divider />
                                            <Typography variant="caption" color="text.secondary">
                                                {t('settings.companies.credentials', 'Credentials')}
                                            </Typography>

                                            {getCredentialFields(newProvider).map((field) => (
                                                <TextField
                                                    key={field}
                                                    size="small"
                                                    label={field}
                                                    value={newCredentials[field] || ''}
                                                    onChange={(e) => setNewCredentials(prev => ({ ...prev, [field]: e.target.value }))}
                                                    type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('token') || field.toLowerCase().includes('json') ? 'password' : 'text'}
                                                    multiline={field === 'serviceAccountJson'}
                                                    rows={field === 'serviceAccountJson' ? 4 : undefined}
                                                />
                                            ))}

                                            <Stack direction="row" justifyContent="flex-end" spacing={1}>
                                                <Button size="small" onClick={() => { setShowAddIntegration(false); setNewCredentials({}); }}>
                                                    {t('common.cancel')}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={handleAddIntegration}
                                                    disabled={integrationSaving || getCredentialFields(newProvider).some(f => !newCredentials[f])}
                                                    startIcon={integrationSaving ? <CircularProgress size={14} /> : null}
                                                >
                                                    {t('common.save')}
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                ) : (
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => setShowAddIntegration(true)}
                                        sx={{ alignSelf: 'flex-start' }}
                                    >
                                        {t('settings.companies.addIntegration', 'Add Integration')}
                                    </Button>
                                )}
                            </>
                        )}
                    </Box>
                </TabPanel>

                {/* Tab 6: Work Hours (only when compass enabled) */}
                {state.companyFeatures.compassEnabled && (
                    <TabPanel value={state.activeTab} index={6}>
                        {workConfigLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress size={32} />
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {/* Working Days */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        {t('compass.workHours.workingDays')}
                                    </Typography>
                                    <ToggleButtonGroup
                                        value={workingDays}
                                        onChange={(_, newDays: number[]) => {
                                            if (newDays.length > 0) {
                                                setWorkingDays(newDays);
                                                setWorkConfigSaved(false);
                                            }
                                        }}
                                        size="small"
                                        sx={{ flexWrap: 'wrap' }}
                                    >
                                        {dayLabels.map((day) => (
                                            <ToggleButton key={day.value} value={day.value} sx={{ px: 2 }}>
                                                {day.label}
                                            </ToggleButton>
                                        ))}
                                    </ToggleButtonGroup>
                                </Box>

                                {/* Working Hours */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        {t('compass.workHours.workingHours')}
                                    </Typography>
                                    <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
                                        <TextField
                                            label={t('compass.workHours.start')}
                                            type="time"
                                            value={workingHoursStart}
                                            onChange={(e) => {
                                                setWorkingHoursStart(e.target.value);
                                                setWorkConfigSaved(false);
                                            }}
                                            slotProps={{ inputLabel: { shrink: true } }}
                                            size="small"
                                            sx={{ minWidth: 150 }}
                                        />
                                        <TextField
                                            label={t('compass.workHours.end')}
                                            type="time"
                                            value={workingHoursEnd}
                                            onChange={(e) => {
                                                setWorkingHoursEnd(e.target.value);
                                                setWorkConfigSaved(false);
                                            }}
                                            slotProps={{ inputLabel: { shrink: true } }}
                                            size="small"
                                            sx={{ minWidth: 150 }}
                                        />
                                    </Stack>
                                </Box>

                                {/* Timezone */}
                                <Autocomplete
                                    value={defaultTimezone}
                                    onChange={(_, newValue) => {
                                        setDefaultTimezone(newValue || 'UTC');
                                        setWorkConfigSaved(false);
                                    }}
                                    options={[
                                        'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
                                        'America/Los_Angeles', 'America/Sao_Paulo', 'Europe/London',
                                        'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Asia/Tokyo',
                                        'Asia/Shanghai', 'Asia/Seoul', 'Asia/Singapore', 'Asia/Dubai',
                                        'Asia/Jerusalem', 'Australia/Sydney', 'Pacific/Auckland',
                                    ]}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={t('settings.stores.timezoneLabel')}
                                            size="small"
                                        />
                                    )}
                                    freeSolo
                                    disableClearable
                                    size="small"
                                />

                                {/* Save button */}
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                                    {workConfigSaved && (
                                        <Chip label={t('common.saved', 'Saved')} color="success" size="small" icon={<CheckCircleIcon />} />
                                    )}
                                    <Button
                                        variant="outlined"
                                        startIcon={workConfigSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                                        onClick={handleSaveWorkConfig}
                                        disabled={workConfigSaving}
                                    >
                                        {t('common.save')}
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </TabPanel>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={state.submitting}>{t('common.cancel')}</Button>
                <Button variant="contained" onClick={state.handleEditSubmit} disabled={state.submitting || !state.isEditValid()} startIcon={state.submitting ? <CircularProgress size={16} /> : null}>
                    {t('common.save')}
                </Button>
            </DialogActions>

            {/* Confirmation dialog for deleting an integration */}
            <Dialog open={!!confirmDeleteIntegration} onClose={() => setConfirmDeleteIntegration(null)}>
                <DialogTitle>{t('common.confirm')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('common.confirmDelete')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteIntegration(null)}>{t('common.cancel')}</Button>
                    <Button
                        color="error"
                        onClick={async () => {
                            if (confirmDeleteIntegration) await handleDeleteIntegration(confirmDeleteIntegration);
                            setConfirmDeleteIntegration(null);
                        }}
                    >
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* AIMS Settings Dialog */}
            {state.company && (
                <Suspense fallback={null}>
                    {aimsDialogOpen && (
                        <AIMSSettingsDialog
                            open={true}
                            onClose={() => setAimsDialogOpen(false)}
                            company={state.company}
                        />
                    )}
                </Suspense>
            )}
        </>
    );
}
