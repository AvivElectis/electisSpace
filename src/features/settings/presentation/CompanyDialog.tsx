/**
 * Company Dialog
 * 
 * @description Dialog for creating and editing companies.
 * CREATE mode: Wizard stepper — Step 1: Code + AIMS credentials → Connect → Step 2: Pick stores
 * EDIT mode: Tabs — Basic Info + AIMS Config (unchanged)
 * Only PLATFORM_ADMIN can create companies; COMPANY_ADMIN+ can edit.
 */
import {
    Dialog,
    DialogTitle,
    DialogContent,
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
    InputAdornment,
    IconButton,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    useTheme,
    Stepper,
    Step,
    StepLabel,
    Checkbox,
    Chip,
    Paper,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudIcon from '@mui/icons-material/Cloud';
import BusinessIcon from '@mui/icons-material/Business';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    companyService,
    type Company,
    type CreateCompanyDto,
    type UpdateCompanyDto,
    type UpdateAimsConfigDto,
    type AimsStoreInfo,
} from '@shared/infrastructure/services/companyService';
import { fieldMappingService } from '@shared/infrastructure/services/fieldMappingService';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

interface CompanyDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    company?: Company | null; // If provided, edit mode
}

export function CompanyDialog({ open, onClose, onSave, company }: CompanyDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isRtl = theme.direction === 'rtl';
    const isEdit = !!company;

    // =========== Shared State ===========
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Basic Info
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Code Validation
    const [codeValidating, setCodeValidating] = useState(false);
    const [codeValid, setCodeValid] = useState<boolean | null>(null);
    const [codeError, setCodeError] = useState<string | null>(null);

    // AIMS Configuration
    const [aimsBaseUrl, setAimsBaseUrl] = useState('');
    const [aimsCluster, setAimsCluster] = useState('');
    const [aimsUsername, setAimsUsername] = useState('');
    const [aimsPassword, setAimsPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [aimsChanged, setAimsChanged] = useState(false);

    // =========== Edit Mode State ===========
    const [activeTab, setActiveTab] = useState(0);
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionTestResult, setConnectionTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // =========== Create Mode Wizard State ===========
    const [wizardStep, setWizardStep] = useState(0);
    const [connecting, setConnecting] = useState(false);
    const [connectError, setConnectError] = useState<string | null>(null);
    const [aimsStores, setAimsStores] = useState<AimsStoreInfo[]>([]);
    const [selectedStoreCode, setSelectedStoreCode] = useState<string | null>(null);
    const [storeFriendlyName, setStoreFriendlyName] = useState('');

    // Initialize form when dialog opens
    useEffect(() => {
        if (open) {
            setConnectionTestResult(null);
            setIsConnected(false);
            setError(null);
            setCodeError(null);
            setAimsChanged(false);
            
            if (company) {
                // Edit mode - populate from company
                setName(company.name);
                setCode(company.code);
                setLocation(company.location || '');
                setDescription(company.description || '');
                setIsActive(company.isActive);
                const cluster = company.aimsCluster || 'c1';
                setAimsCluster(cluster);
                if (company.aimsBaseUrl) {
                    setAimsBaseUrl(company.aimsBaseUrl);
                } else {
                    setAimsBaseUrl(cluster === 'common' ? 'https://eu.common.solumesl.com/common' : 'https://eu.common.solumesl.com/c1/common');
                }
                setAimsUsername(company.aimsUsername || '');
                setAimsPassword('');
                setCodeValid(true);
                setActiveTab(0);
                
                if (company.aimsConfigured) {
                    checkConnectionStatus(company.id);
                }
            } else {
                // Create mode - reset wizard
                setName('');
                setCode('');
                setLocation('');
                setDescription('');
                setIsActive(true);
                setAimsCluster('c1');
                setAimsBaseUrl('https://eu.common.solumesl.com/c1/common');
                setAimsUsername('');
                setAimsPassword('');
                setCodeValid(null);
                setWizardStep(0);
                setConnecting(false);
                setConnectError(null);
                setAimsStores([]);
                setSelectedStoreCode(null);
                setStoreFriendlyName('');
            }
        } else {
            if (healthCheckIntervalRef.current) {
                clearInterval(healthCheckIntervalRef.current);
                healthCheckIntervalRef.current = null;
            }
        }
    }, [open, company]);
    
    // =========== Edit Mode Helpers ===========
    
    const checkConnectionStatus = async (companyId: string) => {
        try {
            const result = await fieldMappingService.testAimsConnection(companyId);
            setIsConnected(result.success);
            if (result.success) {
                startHealthCheck(companyId);
            }
        } catch {
            setIsConnected(false);
        }
    };
    
    const startHealthCheck = (companyId: string) => {
        if (healthCheckIntervalRef.current) {
            clearInterval(healthCheckIntervalRef.current);
        }
        healthCheckIntervalRef.current = setInterval(async () => {
            try {
                const result = await fieldMappingService.testAimsConnection(companyId);
                if (!result.success) {
                    setIsConnected(false);
                    setConnectionTestResult({ success: false, message: result.message });
                    if (healthCheckIntervalRef.current) {
                        clearInterval(healthCheckIntervalRef.current);
                        healthCheckIntervalRef.current = null;
                    }
                }
            } catch {
                // Silently ignore
            }
        }, 30000);
    };
    
    useEffect(() => {
        return () => {
            if (healthCheckIntervalRef.current) {
                clearInterval(healthCheckIntervalRef.current);
            }
        };
    }, []);

    // =========== Code Validation ===========
    
    useEffect(() => {
        if (!open || isEdit) return;
        if (!code || code.length < 3) {
            setCodeValid(null);
            setCodeError(null);
            return;
        }
        const isValidFormat = /^[A-Z]{3,}$/.test(code);
        if (!isValidFormat) {
            setCodeValid(false);
            setCodeError(t('settings.companies.codeInvalidFormat'));
            return;
        }
        const handler = setTimeout(async () => {
            setCodeValidating(true);
            try {
                const result = await companyService.validateCode(code);
                setCodeValid(result.available);
                setCodeError(result.available ? null : t('settings.companies.codeExists'));
            } catch {
                setCodeError(t('settings.companies.codeValidationError'));
            } finally {
                setCodeValidating(false);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [code, open, isEdit, t]);

    const handleCodeChange = (value: string) => {
        setCode(value.toUpperCase().replace(/[^A-Z]/g, ''));
    };

    const handleAimsFieldChange = (setter: (value: string) => void) => (value: string) => {
        setter(value);
        setAimsChanged(true);
        setConnectionTestResult(null);
    };

    // =========== Edit Mode: Test Connection ===========
    
    const handleTestConnection = async () => {
        if (!company?.id) return;
        setTestingConnection(true);
        setConnectionTestResult(null);
        try {
            if (aimsChanged && aimsBaseUrl && aimsCluster && aimsUsername) {
                const aimsData: UpdateAimsConfigDto = {
                    baseUrl: aimsBaseUrl.trim(),
                    cluster: aimsCluster.trim(),
                    username: aimsUsername.trim()
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
        if (healthCheckIntervalRef.current) {
            clearInterval(healthCheckIntervalRef.current);
            healthCheckIntervalRef.current = null;
        }
    };

    // =========== Create Mode: Wizard Logic ===========
    
    /** Step 1 validity: code + AIMS credentials */
    const isStep1Valid = () => {
        if (!code || code.length < 3 || !codeValid) return false;
        if (!aimsCluster || !aimsUsername || !aimsPassword) return false;
        return true;
    };

    /** Connect to AIMS and fetch stores */
    const handleConnectAndFetch = async () => {
        if (!isStep1Valid()) return;
        
        setConnecting(true);
        setConnectError(null);
        setAimsStores([]);
        
        try {
            const result = await companyService.fetchAimsStores({
                baseUrl: aimsBaseUrl.trim(),
                cluster: aimsCluster.trim(),
                username: aimsUsername.trim(),
                password: aimsPassword,
                companyCode: code.trim(),
            });
            
            if (!result.success) {
                setConnectError(result.error || t('settings.companies.connectionTestError'));
                return;
            }
            
            if (result.stores.length === 0) {
                setConnectError(t('settings.companies.noAimsStores'));
                return;
            }
            
            setAimsStores(result.stores);
            setSelectedStoreCode(null);
            setStoreFriendlyName('');
            setWizardStep(1);
        } catch (err: any) {
            setConnectError(err.response?.data?.message || err.message || t('settings.companies.connectionTestError'));
        } finally {
            setConnecting(false);
        }
    };

    /** Handle selecting a store from the AIMS list */
    const handleSelectStore = (storeCode: string) => {
        setSelectedStoreCode(storeCode);
        const store = aimsStores.find(s => s.code === storeCode);
        if (store) {
            setStoreFriendlyName(store.name || '');
        }
    };

    /** Step 2 validity: store selected + name for company */
    const isStep2Valid = () => {
        if (!selectedStoreCode) return false;
        if (!name.trim()) return false;
        return true;
    };

    // =========== Submit Handlers ===========

    const isEditValid = () => {
        if (!name.trim()) return false;
        if (!isEdit && (!code || code.length < 3 || !codeValid)) return false;
        return true;
    };

    /** Edit mode submit */
    const handleEditSubmit = async () => {
        if (!isEditValid()) return;
        setSubmitting(true);
        setError(null);
        try {
            if (company) {
                const updateData: UpdateCompanyDto = {
                    name: name.trim(),
                    location: location.trim() || undefined,
                    description: description.trim() || undefined,
                    isActive
                };
                await companyService.update(company.id, updateData);
                if (aimsChanged && aimsBaseUrl && aimsCluster && aimsUsername) {
                    const aimsData: UpdateAimsConfigDto = {
                        baseUrl: aimsBaseUrl.trim(),
                        cluster: aimsCluster.trim(),
                        username: aimsUsername.trim()
                    };
                    if (aimsPassword) aimsData.password = aimsPassword;
                    await companyService.updateAimsConfig(company.id, aimsData);
                }
            }
            onSave();
        } catch (err: any) {
            setError(err.response?.data?.message || t('settings.companies.saveError'));
        } finally {
            setSubmitting(false);
        }
    };

    /** Create mode submit — creates company + AIMS config + selected store */
    const handleCreateSubmit = async () => {
        if (!isStep2Valid()) return;
        setSubmitting(true);
        setError(null);
        try {
            const createData: CreateCompanyDto = {
                name: name.trim(),
                code: code.trim(),
                location: location.trim() || undefined,
                description: description.trim() || undefined,
                aimsConfig: {
                    baseUrl: aimsBaseUrl.trim(),
                    cluster: aimsCluster.trim(),
                    username: aimsUsername.trim(),
                    password: aimsPassword,
                },
            };
            const result = await companyService.create(createData);
            const newCompanyId = result.id;
            
            // Create the selected store
            if (selectedStoreCode && newCompanyId) {
                await companyService.createStore(newCompanyId, {
                    name: storeFriendlyName.trim() || selectedStoreCode,
                    code: selectedStoreCode,
                });
            }
            
            onSave();
        } catch (err: any) {
            setError(err.response?.data?.message || t('settings.companies.saveError'));
        } finally {
            setSubmitting(false);
        }
    };

    // =========== Render: Edit Mode (tabs — unchanged) ===========
    
    const renderEditMode = () => (
        <>
            <DialogTitle>{t('settings.companies.editTitle')}</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                    variant="fullWidth"
                >
                    <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.basicInfo')} sx={{ minHeight: 48 }} />
                    <Tab icon={<CloudIcon fontSize="small" />} iconPosition="start" label={t('settings.companies.aimsConfig')} sx={{ minHeight: 48 }} />
                </Tabs>

                {/* Basic Info Tab */}
                <TabPanel value={activeTab} index={0}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label={t('settings.companies.codeLabel')}
                            value={code}
                            disabled
                            inputProps={{ style: { textTransform: 'uppercase', fontFamily: 'monospace' } }}
                        />
                        <TextField
                            label={t('settings.companies.nameLabel')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            inputProps={{ maxLength: 100 }}
                        />
                        <TextField
                            label={t('settings.companies.locationLabel')}
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder={t('settings.companies.locationPlaceholder')}
                            inputProps={{ maxLength: 255 }}
                        />
                        <TextField
                            label={t('settings.companies.descriptionLabel')}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            multiline
                            rows={3}
                            placeholder={t('settings.companies.descriptionPlaceholder')}
                        />
                        <FormControlLabel
                            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                            label={t('settings.companies.activeLabel')}
                        />
                    </Box>
                </TabPanel>

                {/* AIMS Config Tab */}
                <TabPanel value={activeTab} index={1}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {isConnected ? (
                            <Alert severity="success" sx={{ mb: 1 }}>{t('settings.companies.connectedToAims')}</Alert>
                        ) : (
                            <Alert severity="info" sx={{ mb: 1 }}>{t('settings.companies.aimsConfigInfo')}</Alert>
                        )}
                        <FormControl fullWidth disabled={isConnected}>
                            <InputLabel>{t('settings.companies.aimsCluster')}</InputLabel>
                            <Select
                                value={aimsCluster || 'c1'}
                                label={t('settings.companies.aimsCluster')}
                                onChange={(e) => {
                                    const cluster = e.target.value;
                                    handleAimsFieldChange(setAimsCluster)(cluster);
                                    const baseUrl = cluster === 'common' ? 'https://eu.common.solumesl.com/common' : 'https://eu.common.solumesl.com/c1/common';
                                    handleAimsFieldChange(setAimsBaseUrl)(baseUrl);
                                }}
                            >
                                <MenuItem value="c1">C1 (eu.common.solumesl.com/c1/common)</MenuItem>
                                <MenuItem value="common">Common (eu.common.solumesl.com/common)</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField label={t('settings.companies.aimsBaseUrl')} value={aimsBaseUrl} disabled helperText={t('settings.companies.aimsBaseUrlHelp')} />
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
                        {company && (
                            <>
                                <Divider sx={{ my: 1 }} />
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
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {isConnected && (
                                            <Button size="small" variant="outlined" color="warning" startIcon={<LinkOffIcon />} onClick={handleDisconnect}>
                                                {t('settings.companies.disconnect')}
                                            </Button>
                                        )}
                                        {!isConnected && (company.aimsConfigured || (aimsBaseUrl && aimsCluster && aimsUsername)) && (
                                            <Button
                                                size="small" variant="outlined"
                                                startIcon={testingConnection ? <CircularProgress size={14} /> : <RefreshIcon />}
                                                onClick={handleTestConnection}
                                                disabled={testingConnection}
                                            >
                                                {aimsChanged ? t('settings.companies.saveAndTest') : t('settings.companies.testConnection')}
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                                {connectionTestResult && (
                                    <Alert severity={connectionTestResult.success ? 'success' : 'error'} sx={{ mt: 1 }} onClose={() => setConnectionTestResult(null)}>
                                        {connectionTestResult.message}
                                    </Alert>
                                )}
                                {aimsChanged && !isConnected && (
                                    <Alert severity="info" sx={{ mt: 1 }}>{t('settings.companies.aimsChangesPending')}</Alert>
                                )}
                            </>
                        )}
                    </Box>
                </TabPanel>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={submitting}>{t('common.cancel')}</Button>
                <Button variant="contained" onClick={handleEditSubmit} disabled={submitting || !isEditValid()} startIcon={submitting ? <CircularProgress size={16} /> : null}>
                    {t('common.save')}
                </Button>
            </DialogActions>
        </>
    );

    // =========== Render: Create Mode (wizard stepper) ===========
    
    const wizardSteps = [
        t('settings.companies.wizardStepCredentials'),
        t('settings.companies.wizardStepStores'),
    ];

    const renderCreateMode = () => (
        <>
            <DialogTitle>{t('settings.companies.createTitle')}</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                
                <Stepper activeStep={wizardStep} sx={{ mb: 3, mt: 1 }}>
                    {wizardSteps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* Step 1: Code + AIMS Credentials */}
                {wizardStep === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {t('settings.companies.wizardStep1Info')}
                        </Typography>
                        
                        {/* Company Code */}
                        <TextField
                            label={t('settings.companies.codeLabel')}
                            value={code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            required
                            error={!!codeError}
                            helperText={codeError || t('settings.companies.codeHelp')}
                            InputProps={{
                                endAdornment: code.length >= 3 && (
                                    <InputAdornment position="end">
                                        {codeValidating ? (
                                            <CircularProgress size={20} />
                                        ) : codeValid === true ? (
                                            <CheckCircleIcon color="success" />
                                        ) : codeValid === false ? (
                                            <ErrorIcon color="error" />
                                        ) : null}
                                    </InputAdornment>
                                )
                            }}
                            inputProps={{ maxLength: 10, style: { textTransform: 'uppercase', fontFamily: 'monospace' } }}
                        />

                        <Divider sx={{ my: 1 }}>
                            <Chip icon={<CloudIcon />} label={t('settings.companies.aimsConfig')} size="small" />
                        </Divider>

                        {/* Cluster */}
                        <FormControl fullWidth>
                            <InputLabel>{t('settings.companies.aimsCluster')}</InputLabel>
                            <Select
                                value={aimsCluster || 'c1'}
                                label={t('settings.companies.aimsCluster')}
                                onChange={(e) => {
                                    const cluster = e.target.value;
                                    setAimsCluster(cluster);
                                    const baseUrl = cluster === 'common' ? 'https://eu.common.solumesl.com/common' : 'https://eu.common.solumesl.com/c1/common';
                                    setAimsBaseUrl(baseUrl);
                                    setConnectError(null);
                                }}
                            >
                                <MenuItem value="c1">C1 (eu.common.solumesl.com/c1/common)</MenuItem>
                                <MenuItem value="common">Common (eu.common.solumesl.com/common)</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Username */}
                        <TextField
                            label={t('settings.companies.aimsUsername')}
                            value={aimsUsername}
                            onChange={(e) => { setAimsUsername(e.target.value); setConnectError(null); }}
                            placeholder="admin@company.com"
                            required
                        />

                        {/* Password */}
                        <Box sx={{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                                label={t('settings.companies.aimsPassword')}
                                type={showPassword ? 'text' : 'password'}
                                value={aimsPassword}
                                onChange={(e) => { setAimsPassword(e.target.value); setConnectError(null); }}
                                sx={{ flex: 1 }}
                                required
                            />
                            <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                sx={{ mt: 1, border: 1, borderColor: 'divider', borderRadius: 1, width: 40, height: 40 }}
                            >
                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                        </Box>

                        {connectError && (
                            <Alert severity="error" onClose={() => setConnectError(null)}>
                                {connectError}
                            </Alert>
                        )}
                    </Box>
                )}

                {/* Step 2: Pick Store + Company Details */}
                {wizardStep === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {t('settings.companies.wizardStep2Info')}
                        </Typography>

                        {/* Store Selection */}
                        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StorefrontIcon fontSize="small" />
                            {t('settings.companies.selectStore')} ({aimsStores.length})
                        </Typography>

                        <Box sx={{ maxHeight: 220, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                            {aimsStores.map((store) => (
                                <Paper
                                    key={store.code}
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        bgcolor: selectedStoreCode === store.code ? 'action.selected' : 'transparent',
                                        '&:hover': { bgcolor: selectedStoreCode === store.code ? 'action.selected' : 'action.hover' },
                                        '&:last-child': { borderBottom: 0 },
                                    }}
                                    onClick={() => handleSelectStore(store.code)}
                                >
                                    <Checkbox
                                        checked={selectedStoreCode === store.code}
                                        size="small"
                                        sx={{ p: 0 }}
                                    />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={600} noWrap>
                                            {store.name || store.code}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {t('settings.companies.storeCode')}: {store.code}
                                            {store.city && ` · ${store.city}`}
                                            {store.country && `, ${store.country}`}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {store.labelCount} {t('settings.companies.labels')} · {store.gatewayCount} {t('settings.companies.gateways')}
                                        </Typography>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>

                        {selectedStoreCode && (
                            <>
                                <Divider sx={{ my: 1 }}>
                                    <Chip icon={<BusinessIcon />} label={t('settings.companies.companyDetails')} size="small" />
                                </Divider>

                                {/* Store Friendly Name */}
                                <TextField
                                    label={t('settings.companies.storeFriendlyName')}
                                    value={storeFriendlyName}
                                    onChange={(e) => setStoreFriendlyName(e.target.value)}
                                    placeholder={aimsStores.find(s => s.code === selectedStoreCode)?.name || ''}
                                    helperText={t('settings.companies.storeFriendlyNameHelp')}
                                    inputProps={{ maxLength: 100 }}
                                />
                                
                                {/* Company Name */}
                                <TextField
                                    label={t('settings.companies.nameLabel')}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    inputProps={{ maxLength: 100 }}
                                />
                                
                                {/* Location */}
                                <TextField
                                    label={t('settings.companies.locationLabel')}
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder={t('settings.companies.locationPlaceholder')}
                                    inputProps={{ maxLength: 255 }}
                                />
                            </>
                        )}
                    </Box>
                )}
            </DialogContent>
            
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Box>
                    {wizardStep > 0 && (
                        <Button onClick={() => setWizardStep(0)} disabled={submitting}>
                            {t('common.back')}
                        </Button>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={onClose} disabled={submitting}>
                        {t('common.cancel')}
                    </Button>
                    {wizardStep === 0 && (
                        <Button
                            variant="contained"
                            onClick={handleConnectAndFetch}
                            disabled={!isStep1Valid() || connecting}
                            startIcon={connecting ? <CircularProgress size={16} /> : <CloudIcon />}
                        >
                            {t('settings.companies.connectAndFetch')}
                        </Button>
                    )}
                    {wizardStep === 1 && (
                        <Button
                            variant="contained"
                            onClick={handleCreateSubmit}
                            disabled={!isStep2Valid() || submitting}
                            startIcon={submitting ? <CircularProgress size={16} /> : null}
                        >
                            {t('common.create')}
                        </Button>
                    )}
                </Box>
            </DialogActions>
        </>
    );

    // =========== Main Render ===========
    
    return (
        <Dialog 
            open={open} 
            onClose={submitting || connecting ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { maxHeight: '90vh' }
            }}
        >
            {isEdit ? renderEditMode() : renderCreateMode()}
        </Dialog>
    );
}

export default CompanyDialog;
