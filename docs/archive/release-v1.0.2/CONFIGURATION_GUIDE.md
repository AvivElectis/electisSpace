# Configuration Guide

**electisSpace v1.0.2**

Complete reference for all application settings and configuration options.

---

## Table of Contents

1. [SoluM API Configuration](#solum-api-configuration)
2. [People Manager Settings](#people-manager-settings)
3. [Synchronization Settings](#synchronization-settings)
4. [Application Settings](#application-settings)
5. [CSV Format Specification](#csv-format-specification)
6. [Advanced Configuration](#advanced-configuration)

---

## SoluM API Configuration

### Connection Settings

Access via: **Settings → SoluM API**

| Setting | Description | Example | Required |
|---------|-------------|---------|----------|
| Server URL | AIMS server address | `https://aims.example.com` | Yes |
| Store ID | Your store identifier | `100` | Yes |
| Username | API username | `admin` | Yes |
| Password | API password | `••••••••` | Yes |

### Server URL Format

The server URL should be the base URL of your SoluM AIMS server:

```
https://aims.example.com
https://192.168.1.100:8080
https://aims.company.local/api
```

> **Note**: Include the protocol (`https://`) but do not include trailing slashes.

### Testing Connection

1. Enter all connection details
2. Click **Test Connection**
3. Wait for result:
   - ✅ **Success**: Connection established
   - ❌ **Failed**: Check settings and try again

### Store ID

The Store ID is your unique store identifier in AIMS:

- Usually a numeric value (e.g., `100`, `200`)
- Can be found in AIMS admin panel
- Each store has its own set of labels

---

## People Manager Settings

### Enabling People Manager Mode

Access via: **Settings → SoluM API**

| Setting | Description | Default |
|---------|-------------|---------|
| Enable People Manager Mode | Switch between Spaces and People modes | Off |
| Total Available Spaces | Number of ESL labels available for assignment | 0 |

### Mode Behavior

| Mode | Navigation | Dashboard | Primary Feature |
|------|------------|-----------|-----------------|
| Spaces Mode | `/spaces` | Space statistics | Label management |
| People Mode | `/people` | People statistics | Personnel assignment |

### Available Spaces

This number defines how many ESL labels are available for personnel assignment:

- Set to match your actual ESL inventory
- Affects the assignment pool
- Dashboard shows assigned vs. available ratio

---

## Synchronization Settings

### Auto-Sync Configuration

Access via: **Settings → SoluM API**

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| Enable Auto Sync | Automatic background sync | Off | On/Off |
| Sync Interval | Minutes between syncs | 5 | 1-60 |

### Sync Behavior

#### Manual Sync
- Triggered by user action
- Immediate execution
- Visual progress indicator
- Detailed error reporting

#### Auto-Sync
- Runs in background
- Respects interval setting
- Continues while app is open
- Pauses when offline

### Sync Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| Synced | Green | Data matches AIMS |
| Pending | Yellow | Local changes waiting |
| Syncing | Blue | Sync in progress |
| Error | Red | Sync failed |

---

## Application Settings

### Language Settings

Access via: **Settings → General**

| Language | Code | RTL Support |
|----------|------|-------------|
| English | `en` | No |
| Hebrew | `he` | Yes |

### Debug Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Debug Mode | Enable verbose logging | Off |
| Show Dev Tools | Display developer tools | Off |

### Data Management

| Action | Description |
|--------|-------------|
| Clear Cache | Remove temporary data |
| Reset Settings | Restore defaults |
| Export Settings | Save settings to file |
| Import Settings | Load settings from file |

---

## CSV Format Specification

### Overview

People Manager uses CSV files for bulk personnel import. The format follows the SoluM article specification.

### Required Format

```csv
articleId,articleName,data1,data2,data3,data4,data5,nfcUrl
```

### Field Specifications

| Field | Type | Max Length | Required | Description |
|-------|------|------------|----------|-------------|
| `articleId` | String | 50 | Yes | Unique identifier |
| `articleName` | String | 100 | Yes | Display name |
| `data1` | String | 100 | No | Custom field 1 |
| `data2` | String | 100 | No | Custom field 2 |
| `data3` | String | 100 | No | Custom field 3 |
| `data4` | String | 100 | No | Custom field 4 |
| `data5` | String | 100 | No | Custom field 5 |
| `nfcUrl` | String | 500 | No | NFC URL link |

### Example CSV

```csv
articleId,articleName,data1,data2,data3,data4,data5,nfcUrl
EMP001,John Smith,Building A,Floor 2,Room 201,Manager,IT Department,https://intranet/profiles/john
EMP002,Jane Doe,Building A,Floor 3,Room 305,Developer,Engineering,https://intranet/profiles/jane
EMP003,Bob Johnson,Building B,Floor 1,Room 102,Analyst,Finance,https://intranet/profiles/bob
```

### Suggested Field Usage

For office/personnel management:

| Field | Suggested Use |
|-------|---------------|
| `articleId` | Employee ID |
| `articleName` | Full name |
| `data1` | Building/Location |
| `data2` | Floor |
| `data3` | Room/Desk |
| `data4` | Job title |
| `data5` | Department |
| `nfcUrl` | Profile link |

### CSV Best Practices

1. **Encoding**: Use UTF-8 encoding
2. **Header Row**: Include header row (required)
3. **Unique IDs**: Ensure `articleId` values are unique
4. **No Special Chars**: Avoid commas in data (or quote the field)
5. **Consistent Format**: Keep data format consistent

### Quoted Fields

If your data contains commas, wrap in quotes:

```csv
articleId,articleName,data1
EMP001,"Smith, John",Building A
EMP002,"Doe, Jane","Floor 3, Room 305"
```

---

## Advanced Configuration

### Electron Configuration

The Electron app can be configured via `electron-builder.yml`:

```yaml
appId: com.electis.space
productName: electisSpace
nsis:
  oneClick: false
  perMachine: true
  allowToChangeInstallationDirectory: true
```

### Capacitor Configuration

Android settings in `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.electis.space',
  appName: 'electisSpace',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};
```

### Environment Variables

For development, create `.env` file:

```env
VITE_API_URL=https://aims.example.com
VITE_DEFAULT_STORE_ID=100
VITE_DEBUG_MODE=true
```

### Storage Locations

| Platform | Settings Location | Data Location |
|----------|-------------------|---------------|
| Windows | `%APPDATA%\electisSpace` | `%LOCALAPPDATA%\electisSpace` |
| Android | Internal storage | App data folder |

### API Rate Limiting

Default API behavior:

| Setting | Value |
|---------|-------|
| Request timeout | 30 seconds |
| Batch size | 100 items |
| Retry attempts | 3 |
| Retry delay | 1 second |

---

## Configuration Backup

### Export Settings

1. Go to **Settings**
2. Click **Export Settings**
3. Save the JSON file

### Import Settings

1. Go to **Settings**
2. Click **Import Settings**
3. Select your backup file
4. Confirm import

### Backup File Contents

```json
{
  "version": "1.0.2",
  "exportDate": "2024-12-29T12:00:00Z",
  "settings": {
    "serverUrl": "https://aims.example.com",
    "storeId": "100",
    "autoSync": true,
    "syncInterval": 5,
    "peopleManagerMode": true,
    "totalAvailableSpaces": 100,
    "language": "en"
  }
}
```

> **Security Note**: The backup file does not include passwords. You'll need to re-enter credentials after import.

---

## Troubleshooting Configuration

### Connection Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Connection timeout | Network/firewall | Check network settings |
| 401 Unauthorized | Wrong credentials | Verify username/password |
| 404 Not Found | Wrong URL | Check server URL |
| SSL Error | Certificate issue | Verify HTTPS configuration |

### Sync Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Sync fails | API error | Check AIMS server logs |
| Partial sync | Rate limiting | Reduce sync frequency |
| Data mismatch | Cache issue | Clear cache and retry |

### Reset to Defaults

If configuration becomes corrupted:

1. Close electisSpace
2. Delete settings folder:
   - Windows: `%APPDATA%\electisSpace`
   - Android: Clear app data
3. Restart application
4. Reconfigure settings

---

**electisSpace** - ESL Management System  
© 2025 Aviv Electis
