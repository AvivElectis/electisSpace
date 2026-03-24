/**
 * NativeCompaniesListPage — Android-native list of companies.
 */
import { useEffect, useState, useMemo, useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';

import { companyService, type Company } from '@shared/infrastructure/services/companyService';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeGroupedList } from '@shared/presentation/native/NativeGroupedList';
import { NativeCard } from '@shared/presentation/native/NativeCard';
import { NativeSearchBar } from '@shared/presentation/native/NativeSearchBar';
import { NativeEmptyState } from '@shared/presentation/native/NativeEmptyState';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';
import { nativeColors } from '@shared/presentation/themes/nativeTokens';

export function NativeCompaniesListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isPlatformAdmin } = useAuthContext();
    const isAppReady = useAuthStore((s) => s.isAppReady);

    useSetNativeTitle(t('settings.companies.title'));

    const [companies, setCompanies] = useState<Company[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearch = useDeferredValue(searchQuery);

    const fetchCompanies = async () => {
        try {
            const response = await companyService.getAll({ limit: 200 });
            setCompanies(response.data);
        } catch {
            // swallow
        }
    };

    useEffect(() => {
        if (isAppReady) {
            fetchCompanies();
        }
    }, [isAppReady]);

    const filtered = useMemo(() => {
        if (!deferredSearch) return companies;
        const q = deferredSearch.toLowerCase();
        return companies.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                (c.location || '').toLowerCase().includes(q)
        );
    }, [companies, deferredSearch]);

    const active = useMemo(() => filtered.filter((c) => c.isActive), [filtered]);
    const inactive = useMemo(() => filtered.filter((c) => !c.isActive), [filtered]);

    const sections = useMemo(() => [
        {
            title: t('common.status.active'),
            count: active.length,
            color: 'success' as const,
            items: active,
        },
        {
            title: t('common.status.inactive'),
            count: inactive.length,
            color: 'warning' as const,
            items: inactive,
        },
    ], [t, active, inactive]);

    const canCreate = isPlatformAdmin;

    return (
        <NativePage onRefresh={fetchCompanies} noPadding>
            <Box sx={{ px: 1, py: 0.5 }}>
                <NativeSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t('settings.companies.searchPlaceholder')}
                />
            </Box>

            <NativeGroupedList<Company>
                sections={sections}
                renderItem={(company) => (
                    <NativeCard>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                                    <Chip
                                        label={company.code}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontFamily: 'monospace', fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                                    />
                                </Box>
                                <Typography variant="body2" fontWeight={600} noWrap>
                                    {company.name}
                                </Typography>
                                {company.location && (
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {company.location}
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                {company.aimsConfigured ? (
                                    <CloudIcon sx={{ fontSize: 18, color: nativeColors.status.success }} />
                                ) : (
                                    <CloudOffIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                )}
                                <Typography variant="caption" color="text.secondary">
                                    {(company.storeCount ?? company._count?.stores ?? 0)} {t('settings.companies.stores')}
                                </Typography>
                            </Box>
                        </Box>
                    </NativeCard>
                )}
                onItemTap={(company) => navigate(`/settings/companies/${company.id}`)}
                keyExtractor={(company) => company.id}
                emptyState={
                    <NativeEmptyState
                        icon={<BusinessIcon />}
                        title={searchQuery ? t('settings.companies.noSearchResults') : t('settings.companies.noCompanies')}
                    />
                }
                fab={canCreate ? { onClick: () => navigate('/settings/companies/new') } : undefined}
            />
        </NativePage>
    );
}
