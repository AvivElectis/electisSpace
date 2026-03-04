/**
 * useCompanyDialogState - All state, effects, and handlers for CompanyDialog
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material';
import {
    companyService,
    type Company,
    type UpdateCompanyDto,
    type UpdateAimsConfigDto,
} from '@shared/infrastructure/services/companyService';
import { fieldMappingService } from '@shared/infrastructure/services/fieldMappingService';
import type { CompanyFeatures, SpaceType } from '@shared/infrastructure/services/authService';
import { DEFAULT_COMPANY_FEATURES } from '@shared/infrastructure/services/authService';

interface Params {
    open: boolean;
    onSave: () => void;
    company?: Company | null;
}

export function useCompanyDialogState({ open, onSave, company }: Params) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isRtl = theme.direction === 'rtl';
    const isEdit = !!company;

    // Shared State
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

    // Edit Mode State
    const [activeTab, setActiveTab] = useState(0);
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionTestResult, setConnectionTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Company Features State
    const [companyFeatures, setCompanyFeatures] = useState<CompanyFeatures>({ ...DEFAULT_COMPANY_FEATURES });
    const [spaceType, setSpaceType] = useState<SpaceType>('office');

    // Initialize form when dialog opens
    useEffect(() => {
        if (open) {
            setConnectionTestResult(null);
            setIsConnected(false);
            setError(null);
            setCodeError(null);
            setAimsChanged(false);

            if (company) {
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
                // Initialize features from company data
                setCompanyFeatures(company.companyFeatures ?? { ...DEFAULT_COMPANY_FEATURES });
                setSpaceType((company.spaceType as SpaceType) ?? 'office');

                if (company.aimsConfigured) {
                    checkConnectionStatus(company.id);
                }
            } else {
                // Create mode is handled by CreateCompanyWizard (own state).
                // Reset edit-mode fields for safety.
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
                setCompanyFeatures({ ...DEFAULT_COMPANY_FEATURES });
                setSpaceType('office');
            }
        } else {
            if (healthCheckIntervalRef.current) {
                clearInterval(healthCheckIntervalRef.current);
                healthCheckIntervalRef.current = null;
            }
        }
    }, [open, company]);

    // Cleanup health check on unmount
    useEffect(() => {
        return () => {
            if (healthCheckIntervalRef.current) {
                clearInterval(healthCheckIntervalRef.current);
            }
        };
    }, []);

    // Edit Mode Helpers
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

    // Code Validation
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

    const handleFeatureToggle = (feature: keyof CompanyFeatures, value: boolean) => {
        setCompanyFeatures(prev => {
            const updated = { ...prev, [feature]: value };
            // Enforce mutual exclusivity: spaces and people
            if (feature === 'spacesEnabled' && value) {
                updated.peopleEnabled = false;
            } else if (feature === 'peopleEnabled' && value) {
                updated.spacesEnabled = false;
            }
            // If conference is disabled, also disable simple conference mode
            if (feature === 'conferenceEnabled' && !value) {
                updated.simpleConferenceMode = false;
            }
            return updated;
        });
    };

    const handleAimsFieldChange = (setter: (value: string) => void) => (value: string) => {
        setter(value);
        setAimsChanged(true);
        setConnectionTestResult(null);
    };

    // Edit Mode: Test Connection
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

    // Submit Handlers
    const isEditValid = () => {
        if (!name.trim()) return false;
        if (!isEdit && (!code || code.length < 3 || !codeValid)) return false;
        return true;
    };

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
                    isActive,
                    companyFeatures,
                    spaceType,
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

    return {
        // Common
        isEdit, isRtl, submitting, error, setError, company,

        // Basic Info
        name, setName, code, location, setLocation,
        description, setDescription, isActive, setIsActive,
        codeValidating, codeValid, codeError, handleCodeChange,

        // AIMS Config
        aimsBaseUrl, setAimsBaseUrl, aimsCluster, setAimsCluster,
        aimsUsername, setAimsUsername, aimsPassword, setAimsPassword,
        showPassword, setShowPassword, aimsChanged,
        handleAimsFieldChange,

        // Company Features
        companyFeatures, spaceType, setSpaceType,
        handleFeatureToggle,

        // Edit Mode
        activeTab, setActiveTab,
        testingConnection, connectionTestResult, setConnectionTestResult,
        isConnected, handleTestConnection, handleDisconnect,
        isEditValid, handleEditSubmit,
    };
}
