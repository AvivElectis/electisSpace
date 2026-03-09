import { useState, useMemo } from 'react';
import { Box, Typography, Tabs, Tab, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import ExploreIcon from '@mui/icons-material/Explore';
import { CompassBookingsTab } from './CompassBookingsTab';
import { CompassSpacesTab } from './CompassSpacesTab';
import { CompassEmployeesTab } from './CompassEmployeesTab';
import { CompassRulesTab } from './CompassRulesTab';
import { CompassOrganizationTab } from './CompassOrganizationTab';
import { CompassAmenitiesTab } from './CompassAmenitiesTab';
import { CompassNeighborhoodsTab } from './CompassNeighborhoodsTab';
import { CompassIntegrationsTab } from './CompassIntegrationsTab';

const TAB_NAMES = ['bookings', 'spaces', 'employees', 'rules', 'organization', 'amenities', 'neighborhoods', 'integrations'] as const;

export function CompassPage() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = useMemo(() => {
        const tabParam = searchParams.get('tab');
        if (!tabParam) return 0;
        const idx = TAB_NAMES.indexOf(tabParam as any);
        return idx >= 0 ? idx : 0;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const [tab, setTab] = useState(initialTab);

    const handleTabChange = (_: unknown, value: number) => {
        setTab(value);
        setSearchParams({ tab: TAB_NAMES[value] }, { replace: true });
    };

    return (
        <Box>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <ExploreIcon color="primary" />
                <Typography variant="h4" fontWeight={500} sx={{ fontSize: { xs: '1.25rem', sm: '2rem' } }}>
                    {t('compass.dashboard.title')}
                </Typography>
            </Stack>

            <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
                <Tab label={t('compass.navigation.bookings')} />
                <Tab label={t('compass.navigation.spaces')} />
                <Tab label={t('compass.navigation.employees')} />
                <Tab label={t('compass.navigation.rules')} />
                <Tab label={t('compass.navigation.organization')} />
                <Tab label={t('compass.navigation.amenities')} />
                <Tab label={t('compass.navigation.neighborhoods')} />
                <Tab label={t('compass.navigation.integrations', 'Integrations')} />
            </Tabs>

            <Box sx={{ display: tab === 0 ? 'block' : 'none' }}><CompassBookingsTab /></Box>
            <Box sx={{ display: tab === 1 ? 'block' : 'none' }}><CompassSpacesTab /></Box>
            <Box sx={{ display: tab === 2 ? 'block' : 'none' }}><CompassEmployeesTab /></Box>
            <Box sx={{ display: tab === 3 ? 'block' : 'none' }}><CompassRulesTab /></Box>
            <Box sx={{ display: tab === 4 ? 'block' : 'none' }}><CompassOrganizationTab /></Box>
            <Box sx={{ display: tab === 5 ? 'block' : 'none' }}><CompassAmenitiesTab /></Box>
            <Box sx={{ display: tab === 6 ? 'block' : 'none' }}><CompassNeighborhoodsTab /></Box>
            <Box sx={{ display: tab === 7 ? 'block' : 'none' }}><CompassIntegrationsTab /></Box>
        </Box>
    );
}
