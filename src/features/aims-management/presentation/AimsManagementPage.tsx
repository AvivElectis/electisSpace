/**
 * AIMS Management Page
 *
 * Main page with tab navigation for Gateways, Labels, and Product Updates.
 * Follows the same layout pattern as ConferencePage and other feature pages.
 */

import { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Tabs, Tab, Button, Alert, Stack, Card, CardContent,
    Fab, useMediaQuery, useTheme,
} from '@mui/material';
import RouterIcon from '@mui/icons-material/Router';
import LabelIcon from '@mui/icons-material/Label';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { GatewayList } from './GatewayList';
import { GatewayDetail } from './GatewayDetail';
import { GatewayRegistration } from './GatewayRegistration';
import { LabelsOverview } from './LabelsOverview';
import { ProductHistory } from './ProductHistory';
import { useAimsManagementStore } from '../infrastructure/aimsManagementStore';
import { useGateways } from '../application/useGateways';
import { useLabelsOverview } from '../application/useLabelsOverview';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export function AimsManagementPage() {
    const { t } = useTranslation();
    const { activeStoreId, isAppReady } = useAuthStore();
    const { hasStoreRole } = useAuthContext();
    const canManage = hasStoreRole('STORE_ADMIN');
    const { activeTab, setActiveTab, reset } = useAimsManagementStore();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [selectedGatewayMac, setSelectedGatewayMac] = useState<string | null>(null);
    const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
    const { gateways, fetchGateways } = useGateways(activeStoreId);
    const { stats: labelStats, fetchLabels } = useLabelsOverview(activeStoreId);

    // Reset store when store changes
    useEffect(() => {
        reset();
    }, [activeStoreId, reset]);

    // Fetch labels for the stats card
    useEffect(() => {
        if (activeStoreId) {
            fetchLabels();
        }
    }, [activeStoreId, fetchLabels]);

    // Stats
    const { onlineCount, offlineCount } = useMemo(() => {
        const online = gateways.filter((g: any) => g.status === 'ONLINE' || g.status === 'online').length;
        return { onlineCount: online, offlineCount: gateways.length - online };
    }, [gateways]);

    const cardsSetting = useMemo(() => ({
        boxShadow: 'none',
        bgcolor: 'transparent',
        border: 'none',
        '&:hover': { boxShadow: '0px 0px 1px 1px #6666663b' },
    }), []);

    if (!isAppReady || !activeStoreId) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="info">{t('aims.selectStore')}</Alert>
            </Box>
        );
    }

    // Gateway detail view
    if (selectedGatewayMac) {
        return (
            <Box>
                <GatewayDetail
                    storeId={activeStoreId}
                    mac={selectedGatewayMac}
                    onBack={() => setSelectedGatewayMac(null)}
                />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header Section */}
            <Stack
                direction="column"
                justifyContent="flex-start"
                alignItems="flex-start"
                gap={2}
                sx={{ mb: 3 }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 500, mb: 0.5, fontSize: { xs: '1.25rem', sm: '2rem' } }}>
                        {t('aims.management')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('aims.subtitle')}
                    </Typography>
                </Box>
                {canManage && activeTab === 0 && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setRegisterDialogOpen(true)}
                        sx={{ minWidth: { xs: '100%', sm: '140px' }, display: { xs: 'none', md: 'inline-flex' } }}
                    >
                        {t('aims.registerGateway')}
                    </Button>
                )}
            </Stack>

            {/* Stats */}
            {isMobile ? (
                <Stack direction="row" gap={1.5} alignItems="center" sx={{ mb: 2, px: 1 }} flexWrap="wrap">
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                        {gateways.length} {t('aims.gateways')}
                    </Typography>
                    <Stack direction="row" gap={0.5} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                        <Typography variant="caption">{onlineCount}</Typography>
                    </Stack>
                    <Stack direction="row" gap={0.5} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                        <Typography variant="caption">{offlineCount}</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                        {labelStats.total} {t('aims.labels')}
                    </Typography>
                </Stack>
            ) : (
                <Stack direction="row" gap={2} sx={{ mb: 3 }}>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <RouterIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {gateways.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('aims.totalGateways')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'success.main', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <WifiIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {onlineCount}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('aims.online')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'error.light', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <WifiOffIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {offlineCount}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('aims.offline')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                    <Card sx={{ ...cardsSetting, flex: 1, minWidth: 0 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
                                <Box sx={{ bgcolor: 'info.main', borderRadius: 2, p: 1.5, display: 'flex' }}>
                                    <LabelIcon sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 500, fontSize: '2rem' }}>
                                        {labelStats.total}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {t('aims.totalLabels')}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab icon={<RouterIcon fontSize="small" />} iconPosition="start" label={t('aims.gateways')} />
                <Tab icon={<LabelIcon fontSize="small" />} iconPosition="start" label={t('aims.labelStatus')} />
                <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label={t('aims.productUpdates')} />
            </Tabs>

            <TabPanel value={activeTab} index={0}>
                <GatewayList storeId={activeStoreId} onSelectGateway={setSelectedGatewayMac} />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
                <LabelsOverview storeId={activeStoreId} />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
                <ProductHistory storeId={activeStoreId} />
            </TabPanel>

            {/* Mobile FAB for register gateway */}
            {isMobile && canManage && activeTab === 0 && (
                <Fab
                    color="primary"
                    variant="extended"
                    onClick={() => setRegisterDialogOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1050,
                        height: 64,
                        px: 3,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                    }}
                >
                    <AddIcon sx={{ mr: 1, fontSize: '1.5rem' }} />
                    {t('aims.register')}
                </Fab>
            )}

            {/* Bottom spacer for mobile FAB */}
            {isMobile && <Box sx={{ height: 104 }} />}

            {canManage && (
                <GatewayRegistration
                    open={registerDialogOpen}
                    onClose={() => setRegisterDialogOpen(false)}
                    storeId={activeStoreId}
                    onSuccess={() => fetchGateways(true)}
                />
            )}
        </Box>
    );
}
