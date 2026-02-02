# electisSpace - User Manual

**Version:** 2.0.0  
**Last Updated:** February 2, 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Login & Authentication](#2-login--authentication)
3. [Dashboard](#3-dashboard)
4. [Spaces Management](#4-spaces-management)
5. [People Management](#5-people-management)
6. [Conference Rooms](#6-conference-rooms)
7. [Labels Management](#7-labels-management)
8. [Settings](#8-settings)
9. [Synchronization](#9-synchronization)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Getting Started

### 1.1 What is electisSpace?

electisSpace is an Electronic Shelf Label (ESL) management application that helps organizations manage digital labels for:

- **Offices and Rooms**: Display room names, occupants, and status
- **Conference Rooms**: Show meeting schedules and availability
- **Personnel**: Employee information and location tracking

The application integrates with SoluM AIMS to control the physical ESL hardware.

### 1.2 Supported Platforms

- **Web Browser**: Chrome, Firefox, Edge, Safari
- **Windows Desktop**: Standalone application (Electron)
- **Android**: Mobile app (APK)

### 1.3 System Requirements

| Platform | Requirements |
|----------|--------------|
| Web | Modern browser with JavaScript enabled |
| Windows | Windows 10/11, 4GB RAM minimum |
| Android | Android 8.0+, 2GB RAM minimum |

---

## 2. Login & Authentication

### 2.1 Logging In

1. Open electisSpace
2. Enter your **email address** and **password**
3. Click **Login**
4. Check your email for the **6-digit verification code**
5. Enter the code within 10 minutes
6. You're now logged in!

> **Note**: Your session remains active until you explicitly log out. The app will automatically refresh your authentication in the background.

### 2.2 Forgot Password

1. On the login screen, click **"Forgot Password?"**
2. Enter your email address
3. Check your email for the reset code
4. Enter the code and set a new password

### 2.3 Logging Out

1. Click your profile icon in the top-right corner
2. Select **"Logout"**

---

## 3. Dashboard

The Dashboard provides a quick overview of your ESL system.

### 3.1 Dashboard Cards

| Card | Description |
|------|-------------|
| **Spaces** | Total count of rooms/desks |
| **People** | Total personnel in the system |
| **Conference Rooms** | Meeting room count and active meetings |
| **Sync Status** | Last sync time and connection status |

### 3.2 Quick Actions

- **Sync Now**: Manually trigger data synchronization
- **Add Space**: Create a new space entry
- **Import People**: Bulk import via CSV

---

## 4. Spaces Management

### 4.1 Viewing Spaces

Navigate to **Spaces** from the sidebar to see all rooms/desks.

**Features:**
- Search by name or ID
- Sort by any column
- Filter by status
- Pagination for large datasets

### 4.2 Creating a Space

1. Click **"Add Space"** button
2. Fill in the required fields:
   - **Name**: Display name for the space
   - **External ID**: Unique identifier (e.g., ROOM-001)
   - **Label Code**: (Optional) Assign an ESL label
3. Add any custom fields as needed
4. Click **"Save"**

### 4.3 Editing a Space

1. Click on a space row to select it
2. Click **"Edit"** or double-click the row
3. Modify the fields
4. Click **"Save"**

### 4.4 Assigning Labels

1. Select a space
2. Click **"Assign Label"**
3. Choose from available labels or enter a label code
4. The label will sync on the next sync cycle

### 4.5 Bulk Operations

- **Export**: Download all spaces as CSV
- **Import**: Upload CSV to create/update multiple spaces
- **Delete Selected**: Remove multiple spaces at once

---

## 5. People Management

### 5.1 Viewing People

Navigate to **People** from the sidebar.

### 5.2 Adding a Person

1. Click **"Add Person"**
2. Enter person details:
   - **Name**: Full name
   - **External ID**: Employee ID
   - **Custom Fields**: Department, title, etc.
3. Click **"Save"**

### 5.3 CSV Import

1. Click **"Import CSV"**
2. Select your CSV file
3. Map CSV columns to system fields
4. Preview the import
5. Click **"Import"**

**CSV Format Example:**
```csv
external_id,name,department,title
EMP001,John Smith,Engineering,Developer
EMP002,Jane Doe,Marketing,Manager
```

### 5.4 Assigning People to Spaces

1. Select a person
2. Click **"Assign to Space"**
3. Choose the target space from the dropdown
4. Click **"Assign"**

---

## 6. Conference Rooms

### 6.1 Managing Conference Rooms

Navigate to **Conference** from the sidebar.

### 6.2 Creating a Conference Room

1. Click **"Add Room"**
2. Enter room details:
   - **Room Name**: e.g., "Conference Room A"
   - **Label Code**: ESL label assignment
3. Click **"Save"**

### 6.3 Toggling Meeting Status

1. Find the room in the list
2. Click the **meeting toggle** switch
3. If enabling a meeting:
   - Enter meeting name
   - Set start and end times
   - (Optional) Add participants
4. The ESL label will update to show the meeting status

### 6.4 Quick Meeting Toggle

From the Conference Room card, you can quickly:
- ✅ **Green**: Room is free
- 🔴 **Red**: Room is occupied

Click to toggle between states.

---

## 7. Labels Management

### 7.1 Viewing Labels

Navigate to **Labels** from the sidebar to see all ESL labels registered in the system.

### 7.2 Label Status Indicators

| Status | Meaning |
|--------|---------|
| 🟢 Online | Label is connected and responsive |
| 🟡 Updating | Label is receiving new content |
| 🔴 Offline | Label is not responding |
| ⚪ Unassigned | Label not linked to any item |

### 7.3 Refreshing Labels

Click **"Refresh"** to fetch the latest label status from SoluM AIMS.

---

## 8. Settings

Access Settings by clicking the **gear icon** ⚙️ in the sidebar.

### 8.1 Application Settings

| Setting | Description |
|---------|-------------|
| **App Name** | Displayed in the header |
| **App Subtitle** | Secondary text in header |
| **Space Type** | office, room, chair, or person-tag |

### 8.2 SoluM Connection

Configure your SoluM AIMS connection:

1. **Company Name**: Your AIMS company identifier
2. **Store Number**: The store/location number
3. **Cluster**: common or c1
4. **Username/Password**: AIMS credentials

Click **"Test Connection"** to verify settings.

### 8.3 Auto-Sync Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Auto-Sync Enabled** | Automatically sync data | Off |
| **Sync Interval** | Time between syncs (seconds) | 30 |

> **Note**: Minimum sync interval is 10 seconds. Lower values are not recommended for production use.

### 8.4 Logo Configuration

Upload custom logos:
1. Click **"Upload Logo 1"** or **"Upload Logo 2"**
2. Select an image file (PNG or JPEG, max 2MB)
3. The logo will appear in the application header

### 8.5 Security Settings

- **Password Protection**: Lock settings with a password
- **Change Password**: Update your account password

---

## 9. Synchronization

### 9.1 Understanding Sync

electisSpace synchronizes data between:
- Local database (your data)
- SoluM AIMS (ESL hardware)

### 9.2 Sync Status Indicator

Located in the toolbar, the sync indicator shows:

| Icon | Meaning |
|------|---------|
| 🟢 | Connected, last sync successful |
| 🟡 | Syncing in progress |
| 🔴 | Connection error or sync failed |

### 9.3 Manual Sync

Click the **"Sync"** button in the toolbar to manually trigger synchronization.

### 9.4 Auto-Sync

When enabled, the system automatically syncs at the configured interval (default: 30 seconds, minimum: 10 seconds).

To configure:
1. Go to **Settings**
2. Find **"Auto-Sync Settings"**
3. Toggle **"Enable Auto-Sync"**
4. Set your preferred interval (10-3600 seconds)
5. Click **"Save"**

### 9.5 Sync Queue

If syncs fail, they're queued for retry:
- Maximum 5 retry attempts
- Exponential backoff between retries
- View queue status in Settings > Sync Status

---

## 10. Troubleshooting

### 10.1 Connection Issues

**Problem**: "Unable to connect to server"

**Solutions:**
1. Check your internet connection
2. Verify the server URL in settings
3. Check if the server is running
4. Contact your administrator

### 10.2 Sync Failures

**Problem**: "Sync failed" error

**Solutions:**
1. Check SoluM AIMS credentials
2. Verify your AIMS account has API access
3. Check the sync queue for specific errors
4. Try manual sync after fixing the issue

### 10.3 Label Not Updating

**Problem**: ESL label shows old content

**Solutions:**
1. Check label status (online/offline)
2. Trigger manual sync
3. Wait for the next auto-sync cycle
4. Check if the label battery is low

### 10.4 Login Issues

**Problem**: 2FA code not received

**Solutions:**
1. Check spam/junk folder
2. Wait 1-2 minutes for delivery
3. Click "Resend Code"
4. Verify email address is correct

### 10.5 Performance Issues

**Problem**: App is slow

**Solutions:**
1. Reduce the number of items displayed per page
2. Use filters to narrow down data
3. Clear browser cache (web version)
4. Restart the application

---

## Getting Help

For additional support:

- **Documentation**: Check the docs folder for technical details
- **Logs**: Access application logs in Settings > Logs
- **Contact**: Reach out to your system administrator

---

**© 2026 Electis Space. All rights reserved.**
