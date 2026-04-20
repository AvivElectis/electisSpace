/**
 * Shared types for the 6-step Company Creation Wizard
 */
import type { ArticleFormat } from '@features/configuration/domain/types';
import type { SolumMappingConfig } from '@features/settings/domain/types';
import type { CompanyFeatures, SpaceType, PeopleType } from '@shared/infrastructure/services/authService';

export interface WizardStoreData {
    code: string;
    name: string;
    timezone: string;
    labelCount?: number;
    gatewayCount?: number;
    selected: boolean;
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
    peopleType: PeopleType;
}

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
    },
    spaceType: 'office',
    peopleType: 'people',
};
