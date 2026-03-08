import { useState } from 'react';
import {
    Box,
    Typography,
    Avatar,
    Card,
    CardContent,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import LogoutIcon from '@mui/icons-material/Logout';
import LanguageIcon from '@mui/icons-material/Language';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCompassAuthStore } from '@features/auth/application/useCompassAuthStore';
import { AccessibilityDialog } from '@shared/components/AccessibilityDialog';

export function ProfilePage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const user = useCompassAuthStore((s) => s.user);
    const logout = useCompassAuthStore((s) => s.logout);
    const [a11yOpen, setA11yOpen] = useState(false);

    const branchAddress = user?.branchAddress ?? null;

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'he' : 'en';
        i18n.changeLanguage(newLang); // Direction auto-set by i18n config
    };

    return (
        <Box sx={{ p: 2, pb: 10 }}>
            {/* Profile header */}
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                        src={user?.avatarUrl ?? undefined}
                        sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}
                        aria-label={user?.displayName ?? undefined}
                    >
                        {user?.displayName?.charAt(0) ?? '?'}
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            {user?.displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {user?.email}
                        </Typography>
                        {user?.departmentName && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <BusinessIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                    {t('profile.department')}: {user.departmentName}
                                </Typography>
                            </Box>
                        )}
                        {branchAddress && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                    {branchAddress}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Menu */}
            <Card variant="outlined">
                <List disablePadding aria-label={t('profile.settings')}>
                    <ListItemButton onClick={() => navigate('/friends')}>
                        <ListItemIcon><PeopleIcon /></ListItemIcon>
                        <ListItemText primary={t('profile.friends')} />
                    </ListItemButton>
                    <Divider />
                    <ListItemButton onClick={toggleLanguage}>
                        <ListItemIcon><LanguageIcon /></ListItemIcon>
                        <ListItemText
                            primary={t('profile.language')}
                            secondary={i18n.language === 'en' ? 'English' : 'עברית'}
                        />
                    </ListItemButton>
                    <Divider />
                    <ListItemButton onClick={() => setA11yOpen(true)}>
                        <ListItemIcon><AccessibilityNewIcon /></ListItemIcon>
                        <ListItemText primary={t('profile.accessibility')} />
                    </ListItemButton>
                    <Divider />
                    <ListItemButton onClick={logout}>
                        <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
                        <ListItemText
                            primary={t('profile.logout')}
                            primaryTypographyProps={{ color: 'error' }}
                        />
                    </ListItemButton>
                </List>
            </Card>

            <AccessibilityDialog open={a11yOpen} onClose={() => setA11yOpen(false)} />
        </Box>
    );
}
