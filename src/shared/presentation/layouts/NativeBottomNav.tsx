/**
 * NativeBottomNav
 *
 * Fixed bottom navigation bar for native (Android/iOS) app layout.
 * Uses MUI BottomNavigation with haptic feedback on tab change.
 */

import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavTabs } from '../hooks/useNavTabs';
import { useTheme } from '@mui/material/styles';

export const NATIVE_BOTTOM_NAV_HEIGHT = 64;

export function NativeBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const navTabs = useNavTabs();
    const theme = useTheme();

    // Find active tab value by matching pathname
    const activeValue = navTabs.find(tab => tab.value === location.pathname)?.value ?? false;

    const handleChange = async (_event: React.SyntheticEvent, newValue: string) => {
        if (newValue === activeValue) return;

        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch {
            // Haptics not available on web — silently ignore
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
                borderTop: `1px solid ${theme.palette.divider}`,
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            <BottomNavigation
                showLabels
                value={activeValue}
                onChange={handleChange}
                sx={{
                    height: NATIVE_BOTTOM_NAV_HEIGHT,
                    justifyContent: 'center',
                }}
            >
                {navTabs.map(tab => (
                    <BottomNavigationAction
                        key={tab.value}
                        label={tab.label}
                        value={tab.value}
                        icon={tab.icon}
                        sx={{
                            minWidth: 64,
                            maxWidth: 96,
                            '& .MuiBottomNavigationAction-label': {
                                fontSize: '0.8rem',
                                '&.Mui-selected': { fontSize: '0.85rem' },
                            },
                            '& .MuiSvgIcon-root': {
                                fontSize: '1.6rem',
                            },
                        }}
                    />
                ))}
            </BottomNavigation>
        </Paper>
    );
}
