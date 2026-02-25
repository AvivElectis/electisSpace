/**
 * AIMS Management Page
 * 
 * Main page with tab navigation for Gateways, Labels, and Product Updates.
 */

import { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Button, Alert } from '@mui/material';
import RouterIcon from '@mui/icons-material/Router';
import LabelIcon from '@mui/icons-material/Label';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/infrastructure/authStore';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { GatewayList } from './GatewayList';
import { GatewayDetail } from './GatewayDetail';
import { GatewayRegistration } from './GatewayRegistration';
import { LabelHistory } from './LabelHistory';
import { ProductHistory } from './ProductHistory';
import { useAimsManagementStore } from '../infrastructure/aimsManagementStore';
import { useGateways } from '../application/useGateways';

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
    
    const [selectedGatewayMac, setSelectedGatewayMac] = useState<string | null>(null);
    const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
    const { fetchGateways } = useGateways(activeStoreId);

    // Reset store when store changes
    useEffect(() => {
        reset();
    }, [activeStoreId, reset]);

    if (!isAppReady || !activeStoreId) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="info">{t('aims.selectStore', 'Please select a store to view AIMS management.')}</Alert>
            </Box>
        );
    }

    // Gateway detail view
    if (selectedGatewayMac) {
        return (
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                <GatewayDetail 
                    storeId={activeStoreId} 
                    mac={selectedGatewayMac} 
                    onBack={() => setSelectedGatewayMac(null)} 
                />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">{t('aims.management', 'AIMS Management')}</Typography>
                {canManage && activeTab === 0 && (
                    <Button 
                        variant="contained" 
                        startIcon={<AddIcon />} 
                        onClick={() => setRegisterDialogOpen(true)}
                        size="small"
                    >
                        {t('aims.registerGateway', 'Register Gateway')}
                    </Button>
                )}
            </Box>

            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab icon={<RouterIcon fontSize="small" />} iconPosition="start" label={t('aims.gateways', 'Gateways')} />
                <Tab icon={<LabelIcon fontSize="small" />} iconPosition="start" label={t('aims.labelStatus', 'Label Status')} />
                <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label={t('aims.productUpdates', 'Product Updates')} />
            </Tabs>

            <TabPanel value={activeTab} index={0}>
                <GatewayList storeId={activeStoreId} onSelectGateway={setSelectedGatewayMac} />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
                <LabelHistory storeId={activeStoreId} />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
                <ProductHistory storeId={activeStoreId} />
            </TabPanel>

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
