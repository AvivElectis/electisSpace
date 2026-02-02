/**
 * Enhanced User Dialog
 * 
 * @description Comprehensive dialog for creating and editing users with:
 * - Company selection (with inline creation for PLATFORM_ADMIN)
 * - Store assignments with roles and features
 * - Multi-step flow for creating new users
 * 
 * This replaces the original UserDialog with full company/store support.
 */
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    Box,
    Divider,
    FormControlLabel,
    Switch,
    Typography,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { CompanySelector } from './CompanySelector';
import { StoreAssignment, type StoreAssignmentData } from './StoreAssignment';
import { companyService, type Company, type CreateCompanyDto } from '@shared/infrastructure/services/companyService';
import api from '@shared/infrastructure/services/apiClient';

// Company roles
const COMPANY_ROLES = ['VIEWER', 'COMPANY_ADMIN'] as const;
type CompanyRole = typeof COMPANY_ROLES[number];

// User from backend
interface UserData {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    globalRole: 'PLATFORM_ADMIN' | null;
    isActive: boolean;
    companies?: Array<{
        company: { id: string; name: string; code: string };
        role: CompanyRole;
        allStoresAccess: boolean;
    }>;
    stores?: Array<{
        store: { id: string; name: string; code: string; companyId: string };
        role: string;
        features: string[];
    }>;
}

interface EnhancedUserDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    user?: UserData | null; // If provided, edit mode
}

// Steps for create mode
const STEPS = ['basicInfo', 'companyAssignment', 'storeAssignment'];

export function EnhancedUserDialog({ open, onClose, onSave, user }: EnhancedUserDialogProps) {
    const { t } = useTranslation();
    const { isPlatformAdmin, user: currentUser } = useAuthContext();
    const isEdit = !!user;

    // Stepper state (only for create mode)
    const [activeStep, setActiveStep] = useState(0);
    
    // Form state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Basic Info
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Company Assignment
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);
    const [newCompanyData, setNewCompanyData] = useState<{ code: string; name: string; location?: string }>({ code: '', name: '' });
    const [companyRole, setCompanyRole] = useState<CompanyRole>('VIEWER');
    const [allStoresAccess, setAllStoresAccess] = useState(false);

    // Store Assignments
    const [storeAssignments, setStoreAssignments] = useState<StoreAssignmentData[]>([]);

    // Initialize form when dialog opens or user changes
    useEffect(() => {
        if (open) {
            if (user) {
                // Edit mode - populate from user data
                setEmail(user.email);
                setFirstName(user.firstName || '');
                setLastName(user.lastName || '');
                setIsActive(user.isActive);
                setPassword('');

                // Get first company assignment (for now, we support one company per user in UI)
                const firstCompanyAssignment = user.companies?.[0];
                if (firstCompanyAssignment) {
                    setSelectedCompanyId(firstCompanyAssignment.company.id);
                    setCompanyRole(firstCompanyAssignment.role);
                    setAllStoresAccess(firstCompanyAssignment.allStoresAccess);
                }

                // Get store assignments for this company
                const userStoreAssignments: StoreAssignmentData[] = (user.stores || [])
                    .filter(s => !firstCompanyAssignment || s.store.companyId === firstCompanyAssignment.company.id)
                    .map(s => ({
                        storeId: s.store.id,
                        storeName: s.store.name,
                        storeCode: s.store.code,
                        role: s.role as any,
                        features: s.features
                    }));
                setStoreAssignments(userStoreAssignments);
            } else {
                // Create mode - reset form
                setEmail('');
                setFirstName('');
                setLastName('');
                setPassword('');
                setIsActive(true);
                setSelectedCompanyId('');
                setIsCreatingCompany(false);
                setNewCompanyData({ code: '', name: '' });
                setCompanyRole('VIEWER');
                setAllStoresAccess(false);
                setStoreAssignments([]);
            }
            setActiveStep(0);
            setError(null);
        }
    }, [open, user]);

    // Get accessible companies for non-platform admins
    const accessibleCompanyId = useMemo(() => {
        if (isPlatformAdmin) return null;
        // For company/store admins, get their first company
        return currentUser?.companies?.[0]?.id || null;
    }, [isPlatformAdmin, currentUser]);

    // Auto-select company for non-platform admins
    useEffect(() => {
        if (!isPlatformAdmin && accessibleCompanyId && !isEdit) {
            setSelectedCompanyId(accessibleCompanyId);
        }
    }, [isPlatformAdmin, accessibleCompanyId, isEdit]);

    // Handle company selection change
    const handleCompanyChange = (companyId: string, _company?: Company) => {
        setSelectedCompanyId(companyId);
        // Reset store assignments when company changes
        setStoreAssignments([]);
        setAllStoresAccess(false);
    };

    // Validate current step
    const isStepValid = (step: number): boolean => {
        switch (step) {
            case 0: // Basic Info
                if (!email.trim()) return false;
                if (!isEdit && !password) return false;
                return true;
            case 1: // Company Assignment
                if (isCreatingCompany) {
                    return newCompanyData.code.length >= 3 && newCompanyData.name.trim().length > 0;
                }
                return !!selectedCompanyId;
            case 2: // Store Assignment
                if (allStoresAccess) return true;
                return storeAssignments.length > 0;
            default:
                return false;
        }
    };

    // Handle next step
    const handleNext = () => {
        setActiveStep(prev => prev + 1);
    };

    // Handle back
    const handleBack = () => {
        setActiveStep(prev => prev - 1);
    };

    // Handle submit
    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        try {
            let companyId = selectedCompanyId;

            // Create new company if needed
            if (isCreatingCompany && !isEdit) {
                const createCompanyDto: CreateCompanyDto = {
                    code: newCompanyData.code,
                    name: newCompanyData.name,
                    location: newCompanyData.location || undefined
                };
                const newCompany = await companyService.create(createCompanyDto);
                companyId = newCompany.id;
            }

            if (isEdit && user) {
                // Update existing user
                await api.patch(`/users/${user.id}`, {
                    firstName: firstName.trim() || null,
                    lastName: lastName.trim() || null,
                    isActive
                });

                // Update company assignment if changed
                const existingCompanyAssignment = user.companies?.[0];
                if (existingCompanyAssignment && companyId) {
                    // Update company role
                    await api.patch(`/users/${user.id}/companies/${companyId}`, {
                        role: companyRole,
                        allStoresAccess
                    });
                }

                // Update store assignments
                // First, remove stores no longer assigned
                const existingStoreIds = new Set(user.stores?.map(s => s.store.id) || []);
                const newStoreIds = new Set(storeAssignments.map(a => a.storeId));

                for (const storeId of existingStoreIds) {
                    if (!newStoreIds.has(storeId) && !allStoresAccess) {
                        await api.delete(`/users/${user.id}/stores/${storeId}`);
                    }
                }

                // Add or update stores
                for (const assignment of storeAssignments) {
                    if (existingStoreIds.has(assignment.storeId)) {
                        // Update
                        await api.patch(`/users/${user.id}/stores/${assignment.storeId}`, {
                            role: assignment.role,
                            features: assignment.features
                        });
                    } else {
                        // Add
                        await api.post(`/users/${user.id}/stores`, {
                            storeId: assignment.storeId,
                            role: assignment.role,
                            features: assignment.features
                        });
                    }
                }
            } else {
                // Create new user
                const createUserData = {
                    email: email.trim(),
                    firstName: firstName.trim() || null,
                    lastName: lastName.trim() || null,
                    password,
                    companyId,
                    companyRole,
                    allStoresAccess,
                    stores: allStoresAccess ? [] : storeAssignments.map(a => ({
                        storeId: a.storeId,
                        role: a.role,
                        features: a.features
                    }))
                };

                await api.post('/users', createUserData);
            }

            onSave();
        } catch (err: any) {
            console.error('Failed to save user:', err);
            setError(
                err.response?.data?.message ||
                t('settings.users.saveError')
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Render step content
    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label={t('auth.email')}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isEdit}
                            required
                            fullWidth
                            autoFocus={!isEdit}
                        />

                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: 2 
                        }}>
                            <TextField
                                label={t('auth.firstName')}
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label={t('auth.lastName')}
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                fullWidth
                            />
                        </Box>

                        {!isEdit && (
                            <TextField
                                label={t('auth.password')}
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                fullWidth
                                helperText={t('auth.passwordMinLength')}
                            />
                        )}

                        {isEdit && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                    />
                                }
                                label={t('common.status.active')}
                            />
                        )}
                    </Box>
                );

            case 1:
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Company Selector */}
                        <CompanySelector
                            value={selectedCompanyId}
                            onChange={handleCompanyChange}
                            isCreatingNew={isCreatingCompany}
                            onCreateModeChange={setIsCreatingCompany}
                            newCompanyData={newCompanyData}
                            onNewCompanyDataChange={setNewCompanyData}
                            allowCreate={isPlatformAdmin}
                            disabled={!isPlatformAdmin && !!accessibleCompanyId}
                        />

                        <Divider sx={{ my: 1 }} />

                        {/* Company Role */}
                        <FormControl fullWidth>
                            <InputLabel>{t('settings.users.companyRole')}</InputLabel>
                            <Select
                                value={companyRole}
                                label={t('settings.users.companyRole')}
                                onChange={(e) => setCompanyRole(e.target.value as CompanyRole)}
                            >
                                {COMPANY_ROLES.map(role => (
                                    <MenuItem key={role} value={role}>
                                        <Box>
                                            <Typography variant="body1">
                                                {t(`roles.${role.toLowerCase()}`)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {role === 'COMPANY_ADMIN' 
                                                    ? t('settings.users.companyAdminDesc')
                                                    : t('settings.users.viewerDesc')
                                                }
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                );

            case 2:
                return (
                    <StoreAssignment
                        companyId={isCreatingCompany ? '' : selectedCompanyId}
                        companyRole={companyRole}
                        allStoresAccess={allStoresAccess}
                        onAllStoresAccessChange={setAllStoresAccess}
                        assignments={storeAssignments}
                        onAssignmentsChange={setStoreAssignments}
                    />
                );

            default:
                return null;
        }
    };

    // For edit mode, show simplified layout without stepper
    if (isEdit) {
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
                    {t('settings.users.editUser')}
                </DialogTitle>

                <DialogContent dividers>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Basic Info */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom color="primary">
                                {t('settings.users.basicInfo')}
                            </Typography>
                            {renderStepContent(0)}
                        </Box>

                        <Divider />

                        {/* Company */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom color="primary">
                                {t('settings.users.companyAssignment')}
                            </Typography>
                            {renderStepContent(1)}
                        </Box>

                        <Divider />

                        {/* Stores */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom color="primary">
                                {t('settings.users.storeAssignments')}
                            </Typography>
                            {renderStepContent(2)}
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose} disabled={submitting}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={16} /> : null}
                    >
                        {t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    // Create mode with stepper
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
                {t('settings.users.addUser')}
            </DialogTitle>

            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Stepper */}
                <Stepper 
                    activeStep={activeStep} 
                    sx={{ 
                        mb: 3,
                        '& .MuiStepLabel-label': {
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }
                    }}
                    alternativeLabel
                >
                    {STEPS.map((step) => (
                        <Step key={step}>
                            <StepLabel>
                                {t(`settings.users.steps.${step}`)}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* Step Content */}
                {renderStepContent(activeStep)}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
                <Button onClick={onClose} disabled={submitting}>
                    {t('common.cancel')}
                </Button>
                
                {activeStep > 0 && (
                    <Button onClick={handleBack} disabled={submitting}>
                        {t('common.back')}
                    </Button>
                )}

                {activeStep < STEPS.length - 1 ? (
                    <Button
                        variant="contained"
                        onClick={handleNext}
                        disabled={!isStepValid(activeStep)}
                    >
                        {t('common.next')}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={submitting || !isStepValid(activeStep)}
                        startIcon={submitting ? <CircularProgress size={16} /> : null}
                    >
                        {t('common.create')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default EnhancedUserDialog;
