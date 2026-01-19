/**
 * Test Data for E2E Tests
 */

/**
 * Sample spaces data
 */
export const sampleSpaces = [
    { id: 'S001', name: 'Conference Room A', floor: '1', building: 'Main' },
    { id: 'S002', name: 'Meeting Room B', floor: '2', building: 'Main' },
    { id: 'S003', name: 'Office 101', floor: '1', building: 'Annex' },
];

/**
 * Sample people data (as would be in CSV)
 */
export const samplePeople = [
    { id: 'P001', name: 'John Doe', department: 'Engineering', email: 'john@example.com' },
    { id: 'P002', name: 'Jane Smith', department: 'Marketing', email: 'jane@example.com' },
    { id: 'P003', name: 'Bob Wilson', department: 'Engineering', email: 'bob@example.com' },
    { id: 'P004', name: 'Alice Brown', department: 'HR', email: 'alice@example.com' },
];

/**
 * Sample CSV content for people upload
 */
export const sampleCSVContent = `id,name,department,email
P001,John Doe,Engineering,john@example.com
P002,Jane Smith,Marketing,jane@example.com
P003,Bob Wilson,Engineering,bob@example.com
P004,Alice Brown,HR,alice@example.com`;

/**
 * Invalid CSV content for testing error handling
 */
export const invalidCSVContent = `This is not a valid CSV
with random data
and no structure`;

/**
 * Sample conference rooms data
 */
export const sampleConferenceRooms = [
    {
        id: 'C001',
        roomName: 'Board Room',
        hasMeeting: true,
        meetingName: 'Strategy Meeting',
        startTime: '09:00',
        endTime: '10:00',
        participants: 'CEO, CFO, CTO'
    },
    {
        id: 'C002',
        roomName: 'Huddle Space',
        hasMeeting: false
    },
    {
        id: 'C003',
        roomName: 'Training Room',
        hasMeeting: true,
        meetingName: 'New Hire Orientation',
        startTime: '14:00',
        endTime: '17:00',
        participants: 'HR Team'
    },
];

/**
 * Sample settings configurations
 */
export const sampleSettings = {
    default: {
        appName: 'electisSpace',
        appSubtitle: 'Space Management',
        workingMode: 'sftp' as const,
        spaceType: 'room' as const,
    },
    solumMode: {
        appName: 'electisSpace',
        appSubtitle: 'SoluM Integration',
        workingMode: 'solumapi' as const,
        spaceType: 'room' as const,
        solumCredentials: {
            baseUrl: 'https://eu.common.solumesl.com',
            companyCode: 'TEST_COMPANY',
            storeNumber: '001',
            username: 'testuser',
            password: 'testpass',
        },
    },
    peopleManagerMode: {
        appName: 'People Manager',
        appSubtitle: 'Assignment System',
        workingMode: 'solumapi' as const,
        spaceType: 'room' as const,
        peopleManagerEnabled: true,
    },
};

/**
 * Test list names
 */
export const testListNames = {
    list1: 'Morning Shift',
    list2: 'Afternoon Shift',
    list3: 'Night Crew',
};

/**
 * Timeouts for E2E tests
 */
export const TIMEOUTS = {
    short: 300,
    medium: 500,
    long: 1000,
    networkIdle: 2000,
};

/**
 * Viewport sizes for responsive testing
 */
export const VIEWPORTS = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 },
    largeDesktop: { width: 1920, height: 1080 },
};
