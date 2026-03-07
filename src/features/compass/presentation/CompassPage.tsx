import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ExploreIcon from '@mui/icons-material/Explore';
import { CompassBookingsTab } from './CompassBookingsTab';
import { CompassSpacesTab } from './CompassSpacesTab';
import { CompassEmployeesTab } from './CompassEmployeesTab';
import { CompassRulesTab } from './CompassRulesTab';
import { CompassOrganizationTab } from './CompassOrganizationTab';

export function CompassPage() {
    const { t } = useTranslation();
    const [tab, setTab] = useState(0);

    return (
        <Box>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <ExploreIcon color="primary" />
                <Typography variant="h4" fontWeight={500} sx={{ fontSize: { xs: '1.25rem', sm: '2rem' } }}>
                    {t('compass.dashboard.title')}
                </Typography>
            </Stack>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
                <Tab label={t('compass.navigation.bookings')} />
                <Tab label={t('compass.navigation.spaces')} />
                <Tab label={t('compass.navigation.employees')} />
                <Tab label={t('compass.navigation.rules')} />
                <Tab label={t('compass.navigation.organization')} />
            </Tabs>

            {tab === 0 && <CompassBookingsTab />}
            {tab === 1 && <CompassSpacesTab />}
            {tab === 2 && <CompassEmployeesTab />}
            {tab === 3 && <CompassRulesTab />}
            {tab === 4 && <CompassOrganizationTab />}
        </Box>
    );
}
