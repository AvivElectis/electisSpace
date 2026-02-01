import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    FormControlLabel,
    Switch,
    Box,
    Checkbox,
    FormGroup,
    FormLabel,
    Typography,
    Divider
} from '@mui/material';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { User, CreateUserDto, UpdateUserDto, UpdateUserStoreDto } from '@shared/infrastructure/services/userService';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

// Available features
const AVAILABLE_FEATURES = [
    { id: 'dashboard', icon: '📊' },
    { id: 'spaces', icon: '🏷️' },
    { id: 'conference', icon: '🎤' },
    { id: 'people', icon: '👥' },
] as const;

// Store roles
const STORE_ROLES = ['STORE_ADMIN', 'STORE_MANAGER', 'STORE_EMPLOYEE', 'STORE_VIEWER'] as const;

interface UserDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
    onUpdateStoreAccess?: (userId: string, storeId: string, data: UpdateUserStoreDto) => Promise<void>;
    user?: User | null; // If provided, we are in Edit mode
}

export function UserDialog({ open, onClose, onSave, onUpdateStoreAccess, user }: UserDialogProps) {
    const { t } = useTranslation();
    const { user: currentUser } = useAuthStore();
    const isEdit = !!user;
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState<typeof STORE_ROLES[number]>('STORE_VIEWER');
    const [features, setFeatures] = useState<string[]>(['dashboard']);
    const [password, setPassword] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [storeId, setStoreId] = useState('');
    const [roleOrFeaturesChanged, setRoleOrFeaturesChanged] = useState(false);

    // Track original values for edit mode
    const [originalRole, setOriginalRole] = useState<typeof STORE_ROLES[number]>('STORE_VIEWER');
    const [originalFeatures, setOriginalFeatures] = useState<string[]>(['dashboard']);

    // Track if dialog was just opened to prevent re-initialization
    const lastUserId = useRef<string | null>(null);
    const wasOpen = useRef(false);

    // Get current user's admin stores (memoized to prevent unnecessary re-renders)
    const adminStores = useMemo(() => 
        currentUser?.stores?.filter(s => 
            s.role === 'STORE_ADMIN' || currentUser.globalRole === 'PLATFORM_ADMIN'
        ) || [], 
        [currentUser?.stores, currentUser?.globalRole]
    );

    // Initialize form only when dialog opens with a new/different user
    useEffect(() => {
        // Only initialize when dialog opens or user changes
        const dialogJustOpened = open && !wasOpen.current;
        const userChanged = user?.id !== lastUserId.current;
        
        if (open && (dialogJustOpened || userChanged)) {
            lastUserId.current = user?.id || null;
            
            if (user) {
                setEmail(user.email);
                setFirstName(user.firstName || '');
                setLastName(user.lastName || '');
                // Get first store's role and features for editing
                const firstStore = user.stores?.[0];
                const storeRole = firstStore?.role || 'STORE_VIEWER';
                const storeFeatures = firstStore?.features || ['dashboard'];
                setRole(storeRole);
                setFeatures(storeFeatures);
                setOriginalRole(storeRole);
                setOriginalFeatures(storeFeatures);
                setIsActive(user.isActive);
                setStoreId(firstStore?.id || '');
                setPassword(''); // Don't show password
                setRoleOrFeaturesChanged(false);
            } else {
                // Reset for Create mode
                setEmail('');
                setFirstName('');
                setLastName('');
                setRole('STORE_VIEWER');
                setFeatures(['dashboard']);
                setOriginalRole('STORE_VIEWER');
                setOriginalFeatures(['dashboard']);
                setPassword('');
                setIsActive(true);
                setStoreId(adminStores[0]?.id || '');
                setRoleOrFeaturesChanged(false);
            }
            setError(null);
        }
        
        wasOpen.current = open;
    }, [open, user, adminStores]);

    const handleFeatureToggle = (featureId: string) => {
        setFeatures(prev => {
            let newFeatures;
            if (prev.includes(featureId)) {
                // Always keep dashboard
                if (featureId === 'dashboard') return prev;
                newFeatures = prev.filter(f => f !== featureId);
            } else {
                newFeatures = [...prev, featureId];
            }
            // Check if features changed from original (use spread to avoid mutating)
            if (isEdit) {
                const changed = role !== originalRole || 
                    JSON.stringify([...newFeatures].sort()) !== JSON.stringify([...originalFeatures].sort());
                setRoleOrFeaturesChanged(changed);
            }
            return newFeatures;
        });
    };

    const handleRoleChange = (newRole: typeof STORE_ROLES[number]) => {
        setRole(newRole);
        if (isEdit) {
            const changed = newRole !== originalRole || 
                JSON.stringify([...features].sort()) !== JSON.stringify([...originalFeatures].sort());
            setRoleOrFeaturesChanged(changed);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Basic Validation
        if (!isEdit && !password) {
            setError(t('validation.required', { field: t('auth.password') }));
            return;
        }
        if (!email) {
            setError(t('validation.required', { field: t('auth.email') }));
            return;
        }
        if (!isEdit && !storeId) {
            setError(t('validation.required', { field: t('settings.users.store') }));
            return;
        }

        try {
            setSubmitting(true);
            console.log('handleSubmit called, isEdit:', isEdit);
            
            if (isEdit) {
                // Update basic user info
                const data = { firstName, lastName, isActive } as UpdateUserDto;
                console.log('Edit mode - updating user with data:', data);
                await onSave(data);
                
                // Update store access if role or features changed
                console.log('roleOrFeaturesChanged:', roleOrFeaturesChanged, 'storeId:', storeId, 'user:', user?.id);
                if (roleOrFeaturesChanged && onUpdateStoreAccess && user && storeId) {
                    console.log('Updating store access with:', { role, features });
                    await onUpdateStoreAccess(user.id, storeId, { role, features });
                }
            } else {
                // Create new user
                const data = { 
                    email, 
                    firstName, 
                    lastName, 
                    password,
                    storeId,
                    role,
                    features
                } as CreateUserDto;
                console.log('Create mode - creating user with data:', data);
                await onSave(data);
            }
            
            console.log('Save successful, closing dialog');
            onClose();
        } catch (err: any) {
            console.error('Save failed with error:', err);
            setError(err.message || 'Failed to save user');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>
                    {isEdit ? t('settings.users.editUser') : t('settings.users.addUser')}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {error && <Alert severity="error">{error}</Alert>}

                        <TextField
                            label={t('auth.email')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isEdit} // Email cannot be changed
                            required
                            fullWidth
                            type="email"
                        />

                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
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
                            <>
                                <FormControl fullWidth required>
                                    <InputLabel>{t('settings.users.store')}</InputLabel>
                                    <Select
                                        value={storeId}
                                        label={t('settings.users.store')}
                                        onChange={(e) => setStoreId(e.target.value)}
                                    >
                                        {adminStores.map(store => (
                                            <MenuItem key={store.id} value={store.id}>
                                                {store.name} ({store.storeNumber})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    label={t('auth.password')}
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    fullWidth
                                    helperText={t('auth.passwordMinLength')}
                                />
                            </>
                        )}

                        <Divider />

                        <FormControl fullWidth>
                            <InputLabel>{t('auth.role')}</InputLabel>
                            <Select
                                value={role}
                                label={t('auth.role')}
                                onChange={(e) => handleRoleChange(e.target.value as any)}
                            >
                                {STORE_ROLES.map(r => (
                                    <MenuItem key={r} value={r}>
                                        {t(`roles.${r.toLowerCase()}`)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl component="fieldset" sx={{ mt: 1 }}>
                            <FormLabel component="legend">
                                <Typography variant="subtitle2">
                                    {t('settings.users.features')}
                                </Typography>
                            </FormLabel>
                            <FormGroup row>
                                {AVAILABLE_FEATURES.map(feature => (
                                    <FormControlLabel
                                        key={feature.id}
                                        control={
                                            <Checkbox
                                                checked={features.includes(feature.id)}
                                                onChange={() => handleFeatureToggle(feature.id)}
                                                disabled={feature.id === 'dashboard'} // Dashboard always on
                                            />
                                        }
                                        label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <span>{feature.icon}</span>
                                                <span>{t(`navigation.${feature.id}`)}</span>
                                            </Box>
                                        }
                                    />
                                ))}
                            </FormGroup>
                        </FormControl>

                        {isEdit && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={t('common.status.active')}
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={submitting}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" variant="contained" disabled={submitting}>
                        {submitting ? t('common.saving') : t('common.save')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
