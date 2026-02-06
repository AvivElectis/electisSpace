/**
 * Enhanced User Dialog - Unified
 * 
 * @description Comprehensive dialog for creating, editing users, AND self-profile editing with:
 * - Beautiful profile header with avatar, name, role
 * - Edit mode toggle - fields disabled until user clicks edit
 * - Company selection (with inline creation for PLATFORM_ADMIN)
 * - Store assignments with roles and features
 * - Multi-step flow for creating new users
 * - Account statistics display
 * - Password management (change for self, reset for admin)
 * 
 * This is the unified user edit dialog used both in Settings and for profile editing.
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
    MenuItem,
    Avatar,
    Chip,
    InputAdornment,
    IconButton,
    Grid,
    useTheme,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoginIcon from '@mui/icons-material/Login';
import EditIcon from '@mui/icons-material/Edit';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { CompanySelector } from './CompanySelector';
import { StoreAssignment, type StoreAssignmentData } from './StoreAssignment';
import { companyService, type Company, type CreateCompanyDto } from '@shared/infrastructure/services/companyService';
import api from '@shared/infrastructure/services/apiClient';
import { formatDistanceToNow } from 'date-fns';

// Company roles
const COMPANY_ROLES = ['VIEWER', 'COMPANY_ADMIN'] as const;
type CompanyRole = typeof COMPANY_ROLES[number];

// User from backend
interface UserData {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone?: string | null;
    globalRole: 'PLATFORM_ADMIN' | null;
    isActive: boolean;
    lastLogin?: string | null;
    lastActivity?: string | null;
    loginCount?: number;
    createdAt?: string;
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
    profileMode?: boolean; // If true, self-editing mode (from header avatar)
}

// Steps for create mode
const STEPS = ['basicInfo', 'companyAssignment', 'storeAssignment'];

export function EnhancedUserDialog({ open, onClose, onSave, user, profileMode = false }: EnhancedUserDialogProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isRtl = theme.direction === 'rtl';
    const { isPlatformAdmin, user: currentUser } = useAuthContext();
    const { setUser: setAuthUser } = useAuthStore();
    const isEdit = !!user || profileMode;

    // Profile data for self-editing mode
    const [profileData, setProfileData] = useState<UserData | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // Edit mode toggle - fields disabled until user clicks edit
    const [isEditing, setIsEditing] = useState(false);

    // Stepper state (only for create mode)
    const [activeStep, setActiveStep] = useState(0);
    
    // Form state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Basic Info
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Password change (profile mode)
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

    // Helper: get the user data (from fetched user data, profile data, or user prop)
    const [fetchedUserData, setFetchedUserData] = useState<UserData | null>(null);
    const userData = profileMode ? profileData : (fetchedUserData || user);

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
                    
                    // Get first company assignment
                    const firstCompanyAssignment = data.companies?.[0];
                    if (firstCompanyAssignment) {
                        setSelectedCompanyId(firstCompanyAssignment.company.id);
                        setCompanyRole(firstCompanyAssignment.role);
                        setAllStoresAccess(firstCompanyAssignment.allStoresAccess);
                    }
                    
                    // Get store assignments
                    const userStoreAssignments: StoreAssignmentData[] = (data.stores || [])
                        .filter(s => !firstCompanyAssignment || s.store.companyId === firstCompanyAssignment.company.id)
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
                    // Fall back to the passed user prop
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
                // Edit mode - populate from user data
                setEmail(userToUse.email);
                setFirstName(userToUse.firstName || '');
                setLastName(userToUse.lastName || '');
                setPhone(userToUse.phone || '');
                setIsActive(userToUse.isActive);
                setPassword('');

                // Get first company assignment (for now, we support one company per user in UI)
                const firstCompanyAssignment = userToUse.companies?.[0];
                if (firstCompanyAssignment) {
                    setSelectedCompanyId(firstCompanyAssignment.company.id);
                    setCompanyRole(firstCompanyAssignment.role);
                    setAllStoresAccess(firstCompanyAssignment.allStoresAccess);
                }

                // Get store assignments for this company
                const userStoreAssignments: StoreAssignmentData[] = (userToUse.stores || [])
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
        
        // Reset password fields and edit mode when dialog opens
        if (open) {
            setIsEditing(false); // Start in view mode
            setShowPasswordSection(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [open, user, fetchedUserData, profileMode]);

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

    // Handle password change (profile mode only - requires current password)
    const handleChangePassword = async () => {
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
            await api.post('/users/me/change-password', {
                currentPassword,
                newPassword,
            });
            
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
    };

    // Handle submit
    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            // Profile mode - self update via /users/me
            if (profileMode) {
                await api.patch('/users/me', {
                    firstName: firstName.trim() || null,
                    lastName: lastName.trim() || null,
                    phone: phone.trim() || null,
                });
                
                setSuccess(t('settings.users.profileSaved'));
                
                // Update auth store with new data
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

            // Create new company if needed - ONLY for EDIT mode
            // For CREATE mode, the backend handles company creation via the {type: 'new'} format
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
                // Validate password reset if entered
                if (newPassword && newPassword !== confirmPassword) {
                    setError(t('settings.users.passwordMismatch'));
                    setSubmitting(false);
                    return;
                }

                // Update existing user
                const updateData: Record<string, any> = {
                    firstName: firstName.trim() || null,
                    lastName: lastName.trim() || null,
                    isActive
                };

                // Add password reset if provided
                if (newPassword) {
                    updateData.password = newPassword;
                }

                await api.patch(`/users/${user.id}`, updateData);

                // Handle company assignment - use fetchedUserData which has companies
                const userWithCompanies = fetchedUserData || user;
                const existingCompanyAssignment = userWithCompanies.companies?.find(c => c.company.id === companyId);
                const hasAnyCompanyAssignment = userWithCompanies.companies && userWithCompanies.companies.length > 0;
                
                if (companyId) {
                    if (existingCompanyAssignment) {
                        // Already assigned to this company - just update role
                        await api.patch(`/users/${user.id}/companies/${companyId}`, {
                            role: companyRole,
                            allStoresAccess
                        });
                    } else if (hasAnyCompanyAssignment) {
                        // Assigned to different company(ies) - add new assignment
                        await api.post(`/users/${user.id}/companies`, {
                            company: { type: 'existing', id: companyId },
                            allStoresAccess,
                            isCompanyAdmin: companyRole === 'COMPANY_ADMIN'
                        });
                    } else {
                        // No existing company - assign to new one
                        await api.post(`/users/${user.id}/companies`, {
                            company: { type: 'existing', id: companyId },
                            allStoresAccess,
                            isCompanyAdmin: companyRole === 'COMPANY_ADMIN'
                        });
                    }
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
                // Create new user - format data for backend schema
                const createUserData: Record<string, any> = {
                    email: email.trim(),
                    firstName: firstName.trim() || undefined,
                    lastName: lastName.trim() || undefined,
                    phone: phone.trim() || undefined,
                    password,
                    allStoresAccess,
                };

                // Format company - backend expects {type: 'existing', id} or {type: 'new', code, name}
                if (isCreatingCompany) {
                    createUserData.company = {
                        type: 'new',
                        code: newCompanyData.code,
                        name: newCompanyData.name,
                        location: newCompanyData.location || undefined,
                    };
                } else {
                    createUserData.company = {
                        type: 'existing',
                        id: companyId,
                    };
                }

                // Format stores - backend expects {type: 'existing', id, role, features}
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
            setError(
                err.response?.data?.message ||
                t('settings.users.saveError')
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Helper functions
    const getInitials = () => {
        if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
        if (email) return email.substring(0, 2).toUpperCase();
        return '?';
    };

    const getRoleBadgeColor = () => {
        if (userData?.globalRole === 'PLATFORM_ADMIN') return 'error';
        const role = userData?.companies?.[0]?.role;
        if (role === 'COMPANY_ADMIN') return 'primary';
        return 'default';
    };

    const getRoleLabel = () => {
        if (userData?.globalRole === 'PLATFORM_ADMIN') return t('settings.users.roles.platformAdmin');
        const role = userData?.companies?.[0]?.role;
        if (role === 'COMPANY_ADMIN') return t('settings.users.roles.companyAdmin');
        return t('settings.users.roles.viewer');
    };

    // Render the profile header section
    const renderProfileHeader = () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                {getInitials()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
                <Typography variant="h6">
                    {firstName || lastName ? `${firstName} ${lastName}`.trim() : email || t('settings.users.newUser')}
                </Typography>
                {email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                            {email}
                        </Typography>
                    </Box>
                )}
                {userData && (
                    <Chip
                        label={getRoleLabel()}
                        color={getRoleBadgeColor() as any}
                        size="small"
                        sx={{ mt: 1 }}
                    />
                )}
            </Box>
            {/* Edit button for edit mode */}
            {isEdit && !isEditing && (
                <IconButton
                    color="primary"
                    onClick={() => setIsEditing(true)}
                    sx={{ 
                        border: 1, 
                        borderColor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' }
                    }}
                >
                    <EditIcon />
                </IconButton>
            )}
        </Box>
    );

    // Render account statistics
    const renderAccountStats = () => {
        if (!userData) return null;
        
        return (
            <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('settings.users.accountStats')}
                </Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LoginIcon fontSize="small" color="action" />
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    {t('settings.users.loginCount')}
                                </Typography>
                                <Typography variant="body2">
                                    {userData?.loginCount || 0}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    {t('settings.users.lastLogin')}
                                </Typography>
                                <Typography variant="body2">
                                    {userData?.lastLogin
                                        ? formatDistanceToNow(new Date(userData.lastLogin), { addSuffix: true })
                                        : t('common.never')
                                    }
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    {t('settings.users.memberSince')}
                                </Typography>
                                <Typography variant="body2">
                                    {userData?.createdAt
                                        ? new Date(userData.createdAt).toLocaleDateString()
                                        : '-'
                                    }
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        );
    };

    // Render basic info section
    const renderBasicInfo = () => (
        <Box>
            <Typography variant="subtitle2" color="primary" gutterBottom>
                {t('settings.users.basicInfo')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Email - always disabled in edit mode, only editable in create mode */}
                <TextField
                    label={t('auth.email')}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isEdit}
                    required={!isEdit}
                    fullWidth
                    size="small"
                />

                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2 
                }}>
                    <TextField
                        label={t('common.firstName')}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isEdit && !isEditing}
                    />
                    <TextField
                        label={t('common.lastName')}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isEdit && !isEditing}
                    />
                </Box>

                <TextField
                    label={t('common.phone')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    fullWidth
                    size="small"
                    disabled={isEdit && !isEditing}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <PhoneIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />

                {/* Password only for create mode */}
                {!isEdit && (
                    <TextField
                        label={t('auth.password')}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        helperText={t('auth.passwordMinLength')}
                    />
                )}

                {/* Active toggle (admin editing other users only) */}
                {isEdit && !profileMode && isEditing && (
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
        </Box>
    );

    // Render company assignment section
    const renderCompanySection = () => (
        <Box>
            <Typography variant="subtitle2" color="primary" gutterBottom>
                {t('settings.users.companyAssignment')}
            </Typography>
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
                    disabled={(isEdit && !isEditing) || (!isPlatformAdmin && !!accessibleCompanyId)}
                />

                <Divider sx={{ my: 1 }} />

                {/* Company Role */}
                <FormControl fullWidth size="small" disabled={isEdit && !isEditing}>
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
        </Box>
    );

    // Render store assignment section
    const renderStoreSection = () => (
        <Box>
            <Typography variant="subtitle2" color="primary" gutterBottom>
                {t('settings.users.storeAssignments')}
            </Typography>
            <StoreAssignment
                companyId={isCreatingCompany ? '' : selectedCompanyId}
                companyRole={companyRole}
                allStoresAccess={allStoresAccess}
                onAllStoresAccessChange={setAllStoresAccess}
                assignments={storeAssignments}
                onAssignmentsChange={setStoreAssignments}
                disabled={isEdit && !isEditing}
            />
        </Box>
    );

    // Render password section
    const renderPasswordSection = () => {
        // Profile mode - requires current password
        if (profileMode) {
            return (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" color="primary">
                            {t('settings.users.password')}
                        </Typography>
                        <Button
                            size="small"
                            onClick={() => setShowPasswordSection(!showPasswordSection)}
                        >
                            {showPasswordSection ? t('common.cancel') : t('settings.users.changePassword')}
                        </Button>
                    </Box>

                    {showPasswordSection && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            {/* Current Password */}
                            <Box sx={{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
                                <TextField
                                    label={t('settings.users.currentPassword')}
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    size="small"
                                    sx={{ flex: 1 }}
                                />
                                <IconButton
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    sx={{ 
                                        mt: 0.5,
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        width: 40,
                                        height: 40
                                    }}
                                >
                                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </Box>
                            {/* New Password */}
                            <Box sx={{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
                                <TextField
                                    label={t('settings.users.newPassword')}
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    size="small"
                                    helperText={t('settings.users.passwordRequirements')}
                                    sx={{ flex: 1 }}
                                />
                                <IconButton
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    sx={{ 
                                        mt: 0.5,
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        width: 40,
                                        height: 40
                                    }}
                                >
                                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </Box>
                            {/* Confirm Password */}
                            <TextField
                                label={t('settings.users.confirmPassword')}
                                type="password"
                                fullWidth
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                size="small"
                                error={confirmPassword.length > 0 && newPassword !== confirmPassword}
                                helperText={
                                    confirmPassword.length > 0 && newPassword !== confirmPassword
                                        ? t('settings.users.passwordMismatch')
                                        : ''
                                }
                            />
                            <Button
                                variant="contained"
                                color="warning"
                                onClick={handleChangePassword}
                                disabled={submitting || !currentPassword || !newPassword || newPassword !== confirmPassword}
                            >
                                {submitting ? <CircularProgress size={20} /> : t('settings.users.changePassword')}
                            </Button>
                        </Box>
                    )}
                </Box>
            );
        }

        // Admin mode - reset password without current password
        // Same UI as profile mode: button to expand, then inputs + submit
        return (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="primary">
                        {t('settings.users.resetPassword')}
                    </Typography>
                    <Button
                        size="small"
                        onClick={() => setShowPasswordSection(!showPasswordSection)}
                    >
                        {showPasswordSection ? t('common.cancel') : t('settings.users.resetPassword')}
                    </Button>
                </Box>

                {showPasswordSection && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        {/* New Password */}
                        <Box sx={{ display: 'flex', flexDirection: isRtl ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                                label={t('settings.users.newPassword')}
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                size="small"
                                helperText={t('settings.users.passwordRequirements')}
                                sx={{ flex: 1 }}
                            />
                            <IconButton
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                sx={{ 
                                    mt: 0.5,
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    width: 40,
                                    height: 40
                                }}
                            >
                                {showNewPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </Box>
                        {/* Confirm Password */}
                        <TextField
                            label={t('settings.users.confirmPassword')}
                            type="password"
                            fullWidth
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            size="small"
                            error={confirmPassword.length > 0 && newPassword !== confirmPassword}
                            helperText={
                                confirmPassword.length > 0 && newPassword !== confirmPassword
                                    ? t('settings.users.passwordMismatch')
                                    : ''
                            }
                        />
                        <Button
                            variant="contained"
                            color="warning"
                            onClick={handleSubmit}
                            disabled={submitting || !newPassword || newPassword !== confirmPassword}
                        >
                            {submitting ? <CircularProgress size={20} /> : t('settings.users.resetPassword')}
                        </Button>
                    </Box>
                )}
            </Box>
        );
    };

    // Edit/Profile mode - unified layout
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
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PersonIcon />
                    {profileMode ? t('settings.users.editProfile') : t('settings.users.editUser')}
                </DialogTitle>

                <DialogContent dividers>
                    {profileLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
                            {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
                            
                            {/* Profile Header with Edit button */}
                            {renderProfileHeader()}

                            <Divider />

                            {/* Basic Info Section */}
                            {renderBasicInfo()}

                            <Divider />

                            {/* Account Stats */}
                            {renderAccountStats()}

                            {/* Company Section - only for admin editing or if user has companies */}
                            {(!profileMode || (userData?.companies && userData.companies.length > 0)) && (
                                <>
                                    <Divider />
                                    {renderCompanySection()}
                                </>
                            )}

                            {/* Store Section - only for admin editing or if user has stores */}
                            {(!profileMode || (userData?.stores && userData.stores.length > 0)) && (
                                <>
                                    <Divider />
                                    {renderStoreSection()}
                                </>
                            )}

                            <Divider />

                            {/* Password Section */}
                            {renderPasswordSection()}
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose} disabled={submitting} color="inherit">
                        {isEditing ? t('common.cancel') : t('common.close')}
                    </Button>
                    {isEditing && (
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={submitting || profileLoading || (newPassword.length > 0 && newPassword !== confirmPassword)}
                            startIcon={submitting ? <CircularProgress size={16} /> : null}
                        >
                            {t('common.save')}
                        </Button>
                    )}
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
                {activeStep === 0 && renderBasicInfo()}
                {activeStep === 1 && renderCompanySection()}
                {activeStep === 2 && renderStoreSection()}
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
