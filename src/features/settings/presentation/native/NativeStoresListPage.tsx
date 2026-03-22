/**
 * NativeStoresListPage — Stores for a company.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Chip } from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';

import { companyService, type CompanyStore } from '@shared/infrastructure/services/companyService';

import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeGroupedList } from '@shared/presentation/native/NativeGroupedList';
import { NativeCard } from '@shared/presentation/native/NativeCard';
import { NativeEmptyState } from '@shared/presentation/native/NativeEmptyState';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';

export function NativeStoresListPage() {
    const { id: companyId } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();

    useSetNativeTitle(t('settings.companies.stores'));

    const [stores, setStores] = useState<CompanyStore[]>([]);

    const fetchStores = async () => {
        if (!companyId) return;
        try {
            const resp = await companyService.getStores(companyId, { limit: 200 });
            setStores(resp.stores);
        } catch {
            // swallow
        }
    };

    useEffect(() => {
        fetchStores();
    }, [companyId]);

    const active = stores.filter((s) => s.isActive);
    const inactive = stores.filter((s) => !s.isActive);

    const sections = [
        { title: t('common.status.active'), count: active.length, color: 'success' as const, items: active },
        { title: t('common.status.inactive'), count: inactive.length, color: 'warning' as const, items: inactive },
    ];

    return (
        <NativePage onRefresh={fetchStores} noPadding>
            <NativeGroupedList<CompanyStore>
                sections={sections}
                renderItem={(store) => (
                    <NativeCard>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="body2" fontWeight={600}>{store.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {store.code} · {store.timezone}
                                </Typography>
                            </Box>
                            <Chip
                                label={store.syncEnabled ? t('settings.stores.syncEnabled', 'Sync On') : t('settings.stores.syncDisabled', 'Sync Off')}
                                size="small"
                                color={store.syncEnabled ? 'info' : 'default'}
                            />
                        </Box>
                    </NativeCard>
                )}
                onItemTap={(store) => navigate(`/settings/companies/${companyId}/stores/${store.id}`)}
                keyExtractor={(store) => store.id}
                emptyState={
                    <NativeEmptyState
                        icon={<StoreIcon />}
                        title={t('settings.stores.noStores', 'No stores yet')}
                    />
                }
                fab={{ onClick: () => navigate(`/settings/companies/${companyId}/stores/new`) }}
            />
        </NativePage>
    );
}
