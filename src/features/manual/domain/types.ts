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
            { id: 'welcome', titleKey: 'manual.gettingStarted.welcome.title', contentKey: 'manual.gettingStarted.welcome.content' },
            { id: 'navigation', titleKey: 'manual.gettingStarted.navigation.title', contentKey: 'manual.gettingStarted.navigation.content' },
            { id: 'first-setup', titleKey: 'manual.gettingStarted.firstSetup.title', contentKey: 'manual.gettingStarted.firstSetup.content' },
            { id: 'roles', titleKey: 'manual.gettingStarted.roles.title', contentKey: 'manual.gettingStarted.roles.content' },
        ]
    },
    {
        id: 'spaces',
        titleKey: 'manual.tabs.spaces',
        iconName: 'Business',
        sections: [
            { id: 'overview', titleKey: 'manual.spaces.overview.title', contentKey: 'manual.spaces.overview.content' },
            { id: 'management', titleKey: 'manual.spaces.management.title', contentKey: 'manual.spaces.management.content' },
            { id: 'data-fields', titleKey: 'manual.spaces.dataFields.title', contentKey: 'manual.spaces.dataFields.content' },
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
            { id: 'how-it-works', titleKey: 'manual.sync.howItWorks.title', contentKey: 'manual.sync.howItWorks.content' },
            { id: 'real-time', titleKey: 'manual.sync.realTime.title', contentKey: 'manual.sync.realTime.content' },
            { id: 'manual-sync', titleKey: 'manual.sync.manualSync.title', contentKey: 'manual.sync.manualSync.content' },
            { id: 'troubleshooting', titleKey: 'manual.sync.troubleshooting.title', contentKey: 'manual.sync.troubleshooting.content' },
        ]
    },
    {
        id: 'settings',
        titleKey: 'manual.tabs.settings',
        iconName: 'Settings',
        sections: [
            { id: 'overview', titleKey: 'manual.settings.overview.title', contentKey: 'manual.settings.overview.content' },
            { id: 'companies', titleKey: 'manual.settings.companies.title', contentKey: 'manual.settings.companies.content' },
            { id: 'users', titleKey: 'manual.settings.users.title', contentKey: 'manual.settings.users.content' },
            { id: 'aims-config', titleKey: 'manual.settings.aimsConfig.title', contentKey: 'manual.settings.aimsConfig.content' },
        ]
    },
];
