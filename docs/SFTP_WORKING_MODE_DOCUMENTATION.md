# SFTP Working Mode Documentation

## Overview

The Conference Manager application supports two working modes: **SFTP** and **SOLUM_API**. This document provides comprehensive documentation for the SFTP working mode, including API endpoints, secrets, commands, architecture, and workflow.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints](#api-endpoints)
3. [Authentication & Secrets](#authentication--secrets)
4. [Encryption Specification](#encryption-specification)
5. [Service Layer](#service-layer)
6. [Data Flow](#data-flow)
7. [Configuration](#configuration)
8. [Commands & Operations](#commands--operations)
9. [Error Handling](#error-handling)
10. [Testing](#testing)

---

## Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     SFTP Working Mode                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │  SFTPSettings   │───▶│   sftpService    │                   │
│  │   (Component)   │    │   (Singleton)    │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                  │                              │
│  ┌─────────────────┐    ┌────────▼─────────┐                   │
│  │ connectionCtrl  │───▶│  SFTPAPIClient   │                   │
│  │  (Zustand)      │    │                  │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                  │                              │
│  ┌─────────────────┐    ┌────────▼─────────┐                   │
│  │  settingsCtrl   │    │   encryption.ts  │                   │
│  │  (Zustand)      │    │  (AES-256-CBC)   │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                  │                              │
│                         ┌────────▼─────────┐                   │
│                         │   SFTP API       │                   │
│                         │ solum.co.il/sftp │                   │
│                         └──────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

| File | Description |
|------|-------------|
| `src/services/sftpService.ts` | Main SFTP service - connection management, file operations |
| `src/services/sftpApiClient.ts` | Low-level API client - HTTP requests to SFTP API |
| `src/utils/encryption.ts` | AES-256-CBC encryption utilities |
| `src/utils/constants.ts` | SFTP host URLs and configuration constants |
| `src/components/settings/SFTPSettings.tsx` | UI component for SFTP configuration |
| `src/store/features/connection/connectionController.ts` | Zustand store for connection state |
| `src/store/features/settings/settingsController.ts` | Zustand store for settings management |
| `src/types/index.ts` | TypeScript interfaces (SFTPCredentials, etc.) |

---

## API Endpoints

### Base URL

| Environment | URL |
|-------------|-----|
| **Production** | `https://solum.co.il/sftp` |
| **Development** | `/api` (proxied via Vite to `https://solum.co.il/sftp`) |

### Endpoint Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sftp/users` | `POST` | Create new SFTP user |
| `/sftp/users` | `GET` | Get all SFTP users |
| `/sftp/users` | `DELETE` | Delete SFTP user |
| `/sftp/password` | `POST` | Reset user password |
| `/sftp/fetch` | `POST` | Fetch directory tree (test connection) |
| `/sftp/file` | `POST` | Upload file |
| `/sftp/file` | `GET` | Download file |
| `/sftp/file` | `DELETE` | Delete file |

---

### 1. Create User

Creates a new SFTP user account.

**Endpoint:** `POST /sftp/users`

**Headers:**
```
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "<encrypted_username>",
  "password": "<encrypted_password>"
}
```

**Response:**
- `201 Created`: `"User created successfully"`
- `500 Internal Server Error`: `"Internal Server Error"`

---

### 2. Get All Users

Retrieves list of all SFTP users.

**Endpoint:** `GET /sftp/users`

**Headers:**
```
Authorization: Bearer <API_TOKEN>
```

**Response:**
```json
{
  "users": [
    {
      "user_name": "john_doe",
      "folder": "john_doe_files"
    }
  ]
}
```

---

### 3. Delete User

Deletes an existing SFTP user.

**Endpoint:** `DELETE /sftp/users?username=<encrypted_username>`

**Headers:**
```
Authorization: Bearer <API_TOKEN>
```

**Response:**
- `200 OK`: `"User deleted successfully"`
- `404 Not Found`: `"User not found"`

---

### 4. Reset Password

Resets password for an SFTP user.

**Endpoint:** `POST /sftp/password`

**Headers:**
```
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "<encrypted_username>",
  "password": "<encrypted_new_password>",
  "confirmPassword": "<encrypted_new_password>"
}
```

**Response:**
- `201 Created`: `"Password reset successfully"`

---

### 5. Fetch Directory Tree (Test Connection)

Retrieves directory structure for a user's SFTP folder. Used to verify credentials.

**Endpoint:** `POST /sftp/fetch`

**Headers:**
```
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "<encrypted_username>",
  "password": "<encrypted_password>"
}
```

**Response:**
```json
{
  "tree": [
    {
      "type": "file",
      "name": "esl.csv",
      "path": "/user_files/esl.csv",
      "size": 1024,
      "mtime": 1699800000
    }
  ]
}
```

---

### 6. Upload File

Uploads a file to the SFTP server.

**Endpoint:** `POST /sftp/file`

**Headers:**
```
Authorization: Bearer <API_TOKEN>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: The file content (binary/blob)
- `username`: Encrypted username
- `password`: Encrypted password
- `filename`: Encrypted filename

**File Size Limit:** 100MB

**Response:**
- `201 Created`: `"File uploaded successfully"`
- `400 Bad Request`: `"No file uploaded"`
- `404 Not Found`: `"User not found"`

---

### 7. Download File

Downloads a file from the SFTP server.

**Endpoint:** `GET /sftp/file`

**Headers:**
```
Authorization: Bearer <API_TOKEN>
```

**Query Parameters:**
- `username`: Encrypted username
- `password`: Encrypted password
- `filename`: Encrypted filename

**Response:**
- `200 OK`: File content as text/binary
- `404 Not Found`: `"File not found"`

---

### 8. Delete File

Deletes a file from the SFTP server.

**Endpoint:** `DELETE /sftp/file`

**Headers:**
```
Authorization: Bearer <API_TOKEN>
```

**Query Parameters:**
- `username`: Encrypted username
- `password`: Encrypted password
- `filename`: Encrypted filename

**Response:**
- `200 OK`: `"File deleted successfully"`

---

## Authentication & Secrets

### API Token

All requests to the SFTP API require a permanent Bearer token.

```
Authorization: Bearer SFTP_APi_T0k3n_2025_c0mpl3x_S3cur3_P3rm4n3nt_K3y_X9zQ7mN5bR8wF2vH4pL
```

**Location in code:** `src/services/sftpApiClient.ts` (line 10)

```typescript
const API_TOKEN = 'SFTP_APi_T0k3n_2025_c0mpl3x_S3cur3_P3rm4n3nt_K3y_X9zQ7mN5bR8wF2vH4pL';
```

### Encryption Key

All sensitive data (username, password, filename) must be encrypted before transmission.

**Key:** `gBfdx3Mkyi8IVAH6OQBcV4VtGRgf5XJV` (32 characters)

**Location in code:** `src/utils/encryption.ts` (line 9)

```typescript
const ENCRYPTION_KEY = 'gBfdx3Mkyi8IVAH6OQBcV4VtGRgf5XJV';
```

### Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP address
- **Response:** HTTP 429 with `retryAfter` information

---

## Encryption Specification

### Algorithm Details

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-CBC |
| Key | `gBfdx3Mkyi8IVAH6OQBcV4VtGRgf5XJV` |
| IV Length | 16 bytes (randomly generated) |
| Padding | PKCS7 |
| Mode | CBC (Cipher Block Chaining) |
| Library | CryptoJS |

### Encrypted String Format

```
<IV_HEX>:<ENCRYPTED_TEXT_BASE64>
```

- **IV_HEX**: 32 hex characters (16 bytes)
- **ENCRYPTED_TEXT_BASE64**: AES-encrypted data in Base64

**Example:**
```
3f5a2b8c9d1e4f6a7b8c9d0e1f2a3b4c:U2FsdGVkX1+vupppZksvRf5pq5g5XjFRlipRkwB0K1Y=
```

### Implementation (TypeScript)

```typescript
// src/utils/encryption.ts

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'gBfdx3Mkyi8IVAH6OQBcV4VtGRgf5XJV';
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = CryptoJS.lib.WordArray.random(IV_LENGTH);
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);

  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  });

  const ivHex = iv.toString(CryptoJS.enc.Hex);
  const encryptedText = encrypted.toString();

  return `${ivHex}:${encryptedText}`;
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = CryptoJS.enc.Hex.parse(textParts[0]);
  const encryptedText = textParts[1];
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);

  const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}
```

---

## Service Layer

### SFTPService (sftpService.ts)

Main service singleton for SFTP operations.

```typescript
// Exported singleton
export const sftpService = new SFTPService();
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `testConnection` | `(credentials: SFTPCredentials) => Promise<boolean>` | Test SFTP connection |
| `connect` | `(credentials: SFTPCredentials) => Promise<void>` | Alias for testConnection |
| `downloadFile` | `(credentials: SFTPCredentials) => Promise<string>` | Download CSV file |
| `uploadFile` | `(credentials: SFTPCredentials, data: string) => Promise<void>` | Upload CSV file |
| `fileExists` | `(credentials: SFTPCredentials) => Promise<boolean>` | Check if remote file exists |
| `getStatus` | `() => SFTPConnectionStatus` | Get current connection status |
| `disconnect` | `() => void` | Disconnect and reset status |

#### Retry Logic

Operations include automatic retry with exponential backoff:

```typescript
private async withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T>
```

- **Initial delay:** 2000ms
- **Backoff multiplier:** 1.5x
- **Retries on:** ETIMEDOUT, ECONNRESET, socket hang up, timeout

### SFTPAPIClient (sftpApiClient.ts)

Low-level HTTP client for SFTP API communication.

#### Methods

| Method | Description |
|--------|-------------|
| `testConnection(username, password)` | Fetch directory tree to verify credentials |
| `getUsers()` | Get all SFTP users |
| `createUser(username, password)` | Create new user |
| `uploadFile(username, password, filename, content)` | Upload file via FormData |
| `downloadFile(username, password, filename)` | Download file content |

---

## Data Flow

### Connection Flow

```
User enters credentials
        │
        ▼
┌─────────────────────┐
│  SFTPSettings.tsx   │
│  handleTestConnection()
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  setCredentials()   │  ◄── Save to Zustand store
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  setSftpCSVConfig() │  ◄── Save CSV config
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  syncFromSFTP()     │  ◄── Connect & download
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  sftpService.connect()
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  sftpApiClient.     │
│  testConnection()   │  ◄── POST /sftp/fetch
└──────────┬──────────┘
           │
           ▼
   Connection Success
```

### Sync From SFTP Flow

```
syncFromSFTP()
      │
      ▼
┌─────────────────────┐
│ Check if connected  │
│ If not, connect()   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ sftpService.        │
│ downloadFile()      │  ◄── GET /sftp/file
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ parseCSV(serverCsv) │  ◄── Parse CSV content
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Update Zustand      │
│ - personnel         │
│ - conferenceRooms   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ fileSystemService.  │
│ writeCSV(localCopy) │  ◄── Cache locally
└─────────────────────┘
```

### Sync To SFTP Flow

```
syncToSFTP()
      │
      ▼
┌─────────────────────┐
│ Check if connected  │
│ If not, connect()   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ generateCSV(data)   │  ◄── Generate CSV from state
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ sftpService.        │
│ uploadFile()        │  ◄── POST /sftp/file
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ sftpService.        │
│ downloadFile()      │  ◄── Re-download to verify
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Update local state  │
│ hasUnsavedChanges=false
└─────────────────────┘
```

---

## Configuration

### SFTPCredentials Interface

```typescript
// src/types/index.ts

export interface SFTPCredentials {
  username: string;       // SFTP username
  password: string;       // SFTP password
  remoteFileName: string; // CSV filename on SFTP server (default: "esl.csv")
  store: string;          // Store identifier (default: "01")
}
```

### Constants

```typescript
// src/utils/constants.ts

// Default CSV filename
export const CSV_FILENAME = 'esl.csv';

// CSV delimiter
export const CSV_DELIMITER = ';';

// Default store identifier
export const DEFAULT_STORE = '01';

// SFTP API host (environment-specific)
export const SFTP_API_HOST = import.meta.env.DEV
  ? '/api'  // Vite proxy in development
  : 'https://solum.co.il/sftp';

// SFTP Authentication host (for settings access)
export const SFTP_AUTH_HOST = import.meta.env.DEV
  ? '/auth-api'
  : 'https://eu.common.solumesl.com';
```

### Vite Proxy Configuration

For development, Vite proxies `/api` to the production SFTP server:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://solum.co.il/sftp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
```

---

## Commands & Operations

### Store Actions (Zustand)

#### Connection Slice

| Action | Description |
|--------|-------------|
| `setCredentials(credentials, skipBackup?)` | Save SFTP credentials to store |
| `connect()` | Establish SFTP connection |
| `disconnect()` | Disconnect from SFTP |
| `syncFromSFTP()` | Download and sync from server |
| `syncToSFTP()` | Upload local data to server |

#### Settings Slice

| Action | Description |
|--------|-------------|
| `setWorkingMode(mode)` | Switch between 'SFTP' and 'SOLUM_API' |
| `setSftpCSVConfig(config)` | Save SFTP-specific CSV configuration |
| `loadFromFile()` | Load data from local file system |
| `saveToFile()` | Save data to local file system |

### Test Commands

Run SFTP connection tests:

```bash
# Test connection with custom base URL
npm run test:sftp <base_url>

# Example
npm run test:sftp https://solum.co.il/sftp
```

Test file upload:

```bash
# Run file upload test
npx ts-node tests/test-file-upload.ts
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Missing/invalid parameters |
| 401 | Unauthorized | Invalid/missing API token |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Formats

**Rate Limit Error:**
```json
{
  "error": true,
  "message": "Too many requests from this IP, please try again after 15 minutes.",
  "retryAfter": 900
}
```

**Authentication Error:**
```json
{
  "error": true,
  "response": "Unauthorized. Please provide a valid token in Authorization header or log in."
}
```

### Application Error Handling

```typescript
// Connection error handling in SFTPSettings.tsx
try {
  await syncFromSFTP();
  setMessage({ type: 'success', text: t('messages.connectionSuccess') });
} catch (error) {
  if (err?.message?.includes('Remote file not found')) {
    // Offer to create the file
    setShowCreateFileDialog(true);
  } else {
    setMessage({ type: 'error', text: err?.message });
  }
}
```

---

## Testing

### Test Files

| File | Description |
|------|-------------|
| `tests/test-sftp-connection.ts` | CLI test for SFTP connection |
| `tests/test-sftp-connection.html` | Browser-based SFTP test page |
| `tests/test-file-upload.ts` | Test file upload/download cycle |
| `tests/test-encryption.ts` | Test encryption/decryption |

### Test Credentials (Development Only)

```typescript
// tests/test-sftp-connection.ts
const USERNAME = 'avivTest';
const PASSWORD = 'REDACTED_PASSWORD';
```

### Browser Test Page

Open `tests/test-sftp-connection.html` in a browser to:
1. Test encryption
2. Get all users
3. Test connection with credentials

---

## Security Notes

1. **Token Storage:** The API token is stored in source code. For production, consider environment variables.

2. **Password Encryption:** User passwords are encrypted before transmission using AES-256-CBC.

3. **Password Storage:** Passwords in Zustand store are encrypted using `encryptionService` before persistence.

4. **Settings Export:** When exporting settings to file, SFTP passwords are stripped for security.

5. **Settings Backup:** Internal backups encrypt passwords using `encryptionService`.

6. **HTTPS Only:** All API communication uses HTTPS.

7. **IV Uniqueness:** A new random IV is generated for each encryption operation.

---

## Working Mode Switching

The application supports switching between SFTP and SOLUM_API modes:

```typescript
// src/store/features/settings/settingsController.ts

setWorkingMode: (mode) => {
  const state = get();
  
  // Prepare the appropriate CSV config based on mode
  let newConfig: CSVConfig;
  if (mode === 'SFTP') {
    newConfig = state.sftpCsvConfig || DEFAULT_CSV_CONFIG;
  } else {
    newConfig = state.solumCsvConfig 
      ? { ...state.solumCsvConfig, delimiter: ',' }
      : DEFAULT_CSV_CONFIG;
  }
  
  set({ workingMode: mode, csvConfig: newConfig });
}
```

### Mode-Specific Behavior

| Feature | SFTP Mode | SOLUM_API Mode |
|---------|-----------|----------------|
| Data Source | Remote CSV file | SoluM ESL API |
| Sync Method | File upload/download | REST API calls |
| CSV Delimiter | Configurable (default: `;`) | Fixed: `,` |
| Auto-Save | File-based | API-based |
| Settings Tab | SFTP Settings enabled | SoluM API Settings enabled |

---

## Related Documentation

- [SFTP-API-Client-Manual.md](archive/SFTP-API-Client-Manual.md) - Original API specification
- [MANUAL.md](archive/MANUAL.md) - User manual with SFTP setup instructions
- [SETTINGS_IMPLEMENTATION.md](archive/SETTINGS_IMPLEMENTATION.md) - Settings system implementation details

---

*Last Updated: January 7, 2026*
