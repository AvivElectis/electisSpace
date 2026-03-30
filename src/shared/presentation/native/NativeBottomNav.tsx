import { memo } from 'react';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavTabs } from '../hooks/useNavTabs';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { glass, nativeSizing } from '../themes/nativeTokens';

const bottomNavInnerSx = { height: nativeSizing.bottomNavHeight, bgcolor: 'transparent' } as const;

const paperSx = {
    position: 'fixed',
    bottom: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    zIndex: (theme: any) => theme.zIndex.appBar,
    ...glass,
    paddingBottom: 'env(safe-area-inset-bottom)',
} as const;

export const NativeBottomNav = memo(function NativeBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const navTabs = useNavTabs();
    const { getLabel } = useSpaceTypeLabels();

    // Match sub-routes too (e.g., /people/new still highlights People tab)
    const activeValue = navTabs.find(tab => {
        if (tab.value === '/') return location.pathname === '/';
        return location.pathname === tab.value || location.pathname.startsWith(tab.value + '/');
    })?.value ?? false;

    const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        if (newValue === activeValue) {
            // Re-tap on active tab: if on a sub-route, go to tab root
            // If already on tab root, go to dashboard
            if (location.pathname !== newValue) {
                navigate(newValue);
            } else if (newValue !== '/') {
                navigate('/');
            }
            return;
        }
        navigate(newValue);
    };

    return (
        <Paper
            elevation={0}
            sx={paperSx}
        >
            <BottomNavigation
                showLabels
                value={activeValue}
                onChange={handleChange}
                sx={bottomNavInnerSx}
            >
                {navTabs.map(tab => (
                    <BottomNavigationAction
                        key={tab.value}
                        label={tab.dynamicLabel ? getLabel('plural') : t(tab.labelKey)}
                        value={tab.value}
                        icon={tab.icon}
                    />
                ))}
            </BottomNavigation>
        </Paper>
    );
});
