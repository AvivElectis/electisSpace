/**
 * UserBasicInfoSection - Email, name, phone, password, active toggle
 * Used in both create (stepper) and edit modes
 */
import {
    Box,
    TextField,
    Typography,
    FormControlLabel,
    Switch,
    InputAdornment,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import { useTranslation } from 'react-i18next';

interface Props {
    email: string;
    emailError: string | null;
    checkingEmail: boolean;
    onEmailChange: (value: string) => void;
    firstName: string;
    onFirstNameChange: (value: string) => void;
    lastName: string;
    onLastNameChange: (value: string) => void;
    phone: string;
    onPhoneChange: (value: string) => void;
    password: string;
    onPasswordChange: (value: string) => void;
    isActive: boolean;
    onIsActiveChange: (value: boolean) => void;
    isEdit: boolean;
    isEditing: boolean;
    profileMode: boolean;
}

export function UserBasicInfoSection({
    email, emailError, checkingEmail, onEmailChange,
    firstName, onFirstNameChange,
    lastName, onLastNameChange,
    phone, onPhoneChange,
    password, onPasswordChange,
    isActive, onIsActiveChange,
    isEdit, isEditing, profileMode,
}: Props) {
    const { t } = useTranslation();

    return (
        <Box>
            <Typography variant="subtitle2" color="primary" gutterBottom>
                {t('settings.users.basicInfo')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label={t('auth.email')}
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    disabled={isEdit}
                    required={!isEdit}
                    fullWidth
                    size="small"
                    error={!!emailError}
                    helperText={emailError || (checkingEmail ? t('common.checking') : undefined)}
                />

                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2
                }}>
                    <TextField
                        label={t('common.firstName')}
                        value={firstName}
                        onChange={(e) => onFirstNameChange(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isEdit && !isEditing}
                    />
                    <TextField
                        label={t('common.lastName')}
                        value={lastName}
                        onChange={(e) => onLastNameChange(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isEdit && !isEditing}
                    />
                </Box>

                <TextField
                    label={t('common.phone')}
                    value={phone}
                    onChange={(e) => onPhoneChange(e.target.value)}
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

                {!isEdit && (
                    <TextField
                        label={t('auth.password')}
                        type="password"
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        helperText={t('auth.passwordMinLength')}
                    />
                )}

                {isEdit && !profileMode && isEditing && (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={isActive}
                                onChange={(e) => onIsActiveChange(e.target.checked)}
                            />
                        }
                        label={t('common.status.active')}
                    />
                )}
            </Box>
        </Box>
    );
}
