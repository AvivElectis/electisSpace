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
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCompassAuthStore } from '@features/auth/application/useCompassAuthStore';

export function ProfilePage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const user = useCompassAuthStore((s) => s.user);
    const logout = useCompassAuthStore((s) => s.logout);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'he' : 'en';
        i18n.changeLanguage(newLang);
        document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
    };

    return (
        <Box sx={{ p: 2, pb: 10 }}>
            {/* Profile header */}
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                        src={user?.avatarUrl ?? undefined}
                        sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}
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
                    </Box>
                </CardContent>
            </Card>

            {/* Menu */}
            <Card variant="outlined">
                <List disablePadding>
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
                    <ListItemButton>
                        <ListItemIcon><SettingsIcon /></ListItemIcon>
                        <ListItemText primary={t('profile.settings')} />
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
        </Box>
    );
}
