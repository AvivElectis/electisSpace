/**
 * Company Selector Component
 * 
 * @description Allows selecting an existing company or creating a new one inline.
 * Used in UserDialog when assigning users to companies.
 * Only shows companies the current user has access to.
 */
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Divider,
    TextField,
    Collapse,
    Button,
    Alert,
    CircularProgress,
    InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { companyService, type Company } from '@shared/infrastructure/services/companyService';
import { useAuthContext } from '@features/auth/application/useAuthContext';

interface NewCompanyData {
    code: string;
    name: string;
    location?: string;
}

interface CompanySelectorProps {
    /** Selected company ID */
    value: string;
    /** Callback when company changes */
    onChange: (companyId: string, company?: Company) => void;
    /** Whether a new company is being created */
    isCreatingNew: boolean;
    /** Callback when toggling create mode */
    onCreateModeChange: (isCreating: boolean) => void;
    /** New company data (when creating) */
    newCompanyData?: NewCompanyData;
    /** Callback when new company data changes */
    onNewCompanyDataChange?: (data: NewCompanyData) => void;
    /** Whether the selector is disabled */
    disabled?: boolean;
    /** Error message */
    error?: string;
    /** Whether to allow creating new companies (requires PLATFORM_ADMIN) */
    allowCreate?: boolean;
}

export function CompanySelector({
    value,
    onChange,
    isCreatingNew,
    onCreateModeChange,
    newCompanyData = { code: '', name: '' },
    onNewCompanyDataChange,
    disabled = false,
    error,
    allowCreate = true
}: CompanySelectorProps) {
    const { t } = useTranslation();
    const { isPlatformAdmin } = useAuthContext();

    // State
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Code validation for new company
    const [codeValidating, setCodeValidating] = useState(false);
    const [codeValid, setCodeValid] = useState<boolean | null>(null);
    const [codeError, setCodeError] = useState<string | null>(null);

    // Can user create companies?
    const canCreate = allowCreate && isPlatformAdmin;

    // Fetch companies
    const fetchCompanies = useCallback(async () => {
        try {
            setLoading(true);
            setFetchError(null);
            const response = await companyService.getAll({ limit: 100 });
            setCompanies(response.data);
        } catch (err) {
            console.error('Failed to fetch companies:', err);
            setFetchError(t('settings.companies.fetchError', 'Failed to load companies'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    // Validate code when creating new company
    useEffect(() => {
        if (!isCreatingNew || !newCompanyData.code || newCompanyData.code.length < 3) {
            setCodeValid(null);
            setCodeError(null);
            return;
        }

        // Validate format
        const isValidFormat = /^[A-Z]{3,}$/.test(newCompanyData.code);
        if (!isValidFormat) {
            setCodeValid(false);
            setCodeError(t('settings.companies.codeInvalidFormat', 'Code must be 3+ uppercase letters'));
            return;
        }

        const handler = setTimeout(async () => {
            setCodeValidating(true);
            try {
                const result = await companyService.validateCode(newCompanyData.code);
                setCodeValid(result.available);
                setCodeError(result.available ? null : t('settings.companies.codeExists', 'This code is already in use'));
            } catch {
                setCodeError(t('settings.companies.codeValidationError', 'Failed to validate code'));
            } finally {
                setCodeValidating(false);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [newCompanyData.code, isCreatingNew, t]);

    // Handle company selection change
    const handleSelectChange = (selectedValue: string) => {
        if (selectedValue === '__create__') {
            onCreateModeChange(true);
            onChange('', undefined);
        } else {
            onCreateModeChange(false);
            const selectedCompany = companies.find(c => c.id === selectedValue);
            onChange(selectedValue, selectedCompany);
        }
    };

    // Handle new company code input
    const handleCodeChange = (value: string) => {
        const upperCode = value.toUpperCase().replace(/[^A-Z]/g, '');
        onNewCompanyDataChange?.({ ...newCompanyData, code: upperCode });
    };

    // Cancel creating new company
    const handleCancelCreate = () => {
        onCreateModeChange(false);
        onNewCompanyDataChange?.({ code: '', name: '' });
        // Select first company if available
        if (companies.length > 0) {
            onChange(companies[0].id, companies[0]);
        }
    };

    // Check if new company data is valid
    const isNewCompanyValid = () => {
        return newCompanyData.code.length >= 3 && 
               codeValid === true && 
               newCompanyData.name.trim().length > 0;
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                <CircularProgress size={20} />
                <Typography color="text.secondary">
                    {t('common.loading', 'Loading...')}
                </Typography>
            </Box>
        );
    }

    if (fetchError) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {fetchError}
            </Alert>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Company Selection */}
            {!isCreatingNew && (
                <FormControl fullWidth error={!!error} disabled={disabled}>
                    <InputLabel>{t('settings.users.company', 'Company')}</InputLabel>
                    <Select
                        value={value}
                        label={t('settings.users.company', 'Company')}
                        onChange={(e) => handleSelectChange(e.target.value)}
                    >
                        {companies.map(company => (
                            <MenuItem key={company.id} value={company.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            fontFamily: 'monospace', 
                                            fontWeight: 'bold',
                                            bgcolor: 'action.hover',
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 0.5
                                        }}
                                    >
                                        {company.code}
                                    </Typography>
                                    <Typography>{company.name}</Typography>
                                </Box>
                            </MenuItem>
                        ))}
                        
                        {/* Create New Option (only for PLATFORM_ADMIN) */}
                        {canCreate && [
                            <Divider key="divider" />,
                            <MenuItem key="create" value="__create__">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                                    <AddIcon fontSize="small" />
                                    <Typography>{t('settings.companies.createNew', 'Create New Company')}</Typography>
                                </Box>
                            </MenuItem>
                        ]}
                    </Select>
                    {error && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                            {error}
                        </Typography>
                    )}
                </FormControl>
            )}

            {/* New Company Form */}
            <Collapse in={isCreatingNew}>
                <Box 
                    sx={{ 
                        p: 2, 
                        border: 1, 
                        borderColor: 'primary.main',
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }}
                >
                    <Typography variant="subtitle2" color="primary">
                        {t('settings.companies.createNew', 'Create New Company')}
                    </Typography>

                    {/* Company Code */}
                    <TextField
                        label={t('settings.companies.codeLabel', 'Company Code')}
                        value={newCompanyData.code}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        required
                        size="small"
                        error={!!codeError}
                        helperText={codeError || t('settings.companies.codeHelp', '3+ uppercase letters (e.g., EMC, ACME)')}
                        InputProps={{
                            endAdornment: newCompanyData.code.length >= 3 && (
                                <InputAdornment position="end">
                                    {codeValidating ? (
                                        <CircularProgress size={16} />
                                    ) : codeValid === true ? (
                                        <CheckCircleIcon color="success" fontSize="small" />
                                    ) : codeValid === false ? (
                                        <ErrorIcon color="error" fontSize="small" />
                                    ) : null}
                                </InputAdornment>
                            )
                        }}
                        inputProps={{ 
                            maxLength: 10,
                            style: { textTransform: 'uppercase', fontFamily: 'monospace' }
                        }}
                    />

                    {/* Company Name */}
                    <TextField
                        label={t('settings.companies.nameLabel', 'Company Name')}
                        value={newCompanyData.name}
                        onChange={(e) => onNewCompanyDataChange?.({ ...newCompanyData, name: e.target.value })}
                        required
                        size="small"
                        inputProps={{ maxLength: 100 }}
                    />

                    {/* Company Location (optional) */}
                    <TextField
                        label={t('settings.companies.locationLabel', 'Location (optional)')}
                        value={newCompanyData.location || ''}
                        onChange={(e) => onNewCompanyDataChange?.({ ...newCompanyData, location: e.target.value })}
                        size="small"
                        placeholder={t('settings.companies.locationPlaceholder', 'City, Country')}
                        inputProps={{ maxLength: 255 }}
                    />

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button size="small" onClick={handleCancelCreate}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                    </Box>

                    {/* Validation Status */}
                    {!isNewCompanyValid() && newCompanyData.code.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            {t('settings.companies.fillRequired', 'Please fill in code and name to create a new company.')}
                        </Typography>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}

export default CompanySelector;
