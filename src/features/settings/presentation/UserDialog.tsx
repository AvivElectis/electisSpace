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
    Box
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { User, CreateUserDto, UpdateUserDto } from '@shared/infrastructure/services/userService';

interface UserDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
    user?: User | null; // If provided, we are in Edit mode
}

export function UserDialog({ open, onClose, onSave, user }: UserDialogProps) {
    const { t } = useTranslation();
    const isEdit = !!user;
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'VIEWER'>('VIEWER');
    const [password, setPassword] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Initialize form when user prop changes
    useEffect(() => {
        if (user) {
            setEmail(user.email);
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
            setRole(user.role);
            setIsActive(user.isActive);
            setPassword(''); // Don't show password
        } else {
            // Reset for Create mode
            setEmail('');
            setFirstName('');
            setLastName('');
            setRole('VIEWER');
            setPassword('');
            setIsActive(true);
        }
        setError(null);
    }, [user, open]);

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

        try {
            setSubmitting(true);
            const data = isEdit
                ? { firstName, lastName, role, isActive } as UpdateUserDto
                : { email, firstName, lastName, role, password } as CreateUserDto;

            await onSave(data);
            onClose();
        } catch (err: any) {
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

                        <FormControl fullWidth>
                            <InputLabel>{t('auth.role')}</InputLabel>
                            <Select
                                value={role}
                                label={t('auth.role')}
                                onChange={(e) => setRole(e.target.value as any)}
                            >
                                <MenuItem value="ADMIN">{t('roles.admin')}</MenuItem>
                                <MenuItem value="MANAGER">{t('roles.manager')}</MenuItem>
                                <MenuItem value="VIEWER">{t('roles.viewer')}</MenuItem>
                            </Select>
                        </FormControl>

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
