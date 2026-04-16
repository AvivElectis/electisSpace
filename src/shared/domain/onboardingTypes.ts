// src/shared/domain/onboardingTypes.ts
import type { Feature } from '@features/auth/application/permissionHelpers';

export type FeatureTour = 'dashboard' | 'spaces' | 'people' | 'conference' | 'labels';

export interface TourStep {
    /** CSS selector or data-tour attribute for the target element */
    targetSelector: string;
    /** i18n key for the tooltip title */
    titleKey: string;
    /** i18n key for the tooltip body */
    bodyKey: string;
    /** Preferred placement of the tooltip */
    placement: 'top' | 'bottom' | 'left' | 'right';
    /** Only include step if this feature is enabled */
    feature?: Feature;
    /** Only include step for admin roles */
    requireAdmin?: boolean;
    /** Only include step for multi-store users */
    requireMultiStore?: boolean;
}

export const ONBOARDING_STORAGE_KEY = 'electisspace_onboarding';

// -- Step configs per feature --

export const dashboardSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="dashboard-stats"]',
        titleKey: 'onboarding.dashboard.statsCards.title',
        bodyKey: 'onboarding.dashboard.statsCards.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="dashboard-quick-actions"]',
        titleKey: 'onboarding.dashboard.quickActions.title',
        bodyKey: 'onboarding.dashboard.quickActions.body',
        placement: 'top',
    },
    {
        targetSelector: '[data-tour="dashboard-card-nav"]',
        titleKey: 'onboarding.dashboard.cardNavigation.title',
        bodyKey: 'onboarding.dashboard.cardNavigation.body',
        placement: 'bottom',
    },
];

export const spacesSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="spaces-add"]',
        titleKey: 'onboarding.spaces.addSpace.title',
        bodyKey: 'onboarding.spaces.addSpace.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="spaces-table-actions"]',
        titleKey: 'onboarding.spaces.tableActions.title',
        bodyKey: 'onboarding.spaces.tableActions.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="spaces-search"]',
        titleKey: 'onboarding.spaces.search.title',
        bodyKey: 'onboarding.spaces.search.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="spaces-lists"]',
        titleKey: 'onboarding.spaces.lists.title',
        bodyKey: 'onboarding.spaces.lists.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="spaces-sync"]',
        titleKey: 'onboarding.spaces.aimsSync.title',
        bodyKey: 'onboarding.spaces.aimsSync.body',
        placement: 'top',
    },
];

export const peopleSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="people-stats"]',
        titleKey: 'onboarding.people.setSlots.title',
        bodyKey: 'onboarding.people.setSlots.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="people-add"]',
        titleKey: 'onboarding.people.addPeople.title',
        bodyKey: 'onboarding.people.addPeople.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="people-assign"]',
        titleKey: 'onboarding.people.assign.title',
        bodyKey: 'onboarding.people.assign.body',
        placement: 'top',
    },
    {
        targetSelector: '[data-tour="people-lists"]',
        titleKey: 'onboarding.people.lists.title',
        bodyKey: 'onboarding.people.lists.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="people-alerts"]',
        titleKey: 'onboarding.people.liveAlerts.title',
        bodyKey: 'onboarding.people.liveAlerts.body',
        placement: 'bottom',
    },
];

export const conferenceAdvancedSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="conference-add"]',
        titleKey: 'onboarding.conference.addRoom.title',
        bodyKey: 'onboarding.conference.addRoom.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="conference-actions"]',
        titleKey: 'onboarding.conference.editDelete.title',
        bodyKey: 'onboarding.conference.editDelete.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="conference-search"]',
        titleKey: 'onboarding.conference.search.title',
        bodyKey: 'onboarding.conference.search.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="conference-sync"]',
        titleKey: 'onboarding.conference.aimsSync.title',
        bodyKey: 'onboarding.conference.aimsSync.body',
        placement: 'top',
    },
];

export const conferenceSimpleSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="conference-cards"]',
        titleKey: 'onboarding.conferenceSimple.roomCards.title',
        bodyKey: 'onboarding.conferenceSimple.roomCards.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="conference-flip"]',
        titleKey: 'onboarding.conferenceSimple.flipStatus.title',
        bodyKey: 'onboarding.conferenceSimple.flipStatus.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="conference-no-label"]',
        titleKey: 'onboarding.conferenceSimple.noLabel.title',
        bodyKey: 'onboarding.conferenceSimple.noLabel.body',
        placement: 'bottom',
    },
];

export const labelsSteps: TourStep[] = [
    {
        targetSelector: '[data-tour="labels-table"]',
        titleKey: 'onboarding.labels.browse.title',
        bodyKey: 'onboarding.labels.browse.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="labels-link"]',
        titleKey: 'onboarding.labels.link.title',
        bodyKey: 'onboarding.labels.link.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="labels-unlink"]',
        titleKey: 'onboarding.labels.unlink.title',
        bodyKey: 'onboarding.labels.unlink.body',
        placement: 'bottom',
    },
    {
        targetSelector: '[data-tour="labels-health"]',
        titleKey: 'onboarding.labels.health.title',
        bodyKey: 'onboarding.labels.health.body',
        placement: 'bottom',
    },
];

/** Map tour name to its step config */
export function getTourSteps(tour: FeatureTour, isSimpleConferenceMode = false): TourStep[] {
    switch (tour) {
        case 'dashboard': return dashboardSteps;
        case 'spaces': return spacesSteps;
        case 'people': return peopleSteps;
        case 'conference': return isSimpleConferenceMode ? conferenceSimpleSteps : conferenceAdvancedSteps;
        case 'labels': return labelsSteps;
    }
}
