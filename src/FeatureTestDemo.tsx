import { useState } from 'react';
import { useSpaceController } from '@features/space/application/useSpaceController';
import { useConferenceController } from '@features/conference/application/useConferenceController';
import { useSettingsController } from '@features/settings/application/useSettingsController';
import { useSyncController } from '@features/sync/application/useSyncController';

/**
 * Feature Test Demo
 * Simple component to verify all core features work correctly
 */
export function FeatureTestDemo() {
    const [testResults, setTestResults] = useState<string[]>([]);

    // Initialize controllers
    const settingsController = useSettingsController();
    const spaceController = useSpaceController({
        csvConfig: settingsController.settings.csvConfig,
    });
    const conferenceController = useConferenceController({
    });
    const syncController = useSyncController({
        csvConfig: settingsController.settings.csvConfig,
        autoSyncEnabled: settingsController.settings.autoSyncEnabled,
        onSpaceUpdate: (spaces) => {
            spaceController.importFromSync(spaces);
        },
        isConnected: settingsController.settings.solumConfig?.isConnected || false,
    });

    const addResult = (message: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const testSpaceFeature = async () => {
        try {
            addResult('Testing Space Feature...');

            // Add a test space
            await spaceController.addSpace({
                id: 'TEST001',
                data: { name: 'Test Chair 1', doctor: 'Dr. Test' },
            });

            addResult(`✅ Space added. Total spaces: ${spaceController.spaces.length}`);
        } catch (error) {
            addResult(`❌ Space test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const testConferenceFeature = async () => {
        try {
            addResult('Testing Conference Feature...');

            // Add a test conference room
            await conferenceController.addConferenceRoom({
                id: 'C01',
                hasMeeting: false,
                meetingName: '',
                startTime: '',
                endTime: '',
                participants: [],
                data: { name: 'Conference Room A' },
            });

            addResult(`✅ Conference room added. Total rooms: ${conferenceController.conferenceRooms.length}`);
        } catch (error) {
            addResult(`❌ Conference test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const testSettingsFeature = () => {
        try {
            addResult('Testing Settings Feature...');

            // Update settings
            settingsController.updateSettings({
                appName: 'electis Space - Test Mode',
                appSubtitle: 'Verification Test',
            });

            addResult(`✅ Settings updated: ${settingsController.settings.appName}`);
            addResult(`   Password protected: ${settingsController.isPasswordProtected ? 'Yes' : 'No'}`);
            addResult(`   Locked: ${settingsController.isLocked ? 'Yes' : 'No'}`);
        } catch (error) {
            addResult(`❌ Settings test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const testEncryptionFeature = () => {
        try {
            addResult('Testing Encryption Feature...');

            // Test export
            const exported = settingsController.exportSettingsToFile('test123');
            addResult(`✅ Settings exported. Version: ${exported.version}`);

            // Test import
            settingsController.importSettingsFromFile(exported, 'test123');
            addResult('✅ Settings imported successfully');
        } catch (error) {
            addResult(`❌ Encryption test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const runAllTests = async () => {
        setTestResults([]);
        addResult('=== Starting Feature Tests ===');

        await testSpaceFeature();
        await testConferenceFeature();
        testSettingsFeature();
        testEncryptionFeature();

        addResult('=== All Tests Complete ===');
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>🧪 electis Space - Feature Verification</h1>

            <div style={{ marginBottom: '20px' }}>
                <h2>Quick Tests</h2>
                <button onClick={runAllTests} style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    marginRight: '10px',
                    cursor: 'pointer',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                }}>
                    Run All Tests
                </button>
                <button onClick={testSpaceFeature} style={{
                    padding: '10px 20px',
                    marginRight: '10px',
                    cursor: 'pointer',
                }}>
                    Test Space
                </button>
                <button onClick={testConferenceFeature} style={{
                    padding: '10px 20px',
                    marginRight: '10px',
                    cursor: 'pointer',
                }}>
                    Test Conference
                </button>
                <button onClick={testSettingsFeature} style={{
                    padding: '10px 20px',
                    marginRight: '10px',
                    cursor: 'pointer',
                }}>
                    Test Settings
                </button>
                <button onClick={testEncryptionFeature} style={{
                    padding: '10px 20px',
                    cursor: 'pointer',
                }}>
                    Test Encryption
                </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h2>Current State</h2>
                <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '15px',
                    borderRadius: '4px',
                    fontSize: '14px',
                }}>
                    {`Spaces: ${spaceController.spaces.length}
Conference Rooms: ${conferenceController.conferenceRooms.length}
Space Lists: ${spaceController.spacesLists.length}
Working Mode: ${settingsController.settings.workingMode}
Sync Status: ${syncController.syncState.status}
Auto-sync: ${settingsController.settings.autoSyncEnabled ? 'Enabled' : 'Disabled'}`}
                </pre>
            </div>

            <div>
                <h2>Test Results</h2>
                <div style={{
                    backgroundColor: '#000',
                    color: '#0f0',
                    padding: '15px',
                    borderRadius: '4px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    fontSize: '14px',
                }}>
                    {testResults.length === 0 ? (
                        <div>Click "Run All Tests" to start verification...</div>
                    ) : (
                        testResults.map((result, index) => (
                            <div key={index}>{result}</div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
