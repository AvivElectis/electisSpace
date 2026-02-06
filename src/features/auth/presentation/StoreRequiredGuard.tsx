/**
 * Store Required Guard Component
 * 
 * Wraps protected content and ensures the user has selected a store.
 * App admins and company admins who have access to multiple stores
 * must choose one before they can use the application.
 */

import { Box, Paper, Typography, Stack, Button } from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import BusinessIcon from '@mui/icons-material/Business';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

interface StoreRequiredGuardProps {
    children: ReactNode;
}

export function StoreRequiredGuard({ children }: StoreRequiredGuardProps) {
    const { t } = useTranslation();
    const user = useAuthStore(state => state.user);
    const activeStoreId = useSettingsStore(state => state.activeStoreId);
    const setActiveStore = useAuthStore(state => state.setActiveStore);

    // If user has no stores at all, they can't do anything
    if (!user) return <>{children}</>;

    // If a store is already selected, render children
    if (activeStoreId) return <>{children}</>;

    // Single-store users: auto-select their store
    if (user.stores.length === 1) {
        // Trigger auto-select (will cause re-render)
        setActiveStore(user.stores[0].id);
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Typography color="text.secondary">{t('common.loading', 'Loading...')}</Typography>
            </Box>
        );
    }

    // Multi-store users or admins: show store selection
    const groupedByCompany = user.stores.reduce((acc, store) => {
        const companyName = store.companyName || 'Unknown';
        if (!acc[companyName]) acc[companyName] = [];
        acc[companyName].push(store);
        return acc;
    }, {} as Record<string, typeof user.stores>);

    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            p: 3,
        }}>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 500, width: '100%', borderRadius: 3 }}>
                <Stack spacing={3} alignItems="center">
                    <StoreIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                    <Typography variant="h5" fontWeight={700} textAlign="center">
                        {t('auth.selectStore', 'Select a Store')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        {t('auth.selectStoreDescription', 'Please choose a store to connect to. This determines which AIMS data you can access.')}
                    </Typography>

                    <Stack spacing={2} sx={{ width: '100%' }}>
                        {Object.entries(groupedByCompany).map(([companyName, stores]) => (
                            <Box key={companyName}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <BusinessIcon fontSize="small" color="action" />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        {companyName}
                                    </Typography>
                                </Stack>
                                {stores.map((store) => (
                                    <Button
                                        key={store.id}
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<StoreIcon />}
                                        onClick={() => setActiveStore(store.id)}
                                        sx={{
                                            mb: 1,
                                            justifyContent: 'flex-start',
                                            textTransform: 'none',
                                            borderRadius: 2,
                                            py: 1.5,
                                        }}
                                    >
                                        <Box sx={{ textAlign: 'left' }}>
                                            <Typography variant="body2" fontWeight={600}>
                                                {store.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {t('auth.storeCode', 'Code')}: {store.code} &middot; {store.role}
                                            </Typography>
                                        </Box>
                                    </Button>
                                ))}
                            </Box>
                        ))}
                    </Stack>

                    {user.stores.length === 0 && (
                        <Typography variant="body2" color="error">
                            {t('auth.noStoresAssigned', 'No stores assigned to your account. Contact your administrator.')}
                        </Typography>
                    )}
                </Stack>
            </Paper>
        </Box>
    );
}
