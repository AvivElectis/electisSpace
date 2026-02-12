import { MANUAL_TABS } from './types';

describe('Manual Domain Types', () => {
    describe('MANUAL_TABS configuration', () => {
        it('should have 6 tabs', () => {
            expect(MANUAL_TABS.length).toBe(6);
        });

        it('should have all required tab IDs', () => {
            const tabIds = MANUAL_TABS.map(tab => tab.id);
            expect(tabIds).toContain('getting-started');
            expect(tabIds).toContain('spaces');
            expect(tabIds).toContain('people');
            expect(tabIds).toContain('conference');
            expect(tabIds).toContain('sync');
            expect(tabIds).toContain('settings');
        });

        it('should have valid structure for each tab', () => {
            MANUAL_TABS.forEach((tab) => {
                expect(tab.id).toBeDefined();
                expect(tab.titleKey).toBeDefined();
                expect(tab.iconName).toBeDefined();
                expect(Array.isArray(tab.sections)).toBe(true);
                expect(tab.sections.length).toBeGreaterThan(0);
            });
        });

        it('should have valid sections for each tab', () => {
            MANUAL_TABS.forEach((tab) => {
                tab.sections.forEach((section) => {
                    expect(section.id).toBeDefined();
                    expect(section.titleKey).toBeDefined();
                    expect(section.contentKey).toBeDefined();
                });
            });
        });
    });

    describe('Getting Started tab', () => {
        const gettingStartedTab = MANUAL_TABS.find(tab => tab.id === 'getting-started');

        it('should have correct title key', () => {
            expect(gettingStartedTab?.titleKey).toBe('manual.tabs.gettingStarted');
        });

        it('should have RocketLaunch icon', () => {
            expect(gettingStartedTab?.iconName).toBe('RocketLaunch');
        });

        it('should have 4 sections', () => {
            expect(gettingStartedTab?.sections.length).toBe(4);
        });

        it('should have welcome, navigation, first-setup, roles sections', () => {
            const sectionIds = gettingStartedTab?.sections.map(s => s.id);
            expect(sectionIds).toContain('welcome');
            expect(sectionIds).toContain('navigation');
            expect(sectionIds).toContain('first-setup');
            expect(sectionIds).toContain('roles');
        });
    });

    describe('Spaces tab', () => {
        const spacesTab = MANUAL_TABS.find(tab => tab.id === 'spaces');

        it('should have correct title key', () => {
            expect(spacesTab?.titleKey).toBe('manual.tabs.spaces');
        });

        it('should have Business icon', () => {
            expect(spacesTab?.iconName).toBe('Business');
        });

        it('should have 4 sections', () => {
            expect(spacesTab?.sections.length).toBe(4);
        });
    });

    describe('People tab', () => {
        const peopleTab = MANUAL_TABS.find(tab => tab.id === 'people');

        it('should have correct title key', () => {
            expect(peopleTab?.titleKey).toBe('manual.tabs.people');
        });

        it('should have People icon', () => {
            expect(peopleTab?.iconName).toBe('People');
        });

        it('should have 4 sections', () => {
            expect(peopleTab?.sections.length).toBe(4);
        });

        it('should have CSV import section', () => {
            const sectionIds = peopleTab?.sections.map(s => s.id);
            expect(sectionIds).toContain('csv-import');
        });
    });

    describe('Conference tab', () => {
        const conferenceTab = MANUAL_TABS.find(tab => tab.id === 'conference');

        it('should have correct title key', () => {
            expect(conferenceTab?.titleKey).toBe('manual.tabs.conference');
        });

        it('should have MeetingRoom icon', () => {
            expect(conferenceTab?.iconName).toBe('MeetingRoom');
        });

        it('should have 3 sections', () => {
            expect(conferenceTab?.sections.length).toBe(3);
        });
    });

    describe('Sync tab', () => {
        const syncTab = MANUAL_TABS.find(tab => tab.id === 'sync');

        it('should have correct title key', () => {
            expect(syncTab?.titleKey).toBe('manual.tabs.sync');
        });

        it('should have Sync icon', () => {
            expect(syncTab?.iconName).toBe('Sync');
        });

        it('should have troubleshooting section', () => {
            const sectionIds = syncTab?.sections.map(s => s.id);
            expect(sectionIds).toContain('troubleshooting');
        });
    });

    describe('Settings tab', () => {
        const settingsTab = MANUAL_TABS.find(tab => tab.id === 'settings');

        it('should have correct title key', () => {
            expect(settingsTab?.titleKey).toBe('manual.tabs.settings');
        });

        it('should have Settings icon', () => {
            expect(settingsTab?.iconName).toBe('Settings');
        });
    });

    describe('translation key format', () => {
        it('should follow manual.*.*.title pattern for section titles', () => {
            MANUAL_TABS.forEach((tab) => {
                tab.sections.forEach((section) => {
                    expect(section.titleKey).toMatch(/^manual\.[a-zA-Z]+\.[a-zA-Z]+\.title$/);
                });
            });
        });

        it('should follow manual.*.*.content pattern for section content', () => {
            MANUAL_TABS.forEach((tab) => {
                tab.sections.forEach((section) => {
                    expect(section.contentKey).toMatch(/^manual\.[a-zA-Z]+\.[a-zA-Z]+\.content$/);
                });
            });
        });
    });
});
