import { useSettingsController } from '../application/useSettingsController';

type LabelKey = 'singular' | 'plural' | 'add' | 'edit' | 'delete' | 'list';

/**
 * Hook to get dynamic space type labels based on current settings
 * @returns getLabel function to retrieve labels by key
 */
export function useSpaceTypeLabels() {
    const settingsController = useSettingsController();

    const getLabel = (key: LabelKey): string => {
        const type = settingsController.settings.spaceType;

        const labels: Record<string, Record<LabelKey, string>> = {
            office: {
                singular: 'Office',
                plural: 'Offices',
                add: 'Add Office',
                edit: 'Edit Office',
                delete: 'Delete Office',
                list: 'Office List',
            },
            room: {
                singular: 'Room',
                plural: 'Rooms',
                add: 'Add Room',
                edit: 'Edit Room',
                delete: 'Delete Room',
                list: 'Room List',
            },
            chair: {
                singular: 'Chair',
                plural: 'Chairs',
                add: 'Add Chair',
                edit: 'Edit Chair',
                delete: 'Delete Chair',
                list: 'Chair List',
            },
            'person-tag': {
                singular: 'Person Tag',
                plural: 'Person Tags',
                add: 'Add Person Tag',
                edit: 'Edit Person Tag',
                delete: 'Delete Person Tag',
                list: 'Person Tag List',
            },
        };

        return labels[type]?.[key] || labels.room[key];
    };

    return { getLabel, spaceType: settingsController.settings.spaceType };
}

