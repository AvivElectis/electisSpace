/**
 * Company Dialog
 * 
 * @description Dialog for creating and editing companies.
 * Includes basic info (name, code, location, description) and AIMS configuration.
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
    IconButton
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudIcon from '@mui/icons-material/Cloud';
import BusinessIcon from '@mui/icons-material/Business';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    companyService,
    type Company,
    type CreateCompanyDto,
    type UpdateCompanyDto,
    type UpdateAimsConfigDto
} from '@shared/infrastructure/services/companyService';

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
    const isEdit = !!company;

    // State
    const [activeTab, setActiveTab] = useState(0);
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

    // Initialize form when dialog opens
    useEffect(() => {
        if (open) {
            if (company) {
                // Edit mode - populate from company
                setName(company.name);
                setCode(company.code);
                setLocation(company.location || '');
                setDescription(company.description || '');
                setIsActive(company.isActive);
                setAimsBaseUrl(company.aimsBaseUrl || '');
                setAimsCluster(company.aimsCluster || '');
                setAimsUsername(company.aimsUsername || '');
                setAimsPassword(''); // Never show existing password
                setCodeValid(true); // Existing code is always valid
            } else {
                // Create mode - reset form
                setName('');
                setCode('');
                setLocation('');
                setDescription('');
                setIsActive(true);
                setAimsBaseUrl('https://api.solumesl.com');
                setAimsCluster('');
                setAimsUsername('');
                setAimsPassword('');
                setCodeValid(null);
            }
            setActiveTab(0);
            setError(null);
            setCodeError(null);
            setAimsChanged(false);
        }
    }, [open, company]);

    // Code validation with debounce
    useEffect(() => {
        if (!open || isEdit) return;
        if (!code || code.length < 3) {
            setCodeValid(null);
            setCodeError(null);
            return;
        }

        // Validate code format (uppercase letters only)
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

    // Handle code input - convert to uppercase
    const handleCodeChange = (value: string) => {
        setCode(value.toUpperCase().replace(/[^A-Z]/g, ''));
    };

    // Handle AIMS field changes
    const handleAimsFieldChange = (setter: (value: string) => void) => (value: string) => {
        setter(value);
        setAimsChanged(true);
    };

    // Validate form
    const isValid = () => {
        if (!name.trim()) return false;
        if (!isEdit && (!code || code.length < 3 || !codeValid)) return false;
        return true;
    };

    // Handle submit
    const handleSubmit = async () => {
        if (!isValid()) return;

        setSubmitting(true);
        setError(null);

        try {
            if (isEdit && company) {
                // Update company basic info
                const updateData: UpdateCompanyDto = {
                    name: name.trim(),
                    location: location.trim() || undefined,
                    description: description.trim() || undefined,
                    isActive
                };
                await companyService.update(company.id, updateData);

                // Update AIMS config if changed
                if (aimsChanged && aimsBaseUrl && aimsCluster && aimsUsername) {
                    const aimsData: UpdateAimsConfigDto = {
                        aimsBaseUrl: aimsBaseUrl.trim(),
                        aimsCluster: aimsCluster.trim(),
                        aimsUsername: aimsUsername.trim()
                    };
                    if (aimsPassword) {
                        aimsData.aimsPassword = aimsPassword;
                    }
                    await companyService.updateAimsConfig(company.id, aimsData);
                }
            } else {
                // Create new company
                const createData: CreateCompanyDto = {
                    name: name.trim(),
                    code: code.trim(),
                    location: location.trim() || undefined,
                    description: description.trim() || undefined
                };
                const newCompany = await companyService.create(createData);

                // Set AIMS config if provided
                if (aimsBaseUrl && aimsCluster && aimsUsername && aimsPassword) {
                    await companyService.updateAimsConfig(newCompany.id, {
                        aimsBaseUrl: aimsBaseUrl.trim(),
                        aimsCluster: aimsCluster.trim(),
                        aimsUsername: aimsUsername.trim(),
                        aimsPassword: aimsPassword
                    });
                }
            }

            onSave();
        } catch (err: any) {
            console.error('Failed to save company:', err);
            setError(err.response?.data?.message || t('settings.companies.saveError'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={submitting ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { maxHeight: '90vh' }
            }}
        >
            <DialogTitle>
                {isEdit 
                    ? t('settings.companies.editTitle')
                    : t('settings.companies.createTitle')}
            </DialogTitle>

            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                    variant="fullWidth"
                >
                    <Tab 
                        icon={<BusinessIcon fontSize="small" />} 
                        iconPosition="start"
                        label={t('settings.companies.basicInfo')}
                        sx={{ minHeight: 48 }}
                    />
                    <Tab 
                        icon={<CloudIcon fontSize="small" />} 
                        iconPosition="start"
                        label={t('settings.companies.aimsConfig')}
                        sx={{ minHeight: 48 }}
                    />
                </Tabs>

                {/* Basic Info Tab */}
                <TabPanel value={activeTab} index={0}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Code (only editable on create) */}
                        <TextField
                            label={t('settings.companies.codeLabel')}
                            value={code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            disabled={isEdit}
                            required={!isEdit}
                            error={!!codeError}
                            helperText={
                                codeError ||
                                t('settings.companies.codeHelp')
                            }
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
                            inputProps={{ 
                                maxLength: 10,
                                style: { textTransform: 'uppercase', fontFamily: 'monospace' }
                            }}
                        />

                        {/* Name */}
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

                        {/* Description */}
                        <TextField
                            label={t('settings.companies.descriptionLabel')}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            multiline
                            rows={3}
                            placeholder={t('settings.companies.descriptionPlaceholder')}
                        />

                        {/* Active Status (only in edit mode) */}
                        {isEdit && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                    />
                                }
                                label={t('settings.companies.activeLabel')}
                            />
                        )}
                    </Box>
                </TabPanel>

                {/* AIMS Config Tab */}
                <TabPanel value={activeTab} index={1}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info" sx={{ mb: 1 }}>
                            {t('settings.companies.aimsConfigInfo')}
                        </Alert>

                        {/* Base URL */}
                        <TextField
                            label={t('settings.companies.aimsBaseUrl')}
                            value={aimsBaseUrl}
                            onChange={(e) => handleAimsFieldChange(setAimsBaseUrl)(e.target.value)}
                            placeholder="https://api.solumesl.com"
                            helperText={t('settings.companies.aimsBaseUrlHelp')}
                        />

                        {/* Cluster */}
                        <TextField
                            label={t('settings.companies.aimsCluster')}
                            value={aimsCluster}
                            onChange={(e) => handleAimsFieldChange(setAimsCluster)(e.target.value)}
                            placeholder="cluster1"
                            helperText={t('settings.companies.aimsClusterHelp')}
                        />

                        {/* Username */}
                        <TextField
                            label={t('settings.companies.aimsUsername')}
                            value={aimsUsername}
                            onChange={(e) => handleAimsFieldChange(setAimsUsername)(e.target.value)}
                            placeholder="admin@company.com"
                        />

                        {/* Password */}
                        <TextField
                            label={t('settings.companies.aimsPassword')}
                            type={showPassword ? 'text' : 'password'}
                            value={aimsPassword}
                            onChange={(e) => handleAimsFieldChange(setAimsPassword)(e.target.value)}
                            placeholder={isEdit 
                                ? t('settings.companies.aimsPasswordPlaceholder')
                                : undefined}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        {/* AIMS Status */}
                        {isEdit && company && (
                            <Box sx={{ 
                                mt: 1, 
                                p: 1.5, 
                                bgcolor: 'action.hover', 
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                                {company.aimsConfigured ? (
                                    <>
                                        <CheckCircleIcon color="success" fontSize="small" />
                                        <Typography variant="body2" color="success.main">
                                            {t('settings.companies.aimsConfigured')}
                                        </Typography>
                                    </>
                                ) : (
                                    <>
                                        <ErrorIcon color="warning" fontSize="small" />
                                        <Typography variant="body2" color="warning.main">
                                            {t('settings.companies.aimsNotConfigured')}
                                        </Typography>
                                    </>
                                )}
                            </Box>
                        )}
                    </Box>
                </TabPanel>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={submitting}>
                    {t('common.cancel')}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting || !isValid()}
                    startIcon={submitting ? <CircularProgress size={16} /> : null}
                >
                    {isEdit ? t('common.save') : t('common.create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default CompanyDialog;
