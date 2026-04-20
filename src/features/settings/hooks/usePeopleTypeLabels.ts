import { useSettingsController } from '../application/useSettingsController';
import { useTranslation } from 'react-i18next';

type LabelKey = 'singular' | 'singularDef' | 'plural' | 'pluralDef' | 'add' | 'edit' | 'delete' | 'list';

/**
 * Dynamic person-type labels (Person / Doctor / Lawyer / Employee …).
 * Mirrors useSpaceTypeLabels so callers can swap the noun everywhere the UI
 * speaks about "people" when People Manager Mode is active.
 */
export function usePeopleTypeLabels() {
    const settingsController = useSettingsController();
    const { t } = useTranslation();

    const getLabel = (key: LabelKey): string => {
        const type = settingsController.settings.peopleType ?? 'people';
        return t(`peopleTypes.${type}.${key}`);
    };

    return { getLabel, peopleType: settingsController.settings.peopleType ?? 'people' };
}
