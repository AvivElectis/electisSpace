/**
 * Enhanced User Dialog
 * 
 * @description Comprehensive dialog for creating, editing users, AND self-profile editing with:
 * - Company selection (with inline creation for PLATFORM_ADMIN)
 * - Store assignments with roles and features
 * - Multi-step flow for creating new users
 * - Profile mode for users to edit their own profile (from header avatar)
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

    // Initialize form when dialog opens or user changes (non-profile mode)
    useEffect(() => {
        if (open && !profileMode) {
            if (user) {
                // Edit mode - populate from user data
                setEmail(user.email);
                setFirstName(user.firstName || '');
                setLastName(user.lastName || '');
                setPhone(user.phone || '');
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
        
        // Reset password fields when dialog opens
        if (open) {
            setShowPasswordSection(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [open, user, profileMode]);

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

    // Handle password change (profile mode only)
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
                
                onSave();
                return;
            }

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

                        <TextField
                            label={t('common.phone')}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PhoneIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />

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

                        {isEdit && !profileMode && (
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

    // Helper functions for profile mode
    const getInitials = () => {
        if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
        if (email) return email.substring(0, 2).toUpperCase();
        return '?';
    };

    const getRoleBadgeColor = () => {
        const data = profileMode ? profileData : user;
        if (data?.globalRole === 'PLATFORM_ADMIN') return 'error';
        const companyRole = data?.companies?.[0]?.role;
        if (companyRole === 'SUPER_USER') return 'warning';
        if (companyRole === 'COMPANY_ADMIN') return 'primary';
        return 'default';
    };

    const getRoleLabel = () => {
        const data = profileMode ? profileData : user;
        if (data?.globalRole === 'PLATFORM_ADMIN') return t('settings.users.roles.platformAdmin');
        const companyRole = data?.companies?.[0]?.role;
        if (companyRole === 'SUPER_USER') return t('settings.users.roles.superUser');
        if (companyRole === 'COMPANY_ADMIN') return t('settings.users.roles.companyAdmin');
        return t('settings.users.roles.viewer');
    };

    // Profile mode - self editing layout
    if (profileMode) {
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
                    {t('settings.users.editProfile')}
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
                            
                            {/* Profile Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                                    {getInitials()}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6">
                                        {firstName || lastName ? `${firstName} ${lastName}`.trim() : email}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <EmailIcon fontSize="small" color="action" />
                                        <Typography variant="body2" color="text.secondary">
                                            {email}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={getRoleLabel()}
                                        color={getRoleBadgeColor() as any}
                                        size="small"
                                        sx={{ mt: 1 }}
                                    />
                                </Box>
                            </Box>

                            <Divider />

                            {/* Basic Info Section */}
                            <Typography variant="subtitle2" color="text.secondary">
                                {t('settings.users.basicInfo')}
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        label={t('common.firstName')}
                                        fullWidth
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        size="small"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TextField
                                        label={t('common.lastName')}
                                        fullWidth
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        size="small"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        label={t('common.phone')}
                                        fullWidth
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        size="small"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <PhoneIcon fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            <Divider />

                            {/* Account Stats Section */}
                            <Typography variant="subtitle2" color="text.secondary">
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
                                                {profileData?.loginCount || 0}
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
                                                {profileData?.lastLogin
                                                    ? formatDistanceToNow(new Date(profileData.lastLogin), { addSuffix: true })
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
                                                {profileData?.createdAt
                                                    ? new Date(profileData.createdAt).toLocaleDateString()
                                                    : '-'
                                                }
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>

                            <Divider />

                            {/* Password Section */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" color="text.secondary">
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
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <TextField
                                        label={t('settings.users.currentPassword')}
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        fullWidth
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        size="small"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position={isRtl ? 'start' : 'end'}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    >
                                                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    <TextField
                                        label={t('settings.users.newPassword')}
                                        type={showNewPassword ? 'text' : 'password'}
                                        fullWidth
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        size="small"
                                        helperText={t('settings.users.passwordRequirements')}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position={isRtl ? 'start' : 'end'}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                    >
                                                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
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

                            {/* Company & Store Assignments (Read Only) */}
                            {((profileData?.companies?.length ?? 0) > 0 || (profileData?.stores?.length ?? 0) > 0) && (
                                <>
                                    <Divider />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        {t('settings.users.assignments')}
                                    </Typography>
                                    
                                    {profileData?.companies?.map((uc) => (
                                        <Box key={uc.company.id} sx={{ pl: 1 }}>
                                            <Typography variant="body2">
                                                <strong>{uc.company.name}</strong> ({uc.company.code})
                                                <Chip label={uc.role} size="small" sx={{ ml: 1 }} />
                                            </Typography>
                                        </Box>
                                    ))}
                                    
                                    {profileData?.stores?.map((us) => (
                                        <Box key={us.store.id} sx={{ pl: 2 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                └ {us.store.name} ({us.store.code}) - {us.role}
                                            </Typography>
                                        </Box>
                                    ))}
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose} disabled={submitting} color="inherit">
                        {t('common.close')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={submitting || profileLoading}
                        startIcon={submitting ? <CircularProgress size={16} /> : null}
                    >
                        {t('common.save')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    // For edit mode (admin editing user), show simplified layout without stepper
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

                        <Divider />

                        {/* Admin Password Reset */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom color="primary">
                                {t('settings.users.resetPassword')}
                            </Typography>
                            <TextField
                                label={t('settings.users.newPassword')}
                                type={showNewPassword ? 'text' : 'password'}
                                fullWidth
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                size="small"
                                helperText={newPassword ? t('settings.users.passwordRequirements') : t('settings.users.leaveEmptyNoChange')}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position={isRtl ? 'start' : 'end'}>
                                            <IconButton
                                                size="small"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                            >
                                                {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
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
