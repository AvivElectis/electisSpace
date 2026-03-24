/**
 * NativeSettingsPage (native/NativeSettingsPage.tsx)
 *
 * NEW settings page for native Android builds — matching Stitch design.
 * This file lives in the `native/` subdirectory and is wired into NativeRoutes.tsx.
 *
 * The OLD NativeSettingsPage at presentation/NativeSettingsPage.tsx remains untouched
 * as it serves the web /settings route via AppRoutes.tsx.
 *
 * Layout:
 *   - Title set via useSetNativeTitle (shows back arrow)
 *   - Horizontal-scrollable quick actions: Profile, Help, About, Logout
 *   - Horizontal chip bar: App Settings, SoluM Settings, Logo, Security, [Users, Companies, Roles (admin)], Logs
 *   - Inline tab panel rendered below chips (no separate routes)
 *   - Each panel lazy-loaded with Suspense
 */

import { useState, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Typography,
    ButtonBase,
    CircularProgress,
} from '@mui/material';

import PersonIcon from '@mui/icons-material/Person';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LogoutIcon from '@mui/icons-material/Logout';

import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeChipBar } from '@shared/presentation/native/NativeChipBar';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';
import { nativeColors, nativeSpacing, nativeSizing } from '@shared/presentation/themes/nativeTokens';

import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useSettingsController } from '../../application/useSettingsController';
import { useAutoLock } from '../../application/useAutoLock';

// ---------------------------------------------------------------------------
// Lazy-loaded tab panels — same imports as the old NativeSettingsPage
// ---------------------------------------------------------------------------

const AppSettingsTab = lazy(() =>
    import('../AppSettingsTab').then((m) => ({ default: m.AppSettingsTab }))
);
const SolumSettingsTab = lazy(() =>
    import('../SolumSettingsTab').then((m) => ({ default: m.SolumSettingsTab }))
);
const LogoSettingsTab = lazy(() =>
    import('../LogoSettingsTab').then((m) => ({ default: m.LogoSettingsTab }))
);
const SecuritySettingsTab = lazy(() =>
    import('../SecuritySettingsTab').then((m) => ({ default: m.SecuritySettingsTab }))
);
const UsersSettingsTab = lazy(() =>
    import('../UsersSettingsTab').then((m) => ({ default: m.UsersSettingsTab }))
);
const CompaniesTab = lazy(() =>
    import('../CompaniesTab').then((m) => ({ default: m.CompaniesTab }))
);
const RolesTab = lazy(() =>
    import('../RolesTab').then((m) => ({ default: m.RolesTab }))
);
const LogsViewerTab = lazy(() =>
    import('../LogsViewerTab').then((m) => ({ default: m.LogsViewerTab }))
);

const EnhancedUserDialog = lazy(() =>
    import('../EnhancedUserDialog').then((m) => ({ default: m.EnhancedUserDialog }))
);

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------

function TabLoadingFallback() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress size={32} />
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Quick action button
// ---------------------------------------------------------------------------

interface QuickActionProps {
    icon: React.ReactElement;
    label: string;
    onClick: () => void;
    danger?: boolean;
}

function QuickAction({ icon, label, onClick, danger = false }: QuickActionProps) {
    return (
        <ButtonBase
            onClick={onClick}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 1.5,
                borderRadius: 2,
                bgcolor: danger
                    ? `${nativeColors.status.error}12`
                    : nativeColors.surface.lowest,
                minWidth: 80,
                flexShrink: 0,
                border: `1px solid ${danger ? `${nativeColors.status.error}30` : nativeColors.surface.high}`,
                minHeight: nativeSizing.touchMinHeight,
            }}
        >
            <Box
                sx={{
                    color: danger ? nativeColors.status.error : nativeColors.primary.main,
                    display: 'flex',
                    fontSize: 24,
                    '& .MuiSvgIcon-root': { fontSize: 'inherit' },
                }}
            >
                {icon}
            </Box>
            <Typography
                variant="caption"
                fontWeight={600}
                sx={{
                    color: danger ? nativeColors.status.error : 'text.primary',
                    lineHeight: 1.2,
                    textAlign: 'center',
                }}
            >
                {label}
            </Typography>
        </ButtonBase>
    );
}

// ---------------------------------------------------------------------------
// Tab IDs
// ---------------------------------------------------------------------------

type SettingsTab =
    | 'app'
    | 'solum'
    | 'logo'
    | 'security'
    | 'users'
    | 'companies'
    | 'roles'
    | 'logs';

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function NativeSettingsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const settingsController = useSettingsController();
    const { user, logout } = useAuthStore();

    useSetNativeTitle(t('settings.title'));

    // Enable auto-lock
    useAutoLock();

    const [currentTab, setCurrentTab] = useState<SettingsTab>('app');
    const [profileOpen, setProfileOpen] = useState(false);

    // Role checks — same logic as old NativeSettingsPage / SettingsDialog
    const isPlatformAdmin = user?.globalRole === 'PLATFORM_ADMIN';
    const isCompanyAdmin = user?.companies?.some((c: any) => c.roleId === 'role-admin');
    const isAdmin =
        isPlatformAdmin ||
        isCompanyAdmin ||
        user?.stores?.some((s: any) => s.roleId === 'role-admin');

    // Build chip list based on roles
    const chips = [
        { label: t('settings.appSettings'), value: 'app' },
        { label: t('settings.solumSettings'), value: 'solum' },
        { label: t('settings.logoSettings'), value: 'logo' },
        { label: t('settings.securitySettings'), value: 'security' },
        ...(isAdmin ? [{ label: t('settings.users.title'), value: 'users' }] : []),
        ...(isPlatformAdmin || isCompanyAdmin
            ? [
                  { label: t('settings.companies.title'), value: 'companies' },
                  { label: t('settings.roles.title'), value: 'roles' },
              ]
            : []),
        { label: t('settings.logViewer'), value: 'logs' },
    ];

    const handleLogout = useCallback(async () => {
        await logout();
        navigate('/login', { replace: true });
    }, [logout, navigate]);

    const handleTabChange = useCallback((value: string) => {
        setCurrentTab(value as SettingsTab);
    }, []);

    // Render the active panel
    const renderPanel = () => {
        switch (currentTab) {
            case 'app':
                return (
                    <AppSettingsTab
                        settings={settingsController.settings}
                        onUpdate={(updates) => settingsController.updateSettings(updates)}
                    />
                );
            case 'solum':
                return (
                    <SolumSettingsTab
                        settings={settingsController.settings}
                        onUpdate={(updates) => settingsController.updateSettings(updates)}
                    />
                );
            case 'logo':
                return (
                    <LogoSettingsTab
                        settings={settingsController.settings}
                        onUpdate={(updates) => settingsController.updateSettings(updates)}
                    />
                );
            case 'security':
                return (
                    <SecuritySettingsTab
                        isPasswordProtected={settingsController.isPasswordProtected}
                        isLocked={settingsController.isLocked}
                        settings={settingsController.settings}
                        onSetPassword={(password) => settingsController.setPassword(password)}
                        onLock={() => settingsController.lock()}
                        onUnlock={(password) => settingsController.unlock(password)}
                        onUpdate={(updates) => settingsController.updateSettings(updates)}
                    />
                );
            case 'users':
                return <UsersSettingsTab />;
            case 'companies':
                return <CompaniesTab />;
            case 'roles':
                return <RolesTab />;
            case 'logs':
                return <LogsViewerTab />;
            default:
                return null;
        }
    };

    return (
        <NativePage noPadding>
            {/* Quick actions — horizontal scroll */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    overflowX: 'auto',
                    flexWrap: 'nowrap',
                    gap: 1.5,
                    px: `${nativeSpacing.pagePadding}px`,
                    py: `${nativeSpacing.sectionGap}px`,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}
            >
                <QuickAction
                    icon={<PersonIcon />}
                    label={t('nativeSettings.profile')}
                    onClick={() => setProfileOpen(true)}
                />
                <QuickAction
                    icon={<HelpOutlineIcon />}
                    label={t('nativeSettings.help')}
                    onClick={() =>
                        Browser.open({ url: 'https://github.com/AvivElectis/electisSpace/wiki' }).catch(() =>
                            window.open('https://github.com/AvivElectis/electisSpace/wiki', '_blank')
                        )
                    }
                />
                <QuickAction
                    icon={<InfoOutlinedIcon />}
                    label={t('nativeSettings.about')}
                    onClick={() => navigate('/settings/about')}
                />
                <QuickAction
                    icon={<LogoutIcon />}
                    label={t('nativeSettings.logout')}
                    onClick={handleLogout}
                    danger
                />
            </Box>

            {/* Tab chip bar */}
            <NativeChipBar
                chips={chips}
                activeValue={currentTab}
                onChange={handleTabChange}
            />

            {/* Inline tab panel */}
            <Box
                sx={{
                    px: `${nativeSpacing.pagePadding}px`,
                    pt: 1,
                    pb: 2,
                }}
            >
                <Suspense fallback={<TabLoadingFallback />}>{renderPanel()}</Suspense>
            </Box>

            {/* Profile dialog */}
            {profileOpen && (
                <Suspense fallback={null}>
                    <EnhancedUserDialog
                        open={profileOpen}
                        onClose={() => setProfileOpen(false)}
                        onSave={() => setProfileOpen(false)}
                        user={user as any}
                        profileMode
                    />
                </Suspense>
            )}
        </NativePage>
    );
}
