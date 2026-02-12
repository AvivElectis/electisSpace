/**
 * UserProfileHeader - Avatar, name, role badge, and edit toggle button
 */
import { Box, Typography, Avatar, Chip, IconButton } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import type { UserData } from './types';

interface Props {
    firstName: string;
    lastName: string;
    email: string;
    userData: UserData | null;
    isEdit: boolean;
    isEditing: boolean;
    onEditToggle: () => void;
    getInitials: () => string;
    getRoleLabel: () => string;
    getRoleBadgeColor: () => string;
}

export function UserProfileHeader({
    firstName, lastName, email, userData,
    isEdit, isEditing, onEditToggle,
    getInitials, getRoleLabel, getRoleBadgeColor,
}: Props) {
    const { t } = useTranslation();

    return (
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
            {isEdit && !isEditing && (
                <IconButton
                    color="primary"
                    onClick={onEditToggle}
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
}
