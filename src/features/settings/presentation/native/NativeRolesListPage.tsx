/**
 * NativeRolesListPage — List of custom roles with FAB to create.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';

import { useRolesStore } from '@features/roles/infrastructure/rolesStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';

import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeGroupedList } from '@shared/presentation/native/NativeGroupedList';
import { NativeCard } from '@shared/presentation/native/NativeCard';
import { NativeEmptyState } from '@shared/presentation/native/NativeEmptyState';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';

import type { Role } from '@features/roles/domain/types';

export function NativeRolesListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isPlatformAdmin, isCompanyAdmin, activeCompanyId } = useAuthContext();
    const { roles, loading, fetchRoles } = useRolesStore();

    useSetNativeTitle(t('settings.roles.title'));

    useEffect(() => {
        fetchRoles(activeCompanyId || undefined);
    }, [fetchRoles, activeCompanyId]);

    const canManage = isPlatformAdmin || isCompanyAdmin;

    const systemRoles = roles.filter((r) => r.scope === 'SYSTEM');
    const companyRoles = roles.filter((r) => r.scope === 'COMPANY');

    const sections = [
        {
            title: t('settings.roles.system'),
            count: systemRoles.length,
            color: 'primary' as const,
            items: systemRoles,
        },
        {
            title: t('settings.roles.company'),
            count: companyRoles.length,
            color: 'info' as const,
            items: companyRoles,
        },
    ];

    return (
        <NativePage onRefresh={() => fetchRoles(activeCompanyId || undefined)} noPadding>
            <NativeGroupedList<Role>
                sections={sections}
                renderItem={(role) => (
                    <NativeCard>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={600}>
                                    {t(`roles.${role.name.toLowerCase()}`, role.name)}
                                </Typography>
                                {role.description && (
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {t(`roles.${role.name.toLowerCase()}_desc`, role.description)}
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                                {role.isDefault && (
                                    <Chip
                                        label={t('settings.roles.default')}
                                        size="small"
                                        color="info"
                                        sx={{ height: 20, fontSize: '0.65rem' }}
                                    />
                                )}
                                <Chip
                                    label={Object.keys(role.permissions || {}).length.toString()}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                />
                            </Box>
                        </Box>
                    </NativeCard>
                )}
                onItemTap={(role) => navigate(`/settings/roles/${role.id}`)}
                keyExtractor={(role) => role.id}
                emptyState={
                    <NativeEmptyState
                        icon={<SecurityIcon />}
                        title={loading ? t('common.loading', 'Loading...') : t('settings.roles.noRoles')}
                    />
                }
                fab={canManage ? { onClick: () => navigate('/settings/roles/new') } : undefined}
            />
        </NativePage>
    );
}
