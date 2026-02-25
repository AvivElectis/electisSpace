/**
 * Device Management Tab - Lists trusted devices and allows revoking access.
 */

import { useState, useEffect, useCallback } from 'react';
import { authService, type DeviceInfo } from '@shared/infrastructure/services/authService';
import { deviceTokenStorage } from '@shared/infrastructure/services/deviceTokenStorage';
import { useTranslation } from 'react-i18next';
import { logger } from '@shared/infrastructure/services/logger';

export const DevicesTab = () => {
    const { t } = useTranslation();
    const [devices, setDevices] = useState<DeviceInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);

    const fetchDevices = useCallback(async () => {
        try {
            setLoading(true);
            const [{ devices: list }, devId] = await Promise.all([
                authService.listDevices(),
                deviceTokenStorage.getDeviceId(),
            ]);
            setDevices(list.map((d) => ({ ...d, current: d.deviceId === devId })));
        } catch (err) {
            logger.error('DevicesTab', 'Failed to fetch devices', { error: String(err) });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDevices(); }, [fetchDevices]);

    const handleRevoke = async (tokenId: string) => {
        setRevoking(tokenId);
        try {
            await authService.revokeDevice(tokenId);
            setDevices((prev) => prev.filter((d) => d.id !== tokenId));
        } catch (err) {
            logger.error('DevicesTab', 'Failed to revoke device', { error: String(err) });
        } finally {
            setRevoking(null);
        }
    };

    const handleRevokeAll = async () => {
        setRevoking('all');
        try {
            await authService.revokeAllDevices();
            await deviceTokenStorage.removeDeviceToken();
            setDevices([]);
        } catch (err) {
            logger.error('DevicesTab', 'Failed to revoke all devices', { error: String(err) });
        } finally {
            setRevoking(null);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch { return dateStr; }
    };

    const platformIcon = (platform: string | null) => {
        if (platform === 'ios' || platform === 'android') return '📱';
        if (platform === 'web') return '💻';
        return '🖥️';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {t('settings.devices.title', 'Trusted Devices')}
                </h3>
                {devices.length > 0 && (
                    <button
                        onClick={handleRevokeAll}
                        disabled={revoking === 'all'}
                        className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 disabled:opacity-50"
                    >
                        {revoking === 'all' ? t('settings.devices.revoking', 'Revoking...') : t('settings.devices.revokeAll', 'Revoke All')}
                    </button>
                )}
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.devices.description', 'These devices can sign in without email verification. Revoke access for devices you no longer use.')}
            </p>

            {devices.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    {t('settings.devices.none', 'No trusted devices')}
                </div>
            ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                    {devices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{platformIcon(device.platform)}</span>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        {device.deviceName || t('settings.devices.unknown', 'Unknown Device')}
                                        {device.current && (
                                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                                                {t('settings.devices.current', 'This device')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('settings.devices.lastUsed', 'Last used')}: {formatDate(device.lastUsedAt)}
                                        {device.lastIp && ` · ${device.lastIp}`}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRevoke(device.id)}
                                disabled={revoking === device.id}
                                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 disabled:opacity-50 px-3 py-1 border border-red-300 dark:border-red-700 rounded-md"
                            >
                                {revoking === device.id ? t('settings.devices.revoking', 'Revoking...') : t('settings.devices.revoke', 'Revoke')}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DevicesTab;
