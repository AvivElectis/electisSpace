/**
 * Shared types for the Company Creation Wizard
 * Base: 6 steps. When Compass is enabled, a 7th step is added.
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
    name: string;
}

export interface WizardBuilding {
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
