import type { Space, ConferenceRoom, CSVConfig } from '@shared/domain/types';
import type { SettingsData } from '../../features/settings/domain/types';

// Mock Spaces
export const mockSpace: Space = {
    id: '101',
    data: {
        ITEM_NAME: 'Test Room',
        ENGLISH_NAME: 'Test Room',
        RANK: 'Captain',
        TITLE: 'Manager',
    },
};

export const mockSpaces: Space[] = [
    {
        id: '101',
        data: {
            ITEM_NAME: 'Room 101',
            ENGLISH_NAME: 'Room 101',
            RANK: 'Captain',
            TITLE: 'Manager',
        },
    },
    {
        id: '102',
        data: {
            ITEM_NAME: 'Room 102',
            ENGLISH_NAME: 'Room 102',
            RANK: 'Lieutenant',
            TITLE: 'Assistant',
        },
    },
    {
        id: '103',
        data: {
            ITEM_NAME: 'Room 103',
            ENGLISH_NAME: 'Room 103',
            RANK: 'Sergeant',
            TITLE: 'Coordinator',
        },
    },
];

// Mock Conference Rooms
export const mockConferenceRoom: ConferenceRoom = {
    id: 'C001',
    hasMeeting: true,
    meetingName: 'Team Meeting',
    startTime: '09:00',
    endTime: '10:00',
    participants: ['John', 'Jane', 'Bob'],
    data: {
        roomName: 'Conference Room 001',
        MEETING_NAME: 'Team Meeting',
        MEETING_TIME: '09:00-10:00',
        PARTICIPANTS: 'John, Jane, Bob',
    },
};

export const mockConferenceRooms: ConferenceRoom[] = [
    {
        id: 'C001',
        hasMeeting: true,
        meetingName: 'Team Meeting',
        startTime: '09:00',
        endTime: '10:00',
        participants: ['John', 'Jane', 'Bob'],
        data: {
            roomName: 'Conference Room 001',
            MEETING_NAME: 'Team Meeting',
            MEETING_TIME: '09:00-10:00',
            PARTICIPANTS: 'John, Jane, Bob',
        },
    },
    {
        id: 'C002',
        hasMeeting: true,
        meetingName: 'Board Meeting',
        startTime: '14:00',
        endTime: '16:00',
        participants: ['Alice', 'Charlie'],
        data: {
            roomName: 'Conference Room 002',
            MEETING_NAME: 'Board Meeting',
            MEETING_TIME: '14:00-16:00',
            PARTICIPANTS: 'Alice, Charlie',
        },
    },
];

// Mock CSV Config
export const mockCsvConfig: CSVConfig = {
    delimiter: ',',
    columns: [
        { index: 0, name: 'ID', required: true },
        { index: 1, name: 'NAME', required: true },
        { index: 2, name: 'RANK', required: false },
        { index: 3, name: 'TITLE', required: false },
    ],
    mapping: {
        ID: 0,
        NAME: 1,
        RANK: 2,
        TITLE: 3,
    },
    conferenceEnabled: false,
};

// Mock Settings
export const mockSettings: SettingsData = {
    appName: 'electisSpace',
    appSubtitle: 'Test Subtitle',
    spaceType: 'room',
    workingMode: 'SOLUM_API',
    csvConfig: mockCsvConfig,
    solumConfig: {
        companyName: 'testcompany',
        username: 'testuser',
        password: 'testpass',
        storeNumber: '001',
        cluster: 'common',
        baseUrl: 'https://eu.common.solumesl.com',
        syncInterval: 300,
        isConnected: true,
        tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: Date.now() + 10800000,
        },
        lastConnected: Date.now(),
    },
    logos: {},
    autoSyncEnabled: false,
    autoSyncInterval: 300,
};

// Mock SoluM Settings (same as mockSettings for backward compatibility)
export const mockSolumSettings: SettingsData = {
    appName: 'electisSpace',
    appSubtitle: 'Test Subtitle',
    spaceType: 'room',
    workingMode: 'SOLUM_API',
    csvConfig: mockCsvConfig,
    solumConfig: {
        companyName: 'testcompany',
        username: 'testuser',
        password: 'testpass',
        storeNumber: '001',
        cluster: 'common',
        baseUrl: 'https://eu.common.solumesl.com',
        syncInterval: 300,
        isConnected: true,
        tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: Date.now() + 10800000,
        },
        lastConnected: Date.now(),
    },
    solumMappingConfig: {
        uniqueIdField: 'ARTICLE_ID',
        mappingInfo: {
            articleId: 'ARTICLE_ID',
            store: 'STORE_ID',
            articleName: 'ITEM_NAME',
        },
        fields: {
            ITEM_NAME: {
                friendlyNameEn: 'Item Name',
                friendlyNameHe: 'שם פריט',
                visible: true,
            },
            ENGLISH_NAME: {
                friendlyNameEn: 'English Name',
                friendlyNameHe: 'שם באנגלית',
                visible: true,
            },
        },
        conferenceMapping: {
            meetingName: 'MEETING_NAME',
            meetingTime: 'MEETING_TIME',
            participants: 'PARTICIPANTS',
        },
    },
    logos: {},
    autoSyncEnabled: false,
    autoSyncInterval: 300,
};

// Mock CSV Data
export const mockCsvData = `ID,NAME,RANK,TITLE
101,Room 101,Captain,Manager
102,Room 102,Lieutenant,Assistant
103,Room 103,Sergeant,Coordinator`;

// Mock SoluM API Responses
export const mockSolumLoginResponse = {
    responseMessage: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 10800,
    },
};

export const mockSolumArticlesResponse = {
    responseMessage: {
        articles: [
            {
                articleBasicInfo: {
                    store: '001',
                    articleId: '101',
                },
                articleData: {
                    ITEM_NAME: 'Room 101',
                    ENGLISH_NAME: 'Room 101',
                    RANK: 'Captain',
                    TITLE: 'Manager',
                },
            },
            {
                articleBasicInfo: {
                    store: '001',
                    articleId: 'C001',
                },
                articleData: {
                    MEETING_NAME: 'Team Meeting',
                    MEETING_TIME: '09:00-10:00',
                    PARTICIPANTS: 'John, Jane, Bob',
                },
            },
        ],
    },
};

export const mockArticleFormat = {
    articleBasicInfo: ['store', 'articleId', 'articleName'],
    articleData: ['ITEM_NAME', 'ENGLISH_NAME', 'RANK', 'TITLE'],
    mappingInfo: {
        store: 'STORE_ID',
        articleId: 'ARTICLE_ID',
        articleName: 'ITEM_NAME',
    },
};
