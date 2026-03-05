import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
    { label: 'nav.home', icon: <HomeIcon />, path: '/' },
    { label: 'nav.find', icon: <SearchIcon />, path: '/find' },
    { label: 'nav.bookings', icon: <EventIcon />, path: '/bookings' },
    { label: 'nav.profile', icon: <PersonIcon />, path: '/profile' },
];

export function BottomNav() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const currentTab = tabs.findIndex(tab => {
        if (tab.path === '/') return location.pathname === '/';
        return location.pathname.startsWith(tab.path);
    });

    return (
        <Paper
            sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }}
            elevation={3}
        >
            <BottomNavigation
                value={currentTab === -1 ? 0 : currentTab}
                onChange={(_, index) => navigate(tabs[index].path)}
                showLabels
            >
                {tabs.map((tab) => (
                    <BottomNavigationAction
                        key={tab.path}
                        label={t(tab.label)}
                        icon={tab.icon}
                    />
                ))}
            </BottomNavigation>
        </Paper>
    );
}
