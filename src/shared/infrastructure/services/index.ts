/**
 * Services Index
 * 
 * Central export for all API services.
 * Frontend components should import from here.
 */

// API Client
export { api, tokenManager } from './apiClient';

// Entity API Services (Backend-backed)
export { spacesApi } from './spacesApi';
export type { 
    SpacesResponse, 
    SpaceResponse, 
    ListSpacesParams, 
    CreateSpaceDto, 
    UpdateSpaceDto,
    BulkCreateSpacesDto,
    BulkUpdateSpacesDto,
} from './spacesApi';

export { peopleApi } from './peopleApi';
export type {
    PeopleResponse,
    PersonResponse,
    ListPeopleParams,
    CreatePersonDto,
    UpdatePersonDto,
    BulkCreatePeopleDto,
    PeopleListItem,
    PeopleListFull,
    CreatePeopleListDto,
    UpdatePeopleListDto,
} from './peopleApi';

export { conferenceApi } from './conferenceApi';
export type { 
    ConferenceRoomsResponse, 
    ConferenceRoomResponse, 
    ListConferenceRoomsParams, 
    CreateConferenceRoomDto, 
    UpdateConferenceRoomDto,
    BulkCreateConferenceRoomsDto,
} from './conferenceApi';

// Sync API
export { syncApi } from './syncApi';
export type { 
    SyncStatusResponse, 
    SyncQueueItem, 
    SyncQueueResponse,
    PullSyncResult,
    PushSyncResult,
    SyncItemStatus,
    SyncOperation,
    SyncEntityType,
} from './syncApi';

// Labels API
export { labelsApi } from './labelsApi';
export type { 
    Label, 
    LabelsResponse, 
    LabelResponse, 
    ListLabelsParams,
} from './labelsApi';

// Store Context API
export { storeContextApi } from './storeContextApi';
export type { 
    UserContext, 
    CompanyContext, 
    StoreContext, 
    SetContextDto,
} from './storeContextApi';

// Company/User Services (existing)
export { companyService } from './companyService';
export { userService } from './userService';
export { authService } from './authService';

// Legacy/Direct Services (to be deprecated)
// These will be removed in Phase 5.3
export { logger } from './logger';
