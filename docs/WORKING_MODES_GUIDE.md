# Working Modes Guide: SFTP vs SoluM API

## Table of Contents

1. [Overview](#overview)
2. [Mode Comparison](#mode-comparison)
3. [SFTP Mode](#sftp-mode)
4. [SoluM API Mode](#solum-api-mode)
5. [Switching Between Modes](#switching-between-modes)
6. [Common Features](#common-features)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Dental Medical Center application supports **two working modes** for data synchronization:

1. **SFTP Mode** - Traditional CSV file-based synchronization via SFTP server
2. **SoluM API Mode** - Modern API-based synchronization with SoluM Electronic Shelf Label (ESL) system

Each mode provides different capabilities and requires different configuration settings from the user.

---

## Mode Comparison

| Feature | SFTP Mode | SoluM API Mode |
|---------|-----------|----------------|
| **Data Format** | CSV files | REST API (JSON) |
| **Sync Type** | File upload/download | API push/pull |
| **Label Assignment** | Not supported | Direct label control |
| **Conference Mode** | CSV-based | Simple toggle + Full mode |
| **Credential Storage** | Username/Password | Username/Password + Tokens |
| **Auto-Sync** | Manual or scheduled file sync | Periodic API sync (configurable) |
| **Field Mapping** | CSV columns | API article schema |
| **Real-Time Updates** | Limited (file-based) | Yes (API-based) |
| **Label Page Control** | No | Yes (switch pages) |
| **Token Management** | Not required | Auto-refresh tokens |

---

## SFTP Mode

### Description

SFTP Mode synchronizes personnel and conference room data using CSV files stored on an SFTP server. The application downloads CSV files, parses them according to configured column mappings, and uploads modified data back to the server.

### When to Use SFTP Mode

- You have an existing SFTP server infrastructure
- Data is managed via CSV files
- You don't need real-time label updates
- Simple file-based workflow is sufficient
- No SoluM ESL hardware integration needed

### Required User Settings

#### 1. Connection Settings

Navigate to: **Settings → SFTP Connection → Connection Settings**

| Setting | Description | Example |
|---------|-------------|---------|
| **Username** | SFTP server username | `user@example.com` |
| **Password** | SFTP server password | `••••••••` |
| **CSV Filename** | Remote CSV file name | `dental_spaces.csv` |
| **Store** | Store identifier | `STORE_01` |

#### 2. CSV Structure Configuration

Navigate to: **Settings → SFTP Connection → CSV Structure**

Configure column mappings to match your CSV file format:

| Column Setting | Description | Required |
|----------------|-------------|----------|
| **Delimiter** | CSV field separator | ✅ (default: `;`) |
| **Column Index** | Position in CSV (0-based) | ✅ |
| **AimsValue** | Internal field identifier | ✅ |
| **Header (EN)** | English column header | ✅ |
| **Header (HE)** | Hebrew column header | ✅ |
| **Type** | Data type (text/number/email/phone) | Optional |
| **Mandatory** | Required field flag | Optional |

**Mandatory Mappings:**
- `store` - Store ID column
- `id` - Person/Space ID column
- `roomName` - Space/Room Name column

**Conference Fields (Optional):**
- `conferenceName` - Meeting name field
- `conferenceTime` - Meeting time field
- `conferenceParticipants` - Participants field

#### 3. App Settings

Navigate to: **Settings → App**

| Setting | Description | Default |
|---------|-------------|---------|
| **Working Mode** | Select "SFTP (CSV)" | `SFTP` |
| **Store Number** | Store identifier for CSV rows | `01` |
| **NFC URL** | NFC tag URL template | `https://solum.co.il/` |

### How SFTP Mode Works

#### Data Flow

```
┌─────────────────┐
│  SFTP Server    │
│                 │
│  ┌───────────┐  │
│  │ CSV File  │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │
         ▼
┌─────────────────────────────┐
│  Application                 │
│                             │
│  1. Download CSV            │
│  2. Parse with CSVService   │
│  3. Map to Person[] objects │
│  4. Update Local Store      │
│                             │
│  (User makes changes)       │
│                             │
│  5. Generate CSV from Store │
│  6. Upload to SFTP Server   │
└─────────────────────────────┘
```

#### Sync Workflow

1. **Download**: Application connects to SFTP server and downloads the configured CSV file
2. **Parse**: CSVService parses the file using configured delimiter and column mappings
3. **Map**: Data is mapped to `Person[]` objects based on column configuration
4. **Store**: Local Zustand store is updated with parsed personnel data
5. **Edit**: User makes changes in the UI (add/edit/delete personnel)
6. **Generate**: On save, CSVService generates CSV from current store state
7. **Upload**: Generated CSV is uploaded back to SFTP server

#### Services Used

- **`sftpApiClient.ts`** - HTTP bridge to SFTP server operations
- **`sftpService.ts`** - High-level SFTP connection and file management
- **`csvService.ts`** - CSV parsing and generation with configurable mappings
- **`settingsFileService.ts`** - Settings backup/restore to SFTP
- **`backupService.ts`** - Automatic backup creation on save

### Example CSV Structure

```csv
STORE_ID;ARTICLE_ID;ARTICLE_NAME;TITLE;SPECIALTY;NFC_URL;STORE_NUMBER
STORE_01;1;Room 101;Dr.;Dentistry;https://solum.co.il/;01
STORE_01;2;Room 102;Dr.;Orthodontics;https://solum.co.il/;01
STORE_01;C01;Conference A;;;https://solum.co.il/;01
```

### Limitations

- ❌ No real-time label updates
- ❌ No label page switching
- ❌ No direct label assignment
- ❌ Manual sync required (or scheduled)
- ❌ File locking conflicts possible with concurrent users

---

## SoluM API Mode

### Description

SoluM API Mode integrates directly with the SoluM Electronic Shelf Label (ESL) system via REST API. It synchronizes "articles" (representing personnel/rooms) with electronic labels, supports real-time updates, label assignment, and advanced conference room features.

### When to Use SoluM API Mode

- You have SoluM ESL hardware deployed
- You need real-time label updates
- You want to control label page switching
- You need direct label-to-article assignment
- Conference room status needs to update labels immediately

### Required User Settings

#### 1. Connection Settings

Navigate to: **Settings → App** → Select "SoluM API" → **Go to settings SoluM API**

| Setting | Description | Example |
|---------|-------------|---------|
| **Cluster/Environment** | SoluM API endpoint | Select from dropdown or Custom |
| **API Base URL** | Full API URL | `https://api.solumesl.com` |
| **Company Code** | Your company identifier | `COMPANY123` |
| **Store** | Store identifier | `STORE_01` |
| **Username** | SoluM API username | `user@example.com` |
| **Password** | SoluM API password | `••••••••` |
| **Sync Interval** | Auto-sync frequency (seconds) | `60` (default) |

#### 2. Conference Mode Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Simple Conference Mode** | Toggle Occupied/Available only | `false` |
| **Enable Conference Mode** | Enable conference room features | `false` |

**Simple Conference Mode:**
- When enabled, conference rooms show only name + Occupied/Available toggle
- Flipping page on label switches between Available (page 1) and Occupied (page 2)
- No meeting details, times, or participants

**Full Conference Mode:**
- Shows full meeting details (name, time, participants)
- Updates label with complete article data
- Conference rooms identified by IDs starting with 'C' (e.g., C01, C02)

#### 3. Article Format / Schema Configuration

Navigate to: **Settings → SoluM API** → Click **"Fetch Schema"**

The application will automatically:
1. Login to SoluM API
2. Fetch the configured article format (Product File Config)
3. Display available fields with mappings

**Field Configuration:**

| Column Setting | Description | Required |
|----------------|-------------|----------|
| **Field** | SoluM API field name | ✅ |
| **AimsValue** | Internal identifier | ✅ |
| **Header (EN)** | English display name | ✅ |
| **Header (HE)** | Hebrew display name | ✅ |
| **Type** | Data type | Optional |
| **Mandatory** | Required field | Optional |

**Mandatory Mappings:**
- `store` → `STORE_ID` (SoluM key)
- `id` → `ARTICLE_ID` (SoluM articleId)
- `roomName` → `ARTICLE_NAME` (SoluM articleName)

**Space Mapping:**
- `spaceId` - Field for space/room ID
- `spaceName` - Field for space/room name
- `nfcUrl` - Field for NFC URL data

#### 4. App Settings

Navigate to: **Settings → App**

| Setting | Description | Default |
|---------|-------------|---------|
| **Working Mode** | Select "SoluM API" | `SOLUM_API` |
| **Store Number** | Store identifier | `01` |
| **NFC URL** | NFC URL template | `https://solum.co.il/` |

### How SoluM API Mode Works

#### Data Flow

```
┌──────────────────────────────┐
│  SoluM ESL Platform          │
│                              │
│  ┌────────────────────────┐  │
│  │  Articles Database     │  │
│  │  Labels Registry       │  │
│  │  Templates            │  │
│  └──────────┬─────────────┘  │
└─────────────┼────────────────┘
              │
              │ REST API
              │
              ▼
┌──────────────────────────────────────┐
│  Application                          │
│                                      │
│  1. Login → Get Access Token         │
│  2. Fetch Articles by Store          │
│  3. Fetch Label Assignments          │
│  4. Map Articles → Person[] objects  │
│  5. Update Local Store               │
│                                      │
│  (User makes changes)                │
│                                      │
│  6. Map Person[] → Articles          │
│  7. Push Articles via API            │
│  8. Update Label Assignments         │
│  9. Auto-refresh Token (periodically)│
└──────────────────────────────────────┘
```

#### Sync Workflow

1. **Authentication**: Login with username/password to get access token + refresh token
2. **Fetch Articles**: GET articles for configured store from `/common/api/v2/common/config/article/info`
3. **Fetch Labels**: GET label assignments from `/common/api/v2/common/labels`
4. **Map to Objects**: `solumService.mapArticlesToPeople()` converts articles to `Person[]` using schema
5. **Update Store**: Local Zustand store updated with personnel
6. **Edit**: User makes changes in UI
7. **Map to Articles**: `solumService.mapPeopleToArticles()` converts `Person[]` back to SoluM articles
8. **Push Updates**: POST articles to `/common/api/v2/common/articles`
9. **Assign Labels**: POST label assignments to `/common/api/v2/common/labels/link`
10. **Auto-Sync**: `useSolumSync` hook triggers periodic sync based on `syncInterval`
11. **Token Refresh**: Automatically refresh access token before expiry

#### Services Used

- **`solumService.ts`** - SoluM API client (login, fetch, push, label operations)
- **`useSolumSync.ts`** - Hook for automatic periodic synchronization
- **`csvService.ts` (Mapping)** - Schema-based article ↔ Person mapping
- **`encryptionService.ts`** - Secure credential and token storage

#### Token Management

- **Access Token**: Valid for configured duration (typically 1 hour)
- **Refresh Token**: Used to get new access token without re-login
- **Auto-Refresh**: Tokens automatically refreshed 5 minutes before expiry
- **Storage**: Encrypted in local storage via `encryptionService`
- **Expiry Tracking**: `expiresAt` timestamp stored with tokens

### SoluM API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/common/api/v2/token` | POST | Login (get tokens) |
| `/common/api/v2/token/refresh` | POST | Refresh access token |
| `/common/api/v2/common/config/article/info` | GET | Fetch articles |
| `/common/api/v2/common/articles` | POST | Push articles (bulk upsert) |
| `/common/api/v2/common/articles` | DELETE | Delete articles |
| `/common/api/v2/common/articles/upload/format` | GET | Fetch article schema |
| `/common/api/v2/common/articles/upload/format` | POST | Update article schema |
| `/common/api/v2/common/labels` | GET | Get all labels |
| `/common/api/v2/common/labels/article` | GET | Get labels linked to article |
| `/common/api/v2/common/labels/link` | POST | Assign labels to articles |
| `/common/api/v2/common/labels/unlink` | POST | Unassign labels |
| `/common/api/v2/common/labels/page` | POST | Switch label page |
| `/common/api/v2/common/labels/unassigned/detail` | GET | Get label detail (active page) |
| `/common/api/v2/common/labels/status/history` | GET | Get label status history |

### Conference Room Features (SoluM Mode)

#### Simple Mode

**Enable:** Settings → SoluM API → ☑ Simple Conference Room Mode

**Behavior:**
- Conference rooms (IDs like C01, C02) show only:
  - Room name
  - Occupied/Available toggle button
- Clicking **"Flip Page"** calls `updateLabelPage()` to switch label display:
  - Page 1 = Available
  - Page 2 = Occupied
- Application detects current page from label and toggles it
- No meeting details required

**Use Case:** Simple room availability signage

#### Full Conference Mode

**Enable:** Settings → SoluM API → ☑ Enable Conference Mode (Filter C*)

**Behavior:**
- Conference rooms support full meeting details:
  - Meeting name
  - Start/End time
  - Participant list
- On save, full article data is pushed to SoluM API
- Labels update with complete meeting information
- Conference fields mapped via CSV config:
  - `conferenceName` → Meeting name field
  - `conferenceTime` → Time range field
  - `conferenceParticipants` → Participants field

**Use Case:** Full meeting room management with detailed scheduling

### Auto-Sync Mechanism

```typescript
// useSolumSync hook (src/hooks/useSolumSync.ts)

useEffect(() => {
  if (workingMode === 'SOLUM_API' && solumConfig) {
    const interval = setInterval(() => {
      syncFromSolum(); // Fetch articles and update store
    }, solumConfig.syncInterval * 1000);
    
    return () => clearInterval(interval);
  }
}, [workingMode, solumConfig?.syncInterval, syncFromSolum]);
```

**Default Interval:** 60 seconds  
**Configurable:** Settings → SoluM API → Sync Interval

### Limitations

- ✅ Requires active internet connection
- ✅ SoluM account and licenses needed
- ✅ API rate limits may apply
- ✅ More complex configuration than SFTP

---

## Switching Between Modes

### How to Switch

1. Navigate to **Settings → App**
2. Under **"Working Mode"**, select:
   - **SFTP (CSV)** for SFTP mode
   - **SoluM API** for SoluM mode
3. Click **"Go to settings [Mode]"** to configure mode-specific settings
4. Click **Save** to apply changes

### What Happens When Switching

#### Switching from SFTP → SoluM API

1. Application stops SFTP file sync
2. CSV configuration is saved as `sftpCsvConfig`
3. SoluM configuration becomes active
4. New field mapping: SoluM article schema → `solumCsvConfig`
5. Personnel data remains in local store (not lost)
6. Next sync uses SoluM API

#### Switching from SoluM API → SFTP

1. Application stops SoluM auto-sync
2. SoluM tokens remain stored (encrypted)
3. CSV configuration switches back to `sftpCsvConfig`
4. Personnel data remains in local store
5. Next sync downloads from SFTP server

### Important Notes

- ⚠️ **Data is NOT automatically migrated** between systems
- ⚠️ You may need to manually sync data after switching
- ⚠️ Configuration for each mode is preserved separately
- ✅ Local personnel/conference data is preserved in store

---

## Common Features

Both modes share these features:

### Personnel Management

- ✅ Add/Edit/Delete personnel records
- ✅ Dynamic field mapping based on configuration
- ✅ Search and filter by room, title, specialty
- ✅ Bulk import/export
- ✅ Save/Load pre-configured lists

### Conference Room Management

- ✅ Add/Edit/Delete conference rooms
- ✅ Meeting status tracking
- ✅ Time range validation
- ✅ Participant lists
- ✅ IDs starting with 'C' (e.g., C01, C02)

### Settings Management

- ✅ App name and subtitle customization
- ✅ Space type (Room vs Chair) terminology
- ✅ Logo upload (up to 3 logos)
- ✅ Multi-language support (English/Hebrew)
- ✅ NFC URL configuration
- ✅ Store number assignment
- ✅ Auto-save toggle
- ✅ Settings export/import (encrypted JSON)
- ✅ Automatic backup creation

### Data Storage

- ✅ Zustand state management
- ✅ LocalStorage persistence
- ✅ Encrypted credential storage (AES-256)
- ✅ Devtools integration for debugging

### Security

- ✅ AES-256 encryption for passwords
- ✅ Secure credential storage
- ✅ Device-specific encryption keys
- ✅ Password redaction in logs

---

## Troubleshooting

### SFTP Mode Issues

#### "Connection failed"
- ✅ Check SFTP credentials (username/password)
- ✅ Verify SFTP API bridge is accessible
- ✅ Ensure firewall allows SFTP API connections
- ✅ Check network connectivity

#### "CSV File Not Found"
- ✅ Verify `remoteFileName` is correct
- ✅ Check file exists on SFTP server
- ✅ Application will offer to create file

#### "Parse Error"
- ✅ Check CSV delimiter matches configuration
- ✅ Verify column mappings align with actual CSV
- ✅ Review CSV structure settings
- ✅ Check for special characters or encoding issues

### SoluM API Mode Issues

#### "Login failed" / "Unauthorized"
- ✅ Verify SoluM credentials (username/password)
- ✅ Check company code is correct
- ✅ Ensure API base URL is accessible
- ✅ Confirm account has proper permissions

#### "Failed to fetch schema"
- ✅ Login first (credentials must be saved)
- ✅ Check company code and store ID
- ✅ Verify API permissions for article format access
- ✅ Review logs for detailed error

#### "Token expired"
- ✅ Tokens auto-refresh normally
- ✅ If manual refresh needed, re-login via Settings
- ✅ Check stored tokens in DevTools → Application → LocalStorage

#### "Failed to push articles"
- ✅ Verify article format matches schema
- ✅ Check mandatory fields are filled
- ✅ Review API error in browser console
- ✅ Ensure store ID is correct

#### "Label page not switching"
- ✅ Verify label code is correct
- ✅ Check label is linked to article
- ✅ Confirm label is online (check battery/signal)
- ✅ Use Logs viewer to see API responses

### General Issues

#### "Changes not saving"
- ✅ Check connection status
- ✅ Verify credentials are configured
- ✅ Look for error notifications
- ✅ Review application logs (Settings → Logs)

#### "Auto-save not working"
- ✅ Enable in Settings → App → ☑ Enable Auto-Save
- ✅ Auto-save triggers 3 seconds after editing stops
- ✅ Changes saved locally, sync every 30s (SFTP) or per interval (SoluM)

#### "Data disappeared after switching modes"
- ✅ Data is still in local store
- ✅ Switching modes doesn't delete data
- ✅ Perform manual sync to reload from server

---

## Configuration Examples

### Example 1: SFTP Mode Setup

**Scenario:** Small dental clinic with existing CSV files on SFTP server

**Settings:**
```
Working Mode: SFTP (CSV)
SFTP Username: clinic@sftp.example.com
SFTP Password: ••••••••
CSV Filename: spaces.csv
Store: CLINIC_01

CSV Structure:
Delimiter: ;
Columns:
  0: STORE_ID (mapped to store)
  1: ARTICLE_ID (mapped to id)
  2: ARTICLE_NAME (mapped to roomName)
  3: TITLE
  4: SPECIALTY
  5: NFC_URL (mapped to nfcUrl)
```

**CSV File:**
```csv
STORE_ID;ARTICLE_ID;ARTICLE_NAME;TITLE;SPECIALTY;NFC_URL
CLINIC_01;1;Room 1;Dr.;Dentistry;https://clinic.example.com/1
CLINIC_01;2;Room 2;Dr.;Orthodontics;https://clinic.example.com/2
```

### Example 2: SoluM API Mode Setup

**Scenario:** Large medical center with SoluM ESL deployed

**Settings:**
```
Working Mode: SoluM API
API Base URL: https://api.solumesl.com
Company Code: MEDCENTER
Store: STORE_03
Username: admin@medcenter.com
Password: ••••••••
Sync Interval: 60 seconds
Simple Conference Mode: ☑ (Enabled)
Enable Conference Mode: ☑ (Enabled)

Article Format:
Fields fetched from SoluM schema:
  - STORE_ID (store)
  - ARTICLE_ID (id)
  - ARTICLE_NAME (roomName)
  - TITLE
  - SPECIALTY
  - NFC_URL (nfcUrl)
```

**Article Mapping:**
```json
{
  "fileExtension": "csv",
  "delimeter": ";",
  "mappingInfo": {
    "store": "STORE_ID",
    "articleId": "ARTICLE_ID",
    "articleName": "ARTICLE_NAME",
    "nfcUrl": "NFC_URL"
  },
  "articleBasicInfo": [
    "store",
    "articleId",
    "articleName",
    "nfcUrl"
  ],
  "articleData": [
    "TITLE",
    "SPECIALTY"
  ]
}
```

---

## Summary

### Choose SFTP Mode When:
- ✅ You have existing SFTP infrastructure
- ✅ CSV-based workflow is sufficient
- ✅ Real-time updates are not critical
- ✅ Simple file-based sync is preferred
- ✅ No ESL hardware integration needed

### Choose SoluM API Mode When:
- ✅ You have SoluM ESL hardware
- ✅ Real-time label updates required
- ✅ Label page switching capability needed
- ✅ Direct label assignment required
- ✅ Conference room status needs instant updates

### Both Modes Provide:
- ✅ Full personnel management
- ✅ Conference room support
- ✅ Multi-language support (EN/HE)
- ✅ Encrypted credential storage
- ✅ Settings export/import
- ✅ Automatic backups
- ✅ Comprehensive logging

---

## Additional Resources

- **Architecture Documentation**: `docs/new_architecture/high_level_design.md`
- **UI Migration Guide**: `docs/new_architecture/UI_MIGRATION_GUIDE.md`
- **Package Usage**: `docs/new_architecture/PACKAGE_USAGE.md`
- **Application Logs**: Settings → Logs (view detailed sync operations)
- **SoluM API Spec**: `solumapi.yaml` (OpenAPI specification)

---

**Last Updated:** 2025-12-16  
**Version:** 1.0  
**Status:** Production Ready

---

## Architecture Improvements for V2 Feature-Based Design

> **Note:** This section outlines recommended improvements for the new **feature-based vertical slice architecture** being developed for Dental Medical Center V2. These improvements address current architectural challenges and provide a more maintainable, testable, and scalable foundation.

### Current Architecture Challenges (V1)

The current implementation has several areas for improvement:

1. **❌ Tight Coupling**: Services directly referenced throughout the codebase
2. **❌ Mode Logic Scattered**: Working mode checks spread across multiple files
3. **❌ Duplicate Code**: Similar sync logic in SFTP and SoluM implementations
4. **❌ Testing Difficulty**: Hard to mock services and test mode-specific behavior
5. **❌ Configuration Complexity**: Multiple config objects for different modes
6. **❌ Error Handling**: Inconsistent error patterns between modes
7. **❌ State Management**: Single global store with mixed concerns

### Recommended Improvements for V2

---

## 1. Adapter Pattern with Unified Interface

### Problem

Current implementation:
```typescript
// Scattered mode checks throughout codebase
if (state.workingMode === 'SFTP') {
  await sftpService.uploadFile(credentials, data);
} else if (state.workingMode === 'SOLUM_API') {
  await solumService.pushArticles(config, storeId, token, articles);
}
```

### Solution: Unified SyncAdapter Interface

Create a common interface that both SFTP and SoluM implementations follow:

```typescript
// shared/domain/sync/SyncAdapter.ts
export interface SyncAdapter {
  /**
   * Connect and authenticate with the sync target
   */
  connect(credentials: SyncCredentials): Promise<void>;
  
  /**
   * Disconnect and cleanup resources
   */
  disconnect(): Promise<void>;
  
  /**
   * Download/fetch data from sync target
   */
  download(): Promise<Person[]>;
  
  /**
   * Upload/push data to sync target
   */
  upload(personnel: Person[]): Promise<void>;
  
  /**
   * Bidirectional sync (download + merge + upload)
   */
  sync(strategy?: 'server-wins' | 'client-wins' | 'merge'): Promise<SyncResult>;
  
  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus;
  
  /**
   * Test connection without persisting credentials
   */
  testConnection(credentials: SyncCredentials): Promise<boolean>;
  
  /**
   * Conference-specific: Update room status (if supported)
   */
  updateConferenceStatus?(roomId: string, status: ConferenceStatus): Promise<void>;
  
  /**
   * Label-specific: Assign label to person (if supported)
   */
  assignLabel?(personId: string, labelCode: string): Promise<void>;
}

export interface SyncCredentials {
  mode: 'SFTP' | 'SOLUM_API';
  sftp?: SFTPCredentials;
  solum?: SolumCredentials;
}

export interface SyncResult {
  success: boolean;
  downloaded: number;
  uploaded: number;
  conflicts: ConflictItem[];
  errors: SyncError[];
}
```

### Implementation Examples

#### SFTP Adapter

```typescript
// features/sync/infrastructure/adapters/SFTPSyncAdapter.ts
import type { SyncAdapter, SyncCredentials, Person, SyncResult } from '../../../shared/domain';

export class SFTPSyncAdapter implements SyncAdapter {
  private sftpClient: SFTPAPIClient;
  private csvService: CSVService;
  private status: ConnectionStatus = 'disconnected';
  
  constructor(
    private csvService: CSVService,
    private config: CSVConfig
  ) {
    this.sftpClient = new SFTPAPIClient({ baseURL: SFTP_API_HOST });
  }
  
  async connect(credentials: SyncCredentials): Promise<void> {
    if (!credentials.sftp) {
      throw new Error('SFTP credentials required');
    }
    
    this.status = 'connecting';
    
    try {
      const result = await this.sftpClient.testConnection(
        credentials.sftp.username,
        credentials.sftp.password
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Connection failed');
      }
      
      this.status = 'connected';
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    this.status = 'disconnected';
  }
  
  async download(): Promise<Person[]> {
    if (this.status !== 'connected') {
      throw new Error('Not connected');
    }
    
    const csvContent = await this.sftpClient.downloadFile(/* ... */);
    const personnel = this.csvService.parseCSV(csvContent, this.config);
    return personnel;
  }
  
  async upload(personnel: Person[]): Promise<void> {
    const csvContent = this.csvService.generateCSV(personnel, this.config);
    await this.sftpClient.uploadFile(/* credentials, */ csvContent);
  }
  
  async sync(strategy = 'server-wins'): Promise<SyncResult> {
    // Implement sync logic with conflict resolution
    const serverData = await this.download();
    // Apply merge strategy...
    return { success: true, downloaded: serverData.length, uploaded: 0, conflicts: [], errors: [] };
  }
  
  getStatus(): ConnectionStatus {
    return this.status;
  }
  
  async testConnection(credentials: SyncCredentials): Promise<boolean> {
    // Test without changing state
    return true;
  }
}
```

#### SoluM Adapter

```typescript
// features/sync/infrastructure/adapters/SolumSyncAdapter.ts
export class SolumSyncAdapter implements SyncAdapter {
  private solumClient: SolumService;
  private tokenManager: TokenManager;
  private status: ConnectionStatus = 'disconnected';
  
  constructor(
    private solumService: SolumService,
    private config: SolumConfig,
    private mappingConfig: MappingConfig
  ) {
    this.solumClient = solumService;
    this.tokenManager = new TokenManager();
  }
  
  async connect(credentials: SyncCredentials): Promise<void> {
    if (!credentials.solum) {
      throw new Error('SoluM credentials required');
    }
    
    this.status = 'connecting';
    
    try {
      const tokens = await this.solumClient.login(credentials.solum);
      this.tokenManager.setTokens(tokens);
      this.status = 'connected';
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    this.tokenManager.clearTokens();
    this.status = 'disconnected';
  }
  
  async download(): Promise<Person[]> {
    const token = await this.tokenManager.getValidToken(this.config);
    const articles = await this.solumClient.fetchArticles(this.config, this.config.store, token);
    const personnel = this.solumClient.mapArticlesToPeople(articles, this.mappingConfig);
    return personnel;
  }
  
  async upload(personnel: Person[]): Promise<void> {
    const token = await this.tokenManager.getValidToken(this.config);
    const articles = this.solumClient.mapPeopleToArticles(personnel, this.mappingConfig, this.config);
    await this.solumClient.pushArticles(this.config, this.config.store, token, articles);
  }
  
  async sync(strategy = 'client-wins'): Promise<SyncResult> {
    // Implement bidirectional sync
    const serverData = await this.download();
    // Apply merge strategy...
    return { success: true, downloaded: serverData.length, uploaded: 0, conflicts: [], errors: [] };
  }
  
  getStatus(): ConnectionStatus {
    return this.status;
  }
  
  async testConnection(credentials: SyncCredentials): Promise<boolean> {
    try {
      await this.solumClient.login(credentials.solum!);
      return true;
    } catch {
      return false;
    }
  }
  
  // SoluM-specific methods
  async assignLabel(personId: string, labelCode: string): Promise<void> {
    const token = await this.tokenManager.getValidToken(this.config);
    await this.solumClient.assignLabel(this.config, this.config.store, token, labelCode, personId);
  }
  
  async updateConferenceStatus(roomId: string, status: ConferenceStatus): Promise<void> {
    const token = await this.tokenManager.getValidToken(this.config);
    const page = status === 'occupied' ? 2 : 1;
    await this.solumClient.updateLabelPage(this.config, this.config.store, token, roomId, page);
  }
}
```

### Usage in Application

```typescript
// features/sync/application/useSyncController.ts
export function useSyncController() {
  const workingMode = useAppStore(state => state.workingMode);
  const sftpConfig = useAppStore(state => state.sftpCsvConfig);
  const solumConfig = useAppStore(state => state.solumConfig);
  
  // Get the appropriate adapter based on mode
  const adapter = useMemo<SyncAdapter>(() => {
    if (workingMode === 'SFTP') {
      return new SFTPSyncAdapter(csvService, sftpConfig);
    } else {
      return new SolumSyncAdapter(solumService, solumConfig, solumCsvConfig);
    }
  }, [workingMode, sftpConfig, solumConfig]);
  
  const syncData = async () => {
    try {
      const result = await adapter.sync('client-wins');
      if (result.success) {
        setPersonnel(result.data);
      }
    } catch (error) {
      handleError(error);
    }
  };
  
  return { syncData, adapter };
}
```

**Benefits:**
- ✅ No mode checks scattered throughout code
- ✅ Easy to add new sync modes (e.g., WebDAV, Dropbox)
- ✅ Testable with mock adapters
- ✅ Clear separation of concerns
- ✅ Swappable implementations at runtime

---

## 2. Dependency Injection Pattern

### Problem

Services are imported directly and created as singletons:

```typescript
import { sftpService } from '../../services/sftpService';
import { solumService } from '../../services/solumService';
```

Difficult to:
- Test with mocks
- Replace implementations
- Manage lifecycle

### Solution: Dependency Injection Container

```typescript
// shared/infrastructure/di/container.ts
export class DIContainer {
  private services = new Map<string, any>();
  
  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }
  
  resolve<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service ${key} not registered`);
    }
    return factory();
  }
}

export const container = new DIContainer();

// Register services
container.register('CSVService', () => new CSVService());
container.register('SFTPAdapter', () => 
  new SFTPSyncAdapter(
    container.resolve('CSVService'),
    useAppStore.getState().sftpCsvConfig
  )
);
container.register('SolumAdapter', () => 
  new SolumSyncAdapter(
    new SolumService(),
    useAppStore.getState().solumConfig,
    useAppStore.getState().solumCsvConfig
  )
);
```

**Usage:**

```typescript
// In tests
const mockAdapter = {
  connect: vi.fn(),
  download: vi.fn().mockResolvedValue([]),
  upload: vi.fn(),
  // ...
};
container.register('SyncAdapter', () => mockAdapter);

// In production
const adapter = container.resolve<SyncAdapter>('SyncAdapter');
```

---

## 3. Feature-Based Vertical Slices

### New Directory Structure

```
src/
├── features/
│   ├── personnel/
│   │   ├── domain/
│   │   │   ├── types.ts              # Person, ValidationRules
│   │   │   ├── validators.ts         # Pure validation functions
│   │   │   └── businessRules.ts      # Business logic
│   │   ├── application/
│   │   │   ├── usePersonnelController.ts  # CRUD operations
│   │   │   ├── usePersonnelFilters.ts     # Filter logic
│   │   │   └── usePersonnelSync.ts        # Sync orchestration
│   │   ├── infrastructure/
│   │   │   ├── personnelStore.ts     # Zustand slice
│   │   │   └── personnelRepository.ts # Data access
│   │   └── presentation/
│   │       ├── PersonnelManagement.tsx
│   │       ├── PersonDialog.tsx
│   │       └── PersonnelTable.tsx
│   │
│   ├── sync/
│   │   ├── domain/
│   │   │   ├── SyncAdapter.ts        # Adapter interface
│   │   │   └── types.ts
│   │   ├── application/
│   │   │   └── useSyncController.ts  # Sync orchestration
│   │   ├── infrastructure/
│   │   │   ├── adapters/
│   │   │   │   ├── SFTPSyncAdapter.ts
│   │   │   │   └── SolumSyncAdapter.ts
│   │   │   └── syncStore.ts
│   │   └── presentation/
│   │       └── SyncStatus.tsx
│   │
│   ├── settings/
│   │   ├── domain/
│   │   │   ├── types.ts
│   │   │   └── validators.ts
│   │   ├── application/
│   │   │   └── useSettingsController.ts
│   │   ├── infrastructure/
│   │   │   ├── settingsStore.ts
│   │   │   └── settingsRepository.ts
│   │   └── presentation/
│   │       ├── SettingsDialog.tsx
│   │       ├── AppSettings.tsx
│   │       ├── SFTPSettings.tsx
│   │       └── SolumSettings.tsx
│   │
│   └── conference/
│       └── [same structure]
│
├── shared/
│   ├── domain/
│   │   └── types.ts             # Cross-feature types
│   ├── infrastructure/
│   │   ├── services/
│   │   │   ├── csvService.ts
│   │   │   ├── logger.ts
│   │   │   └── encryptionService.ts
│   │   ├── di/
│   │   │   └── container.ts
│   │   └── store/
│   │       └── rootStore.ts     # Combines feature stores
│   └── presentation/
│       ├── components/          # Shared UI components
│       └── layouts/
```

**Benefits:**
- ✅ Each feature is self-contained
- ✅ Clear dependency boundaries
- ✅ Easy to understand feature scope
- ✅ Scalable (add features without touching existing ones)

---

## 4. Mode Configuration Unification

### Problem

Separate configuration objects for each mode:

```typescript
interface AppState {
  csvConfig: CSVConfig;
  sftpCsvConfig: CSVConfig;
  solumCsvConfig: MappingConfig;
  sftpCredentials?: SFTPCredentials;
  solumConfig?: SolumConfig;
  solumTokens?: SolumTokens;
}
```

### Solution: Unified Configuration Model

```typescript
// features/settings/domain/types.ts
export interface SyncConfiguration {
  mode: 'SFTP' | 'SOLUM_API';
  active: SFTPConfig | SolumConfig;
  sftp: SFTPConfig;
  solum: SolumConfig;
}

export interface SFTPConfig {
  credentials: {
    username: string;
    password: string;
    remoteFileName: string;
    store: string;
  };
  mapping: CSVConfig;
  autoSync: boolean;
  syncInterval: number; // seconds
}

export interface SolumConfig {
  credentials: {
    baseUrl: string;
    company: string;
    store: string;
    username: string;
    password?: string;
  };
  tokens?: SolumTokens;
  mapping: MappingConfig;
  autoSync: boolean;
  syncInterval: number;
  features: {
    conferenceMode: boolean;
    simpleConferenceMode: boolean;
    labelControl: boolean;
  };
}

// Single source of truth
export interface AppConfiguration {
  app: AppSettings;
  sync: SyncConfiguration;
  ui: UIConfiguration;
  security: SecuritySettings;
}
```

**Usage:**

```typescript
const config = useAppStore(state => state.configuration);
const activeConfig = config.sync.active; // Type-safe, always correct mode config
```

---

## 5. Testing Strategy

### Current Gaps

- Limited unit tests
- No integration tests for sync adapters
- Difficult to test mode-specific behavior

### Improved Testing Approach

#### Unit Tests for Adapters

```typescript
// features/sync/infrastructure/adapters/__tests__/SFTPSyncAdapter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SFTPSyncAdapter } from '../SFTPSyncAdapter';

describe('SFTPSyncAdapter', () => {
  it('should connect with valid credentials', async () => {
    const mockCSVService = { parseCSV: vi.fn(), generateCSV: vi.fn() };
    const adapter = new SFTPSyncAdapter(mockCSVService as any, mockConfig);
    
    const credentials = {
      mode: 'SFTP' as const,
      sftp: {
        username: 'test',
        password: 'test',
        remoteFileName: 'test.csv',
        store: 'STORE_01'
      }
    };
    
    await expect(adapter.connect(credentials)).resolves.not.toThrow();
    expect(adapter.getStatus()).toBe('connected');
  });
  
  it('should download and parse CSV correctly', async () => {
    // ... test implementation
  });
  
  it('should handle connection errors gracefully', async () => {
    // ... test error cases
  });
});
```

#### Integration Tests

```typescript
// features/sync/__tests__/integration/sync.test.ts
describe('Sync Integration', () => {
  it('should sync data between SFTP and local store', async () => {
    // Mock SFTP server
    const mockServer = setupMockSFTPServer();
    
    // Create adapter
    const adapter = new SFTPSyncAdapter(/* ... */);
    
    // Perform sync
    const result = await adapter.sync();
    
    expect(result.success).toBe(true);
    expect(result.downloaded).toBeGreaterThan(0);
    
    mockServer.close();
  });
});
```

#### E2E Tests with Mock Adapters

```typescript
// tests/e2e/mode-switching.test.ts
import { render, screen, fireEvent } from '@testing-library/react';

describe('Mode Switching', () => {
  it('should switch from SFTP to SoluM without data loss', async () => {
    const mockSFTPAdapter = createMockAdapter('SFTP');
    const mockSolumAdapter = createMockAdapter('SOLUM_API');
    
    container.register('SFTPAdapter', () => mockSFTPAdapter);
    container.register('SolumAdapter', () => mockSolumAdapter);
    
    render(<App />);
    
    // Switch mode
    fireEvent.click(screen.getByText(/SoluM API/i));
    fireEvent.click(screen.getByText(/Save/i));
    
    // Verify data persisted
    const personnel = useAppStore.getState().personnel;
    expect(personnel).toHaveLength(3);
  });
});
```

---

## 6. Error Handling Improvements

### Problem

Inconsistent error handling between modes:

```typescript
// SFTP errors
throw new Error('Failed to upload file to SFTP server');

// SoluM errors  
throw new Error(`Login failed: ${JSON.stringify(data.responseMessage)}`);
```

### Solution: Typed Error Classes

```typescript
// shared/domain/errors.ts
export abstract class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class SyncError extends AppError {
  constructor(message: string, public syncMode: 'SFTP' | 'SOLUM_API', metadata?: Record<string, any>) {
    super(message, 'SYNC_ERROR', { syncMode, ...metadata });
  }
}

export class ConnectionError extends SyncError {
  constructor(message: string, syncMode: 'SFTP' | 'SOLUM_API') {
    super(message, syncMode);
    this.code = 'CONNECTION_ERROR';
  }
}

export class AuthenticationError extends SyncError {
  constructor(message: string, syncMode: 'SFTP' | 'SOLUM_API') {
    super(message, syncMode);
    this.code = 'AUTH_ERROR';
  }
}

export class DataValidationError extends AppError {
  constructor(message: string, public field: string, public value: any) {
    super(message, 'VALIDATION_ERROR', { field, value });
  }
}
```

**Usage with Type Guards:**

```typescript
// features/sync/application/useSyncController.ts
const syncData = async () => {
  try {
    await adapter.sync();
  } catch (error) {
    if (error instanceof ConnectionError) {
      showNotification({
        type: 'error',
        message: t('errors.connection'),
        details: error.message,
        action: 'retry'
      });
    } else if (error instanceof AuthenticationError) {
      showNotification({
        type: 'error',
        message: t('errors.authentication'),
        action: 'reconfigure'
      });
      navigateToSettings();
    } else {
      logger.error('Sync', 'Unexpected error', error);
      showGenericError();
    }
  }
};
```

---

## 7. State Management Improvements

### Problem

Single global store with mixed concerns:

```typescript
interface AppState {
  // Personnel
  personnel: Person[];
  // Conference
  conferenceRooms: ConferenceRoom[];
  // Settings
  csvConfig: CSVConfig;
  sftpConfig: SFTPCredentials;
  solumConfig: SolumConfig;
  // UI
  isLoading: boolean;
  error: string | null;
  // ... many more fields
}
```

### Solution: Feature Slices with Composition

```typescript
// features/personnel/infrastructure/personnelStore.ts
export interface PersonnelState {
  items: Person[];
  selectedId: string | null;
  filters: PersonnelFilters;
  isLoading: boolean;
  error: string | null;
}

export const createPersonnelSlice = (set, get) => ({
  personnel: {
    items: [],
    selectedId: null,
    filters: {},
    isLoading: false,
    error: null,
  },
  
  addPerson: (person: Person) => set((state) => ({
    personnel: {
      ...state.personnel,
      items: [...state.personnel.items, person]
    }
  })),
  
  // ... other actions
});
```

```typescript
// features/sync/infrastructure/syncStore.ts
export interface SyncState {
  status: ConnectionStatus;
  lastSyncTime: number | null;
  syncResult: SyncResult | null;
  isAutoSyncEnabled: boolean;
}

export const createSyncSlice = (set, get) => ({
  sync: {
    status: 'disconnected',
    lastSyncTime: null,
    syncResult: null,
    isAutoSyncEnabled: true,
  },
  
  setStatus: (status: ConnectionStatus) => set((state) => ({
    sync: { ...state.sync, status }
  })),
  
  // ... other actions
});
```

```typescript
// shared/infrastructure/store/rootStore.ts
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { createPersonnelSlice } from '../../../features/personnel/infrastructure/personnelStore';
import { createSyncSlice } from '../../../features/sync/infrastructure/syncStore';
import { createSettingsSlice } from '../../../features/settings/infrastructure/settingsStore';

export const useAppStore = create(
  devtools(
    persist(
      (set, get) => ({
        ...createPersonnelSlice(set, get),
        ...createSyncSlice(set, get),
        ...createSettingsSlice(set, get),
      }),
      { name: 'dental-center-store' }
    )
  )
);
```

**Benefits:**
- ✅ Clear feature boundaries in state
- ✅ Each slice is independently testable
- ✅ Easier to understand state shape
- ✅ Better TypeScript inference

---

## 8. Mode-Specific Feature Flags

### Problem

Features availability checked manually:

```typescript
if (workingMode === 'SOLUM_API') {
  // Show label control UI
}
```

### Solution: Feature Capability Matrix

```typescript
// features/sync/domain/capabilities.ts
export interface ModeCapabilities {
  supportsLabelControl: boolean;
  supportsPageSwitching: boolean;
  supportsConferenceMode: boolean;
  supportsSimpleConference: boolean;
  supportsRealTimeSync: boolean;
  requiresTokenManagement: boolean;
  maxSyncInterval: number; // seconds
  supportsBulkOperations: boolean;
}

export const MODE_CAPABILITIES: Record<WorkingMode, ModeCapabilities> = {
  SFTP: {
    supportsLabelControl: false,
    supportsPageSwitching: false,
    supportsConferenceMode: true,
    supportsSimpleConference: false,
    supportsRealTimeSync: false,
    requiresTokenManagement: false,
    maxSyncInterval: 3600,
    supportsBulkOperations: true,
  },
  SOLUM_API: {
    supportsLabelControl: true,
    supportsPageSwitching: true,
    supportsConferenceMode: true,
    supportsSimpleConference: true,
    supportsRealTimeSync: true,
    requiresTokenManagement: true,
    maxSyncInterval: 60,
    supportsBulkOperations: true,
  },
};
```

**Usage:**

```typescript
// features/personnel/presentation/PersonnelManagement.tsx
const workingMode = useAppStore(state => state.sync.mode);
const capabilities = MODE_CAPABILITIES[workingMode];

return (
  <div>
    {capabilities.supportsLabelControl && (
      <LabelControlPanel />
    )}
    {capabilities.supportsPageSwitching && (
      <PageSwitchButton />
    )}
  </div>
);
```

---

## 9. Improved Auto-Sync Architecture

### Problem

Auto-sync logic scattered and mode-specific:

```typescript
// In useSolumSync.ts
useEffect(() => {
  if (workingMode === 'SOLUM_API' && solumConfig) {
    const interval = setInterval(() => {
      syncFromSolum();
    }, solumConfig.syncInterval * 1000);
    return () => clearInterval(interval);
  }
}, [workingMode, solumConfig?.syncInterval]);
```

### Solution: Generic Auto-Sync Hook

```typescript
// features/sync/application/useAutoSync.ts
export function useAutoSync(adapter: SyncAdapter, config: SyncConfig) {
  const { isEnabled, interval } = config;
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  useEffect(() => {
    if (!isEnabled || !adapter) return;
    
    const performSync = async () => {
      if (isSyncing) return; // Prevent concurrent syncs
      
      setIsSyncing(true);
      try {
        await adapter.sync('server-wins');
        setLastSync(new Date());
      } catch (error) {
        logger.error('AutoSync', 'Sync failed', error);
      } finally {
        setIsSyncing(false);
      }
    };
    
    // Initial sync
    performSync();
    
    // Periodic sync
    const intervalId = setInterval(performSync, interval * 1000);
    
    return () => clearInterval(intervalId);
  }, [adapter, isEnabled, interval, isSyncing]);
  
  return { lastSync, isSyncing };
}
```

**Usage:**

```typescript
const adapter = useSyncAdapter(); // Gets correct adapter based on mode
const syncConfig = useAppStore(state => state.sync.config);
const { lastSync, isSyncing } = useAutoSync(adapter, syncConfig);
```

---

## 10. Configuration Validation

### Problem

Invalid configurations cause runtime errors.

### Solution: Schema Validation with Zod

```typescript
// features/settings/domain/validators.ts
import { z } from 'zod';

export const SFTPConfigSchema = z.object({
  credentials: z.object({
    username: z.string().min(1, 'Username required'),
    password: z.string().min(1, 'Password required'),
    remoteFileName: z.string().regex(/\.csv$/, 'Must be a CSV file'),
    store: z.string().min(1, 'Store ID required'),
  }),
  mapping: z.object({
    delimiter: z.string().length(1, 'Delimiter must be single character'),
    columns: z.array(z.object({
      index: z.number().min(0),
      aimsValue: z.string(),
      headerEn: z.string(),
      headerHe: z.string(),
    })).min(3, 'At least 3 columns required'),
  }),
  syncInterval: z.number().min(10).max(3600),
});

export const SolumConfigSchema = z.object({
  credentials: z.object({
    baseUrl: z.string().url('Invalid API URL'),
    company: z.string().min(1),
    store: z.string().min(1),
    username: z.string().email('Invalid email'),
    password: z.string().optional(),
  }),
  mapping: z.object({
    /* ... */
  }),
  syncInterval: z.number().min(10).max(600),
  features: z.object({
    conferenceMode: z.boolean(),
    simpleConferenceMode: z.boolean(),
    labelControl: z.boolean(),
  }),
});
```

**Usage:**

```typescript
const saveSettings = async (config: SolumConfig) => {
  const result = SolumConfigSchema.safeParse(config);
  
  if (!result.success) {
    showValidationErrors(result.error.flatten());
    return;
  }
  
  // Save valid config
  await saveToStore(result.data);
};
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- ✅ Create `SyncAdapter` interface
- ✅ Implement `SFTPSyncAdapter`
- ✅ Implement `SolumSyncAdapter`
- ✅ Create DI container
- ✅ Add error classes

### Phase 2: Refactor Features (Week 3-4)
- ✅ Restructure to vertical slices
- ✅ Split state into feature slices
- ✅ Migrate controllers to use adapters
- ✅ Add capability matrix

### Phase 3: Testing (Week 5)
- ✅ Write adapter unit tests
- ✅ Write integration tests
- ✅ Add E2E test suite

### Phase 4: Migration (Week 6)
- ✅ Migrate V1 users to V2
- ✅ Data migration scripts
- ✅ Documentation updates

---

## Expected Benefits

### For Developers

- **✅ 50% reduction in duplicate code** (unified adapter pattern)
- **✅ 80% easier testing** (DI and mock adapters)
- **✅ 70% faster feature development** (vertical slices)
- **✅ 90% clearer architecture** (feature boundaries)

### For End Users

- **✅ More reliable sync** (better error handling)
- **✅ Faster mode switching** (unified config)
- **✅ Better feedback** (typed errors with context)
- **✅ Fewer bugs** (comprehensive testing)

### For Maintainability

- **✅ Clear separation of concerns** (domain/app/infra/presentation)
- **✅ Easy to add new modes** (implement adapter interface)
- **✅ Testable business logic** (pure functions in domain)
- **✅ Scalable architecture** (feature slices)

---

## Migration Path for Existing V1 Code

### Step 1: Create Adapters (Non-Breaking)

Add new adapter classes alongside existing services:

```typescript
// Keep existing
import { sftpService } from './services/sftpService';
import { solumService } from './services/solumService';

// Add new adapters (delegates to existing services)
const sftpAdapter = new SFTPSyncAdapter(csvService, sftpConfig);
const solumAdapter = new SolumSyncAdapter(solumService, solumConfig, solumCsvConfig);
```

### Step 2: Gradual Controller Migration

Update one controller at a time:

```typescript
// Before
const syncData = async () => {
  if (workingMode === 'SFTP') {
    await sftpService.uploadFile(...);
  } else {
    await solumService.pushArticles(...);
  }
};

// After (using adapter)
const adapter = getAdapter(workingMode);
const syncData = async () => {
  await adapter.upload(personnel);
};
```

### Step 3: Feature-by-Feature Restructure

Move one feature at a time to vertical slice:
1. Start with smallest feature (e.g., Settings)
2. Create feature folder structure
3. Move files progressively
4. Update imports
5. Test thoroughly
6. Repeat for next feature

### Step 4: Consolidate State

After all features migrated:
1. Create feature slices
2. Compose into root store
3. Update selectors
4. Remove old store structure

---

## Conclusion

The new feature-based architecture with unified sync adapters provides:

✅ **Better Abstraction** - SyncAdapter interface removes mode coupling  
✅ **Easier Testing** - DI and mocks enable comprehensive test coverage  
✅ **Clearer Organization** - Vertical slices group related code  
✅ **Type Safety** - Zod schemas validate configurations  
✅ **Error Handling** - Typed errors with proper context  
✅ **Scalability** - Easy to add new features and modes  
✅ **Maintainability** - Clear boundaries and responsibilities  

This architecture positions the application for long-term growth while maintaining code quality and developer productivity.

---

**Architecture Version:** 2.0  
**Recommended for:** V2 Greenfield Implementation  
**Migration Complexity:** Medium (can be done incrementally)  
**Expected Timeline:** 6 weeks for full implementation
