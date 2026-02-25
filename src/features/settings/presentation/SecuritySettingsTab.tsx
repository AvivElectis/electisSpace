import {
    Box,
    Stack,
    Typography,
    Button,
    TextField,
    Alert,
    Divider,
    FormControlLabel,
    Switch,
    Tooltip,
    Paper,
    Chip,
    CircularProgress,
    IconButton,
    useTheme,
    alpha,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LaptopIcon from '@mui/icons-material/Laptop';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import DevicesIcon from '@mui/icons-material/Devices';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LanguageIcon from '@mui/icons-material/Language';
import EventIcon from '@mui/icons-material/Event';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SettingsData } from '../domain/types';
import { ImportExportSection } from '@features/import-export/presentation/ImportExportSection';
import { useConfirmDialog } from '@shared/presentation/hooks/useConfirmDialog';
import { authService, type DeviceInfo } from '@shared/infrastructure/services/authService';
import { deviceTokenStorage } from '@shared/infrastructure/services/deviceTokenStorage';
import { logger } from '@shared/infrastructure/services/logger';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

interface SecuritySettingsTabProps {
    isPasswordProtected: boolean;
    isLocked: boolean;
    settings: SettingsData;
    onSetPassword: (password: string) => void | Promise<void>;
    onLock: () => void;
    onUnlock: (password: string) => boolean;
    onUpdate: (updates: Partial<SettingsData>) => void;
}

// Helpers for device display
const PlatformIcon = ({ platform }: { platform: string | null | undefined }) => {
    if (platform === 'ios' || platform === 'android') return <SmartphoneIcon />;
    if (platform === 'web') return <LaptopIcon />;
    return <DevicesIcon />;
};

const platformLabel = (platform: string | null | undefined): string => {
    if (platform === 'ios') return 'iOS';
    if (platform === 'android') return 'Android';
    if (platform === 'web') return 'Web';
    return 'Unknown';
};

const formatDate = (dateStr: string | null | undefined, locale: string): string => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString(locale, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return dateStr; }
};

const getDeviceOS = (deviceName: string | null | undefined): string | null => {
    if (!deviceName) return null;
    if (/iPhone|iPad/.test(deviceName)) return 'iOS';
    if (/Android/.test(deviceName)) return 'Android';
    if (/Mac/.test(deviceName)) return 'macOS';
    if (/Windows/.test(deviceName)) return 'Windows';
    if (/Linux/.test(deviceName)) return 'Linux';
    return null;
};

const formatRelativeDate = (dateStr: string, t: (key: string, defaultValue: string) => string): string => {
    try {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('settings.devices.justNow', 'Just now');
        if (diffMins < 60) return t('settings.devices.minutesAgo', `${diffMins}m ago`).replace('{{n}}', String(diffMins));
        if (diffHours < 24) return t('settings.devices.hoursAgo', `${diffHours}h ago`).replace('{{n}}', String(diffHours));
        if (diffDays < 7) return t('settings.devices.daysAgo', `${diffDays}d ago`).replace('{{n}}', String(diffDays));
        return formatDate(dateStr, 'en');
    } catch { return dateStr; }
};

/**
 * Security & Devices Settings Tab
 * Password protection, app locking, and trusted device management
 */
export function SecuritySettingsTab({
    isPasswordProtected,
    isLocked,
    settings,
    onSetPassword,
    onLock,
    onUnlock,
    onUpdate,
}: SecuritySettingsTabProps) {
    const { t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [unlockPassword, setUnlockPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Device management state
    const [devices, setDevices] = useState<(DeviceInfo & { current?: boolean })[]>([]);
    const [devicesLoading, setDevicesLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);

    const fetchDevices = useCallback(async () => {
        try {
            setDevicesLoading(true);
            const [{ devices: list }, devId] = await Promise.all([
                authService.listDevices(),
                deviceTokenStorage.getDeviceId(),
            ]);
            setDevices(list.map((d) => ({ ...d, current: d.deviceId === devId })));
        } catch (err) {
            logger.error('SecuritySettingsTab', 'Failed to fetch devices', { error: String(err) });
        } finally {
            setDevicesLoading(false);
        }
    }, []);

    useEffect(() => { fetchDevices(); }, [fetchDevices]);

    const handleRevoke = async (tokenId: string) => {
        const isCurrentDevice = devices.find((d) => d.id === tokenId)?.current;
        const confirmed = await confirm({
            title: t('common.dialog.confirm'),
            message: isCurrentDevice
                ? t('settings.devices.revokeCurrentConfirm')
                : t('settings.devices.revokeConfirm'),
            confirmLabel: t('settings.devices.revoke'),
            cancelLabel: t('common.dialog.cancel'),
            severity: isCurrentDevice ? 'error' : 'warning',
        });
        if (!confirmed) return;

        setRevoking(tokenId);
        try {
            await authService.revokeDevice(tokenId);
            if (isCurrentDevice) {
                await deviceTokenStorage.removeDeviceToken();
                await useAuthStore.getState().logout();
                return;
            }
            setDevices((prev) => prev.filter((d) => d.id !== tokenId));
        } catch (err) {
            logger.error('SecuritySettingsTab', 'Failed to revoke device', { error: String(err) });
        } finally {
            setRevoking(null);
        }
    };

    const handleRevokeAll = async () => {
        const confirmed = await confirm({
            title: t('common.dialog.confirm'),
            message: t('settings.devices.revokeAllConfirm'),
            confirmLabel: t('settings.devices.revokeAll'),
            cancelLabel: t('common.dialog.cancel'),
            severity: 'error',
        });
        if (!confirmed) return;

        setRevoking('all');
        try {
            await authService.revokeAllDevices();
            await deviceTokenStorage.removeDeviceToken();
            await useAuthStore.getState().logout();
            return;
        } catch (err) {
            logger.error('SecuritySettingsTab', 'Failed to revoke all devices', { error: String(err) });
        } finally {
            setRevoking(null);
        }
    };

    const handleSetPassword = async () => {
        setError(null);

        if (!newPassword) {
            setError(t('settings.passwordCannotBeEmpty'));
            return;
        }

        if (newPassword.length < 4) {
            setError(t('settings.passwordTooShort'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('settings.passwordsDoNotMatch'));
            return;
        }

        try {
            await onSetPassword(newPassword);
            setNewPassword('');
            setConfirmPassword('');
            await confirm({
                title: t('common.success'),
                message: t('settings.setPasswordSuccess'),
                confirmLabel: t('common.close'),
                severity: 'success',
                showCancel: false
            });
        } catch (err) {
            setError(`Failed to set password: ${err}`);
        }
    };

    const handleUnlock = async () => {
        setError(null);

        if (!unlockPassword) {
            setError(t('settings.enterPassword'));
            return;
        }

        const success = onUnlock(unlockPassword);
        if (success) {
            setUnlockPassword('');
            await confirm({
                title: t('common.success'),
                message: t('settings.unlockSuccess'),
                confirmLabel: t('common.close'),
                severity: 'success',
                showCancel: false
            });
        } else {
            setError(t('settings.incorrectPassword'));
            setUnlockPassword('');
        }
    };

    const handleLock = async () => {
        if (!isPasswordProtected) {
            setError(t('settings.setPasswordFirst'));
            return;
        }

        const confirmed = await confirm({
            title: t('common.dialog.confirm'),
            message: t('settings.lockConfirm'),
            confirmLabel: t('settings.lock'),
            cancelLabel: t('common.dialog.cancel'),
            severity: 'warning'
        });

        if (confirmed) {
            onLock();
        }
    };

    const getPasswordStrength = (password: string): { level: number; text: string; color: string } => {
        if (!password) return { level: 0, text: '', color: 'grey' };
        if (password.length < 4) return { level: 1, text: t('settings.passwordStrength.tooShort'), color: 'error' };
        if (password.length < 6) return { level: 2, text: t('settings.passwordStrength.weak'), color: 'warning' };
        if (password.length < 8) return { level: 3, text: t('settings.passwordStrength.medium'), color: 'info' };
        return { level: 4, text: t('settings.passwordStrength.strong'), color: 'success' };
    };

    const strength = getPasswordStrength(newPassword);

    return (
        <Box sx={{ px: 2, py: 1, maxWidth: 600, mx: 'auto' }}>
            <Stack gap={2}>
                {/* Status */}
                <Alert severity={isLocked ? 'warning' : 'info'} sx={{ py: 0, px: 2, alignItems: 'center' }}>
                    {isLocked
                        ? `\u{1F512} ${t('settings.lockedMessage')}`
                        : isPasswordProtected
                            ? `\u{1F513} ${t('settings.unlockedMessage')}`
                            : t('settings.noPasswordMessage')
                    }
                </Alert>

                {/* Error */}
                {error && (
                    <Alert severity="error" onClose={() => setError(null)} sx={{ py: 0, px: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Set/Change Password */}
                {!isLocked && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                            {isPasswordProtected ? t('settings.changePassword', 'Change Password') : t('settings.setPassword')}
                        </Typography>
                        <Stack gap={1.5}>
                            <TextField
                                fullWidth
                                size="small"
                                type="password"
                                label={t('settings.newPassword')}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                helperText={strength.text}
                                slotProps={{
                                    formHelperText: {
                                        sx: { color: `${strength.color}.main`, m: 0 }
                                    }
                                }}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                type="password"
                                label={t('settings.confirmPassword')}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <Box sx={{ display: 'flex', gap: 0, justifyContent: 'flex-start' }}>
                                <Button
                                    variant="contained"
                                    onClick={handleSetPassword}
                                    disabled={!newPassword || !confirmPassword}
                                    sx={{ width: 'fit-content' }}
                                >
                                    {isPasswordProtected ? t('settings.changePassword', 'Change Password') : t('settings.setPassword')}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<LockIcon />}
                                    onClick={handleLock}
                                    disabled={!isPasswordProtected}
                                    sx={{ width: 'fit-content' }}
                                >
                                    {t('settings.lockAppSettings')}
                                </Button>
                            </Box>
                        </Stack>
                    </Box>
                )}

                <Divider />

                {/* Unlock Section (only shown when locked) */}
                {isLocked && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('settings.unlockSettings')}
                        </Typography>

                        <Stack gap={1.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="password"
                                    label={t('settings.enterPasswordToUnlock')}
                                    value={unlockPassword}
                                    onChange={(e) => setUnlockPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                />
                                <Tooltip title={t('settings.adminPasswordHint')} arrow>
                                    <InfoOutlined color="action" sx={{ cursor: 'help' }} />
                                </Tooltip>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<LockOpenIcon />}
                                onClick={handleUnlock}
                                disabled={!unlockPassword}
                                sx={{ width: 'fit-content' }}
                            >
                                {t('settings.unlockAppSettings')}
                            </Button>
                        </Stack>

                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {t('settings.unlockToAccess')}
                        </Typography>
                    </Box>
                )}

                <Divider />

                {/* Auto-Lock Settings */}
                {!isLocked && isPasswordProtected && (
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('settings.autoLockSettings')}
                        </Typography>
                        <Stack gap={1.5}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.autoLockEnabled || false}
                                        onChange={(e) => onUpdate({ autoLockEnabled: e.target.checked })}
                                    />
                                }
                                label={t('settings.autoLockEnabled')}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {t('settings.autoLockDescription')}
                            </Typography>
                        </Stack>
                    </Box>
                )}

                <Divider />

                {/* Trusted Devices */}
                <DevicesSection
                    devices={devices}
                    devicesLoading={devicesLoading}
                    revoking={revoking}
                    onRevoke={handleRevoke}
                    onRevokeAll={handleRevokeAll}
                />

                <Divider />

                {/* Clear Storage */}
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 600 }}>
                        {t('settings.clearAppData')}
                    </Typography>
                    <Alert severity="warning" sx={{ mb: 1.5, py: 0, px: 2 }}>
                        {t('settings.clearStorageWarning')}
                    </Alert>
                    <Button
                        variant="text"
                        color="error"
                        onClick={async () => {
                            const confirmed = await confirm({
                                title: t('common.dialog.warning'),
                                message: t('settings.clearStorageConfirm'),
                                confirmLabel: t('common.dialog.delete'),
                                cancelLabel: t('common.dialog.cancel'),
                                severity: 'error'
                            });

                            if (confirmed) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                    >
                        {t('settings.clearAllStorage')}
                    </Button>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        {t('settings.clearStorageHelper')}
                    </Typography>
                </Box>

                <Divider />

                {/* Import/Export Settings */}
                <ImportExportSection />
                <ConfirmDialog />
            </Stack>
        </Box>
    );
}

/* ─── Device Info Row ─── */
function DeviceDetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
            <Box sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center', fontSize: '1rem', flexShrink: 0 }}>
                {icon}
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap component="div">
                <Box component="span" sx={{ fontWeight: 500 }}>{label}:</Box>{' '}
                <Box component="span" dir="ltr" sx={{ unicodeBidi: 'embed' }}>{value}</Box>
            </Typography>
        </Stack>
    );
}

/* ─── Device Card ─── */
function DeviceCard({
    device,
    revoking,
    onRevoke,
}: {
    device: DeviceInfo & { current?: boolean };
    revoking: string | null;
    onRevoke: (id: string) => void;
}) {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isCurrent = device.current;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 2,
                borderColor: isCurrent ? 'primary.main' : 'divider',
                bgcolor: isCurrent ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
                transition: 'border-color 0.2s, background-color 0.2s',
            }}
        >
            {/* Header: icon + name + chips + revoke button */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 1 }}>
                <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isCurrent
                                ? alpha(theme.palette.primary.main, 0.1)
                                : alpha(theme.palette.text.primary, 0.06),
                            color: isCurrent ? 'primary.main' : 'text.secondary',
                            flexShrink: 0,
                        }}
                    >
                        <PlatformIcon platform={device.platform} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                            <Typography variant="body2" fontWeight={600} noWrap>
                                {device.deviceName || t('settings.devices.unknown')}
                            </Typography>
                            {getDeviceOS(device.deviceName) && (
                                <Chip
                                    label={getDeviceOS(device.deviceName)}
                                    size="small"
                                    variant="filled"
                                    sx={{ height: 20, fontSize: '0.7rem', borderRadius: 1, bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}
                                />
                            )}
                            <Chip
                                label={platformLabel(device.platform)}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem', borderRadius: 1 }}
                            />
                            {isCurrent && (
                                <Chip
                                    label={t('settings.devices.current')}
                                    size="small"
                                    color="primary"
                                    sx={{ height: 20, fontSize: '0.7rem', borderRadius: 1 }}
                                />
                            )}
                        </Stack>
                        <Typography variant="caption" color="text.disabled">
                            {formatRelativeDate(device.lastUsedAt, t)}
                        </Typography>
                    </Box>
                </Stack>
                <Tooltip title={t('settings.devices.revoke')}>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => onRevoke(device.id)}
                        disabled={revoking === device.id}
                        sx={{ flexShrink: 0 }}
                    >
                        {revoking === device.id
                            ? <CircularProgress size={18} color="error" />
                            : <DeleteOutlineIcon fontSize="small" />
                        }
                    </IconButton>
                </Tooltip>
            </Stack>

            {/* Detail rows */}
            <Stack
                gap={0.5}
                sx={{
                    ps: { xs: 0, sm: 7 },
                    pt: 0.5,
                    borderTop: 1,
                    borderColor: 'divider',
                }}
            >
                {device.lastIp && (
                    <DeviceDetailRow
                        icon={<LanguageIcon sx={{ fontSize: '1rem' }} />}
                        label={t('settings.devices.ipAddress', 'IP')}
                        value={device.lastIp}
                    />
                )}
                <DeviceDetailRow
                    icon={<EventIcon sx={{ fontSize: '1rem' }} />}
                    label={t('settings.devices.firstSeen', 'Connected')}
                    value={formatDate(device.createdAt, i18n.language)}
                />
                <DeviceDetailRow
                    icon={<AccessTimeIcon sx={{ fontSize: '1rem' }} />}
                    label={t('settings.devices.lastUsed')}
                    value={formatDate(device.lastUsedAt, i18n.language)}
                />
                <DeviceDetailRow
                    icon={<TimerOffIcon sx={{ fontSize: '1rem' }} />}
                    label={t('settings.devices.expires', 'Expires')}
                    value={formatDate(device.expiresAt, i18n.language)}
                />
            </Stack>
        </Paper>
    );
}

/* ─── Devices Section ─── */
function DevicesSection({
    devices,
    devicesLoading,
    revoking,
    onRevoke,
    onRevokeAll,
}: {
    devices: (DeviceInfo & { current?: boolean })[];
    devicesLoading: boolean;
    revoking: string | null;
    onRevoke: (id: string) => void;
    onRevokeAll: () => void;
}) {
    const { t } = useTranslation();

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {t('settings.devices.title')}
                </Typography>
                {devices.length > 1 && (
                    <Button
                        variant="text"
                        color="error"
                        size="small"
                        onClick={onRevokeAll}
                        disabled={revoking === 'all'}
                    >
                        {revoking === 'all' ? t('settings.devices.revoking') : t('settings.devices.revokeAll')}
                    </Button>
                )}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {t('settings.devices.description')}
            </Typography>

            {devicesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : devices.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                    {t('settings.devices.none')}
                </Typography>
            ) : (
                <Stack gap={1.5}>
                    {devices.map((device) => (
                        <DeviceCard
                            key={device.id}
                            device={device}
                            revoking={revoking}
                            onRevoke={onRevoke}
                        />
                    ))}
                </Stack>
            )}
        </Box>
    );
}
