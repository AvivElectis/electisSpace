import { v4 as uuidv4 } from 'uuid';
import { useListsStore } from '../infrastructure/listsStore';
import { useSpacesStore } from '@features/space/infrastructure/spacesStore';
import { useSyncContext } from '@features/sync/application/SyncContext';


export function useListsController() {
    // Stores
    const listsStore = useListsStore();
    const spacesStore = useSpacesStore();
    // const settings = useSettingsStore(state => state.settings); // Not needed anymore for sync init

    // Sync Controller
    // Use global context to avoid duplicate adapters and state conflicts
    const syncController = useSyncContext();

    const saveCurrentSpacesAsList = (name: string) => {
        // validate uniqueness
        if (listsStore.getListByName(name)) {
            throw new Error('List name already exists');
        }

        const currentSpaces = spacesStore.spaces;
        if (currentSpaces.length === 0) {
            // Allow saving empty? Maybe better not.
            // throw new Error('No spaces to save');
        }

        const newList = {
            id: uuidv4(),
            name,
            spaces: currentSpaces,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        listsStore.saveList(newList);
        spacesStore.setActiveListName(name);
    };

    const loadList = async (id: string) => {
        const list = listsStore.lists.find(l => l.id === id);
        if (!list) {
            throw new Error('List not found');
        }

        // 1. Merge spaces
        const result = spacesStore.mergeSpacesList(list.spaces);
        spacesStore.setActiveListName(list.name);

        // 2. Trigger Sync if there are spaces (especially new ones)
        // The requirement says: "if the spaces in the list are missing, then they will be posted to aims."
        // Merging handles the state. Now we sync.
        try {
            await syncController.sync();
        } catch (error) {
            console.error('Auto-sync after list load failed:', error);
            // We don't block the UI for this, just log
        }

        return result;
    };

    const deleteList = (id: string) => {
        listsStore.deleteList(id);
        // If current active list is deleted, clear the name?
        // Logic: The spaces are still there, but they are no longer associated with this deleted list.
        // We'll leave the activeListName as is or clear it. 
        // Let's check if it matches current active name
        const list = listsStore.lists.find(l => l.id === id);
        if (list && spacesStore.activeListName === list.name) {
            spacesStore.setActiveListName(undefined);
        }
    };

    return {
        lists: listsStore.lists,
        saveCurrentSpacesAsList,
        loadList,
        deleteList,
    };
}
