/**
 * Shared types for the Company Creation Wizard
 * Base: 6 steps. When Compass is enabled, 2 extra steps are inserted (Compass Config + Buildings), making 8 total.
 */
import type { ArticleFormat } from '@features/configuration/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import type { CompanyFeatures, SpaceType } from '@shared/infrastructure/services/authService';

export interface WizardStoreData {
    code: string;
    name: string;
    timezone: string;
    labelCount?: number;
    gatewayCount?: number;
    selected: boolean;
}

export interface WizardFloor {
    id: string;
    name: string;
}

export interface WizardBuilding {
    id: string;
    name: string;
    floors: WizardFloor[];
}

export interface CompassConfig {
    maxDurationMinutes: number;
    maxAdvanceBookingDays: number;
    checkInWindowMinutes: number;
    autoReleaseMinutes: number;
    maxConcurrentBookings: number;
}

export interface WizardFormData {
    // Step 1: Connection
    companyCode: string;
    companyName: string;
    location: string;
    description: string;
    aimsCluster: string;
    aimsBaseUrl: string;
    aimsUsername: string;
    aimsPassword: string;
    showPassword: boolean;
    connectionTested: boolean;

    // Step 2: Stores
    stores: WizardStoreData[];

    // Step 3: Article Format
    articleFormat: ArticleFormat | null;

    // Step 4: Field Mapping
    fieldMapping: SolumMappingConfig | null;

    // Step 5: Features
    features: CompanyFeatures;
    spaceType: SpaceType;

    // Compass Configuration (shown when compassEnabled)
    compassConfig: CompassConfig;

    // Building Hierarchy (shown when compassEnabled)
    buildings: WizardBuilding[];
}

export const DEFAULT_COMPASS_CONFIG: CompassConfig = {
    maxDurationMinutes: 480,
    maxAdvanceBookingDays: 14,
    checkInWindowMinutes: 15,
    autoReleaseMinutes: 30,
    maxConcurrentBookings: 1,
};

/** Client-side preview of the compass article format (mirrors server constant) */
export const COMPASS_ARTICLE_FORMAT_PREVIEW: ArticleFormat = {
    fileExtension: 'csv',
    delimeter: ',',
    articleBasicInfo: ['store', 'articleId', 'articleName', 'nfcUrl'],
    articleData: [
        'STORE_ID', 'ARTICLE_ID', 'ITEM_NAME', 'NFC_URL',
        'BUILDING_NAME', 'FLOOR_NAME', 'AREA_NAME',
        'SPACE_TYPE', 'SPACE_MODE', 'SPACE_CAPACITY', 'SPACE_AMENITIES',
        'BOOKING_STATUS',
        'CURRENT_MEETING_NAME', 'CURRENT_MEETING_ORGANIZER',
        'CURRENT_MEETING_START', 'CURRENT_MEETING_END', 'CURRENT_MEETING_PARTICIPANTS',
        'NEXT1_MEETING_NAME', 'NEXT1_MEETING_ORGANIZER',
        'NEXT1_MEETING_START', 'NEXT1_MEETING_END', 'NEXT1_MEETING_PARTICIPANTS',
        'NEXT2_MEETING_NAME', 'NEXT2_MEETING_ORGANIZER',
        'NEXT2_MEETING_START', 'NEXT2_MEETING_END', 'NEXT2_MEETING_PARTICIPANTS',
    ],
    mappingInfo: {
        store: 'STORE_ID',
        articleId: 'ARTICLE_ID',
        articleName: 'ITEM_NAME',
        nfcUrl: 'NFC_URL',
    },
};

export const INITIAL_WIZARD_DATA: WizardFormData = {
    companyCode: '',
    companyName: '',
    location: '',
    description: '',
    aimsCluster: 'c1',
    aimsBaseUrl: 'https://eu.common.solumesl.com/c1/common',
    aimsUsername: '',
    aimsPassword: '',
    showPassword: false,
    connectionTested: false,
    stores: [],
    articleFormat: null,
    fieldMapping: null,
    features: {
        spacesEnabled: false,
        peopleEnabled: false,
        conferenceEnabled: false,
        simpleConferenceMode: false,
        labelsEnabled: false,
        aimsManagementEnabled: false,
        compassEnabled: false,
    },
    spaceType: 'office',
    compassConfig: { ...DEFAULT_COMPASS_CONFIG },
    buildings: [],
};
