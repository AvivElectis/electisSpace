/**
 * useUserDialogState - Encapsulates all state, effects, and handlers for EnhancedUserDialog
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { companyService, type Company, type CreateCompanyDto } from '@shared/infrastructure/services/companyService';
import api from '@shared/infrastructure/services/apiClient';
import type { UserData, CompanyRole, StoreAssignmentData } from './types';

interface Params {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    user?: UserData | null;
    profileMode: boolean;
}

export function useUserDialogState({ open, onSave, user, profileMode }: Params) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isRtl = theme.direction === 'rtl';
    const { isPlatformAdmin, user: currentUser } = useAuthContext();
    const { setUser: setAuthUser } = useAuthStore();
    const isEdit = !!user || profileMode;

    // Profile data for self-editing mode
    const [profileData, setProfileData] = useState<UserData | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // Edit mode toggle
    const [isEditing, setIsEditing] = useState(false);

    // Stepper state (create mode only)
    const [activeStep, setActiveStep] = useState(0);

    // Form state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Basic Info
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const emailCheckTimer = useRef<ReturnType<typeof setTimeout>>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Debounced email uniqueness check (create mode only)
    const checkEmailExists = useCallback((emailToCheck: string) => {
        if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);

        const trimmed = emailToCheck.trim().toLowerCase();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setEmailError(null);
            setCheckingEmail(false);
            return;
        }

        setCheckingEmail(true);
        emailCheckTimer.current = setTimeout(async () => {
            try {
                const response = await api.get<{ exists: boolean }>('/users/check-email', {
                    params: { email: trimmed }
                });
                setEmailError(response.data.exists ? t('settings.users.emailAlreadyExists') : null);
            } catch {
                setEmailError(null);
            } finally {
                setCheckingEmail(false);
            }
        }, 500);
    }, [t]);

    const handleEmailChange = useCallback((value: string) => {
        setEmail(value);
        if (!isEdit) checkEmailExists(value);
    }, [isEdit, checkEmailExists]);

    useEffect(() => {
        return () => { if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current); };
    }, []);

    // Password change fields
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Company Assignment
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [isCreatingCompany, setIsCreatingCompany] = useState(false);
    const [newCompanyData, setNewCompanyData] = useState<{ code: string; name: string; location?: string }>({ code: '', name: '' });
    const [companyRole, setCompanyRole] = useState<CompanyRole>('VIEWER');
    const [allStoresAccess, setAllStoresAccess] = useState(false);

    // Store Assignments
    const [storeAssignments, setStoreAssignments] = useState<StoreAssignmentData[]>([]);

    // Fetched user data (for edit mode - to get companies/stores)
    const [fetchedUserData, setFetchedUserData] = useState<UserData | null>(null);
    const userData = profileMode ? profileData : (fetchedUserData || user || null);

    // Fetch profile data in profile mode
    useEffect(() => {
        if (open && profileMode) {
            setProfileLoading(true);
            setError(null);
            api.get<UserData>('/users/me')
                .then(response => {
                    const data = response.data;
                    setProfileData(data);
                    setEmail(data.email);
                    setFirstName(data.firstName || '');
                    setLastName(data.lastName || '');
                    setPhone(data.phone || '');
                    setIsActive(data.isActive);

                    const firstCompanyAssignment = data.companies?.[0];
                    if (firstCompanyAssignment) {
                        setSelectedCompanyId(firstCompanyAssignment.company.id);
                        setCompanyRole(firstCompanyAssignment.role);
                        setAllStoresAccess(firstCompanyAssignment.allStoresAccess);
                    }

                    const userStoreAssignments: StoreAssignmentData[] = (data.stores || [])
                        .filter(s => s?.store && (!firstCompanyAssignment || s.store.companyId === firstCompanyAssignment.company.id))
                        .map(s => ({
                            storeId: s.store.id,
                            storeName: s.store.name,
                            storeCode: s.store.code,
                            role: s.role as any,
                            features: s.features
                        }));
                    setStoreAssignments(userStoreAssignments);
                })
                .catch(err => {
                    setError(err.response?.data?.error?.message || 'Failed to load profile');
                })
                .finally(() => {
                    setProfileLoading(false);
                });
        }
    }, [open, profileMode]);

    // Fetch full user data in edit mode (to get companies)
    useEffect(() => {
        if (open && !profileMode && user?.id) {
            setProfileLoading(true);
            setError(null);
            api.get<UserData>(`/users/${user.id}`)
                .then(response => {
                    setFetchedUserData(response.data);
                })
                .catch(err => {
                    console.error('Failed to fetch user details:', err);
                    setFetchedUserData(null);
                })
                .finally(() => {
                    setProfileLoading(false);
                });
        } else if (!open) {
            setFetchedUserData(null);
        }
    }, [open, profileMode, user?.id]);

    // Initialize form when dialog opens or user changes (non-profile mode)
    useEffect(() => {
        if (open && !profileMode) {
            const userToUse = fetchedUserData || user;
            if (userToUse) {
                setEmail(userToUse.email);
                setFirstName(userToUse.firstName || '');
                setLastName(userToUse.lastName || '');
                setPhone(userToUse.phone || '');
                setIsActive(userToUse.isActive);
                setPassword('');

                const firstCompanyAssignment = userToUse.companies?.[0];
                if (firstCompanyAssignment) {
                    setSelectedCompanyId(firstCompanyAssignment.company.id);
                    setCompanyRole(firstCompanyAssignment.role);
                    setAllStoresAccess(firstCompanyAssignment.allStoresAccess);
                }

                const userStoreAssignments: StoreAssignmentData[] = (userToUse.stores || [])
                    .filter(s => s?.store && (!firstCompanyAssignment || s.store.companyId === firstCompanyAssignment.company.id))
                    .map(s => ({
                        storeId: s.store.id,
                        storeName: s.store.name,
                        storeCode: s.store.code,
                        role: s.role as any,
                        features: s.features
                    }));
                setStoreAssignments(userStoreAssignments);
            } else {
                // Create mode - reset
                setEmail('');
                setEmailError(null);
                setCheckingEmail(false);
                setFirstName('');
                setLastName('');
                setPhone('');
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
            setSuccess(null);
        }

        if (open) {
            setIsEditing(false);
            setShowPasswordSection(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [open, user, fetchedUserData, profileMode]);

    // Accessible company for non-platform admins
    const accessibleCompanyId = useMemo(() => {
        if (isPlatformAdmin) return null;
        return currentUser?.companies?.[0]?.id || null;
    }, [isPlatformAdmin, currentUser]);

    // Auto-select company for non-platform admins
    useEffect(() => {
        if (!isPlatformAdmin && accessibleCompanyId && !isEdit) {
            setSelectedCompanyId(accessibleCompanyId);
        }
    }, [isPlatformAdmin, accessibleCompanyId, isEdit]);

    const handleCompanyChange = useCallback((companyId: string, _company?: Company) => {
        setSelectedCompanyId(companyId);
        setStoreAssignments([]);
        setAllStoresAccess(false);
    }, []);

    // Step validation
    const isStepValid = useCallback((step: number): boolean => {
        switch (step) {
            case 0:
                if (!email.trim()) return false;
                if (!isEdit && !password) return false;
                if (emailError || checkingEmail) return false;
                return true;
            case 1:
                if (isCreatingCompany) {
                    return newCompanyData.code.length >= 3 && newCompanyData.name.trim().length > 0;
                }
                return !!selectedCompanyId;
            case 2:
                if (allStoresAccess) return true;
                return storeAssignments.length > 0;
            default:
                return false;
        }
    }, [email, isEdit, password, emailError, checkingEmail, isCreatingCompany, newCompanyData, selectedCompanyId, allStoresAccess, storeAssignments]);

    const handleNext = useCallback(() => setActiveStep(prev => prev + 1), []);
    const handleBack = useCallback(() => setActiveStep(prev => prev - 1), []);

    // Password change (profile mode only)
    const handleChangePassword = useCallback(async () => {
        if (newPassword !== confirmPassword) {
            setError(t('settings.users.passwordMismatch'));
            return;
        }
        if (newPassword.length < 8) {
            setError(t('settings.users.passwordTooShort'));
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            setSuccess(t('settings.users.passwordChanged'));
            setShowPasswordSection(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to change password');
        } finally {
            setSubmitting(false);
        }
    }, [newPassword, confirmPassword, currentPassword, t]);

    // Main submit
    const handleSubmit = useCallback(async () => {
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            // Profile mode - self update
            if (profileMode) {
                await api.patch('/users/me', {
                    firstName: firstName.trim() || null,
                    lastName: lastName.trim() || null,
                    phone: phone.trim() || null,
                });
                setSuccess(t('settings.users.profileSaved'));
                if (currentUser) {
                    setAuthUser({
                        ...currentUser,
                        firstName: firstName.trim() || null,
                        lastName: lastName.trim() || null,
                    });
                }
                setIsEditing(false);
                onSave();
                return;
            }

            let companyId = selectedCompanyId;

            // Create new company if needed (edit mode only)
            if (isCreatingCompany && isEdit && user) {
                const createCompanyDto: CreateCompanyDto = {
                    code: newCompanyData.code,
                    name: newCompanyData.name,
                    location: newCompanyData.location || undefined
                };
                const newCompany = await companyService.create(createCompanyDto);
                companyId = newCompany.id;
            }

            if (isEdit && user) {
                // Validate password reset
                if (newPassword && newPassword !== confirmPassword) {
                    setError(t('settings.users.passwordMismatch'));
                    setSubmitting(false);
                    return;
                }

                const updateData: Record<string, any> = {
                    firstName: firstName.trim() || null,
                    lastName: lastName.trim() || null,
                    isActive
                };
                if (newPassword) updateData.password = newPassword;

                await api.patch(`/users/${user.id}`, updateData);

                // Handle company assignment
                const userWithCompanies = fetchedUserData || user;
                const existingCompanyAssignment = userWithCompanies.companies?.find(c => c.company.id === companyId);
                const hasAnyCompanyAssignment = userWithCompanies.companies && userWithCompanies.companies.length > 0;

                if (companyId) {
                    if (existingCompanyAssignment) {
                        await api.patch(`/users/${user.id}/companies/${companyId}`, {
                            role: companyRole,
                            allStoresAccess
                        });
                    } else if (hasAnyCompanyAssignment) {
                        await api.post(`/users/${user.id}/companies`, {
                            company: { type: 'existing', id: companyId },
                            allStoresAccess,
                            isCompanyAdmin: companyRole === 'COMPANY_ADMIN'
                        });
                    } else {
                        await api.post(`/users/${user.id}/companies`, {
                            company: { type: 'existing', id: companyId },
                            allStoresAccess,
                            isCompanyAdmin: companyRole === 'COMPANY_ADMIN'
                        });
                    }
                }

                // Update store assignments
                const userWithStores = fetchedUserData || user;
                const existingStoreIds = new Set(userWithStores.stores?.filter(s => s?.store).map(s => s.store.id) || []);
                const newStoreIds = new Set(storeAssignments.map(a => a.storeId));

                for (const storeId of existingStoreIds) {
                    if (!newStoreIds.has(storeId) && !allStoresAccess) {
                        await api.delete(`/users/${user.id}/stores/${storeId}`);
                    }
                }

                for (const assignment of storeAssignments) {
                    if (existingStoreIds.has(assignment.storeId)) {
                        await api.patch(`/users/${user.id}/stores/${assignment.storeId}`, {
                            role: assignment.role,
                            features: assignment.features
                        });
                    } else {
                        await api.post(`/users/${user.id}/stores`, {
                            storeId: assignment.storeId,
                            role: assignment.role,
                            features: assignment.features
                        });
                    }
                }
            } else {
                // Create new user
                const createUserData: Record<string, any> = {
                    email: email.trim(),
                    firstName: firstName.trim() || undefined,
                    lastName: lastName.trim() || undefined,
                    phone: phone.trim() || undefined,
                    password,
                    allStoresAccess,
                };

                if (isCreatingCompany) {
                    createUserData.company = {
                        type: 'new',
                        code: newCompanyData.code,
                        name: newCompanyData.name,
                        location: newCompanyData.location || undefined,
                    };
                } else {
                    createUserData.company = { type: 'existing', id: companyId };
                }

                if (!allStoresAccess && storeAssignments.length > 0) {
                    createUserData.stores = storeAssignments.map(a => ({
                        type: 'existing',
                        id: a.storeId,
                        role: a.role,
                        features: a.features
                    }));
                }

                await api.post('/users', createUserData);
            }

            setIsEditing(false);
            onSave();
        } catch (err: any) {
            console.error('Failed to save user:', err);
            const errorMessage = err.response?.data?.message || err.response?.data?.error?.message;

            if (errorMessage?.toLowerCase().includes('email already exists') ||
                errorMessage?.toLowerCase().includes('email_exists')) {
                setError(t('settings.users.emailAlreadyExists'));
                if (!isEdit) setActiveStep(0);
            } else {
                setError(errorMessage || t('settings.users.saveError'));
            }
        } finally {
            setSubmitting(false);
        }
    }, [
        profileMode, firstName, lastName, phone, t, currentUser, setAuthUser, onSave,
        selectedCompanyId, isCreatingCompany, isEdit, user, newCompanyData,
        newPassword, confirmPassword, isActive, fetchedUserData, companyRole,
        allStoresAccess, storeAssignments, email, password,
    ]);

    // Profile helpers
    const getInitials = useCallback(() => {
        if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
        if (email) return email.substring(0, 2).toUpperCase();
        return '?';
    }, [firstName, lastName, email]);

    const getRoleBadgeColor = useCallback(() => {
        if (userData?.globalRole === 'PLATFORM_ADMIN') return 'error';
        const role = userData?.companies?.[0]?.role;
        if (role === 'COMPANY_ADMIN') return 'primary';
        return 'default';
    }, [userData]);

    const getRoleLabel = useCallback(() => {
        if (userData?.globalRole === 'PLATFORM_ADMIN') return t('settings.users.roles.platformAdmin');
        const role = userData?.companies?.[0]?.role;
        if (role === 'COMPANY_ADMIN') return t('settings.users.roles.companyAdmin');
        return t('settings.users.roles.viewer');
    }, [userData, t]);

    return {
        // Common
        isEdit, isEditing, setIsEditing, isRtl,
        submitting, error, setError, success, setSuccess,
        profileLoading, userData, profileMode,

        // Basic Info
        email, emailError, checkingEmail, handleEmailChange,
        firstName, setFirstName, lastName, setLastName,
        phone, setPhone, password, setPassword,
        isActive, setIsActive,

        // Company
        selectedCompanyId, isCreatingCompany, setIsCreatingCompany,
        newCompanyData, setNewCompanyData,
        companyRole, setCompanyRole,
        allStoresAccess, setAllStoresAccess,
        isPlatformAdmin, accessibleCompanyId,
        handleCompanyChange,

        // Store
        storeAssignments, setStoreAssignments,

        // Password
        showPasswordSection, setShowPasswordSection,
        currentPassword, setCurrentPassword,
        newPassword, setNewPassword,
        confirmPassword, setConfirmPassword,
        showCurrentPassword, setShowCurrentPassword,
        showNewPassword, setShowNewPassword,
        handleChangePassword,

        // Stepper
        activeStep, isStepValid, handleNext, handleBack,

        // Submit
        handleSubmit,

        // Profile helpers
        getInitials, getRoleBadgeColor, getRoleLabel,
    };
}
