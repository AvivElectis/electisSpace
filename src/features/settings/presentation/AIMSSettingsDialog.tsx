/**
 * AIMSSettingsDialog — Unified AIMS configuration dialog
 *
 * Combines credentials, sync settings, article format, and field mapping
 * into a single dialog opened from Company settings or CompaniesTab.
 */
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Alert,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Divider,
    CircularProgress,
    Paper,
    Stack,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudIcon from '@mui/icons-material/Cloud';
import SyncIcon from '@mui/icons-material/Sync';
import SchemaIcon from '@mui/icons-material/Schema';
import MapIcon from '@mui/icons-material/Map';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Company } from '@shared/infrastructure/services/companyService';
import { companyService, type UpdateAimsConfigDto } from '@shared/infrastructure/services/companyService';
import { fieldMappingService } from '@shared/infrastructure/services/fieldMappingService';
import { useSettingsController } from '../application/useSettingsController';
import { useSettingsStore } from '../infrastructure/settingsStore';
import { useConfigurationController } from '@features/configuration/application/useConfigurationController';
import { SolumFieldMappingTable } from './SolumFieldMappingTable';
import { SolumMappingSelectors } from './SolumMappingSelectors';
import { SolumGlobalFieldsEditor } from './SolumGlobalFieldsEditor';
import {
    SolumSyncSettingsSection,
    SolumPeopleManagerSection,
    SolumSchemaEditorSection,
} from './solum';
import type { SolumMappingConfig } from '../domain/types';
import type { CSVConfig } from '@shared/domain/types';

interface AIMSSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    company: Company;
    onSave?: () => void;
}

export function AIMSSettingsDialog({ open, onClose, company, onSave }: AIMSSettingsDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isRtl = theme.direction === 'rtl';

    // Settings controller for sync/mapping
    const settingsController = useSettingsController();
    const settings = settingsController.settings;
    const { saveCompanySettingsToServer, saveFieldMappingsToServer } = useSettingsStore();
    const { articleFormat } = useConfigurationController();

    // AIMS credentials state (company-level)
    const [aimsCluster, setAimsCluster] = useState('');
    const [aimsBaseUrl, setAimsBaseUrl] = useState('');
    const [aimsUsername, setAimsUsername] = useState('');
    const [aimsPassword, setAimsPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [aimsChanged, setAimsChanged] = useState(false);

    // Connection state
    const [isConnected, setIsConnected] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionTestResult, setConnectionTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const healthCheckRef = useRef<NodeJS.Timeout | null>(null);

    // Accordion expanded state
    const [expanded, setExpanded] = useState<string | false>('connection');

    // Initialize from company data
    useEffect(() => {
        if (open && company) {
            const cluster = company.aimsCluster || 'c1';
            setAimsCluster(cluster);
            setAimsBaseUrl(
                company.aimsBaseUrl ||
                (cluster === 'common'
                    ? 'https://eu.common.solumesl.com/common'
                    : 'https://eu.common.solumesl.com/c1/common')
            );
            setAimsUsername(company.aimsUsername || '');
            setAimsPassword('');
            setShowPassword(false);
            setAimsChanged(false);
            setConnectionTestResult(null);
            setExpanded('connection');

            if (company.aimsConfigured) {
                checkConnection(company.id);
            } else {
                setIsConnected(false);
            }
        }
        return () => {
            if (healthCheckRef.current) {
                clearInterval(healthCheckRef.current);
                healthCheckRef.current = null;
            }
        };
    }, [open, company]);

    const checkConnection = async (companyId: string) => {
        try {
            const result = await fieldMappingService.testAimsConnection(companyId);
            setIsConnected(result.success);
            if (result.success) startHealthCheck(companyId);
        } catch {
            setIsConnected(false);
        }
    };

    const startHealthCheck = (companyId: string) => {
        if (healthCheckRef.current) clearInterval(healthCheckRef.current);
        healthCheckRef.current = setInterval(async () => {
            try {
                const result = await fieldMappingService.testAimsConnection(companyId);
                if (!result.success) {
                    setIsConnected(false);
                    if (healthCheckRef.current) {
                        clearInterval(healthCheckRef.current);
                        healthCheckRef.current = null;
                    }
                }
            } catch {
                // Silently ignore
            }
        }, 30000);
    };

    const handleAimsFieldChange = (setter: (v: string) => void) => (value: string) => {
        setter(value);
        setAimsChanged(true);
        setConnectionTestResult(null);
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        setConnectionTestResult(null);
        try {
            if (aimsChanged && aimsBaseUrl && aimsCluster && aimsUsername) {
                const aimsData: UpdateAimsConfigDto = {
                    baseUrl: aimsBaseUrl.trim(),
                    cluster: aimsCluster.trim(),
                    username: aimsUsername.trim(),
                };
                if (aimsPassword) aimsData.password = aimsPassword;
                await companyService.updateAimsConfig(company.id, aimsData);
                setAimsChanged(false);
            }
            const result = await fieldMappingService.testAimsConnection(company.id);
            setConnectionTestResult({ success: result.success, message: result.message });
            if (result.success) {
                setIsConnected(true);
                startHealthCheck(company.id);
            } else {
                setIsConnected(false);
            }
        } catch (err: any) {
            setConnectionTestResult({
                success: false,
                message: err.response?.data?.message || t('settings.companies.connectionTestError'),
            });
            setIsConnected(false);
        } finally {
            setTestingConnection(false);
        }
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setConnectionTestResult(null);
        if (healthCheckRef.current) {
            clearInterval(healthCheckRef.current);
            healthCheckRef.current = null;
        }
    };

    // Field mapping helpers
    const articleFormatFields = useMemo(() => {
        if (!articleFormat) return [];
        return articleFormat.articleData || [];
    }, [articleFormat]);

    const saveFieldMappingsDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveFieldMappings = useCallback(() => {
        if (saveFieldMappingsDebounceRef.current) clearTimeout(saveFieldMappingsDebounceRef.current);
        saveFieldMappingsDebounceRef.current = setTimeout(() => {
            saveFieldMappingsToServer();
        }, 1000);
    }, [saveFieldMappingsToServer]);

    const updateFieldMappings = useCallback((config: SolumMappingConfig) => {
        settingsController.updateSettings({ solumMappingConfig: config });
        autoSaveFieldMappings();
    }, [settingsController, autoSaveFieldMappings]);

    // Sync settings handlers
    const handleCsvConfigChange = (config: CSVConfig) => {
        settingsController.updateSettings({ csvConfig: config });
        saveCompanySettingsToServer({ csvConfig: config });
    };

    const handlePeopleManagerEnabledChange = (enabled: boolean) => {
        settingsController.updateSettings({ peopleManagerEnabled: enabled });
        saveCompanySettingsToServer({ peopleManagerEnabled: enabled });
    };

    const handlePeopleManagerConfigChange = (config: Partial<{ totalSpaces: number }>) => {
        const updatedConfig = {
            totalSpaces: config.totalSpaces ?? settings.peopleManagerConfig?.totalSpaces ?? 0,
        };
        settingsController.updateSettings({ peopleManagerConfig: updatedConfig });
        saveCompanySettingsToServer({ peopleManagerConfig: updatedConfig });
    };

    const handleAutoSyncChange = (enabled: boolean) => {
        settingsController.updateSettings({ autoSyncEnabled: enabled });
        saveCompanySettingsToServer({ autoSyncEnabled: enabled });
    };

    const handleAutoSyncIntervalChange = (interval: number) => {
        settingsController.updateSettings({ autoSyncInterval: interval });
        saveCompanySettingsToServer({ autoSyncInterval: interval });
    };

    const syncIntervalOptions = [
        { value: 10, label: '10 ' + t('settings.seconds', 'seconds') },
        { value: 20, label: '20 ' + t('settings.seconds', 'seconds') },
        { value: 30, label: '30 ' + t('settings.seconds', 'seconds') },
        { value: 60, label: '1 ' + t('settings.minute', 'minute') },
        { value: 120, label: '2 ' + t('settings.minutes', 'minutes') },
        { value: 300, label: '5 ' + t('settings.minutes', 'minutes') },
    ];

    const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };

    const handleClose = () => {
        onSave?.();
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    height: isMobile ? '100%' : '80vh',
                    maxHeight: isMobile ? '100%' : 800,
                    borderRadius: isMobile ? 0 : 3,
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1.5,
                    px: { xs: 2, sm: 3 },
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <CloudIcon color="primary" />
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="span" fontWeight={600}>
                        {t('settings.aims.dialogTitle', 'AIMS Settings')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {company.name} ({company.code})
                    </Typography>
                </Box>
                <IconButton size="small" onClick={handleClose} sx={{ bgcolor: 'action.hover' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, overflow: 'auto' }}>
                {/* Section 1: Connection */}
                <Accordion
                    expanded={expanded === 'connection'}
                    onChange={handleAccordionChange('connection')}
                    disableGutters
                    sx={{ '&:before': { display: 'none' } }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 }, bgcolor: 'action.hover' }}>
                        <Stack direction="row" alignItems="center" gap={1.5}>
                            <CloudIcon fontSize="small" color={isConnected ? 'success' : 'action'} />
                            <Typography fontWeight={600}>
                                {t('settings.aims.connectionSection', 'Connection')}
                            </Typography>
                            {isConnected && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                        <Stack gap={2}>
                            {isConnected ? (
                                <Alert severity="success">{t('settings.companies.connectedToAims')}</Alert>
                            ) : (
                                <Alert severity="info">{t('settings.companies.aimsConfigInfo')}</Alert>
                            )}

                            <FormControl fullWidth disabled={isConnected}>
                                <InputLabel>{t('settings.companies.aimsCluster')}</InputLabel>
                                <Select
                                    value={aimsCluster || 'c1'}
                                    label={t('settings.companies.aimsCluster')}
                                    onChange={(e) => {
                                        const cluster = e.target.value;
                                        handleAimsFieldChange(setAimsCluster)(cluster);
                                        const url = cluster === 'common'
                                            ? 'https://eu.common.solumesl.com/common'
                                            : 'https://eu.common.solumesl.com/c1/common';
                                        handleAimsFieldChange(setAimsBaseUrl)(url);
                                    }}
                                >
                                    <MenuItem value="c1">C1 (eu.common.solumesl.com/c1/common)</MenuItem>
                                    <MenuItem value="common">Common (eu.common.solumesl.com/common)</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label={t('settings.companies.aimsBaseUrl')}
                                value={aimsBaseUrl}
                                disabled
                                helperText={t('settings.companies.aimsBaseUrlHelp')}
                            />

                            <TextField
                                label={t('settings.companies.aimsUsername')}
                                value={aimsUsername}
                                onChange={(e) => handleAimsFieldChange(setAimsUsername)(e.target.value)}
                                placeholder="admin@company.com"
                                disabled={isConnected}
                            />

                            <Box sx={{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
                                <TextField
                                    label={t('settings.companies.aimsPassword')}
                                    type={showPassword ? 'text' : 'password'}
                                    value={aimsPassword}
                                    onChange={(e) => handleAimsFieldChange(setAimsPassword)(e.target.value)}
                                    placeholder={t('settings.companies.aimsPasswordPlaceholder')}
                                    sx={{ flex: 1 }}
                                    disabled={isConnected}
                                />
                                <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isConnected}
                                    sx={{ mt: 1, border: 1, borderColor: 'divider', borderRadius: 1, width: 40, height: 40 }}
                                >
                                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                            </Box>

                            <Divider />

                            {/* Connection Status & Actions */}
                            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {isConnected ? (
                                        <>
                                            <CheckCircleIcon color="success" fontSize="small" />
                                            <Typography variant="body2" color="success.main">{t('settings.companies.connectedToAims')}</Typography>
                                        </>
                                    ) : company.aimsConfigured ? (
                                        <>
                                            <ErrorIcon color="warning" fontSize="small" />
                                            <Typography variant="body2" color="warning.main">{t('settings.companies.aimsConfigured')}</Typography>
                                        </>
                                    ) : (
                                        <>
                                            <ErrorIcon color="warning" fontSize="small" />
                                            <Typography variant="body2" color="warning.main">{t('settings.companies.aimsNotConfigured')}</Typography>
                                        </>
                                    )}
                                </Box>
                                <Stack direction="row" gap={1}>
                                    {isConnected && (
                                        <Button size="small" variant="outlined" color="warning" startIcon={<LinkOffIcon />} onClick={handleDisconnect}>
                                            {t('settings.companies.disconnect')}
                                        </Button>
                                    )}
                                    {!isConnected && (company.aimsConfigured || (aimsBaseUrl && aimsCluster && aimsUsername)) && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={testingConnection ? <CircularProgress size={14} /> : <RefreshIcon />}
                                            onClick={handleTestConnection}
                                            disabled={testingConnection}
                                        >
                                            {aimsChanged ? t('settings.companies.saveAndTest') : t('settings.companies.testConnection')}
                                        </Button>
                                    )}
                                </Stack>
                            </Box>

                            {connectionTestResult && (
                                <Alert severity={connectionTestResult.success ? 'success' : 'error'} onClose={() => setConnectionTestResult(null)}>
                                    {connectionTestResult.message}
                                </Alert>
                            )}
                            {aimsChanged && !isConnected && (
                                <Alert severity="info">{t('settings.companies.aimsChangesPending')}</Alert>
                            )}
                        </Stack>
                    </AccordionDetails>
                </Accordion>

                {/* Section 2: Sync Settings */}
                <Accordion
                    expanded={expanded === 'sync'}
                    onChange={handleAccordionChange('sync')}
                    disabled={!isConnected}
                    disableGutters
                    sx={{ '&:before': { display: 'none' } }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 }, bgcolor: 'action.hover' }}>
                        <Stack direction="row" alignItems="center" gap={1.5}>
                            <SyncIcon fontSize="small" color={isConnected ? 'primary' : 'disabled'} />
                            <Typography fontWeight={600}>
                                {t('settings.aims.syncSection', 'Sync Settings')}
                            </Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                        <Stack gap={2}>
                            {/* Auto Sync */}
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                                    {t('settings.syncSettings', 'Sync Settings')}
                                </Typography>
                                <Stack gap={2}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.autoSyncEnabled || false}
                                                onChange={(e) => handleAutoSyncChange(e.target.checked)}
                                            />
                                        }
                                        label={t('settings.enableAutoSync')}
                                    />
                                    {settings.autoSyncEnabled && (
                                        <FormControl size="small" sx={{ minWidth: 200 }}>
                                            <InputLabel>{t('settings.syncInterval', 'Sync Interval')}</InputLabel>
                                            <Select
                                                value={settings.autoSyncInterval || 10}
                                                label={t('settings.syncInterval', 'Sync Interval')}
                                                onChange={(e) => handleAutoSyncIntervalChange(Number(e.target.value))}
                                            >
                                                {syncIntervalOptions.map((opt) => (
                                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                </Stack>
                            </Paper>

                            {/* Conference Mode */}
                            <SolumSyncSettingsSection
                                csvConfig={settings.csvConfig || {}}
                                onConfigChange={handleCsvConfigChange}
                            />

                            {/* People Manager Mode */}
                            <SolumPeopleManagerSection
                                enabled={settings.peopleManagerEnabled || false}
                                config={settings.peopleManagerConfig || {}}
                                onEnabledChange={handlePeopleManagerEnabledChange}
                                onConfigChange={handlePeopleManagerConfigChange}
                            />
                        </Stack>
                    </AccordionDetails>
                </Accordion>

                {/* Section 3: Article Format */}
                <Accordion
                    expanded={expanded === 'schema'}
                    onChange={handleAccordionChange('schema')}
                    disabled={!isConnected}
                    disableGutters
                    sx={{ '&:before': { display: 'none' } }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 }, bgcolor: 'action.hover' }}>
                        <Stack direction="row" alignItems="center" gap={1.5}>
                            <SchemaIcon fontSize="small" color={isConnected ? 'primary' : 'disabled'} />
                            <Typography fontWeight={600}>
                                {t('settings.aims.schemaSection', 'Article Format')}
                            </Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                        <SolumSchemaEditorSection
                            articleFormat={articleFormat}
                            isConnected={isConnected}
                        />
                    </AccordionDetails>
                </Accordion>

                {/* Section 4: Field Mapping */}
                <Accordion
                    expanded={expanded === 'mapping'}
                    onChange={handleAccordionChange('mapping')}
                    disabled={!isConnected || articleFormatFields.length === 0}
                    disableGutters
                    sx={{ '&:before': { display: 'none' } }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 }, bgcolor: 'action.hover' }}>
                        <Stack direction="row" alignItems="center" gap={1.5}>
                            <MapIcon fontSize="small" color={isConnected && articleFormatFields.length > 0 ? 'primary' : 'disabled'} />
                            <Typography fontWeight={600}>
                                {t('settings.aims.mappingSection', 'Field Mapping')}
                            </Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                        <Stack gap={2}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                    {t('settings.dataMapping')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                    {t('settings.dataMappingHelp')}
                                </Typography>

                                {/* Mapping Selectors */}
                                <SolumMappingSelectors
                                    articleFormatFields={articleFormatFields}
                                    uniqueIdField={settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0]}
                                    conferenceMapping={
                                        settings.solumMappingConfig?.conferenceMapping || {
                                            meetingName: articleFormatFields[0] || '',
                                            meetingTime: articleFormatFields[0] || '',
                                            participants: articleFormatFields[0] || '',
                                        }
                                    }
                                    onUniqueIdChange={(field) =>
                                        updateFieldMappings({
                                            ...settings.solumMappingConfig,
                                            uniqueIdField: field,
                                            fields: settings.solumMappingConfig?.fields || {},
                                            conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                meetingName: '', meetingTime: '', participants: '',
                                            },
                                        })
                                    }
                                    onConferenceMappingChange={(mapping) =>
                                        updateFieldMappings({
                                            ...settings.solumMappingConfig,
                                            uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                            fields: settings.solumMappingConfig?.fields || {},
                                            conferenceMapping: mapping,
                                        })
                                    }
                                    mappingInfo={settings.solumMappingConfig?.mappingInfo}
                                    onMappingInfoChange={(newMappingInfo) =>
                                        updateFieldMappings({
                                            ...settings.solumMappingConfig,
                                            uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                            fields: settings.solumMappingConfig?.fields || {},
                                            conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                meetingName: '', meetingTime: '', participants: '',
                                            },
                                            mappingInfo: newMappingInfo,
                                        })
                                    }
                                    disabled={false}
                                />

                                {/* Global Field Assignments */}
                                <Box sx={{ mt: 3 }}>
                                    <SolumGlobalFieldsEditor
                                        articleFormatFields={articleFormatFields}
                                        globalAssignments={settings.solumMappingConfig?.globalFieldAssignments || {}}
                                        onChange={(assignments) =>
                                            updateFieldMappings({
                                                ...settings.solumMappingConfig,
                                                uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                                fields: settings.solumMappingConfig?.fields || {},
                                                conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                    meetingName: '', meetingTime: '', participants: '',
                                                },
                                                globalFieldAssignments: assignments,
                                            })
                                        }
                                        disabled={false}
                                    />
                                </Box>

                                {/* Field Mapping Table */}
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                                        {t('settings.fieldFriendlyNames')}
                                    </Typography>
                                    <SolumFieldMappingTable
                                        articleFormatFields={articleFormatFields}
                                        mappings={settings.solumMappingConfig?.fields || {}}
                                        excludeFields={[
                                            ...Object.keys(settings.solumMappingConfig?.globalFieldAssignments || {}),
                                            ...(settings.solumMappingConfig?.mappingInfo?.articleId ? [settings.solumMappingConfig.mappingInfo.articleId] : []),
                                            ...(settings.solumMappingConfig?.mappingInfo?.articleName ? [settings.solumMappingConfig.mappingInfo.articleName] : []),
                                        ]}
                                        onChange={(mappings) =>
                                            updateFieldMappings({
                                                ...settings.solumMappingConfig,
                                                uniqueIdField: settings.solumMappingConfig?.uniqueIdField || articleFormatFields[0],
                                                conferenceMapping: settings.solumMappingConfig?.conferenceMapping || {
                                                    meetingName: '', meetingTime: '', participants: '',
                                                },
                                                fields: mappings,
                                            })
                                        }
                                        disabled={false}
                                    />
                                </Box>
                            </Paper>
                        </Stack>
                    </AccordionDetails>
                </Accordion>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={handleClose}>{t('common.close', 'Close')}</Button>
            </DialogActions>
        </Dialog>
    );
}

export default AIMSSettingsDialog;
