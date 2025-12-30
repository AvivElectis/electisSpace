import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { SpacesManagementView } from './SpacesManagementView';
import { PeopleManagerView } from '@features/people/presentation/PeopleManagerView';

/**
 * Spaces Page - Conditionally renders People Manager or Spaces Management
 * Based on the peopleManagerEnabled toggle in settings
 */
export function SpacesPage() {
    const settings = useSettingsStore((state) => state.settings);

    // When People Manager mode is enabled (SoluM API only), show People Manager
    if (settings.peopleManagerEnabled && settings.workingMode === 'SOLUM_API') {
        return <PeopleManagerView />;
    }

    // Otherwise, show normal Spaces Management
    return <SpacesManagementView />;
}
