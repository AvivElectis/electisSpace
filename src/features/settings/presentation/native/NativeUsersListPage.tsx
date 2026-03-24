/**
 * NativeUsersListPage — Android-native list of users grouped by role.
 */
import { useEffect, useState, useMemo, useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';

import { userService, type User } from '@shared/infrastructure/services/userService';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeGroupedList } from '@shared/presentation/native/NativeGroupedList';
import { NativeCard } from '@shared/presentation/native/NativeCard';
import { NativeSearchBar } from '@shared/presentation/native/NativeSearchBar';
import { NativeEmptyState } from '@shared/presentation/native/NativeEmptyState';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';
import { nativeColors } from '@shared/presentation/themes/nativeTokens';

function getUserRoleKey(user: User): string {
    if (user.globalRole === 'PLATFORM_ADMIN') return 'platform_admin';
    if (user.globalRole === 'APP_VIEWER') return 'viewer';
    const firstCompany = (user as any).companies?.[0];
    if (firstCompany?.roleId === 'role-admin') return 'admin';
    const roleId = firstCompany?.roleId || (user as any).stores?.[0]?.roleId;
    if (roleId) return roleId.startsWith('role-') ? roleId.substring(5) : roleId;
    return 'viewer';
}

function getRoleColor(roleKey: string): 'error' | 'warning' | 'info' | 'success' | 'primary' {
    const map: Record<string, 'error' | 'warning' | 'info' | 'success' | 'primary'> = {
        platform_admin: 'error',
        admin: 'error',
        manager: 'warning',
        employee: 'info',
        viewer: 'primary',
    };
    return map[roleKey] ?? 'primary';
}

export function NativeUsersListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isPlatformAdmin, isCompanyAdmin } = useAuthContext();
    const isAppReady = useAuthStore((s) => s.isAppReady);

    useSetNativeTitle(t('settings.users.title'));

    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearch = useDeferredValue(searchQuery);

    const fetchUsers = async () => {
        try {
            const response = await userService.getAll({ limit: 200 });
            setUsers(response.data);
        } catch {
            // swallow — handled
        }
    };

    useEffect(() => {
        if (isAppReady) {
            fetchUsers();
        }
    }, [isAppReady]);

    const filteredUsers = useMemo(() => {
        if (!deferredSearch) return users;
        const q = deferredSearch.toLowerCase();
        return users.filter(
            (u) =>
                u.email.toLowerCase().includes(q) ||
                `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q)
        );
    }, [users, deferredSearch]);

    // Group by admin vs regular
    const admins = useMemo(
        () => filteredUsers.filter((u) => {
            const key = getUserRoleKey(u);
            return key === 'platform_admin' || key === 'admin';
        }),
        [filteredUsers]
    );
    const regularUsers = useMemo(
        () => filteredUsers.filter((u) => {
            const key = getUserRoleKey(u);
            return key !== 'platform_admin' && key !== 'admin';
        }),
        [filteredUsers]
    );

    const sections = useMemo(() => [
        {
            title: t('settings.roles.appRoles'),
            count: admins.length,
            color: 'error' as const,
            items: admins,
        },
        {
            title: t('settings.roles.companyStoreRoles'),
            count: regularUsers.length,
            color: 'primary' as const,
            items: regularUsers,
        },
    ], [t, admins, regularUsers]);

    const canManage = isPlatformAdmin || isCompanyAdmin;

    return (
        <NativePage onRefresh={fetchUsers} noPadding>
            <Box sx={{ px: 1, py: 0.5 }}>
                <NativeSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t('settings.users.searchPlaceholder')}
                />
            </Box>

            <NativeGroupedList<User>
                sections={sections}
                renderItem={(user) => {
                    const roleKey = getUserRoleKey(user);
                    const roleColor = getRoleColor(roleKey);
                    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
                    const subtitle = displayName !== user.email ? user.email : undefined;
                    return (
                        <NativeCard>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={600} noWrap>
                                        {displayName}
                                    </Typography>
                                    {subtitle && (
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {subtitle}
                                        </Typography>
                                    )}
                                </Box>
                                <Chip
                                    label={t(`roles.${roleKey}`, roleKey)}
                                    size="small"
                                    color={roleColor}
                                    sx={{ fontSize: '0.7rem', height: 22 }}
                                />
                            </Box>
                            {!user.isActive && (
                                <Typography variant="caption" sx={{ color: nativeColors.status.error, mt: 0.5, display: 'block' }}>
                                    {t('common.status.inactive')}
                                </Typography>
                            )}
                        </NativeCard>
                    );
                }}
                onItemTap={(user) => navigate(`/settings/users/${user.id}`)}
                keyExtractor={(user) => user.id}
                emptyState={
                    <NativeEmptyState
                        icon={<PeopleIcon />}
                        title={searchQuery ? t('settings.users.noSearchResults') : t('common.noData')}
                    />
                }
                fab={canManage ? { onClick: () => navigate('/settings/users/new') } : undefined}
            />
        </NativePage>
    );
}
