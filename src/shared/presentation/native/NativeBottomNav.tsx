import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavTabs } from '../hooks/useNavTabs';
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { glass, nativeSizing } from '../themes/nativeTokens';

export function NativeBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const { t } = useTranslation();
    const navTabs = useNavTabs();
    const { getLabel } = useSpaceTypeLabels();

    const activeValue = navTabs.find(tab => tab.value === location.pathname)?.value ?? false;

    const handleChange = async (_event: React.SyntheticEvent, newValue: string) => {
        if (newValue === activeValue) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch {
            // Haptics not available
        }
        navigate(newValue);
    };

    return (
        <Paper
            elevation={0}
            sx={{
                position: 'fixed',
                bottom: 0,
                insetInlineStart: 0,
                insetInlineEnd: 0,
                zIndex: theme.zIndex.appBar,
                ...glass,
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            <BottomNavigation
                showLabels
                value={activeValue}
                onChange={handleChange}
                sx={{ height: nativeSizing.bottomNavHeight, bgcolor: 'transparent' }}
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
}
