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
import { useSpaceTypeLabels } from '@features/settings/hooks/useSpaceTypeLabels';
import { usePeopleTypeLabels } from '@features/settings/hooks/usePeopleTypeLabels';
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
    const { getLabel: getSpaceLabel, spaceType } = useSpaceTypeLabels();
    const { getLabel: getPeopleLabel, peopleType } = usePeopleTypeLabels();

    return useMemo(() => {
        const isPeopleManagerMode =
            (activeStoreEffectiveFeatures?.peopleEnabled ?? peopleManagerEnabled) &&
            workingMode === 'SOLUM_API';

        const primaryLabel = isPeopleManagerMode ? getPeopleLabel('plural') : getSpaceLabel('plural');

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
                label: primaryLabel,
                value: isPeopleManagerMode ? '/people' : '/spaces',
                icon: isPeopleManagerMode ? <PeopleIcon fontSize="small" /> : <BusinessIcon fontSize="small" />,
                dynamicLabel: true,
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
    }, [t, canAccessFeature, activeStoreEffectiveFeatures, workingMode, peopleManagerEnabled, getSpaceLabel, spaceType, getPeopleLabel, peopleType]);
}
