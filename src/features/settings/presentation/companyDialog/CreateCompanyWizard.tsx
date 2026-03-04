/**
 * CreateCompanyWizard — 6-step wizard for creating companies
 *
 * Steps:
 * 0: AIMS Connection + Company Info
 * 1: Multi-Store Selection
 * 2: Article Format (auto-fetched)
 * 3: Field Mapping
 * 4: Features
 * 5: Review & Create
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stepper,
    Step,
    StepLabel,
    Alert,
    CircularProgress,
    Box,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
    companyService,
    type AimsStoreInfo,
    type CreateCompanyFullDto,
} from '@shared/infrastructure/services/companyService';
import {
    ConnectionStep,
    StoreSelectionStep,
    ArticleFormatStep,
    FieldMappingStep,
    FeaturesStep,
    ReviewStep,
} from './steps';
import { INITIAL_WIZARD_DATA, type WizardFormData, type WizardStoreData } from './wizardTypes';

interface Props {
    onClose: () => void;
    onSave: () => void;
}

const STEP_LABELS = [
    'settings.companies.wizardStep1',
    'settings.companies.wizardStep2',
    'settings.companies.wizardStep3',
    'settings.companies.wizardStep4',
    'settings.companies.wizardStep5',
    'settings.companies.wizardStep6',
];

export function CreateCompanyWizard({ onClose, onSave }: Props) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isRtl = theme.direction === 'rtl';

    // Wizard state
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState<WizardFormData>({ ...INITIAL_WIZARD_DATA });

    // Step 1 — connection
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [aimsStores, setAimsStores] = useState<AimsStoreInfo[]>([]);

    // Code validation
    const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
    const [codeChecking, setCodeChecking] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);

    // Step 3 — article format
    const [articleFormatLoading, setArticleFormatLoading] = useState(false);
    const [articleFormatError, setArticleFormatError] = useState<string | null>(null);

    // Submit
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Code validation with debounce
    const codeTimerRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => {
        const code = formData.companyCode;
        if (!code || code.length < 3) {
            setCodeAvailable(null);
            setCodeError(null);
            return;
        }
        if (!/^[A-Z]{3,}$/.test(code)) {
            setCodeAvailable(false);
            setCodeError(t('settings.companies.codeInvalidFormat'));
            return;
        }
        codeTimerRef.current && clearTimeout(codeTimerRef.current);
        codeTimerRef.current = setTimeout(async () => {
            setCodeChecking(true);
            try {
                const result = await companyService.validateCode(code);
                setCodeAvailable(result.available);
                setCodeError(result.available ? null : t('settings.companies.codeExists'));
            } catch {
                setCodeError(t('settings.companies.codeValidationError'));
            } finally {
                setCodeChecking(false);
            }
        }, 500);
        return () => codeTimerRef.current && clearTimeout(codeTimerRef.current);
    }, [formData.companyCode, t]);

    const updateFormData = useCallback((partial: Partial<WizardFormData>) => {
        setFormData(prev => ({ ...prev, ...partial }));
    }, []);

    // Step 1: Test connection + fetch stores
    const handleConnectionTest = useCallback(async () => {
        setConnectionStatus('testing');
        setConnectionError(null);
        try {
            const result = await companyService.fetchAimsStores({
                baseUrl: formData.aimsBaseUrl.trim(),
                cluster: formData.aimsCluster.trim(),
                username: formData.aimsUsername.trim(),
                password: formData.aimsPassword,
                companyCode: formData.companyCode.trim(),
            });

            if (!result.success) {
                setConnectionStatus('failed');
                setConnectionError(result.error || t('settings.companies.connectionFailed'));
                return false;
            }

            setAimsStores(result.stores);
            setConnectionStatus('connected');
            updateFormData({ connectionTested: true });
            return true;
        } catch (err: any) {
            setConnectionStatus('failed');
            setConnectionError(err.response?.data?.message || err.message || t('settings.companies.connectionFailed'));
            return false;
        }
    }, [formData, t, updateFormData]);

    // Step 3: Fetch article format
    const handleFetchArticleFormat = useCallback(async () => {
        setArticleFormatLoading(true);
        setArticleFormatError(null);
        try {
            const result = await companyService.fetchArticleFormat({
                baseUrl: formData.aimsBaseUrl.trim(),
                cluster: formData.aimsCluster.trim(),
                username: formData.aimsUsername.trim(),
                password: formData.aimsPassword,
                companyCode: formData.companyCode.trim(),
            });

            if (result.success && result.format) {
                updateFormData({ articleFormat: result.format });
            } else {
                setArticleFormatError(result.error || t('settings.companies.articleFormatError'));
            }
        } catch (err: any) {
            setArticleFormatError(err.response?.data?.message || err.message || t('settings.companies.articleFormatError'));
        } finally {
            setArticleFormatLoading(false);
        }
    }, [formData, t, updateFormData]);

    // Validation per step
    const isStepValid = (step: number): boolean => {
        switch (step) {
            case 0:
                return !!(
                    formData.companyCode.length >= 3 &&
                    codeAvailable &&
                    formData.companyName.trim() &&
                    formData.aimsUsername &&
                    formData.aimsPassword &&
                    connectionStatus === 'connected'
                );
            case 1:
                return formData.stores.length > 0;
            case 2:
                return !!formData.articleFormat; // Must be fetched
            case 3:
                return true; // Field mapping is optional (auto-generated)
            case 4:
                return true; // Features selection is optional (all off is valid)
            case 5:
                return true; // Review — always valid
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (activeStep < 5) {
            setActiveStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep(prev => prev - 1);
        }
    };

    const handleGoToStep = (step: number) => {
        setActiveStep(step);
    };

    // Store selection handler
    const handleStoresUpdate = useCallback((stores: WizardStoreData[]) => {
        updateFormData({ stores });
    }, [updateFormData]);

    // Submit: create company with full payload
    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const createData: CreateCompanyFullDto = {
                name: formData.companyName.trim(),
                code: formData.companyCode.trim(),
                location: formData.location.trim() || undefined,
                description: formData.description.trim() || undefined,
                aimsConfig: {
                    baseUrl: formData.aimsBaseUrl.trim(),
                    cluster: formData.aimsCluster.trim(),
                    username: formData.aimsUsername.trim(),
                    password: formData.aimsPassword,
                },
                stores: formData.stores.map(s => ({
                    code: s.code,
                    name: s.name || s.code,
                    timezone: s.timezone || 'UTC',
                })),
                companyFeatures: formData.features,
                spaceType: formData.spaceType,
                articleFormat: formData.articleFormat as Record<string, unknown> | undefined,
                fieldMapping: formData.fieldMapping as Record<string, unknown> | undefined,
            };

            await companyService.create(createData);
            onSave();
        } catch (err: any) {
            setError(err.response?.data?.message || t('settings.companies.saveError'));
        } finally {
            setSubmitting(false);
        }
    };

    // Render current step
    const renderStep = () => {
        switch (activeStep) {
            case 0:
                return (
                    <ConnectionStep
                        formData={formData}
                        onUpdate={updateFormData}
                        onConnectionTest={handleConnectionTest}
                        connectionStatus={connectionStatus}
                        connectionError={connectionError}
                        codeAvailable={codeAvailable}
                        codeChecking={codeChecking}
                        codeError={codeError}
                        isRtl={isRtl}
                    />
                );
            case 1:
                return (
                    <StoreSelectionStep
                        aimsStores={aimsStores}
                        selectedStores={formData.stores}
                        onUpdate={handleStoresUpdate}
                    />
                );
            case 2:
                return (
                    <ArticleFormatStep
                        articleFormat={formData.articleFormat}
                        loading={articleFormatLoading}
                        error={articleFormatError}
                        onFetch={handleFetchArticleFormat}
                    />
                );
            case 3:
                return (
                    <FieldMappingStep
                        articleFormat={formData.articleFormat}
                        fieldMapping={formData.fieldMapping}
                        onUpdate={(mapping) => updateFormData({ fieldMapping: mapping })}
                    />
                );
            case 4:
                return (
                    <FeaturesStep
                        features={formData.features}
                        spaceType={formData.spaceType}
                        hasConferenceMapping={
                            !!(formData.fieldMapping?.conferenceMapping?.meetingName)
                        }
                        onUpdate={(features, spaceType) => updateFormData({ features, spaceType })}
                    />
                );
            case 5:
                return (
                    <ReviewStep
                        formData={formData}
                        onGoToStep={handleGoToStep}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <>
            <DialogTitle>{t('settings.companies.createTitle')}</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Stepper
                    activeStep={activeStep}
                    alternativeLabel={!isMobile}
                    orientation={isMobile ? 'vertical' : 'horizontal'}
                    sx={{ mb: 3, mt: 1 }}
                >
                    {STEP_LABELS.map((labelKey, index) => (
                        <Step key={labelKey} completed={index < activeStep}>
                            <StepLabel>
                                {isMobile ? undefined : t(labelKey)}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {renderStep()}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Box>
                    {activeStep > 0 && (
                        <Button onClick={handleBack} disabled={submitting}>
                            {t('settings.companies.back')}
                        </Button>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={onClose} disabled={submitting}>
                        {t('common.cancel')}
                    </Button>
                    {activeStep < 5 ? (
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={!isStepValid(activeStep)}
                        >
                            {t('settings.companies.next')}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={submitting}
                            startIcon={submitting ? <CircularProgress size={16} /> : null}
                        >
                            {submitting
                                ? t('settings.companies.creating')
                                : t('settings.companies.createCompany')}
                        </Button>
                    )}
                </Box>
            </DialogActions>
        </>
    );
}
