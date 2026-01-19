/**
 * Manual Feature Domain Types
 * Types for the in-app user manual with bilingual support
 */

export interface ManualSection {
    id: string;
    titleKey: string;      // i18n key for section title
    contentKey: string;    // i18n key for section content
}

export interface ManualTab {
    id: string;
    titleKey: string;      // i18n key for tab title
    iconName: string;      // MUI icon name reference
    sections: ManualSection[];
}

/**
 * Manual tabs configuration
 * Each tab contains multiple sections with translated content
 */
export const MANUAL_TABS: ManualTab[] = [
    {
        id: 'getting-started',
        titleKey: 'manual.tabs.gettingStarted',
        iconName: 'RocketLaunch',
        sections: [
            { id: 'overview', titleKey: 'manual.gettingStarted.overview.title', contentKey: 'manual.gettingStarted.overview.content' },
            { id: 'first-steps', titleKey: 'manual.gettingStarted.firstSteps.title', contentKey: 'manual.gettingStarted.firstSteps.content' },
            { id: 'connection', titleKey: 'manual.gettingStarted.connection.title', contentKey: 'manual.gettingStarted.connection.content' },
        ]
    },
    {
        id: 'spaces',
        titleKey: 'manual.tabs.spaces',
        iconName: 'Business',
        sections: [
            { id: 'overview', titleKey: 'manual.spaces.overview.title', contentKey: 'manual.spaces.overview.content' },
            { id: 'management', titleKey: 'manual.spaces.management.title', contentKey: 'manual.spaces.management.content' },
            { id: 'labels', titleKey: 'manual.spaces.labels.title', contentKey: 'manual.spaces.labels.content' },
        ]
    },
    {
        id: 'people',
        titleKey: 'manual.tabs.people',
        iconName: 'People',
        sections: [
            { id: 'overview', titleKey: 'manual.people.overview.title', contentKey: 'manual.people.overview.content' },
            { id: 'csv-import', titleKey: 'manual.people.csvImport.title', contentKey: 'manual.people.csvImport.content' },
            { id: 'assignments', titleKey: 'manual.people.assignments.title', contentKey: 'manual.people.assignments.content' },
            { id: 'lists', titleKey: 'manual.people.lists.title', contentKey: 'manual.people.lists.content' },
        ]
    },
    {
        id: 'conference',
        titleKey: 'manual.tabs.conference',
        iconName: 'MeetingRoom',
        sections: [
            { id: 'overview', titleKey: 'manual.conference.overview.title', contentKey: 'manual.conference.overview.content' },
            { id: 'rooms', titleKey: 'manual.conference.rooms.title', contentKey: 'manual.conference.rooms.content' },
            { id: 'meetings', titleKey: 'manual.conference.meetings.title', contentKey: 'manual.conference.meetings.content' },
        ]
    },
    {
        id: 'sync',
        titleKey: 'manual.tabs.sync',
        iconName: 'Sync',
        sections: [
            { id: 'overview', titleKey: 'manual.sync.overview.title', contentKey: 'manual.sync.overview.content' },
            { id: 'auto-sync', titleKey: 'manual.sync.autoSync.title', contentKey: 'manual.sync.autoSync.content' },
            { id: 'troubleshooting', titleKey: 'manual.sync.troubleshooting.title', contentKey: 'manual.sync.troubleshooting.content' },
        ]
    },
    {
        id: 'settings',
        titleKey: 'manual.tabs.settings',
        iconName: 'Settings',
        sections: [
            { id: 'overview', titleKey: 'manual.settings.overview.title', contentKey: 'manual.settings.overview.content' },
            { id: 'solum', titleKey: 'manual.settings.solum.title', contentKey: 'manual.settings.solum.content' },
            { id: 'security', titleKey: 'manual.settings.security.title', contentKey: 'manual.settings.security.content' },
        ]
    },
];
