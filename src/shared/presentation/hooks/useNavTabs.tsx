import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import LabelIcon from '@mui/icons-material/Label';
import RouterIcon from '@mui/icons-material/Router';
import { ConferenceIcon } from '../../../components/icons/ConferenceIcon';
import { useAuthContext } from '@features/auth/application/useAuthContext';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import type { Feature } from '@features/auth/application/permissionHelpers';

export interface NavTab {
    labelKey: string;
    label: string;
    value: string;
    icon: React.ReactElement;
    dynamicLabel?: boolean;
    feature?: Feature;
}

export function useNavTabs(): NavTab[] {
    const { t } = useTranslation();
    const { canAccessFeature, activeStoreEffectiveFeatures } = useAuthContext();
    const workingMode = useSettingsStore(state => state.settings.workingMode);
    const peopleManagerEnabled = useSettingsStore(state => state.settings.peopleManagerEnabled);

    return useMemo(() => {
        const isPeopleManagerMode =
            (activeStoreEffectiveFeatures?.peopleEnabled ?? peopleManagerEnabled) &&
            workingMode === 'SOLUM_API';

        const allNavTabs: NavTab[] = [
            {
                labelKey: 'navigation.dashboard',
                label: t('navigation.dashboard'),
                value: '/',
                icon: <DashboardIcon fontSize="small" />,
                feature: 'dashboard',
            },
            {
                labelKey: isPeopleManagerMode ? 'navigation.people' : 'navigation.spaces',
                label: isPeopleManagerMode ? t('navigation.people') : t('navigation.spaces'),
                value: isPeopleManagerMode ? '/people' : '/spaces',
                icon: isPeopleManagerMode ? <PeopleIcon fontSize="small" /> : <BusinessIcon fontSize="small" />,
                dynamicLabel: !isPeopleManagerMode,
                feature: isPeopleManagerMode ? 'people' : 'spaces',
            },
            {
                labelKey: 'navigation.conference',
                label: t('navigation.conference'),
                value: '/conference',
                icon: <ConferenceIcon fontSize="small" />,
                feature: 'conference',
            },
            {
                labelKey: 'navigation.labels',
                label: t('navigation.labels'),
                value: '/labels',
                icon: <LabelIcon fontSize="small" />,
                feature: 'labels',
            },
            {
                labelKey: 'navigation.aimsManagement',
                label: t('navigation.aimsManagement'),
                value: '/aims-management',
                icon: <RouterIcon fontSize="small" />,
                feature: 'aims-management',
            },
        ];

        return allNavTabs.filter(tab => !tab.feature || canAccessFeature(tab.feature));
    }, [t, canAccessFeature, activeStoreEffectiveFeatures, workingMode, peopleManagerEnabled]);
}
