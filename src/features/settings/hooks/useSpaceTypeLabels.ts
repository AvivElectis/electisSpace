import { useSettingsController } from '../application/useSettingsController';
import { useTranslation } from 'react-i18next';

type LabelKey = 'singular' | 'singularDef' | 'plural' | 'pluralDef' | 'add' | 'edit' | 'delete' | 'list';

/**
 * Hook to get dynamic space type labels based on current settings
 * @returns getLabel function to retrieve labels by key
 */
export function useSpaceTypeLabels() {
    const settingsController = useSettingsController();
    const { t } = useTranslation();

    const getLabel = (key: LabelKey): string => {
        const type = settingsController.settings.spaceType;

        // Map of space type to translation key prefixes
        const typeKeyMap: Record<string, string> = {
            office: 'spaceTypes.office',
            room: 'spaceTypes.room',
            chair: 'spaceTypes.chair',
            'person-tag': 'spaceTypes.personTag',
        };

        const typeKey = typeKeyMap[type] || typeKeyMap.room;

        // Map label keys to translation suffixes
        const labelKeyMap: Record<LabelKey, string> = {
            singular: 'singular',
            singularDef: 'singularDef',
            plural: 'plural',
            pluralDef: 'pluralDef',
            add: 'add',
            edit: 'edit',
            delete: 'delete',
            list: 'list',
        };

        return t(`${typeKey}.${labelKeyMap[key]}`);
    };

    return { getLabel, spaceType: settingsController.settings.spaceType };
}

