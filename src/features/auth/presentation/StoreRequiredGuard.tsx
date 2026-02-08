/**
 * Store Required Guard Component
 *
 * Wraps protected content and ensures the user has selected a store.
 * Handles the full connection flow:
 *   - Returning users: auto-connect to their assigned store (single store)
 *   - First-time / multi-store users: choose a store from their company
 *   - If company AIMS is configured → connect immediately
 *   - If AIMS not configured:
 *       • Admin users → prompted to enter AIMS credentials
 *       • Non-admin users → shown a message to contact their admin (with admin names)
 *   - Platform admins always bypass AIMS checks
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Paper, Typography, Stack, Button, CircularProgress } from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import BusinessIcon from '@mui/icons-material/Business';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { useTranslation } from 'react-i18next';
import { authService } from '@shared/infrastructure/services/authService';
import type { StoreConnectionInfo } from '@shared/infrastructure/services/authService';
import { AimsCredentialsDialog } from './AimsCredentialsDialog';
import { ContactAdminMessage } from './ContactAdminMessage';
import type { ReactNode } from 'react';

interface StoreRequiredGuardProps {
    children: ReactNode;
}

type ConnectionState =
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'aims-ok' }
    | { status: 'needs-creds'; info: StoreConnectionInfo }
    | { status: 'contact-admin'; info: StoreConnectionInfo }
    | { status: 'error'; message: string };

export function StoreRequiredGuard({ children }: StoreRequiredGuardProps) {
    const { t } = useTranslation();
    const user = useAuthStore(state => state.user);
    const activeStoreId = useSettingsStore(state => state.activeStoreId);
    const setActiveStore = useAuthStore(state => state.setActiveStore);

    const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'idle' });
    const [credDialogOpen, setCredDialogOpen] = useState(false);
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const autoSelectTriggered = useRef(false);

    // Check AIMS connection status for a store
    const checkStoreConnection = useCallback(async (storeId: string) => {
        setConnectionState({ status: 'checking' });
        setSelectedStoreId(storeId);
        try {
            const info = await authService.getStoreConnectionInfo(storeId);

            // Platform admins skip AIMS checks entirely
            const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN';
            if (isPlatformAdmin || info.aimsConfigured) {
                setConnectionState({ status: 'aims-ok' });
                setActiveStore(storeId);
                return;
            }

            // AIMS not configured – branch by admin vs non-admin
            if (info.isAdmin) {
                setConnectionState({ status: 'needs-creds', info });
                setCredDialogOpen(true);
            } else {
                setConnectionState({ status: 'contact-admin', info });
            }
        } catch {
            setConnectionState({ status: 'error', message: t('auth.checkingConnectionFailed', 'Failed to check store connection.') });
        }
    }, [user, setActiveStore, t]);

    // If user has no stores or is not logged in, just render children
    if (!user) return <>{children}</>;

    // If a store is already selected, render children
    if (activeStoreId) return <>{children}</>;

    // Single-store users: auto-select their store
    if (user.stores.length === 1 && !autoSelectTriggered.current && connectionState.status === 'idle') {
        autoSelectTriggered.current = true;
        // Use microtask to avoid calling during render
        queueMicrotask(() => checkStoreConnection(user.stores[0].id));
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                <Typography color="text.secondary">{t('auth.checkingConnection', 'Checking connection...')}</Typography>
            </Box>
        );
    }

    // Loading / checking state
    if (connectionState.status === 'checking') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                <Typography color="text.secondary">{t('auth.checkingConnection', 'Checking connection...')}</Typography>
            </Box>
        );
    }

    // Non-admin user: show contact admin message
    if (connectionState.status === 'contact-admin') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', p: 3 }}>
                <Paper elevation={3} sx={{ p: 4, maxWidth: 500, width: '100%', borderRadius: 3 }}>
                    <Stack gap={3} alignItems="center">
                        <ContactAdminMessage
                            storeName={connectionState.info.storeName}
                            companyName={connectionState.info.companyName}
                            adminContacts={connectionState.info.adminContacts}
                        />
                        {user.stores.length > 1 && (
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setConnectionState({ status: 'idle' });
                                    setSelectedStoreId(null);
                                }}
                            >
                                {t('auth.chooseOtherStore', 'Choose a different store')}
                            </Button>
                        )}
                        <Button
                            variant="text"
                            size="small"
                            onClick={() => {
                                if (selectedStoreId) setActiveStore(selectedStoreId);
                            }}
                        >
                            {t('auth.continueWithoutAims', 'Continue without AIMS')}
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        );
    }

    // Admin user: show credentials dialog
    if (connectionState.status === 'needs-creds' && credDialogOpen) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', p: 3 }}>
                <AimsCredentialsDialog
                    open={credDialogOpen}
                    companyId={connectionState.info.companyId}
                    companyName={connectionState.info.companyName}
                    onSuccess={() => {
                        setCredDialogOpen(false);
                        if (selectedStoreId) setActiveStore(selectedStoreId);
                    }}
                    onCancel={() => {
                        setCredDialogOpen(false);
                        setConnectionState({ status: 'idle' });
                        setSelectedStoreId(null);
                    }}
                />
                <Button
                    variant="text"
                    size="small"
                    sx={{ position: 'absolute', bottom: 24 }}
                    onClick={() => {
                        setCredDialogOpen(false);
                        if (selectedStoreId) setActiveStore(selectedStoreId);
                    }}
                >
                    {t('auth.continueWithoutAims', 'Continue without AIMS')}
                </Button>
            </Box>
        );
    }

    // Error state
    if (connectionState.status === 'error') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', p: 3 }}>
                <Paper elevation={3} sx={{ p: 4, maxWidth: 500, width: '100%', borderRadius: 3 }}>
                    <Stack gap={2} alignItems="center">
                        <Typography color="error">{connectionState.message}</Typography>
                        <Button variant="outlined" onClick={() => setConnectionState({ status: 'idle' })}>
                            {t('common.retry', 'Retry')}
                        </Button>
                    </Stack>
                </Paper>
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
                <Stack gap={3} alignItems="center">
                    <StoreIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                    <Typography variant="h5" fontWeight={700} textAlign="center">
                        {t('auth.selectStore', 'Select a Store')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        {t('auth.selectStoreDescription', 'Please choose a store to connect to. This determines which AIMS data you can access.')}
                    </Typography>

                    <Stack gap={2} sx={{ width: '100%' }}>
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
                                        onClick={() => checkStoreConnection(store.id)}
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
