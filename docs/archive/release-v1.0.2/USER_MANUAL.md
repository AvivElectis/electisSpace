# electisSpace User Manual

**Version:** 1.0.2  
**Last Updated:** December 29, 2025

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Installation](#2-installation)
3. [Getting Started](#3-getting-started)
4. [Dashboard](#4-dashboard)
5. [Space Management](#5-space-management)
6. [People Manager](#6-people-manager)
7. [Conference Rooms](#7-conference-rooms)
8. [Lists Management](#8-lists-management)
9. [Synchronization](#9-synchronization)
10. [Settings](#10-settings)
11. [System Logs](#11-system-logs)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Introduction

### What is electisSpace?

electisSpace is a comprehensive Electronic Shelf Label (ESL) Management System designed to simplify the process of managing SoluM AIMS-connected displays. Whether you're managing office spaces, retail shelf labels, or conference room displays, electisSpace provides an intuitive interface to:

- **Manage Spaces**: Configure and organize ESL displays
- **Manage People**: Assign personnel to spaces with CSV import
- **Sync with AIMS**: Bi-directional synchronization with SoluM AIMS
- **Batch Operations**: Bulk assign, update, and manage labels
- **Save Configurations**: Store and load label configurations as lists

### Key Features

| Feature | Description |
|---------|-------------|
| Space Management | Organize and configure ESL displays |
| People Manager | CSV-based personnel assignment |
| Conference Rooms | Specialized room display management |
| Auto-Sync | Automatic AIMS synchronization |
| Multi-language | English and Hebrew support |
| Cross-platform | Windows desktop and Android mobile |

---

## 2. Installation

### Windows Installation

1. **Download** the installer `electisSpace Setup 1.0.2.exe`
2. **Run** the installer (Administrator rights may be required)
3. **Choose** installation directory (defaults to Program Files)
4. **Complete** the installation wizard
5. **Launch** electisSpace from the Start Menu or Desktop shortcut

### Android Installation

1. **Download** the APK file
2. **Enable** "Install from Unknown Sources" in your device settings
3. **Open** the APK file to install
4. **Launch** electisSpace from your app drawer

### First Launch

Upon first launch, you'll be prompted to configure the SoluM API connection:

1. Enter your AIMS server URL
2. Enter your API credentials
3. Test the connection
4. Save settings

---

## 3. Getting Started

### Initial Configuration

Before using electisSpace, configure your AIMS connection:

1. Navigate to **Settings** (gear icon in navigation)
2. Go to the **SoluM API** tab
3. Enter your server details:
   - **Server URL**: Your AIMS server address (e.g., `https://aims.example.com`)
   - **Store ID**: Your store identifier (e.g., `100`)
   - **Username**: API username
   - **Password**: API password
4. Click **Test Connection** to verify
5. Click **Save** to store the configuration

### Understanding the Interface

The application uses a tab-based navigation:

| Tab | Description |
|-----|-------------|
| 🏠 Dashboard | Overview and statistics |
| 📍 Spaces / 👥 People | Main management area |
| 🏢 Conference | Conference room management |
| 📋 Lists | Saved configurations |
| ⚙️ Settings | Application configuration |

---

## 4. Dashboard

The Dashboard provides an at-a-glance overview of your system status.

### Dashboard Sections

#### Status Overview
- **API Connection**: Current connection status to AIMS
- **Last Sync**: When the last successful sync occurred
- **Total Labels**: Number of labels in your store

#### Quick Statistics (Spaces Mode)
- Number of configured spaces
- Sync status breakdown
- Recent activity

#### Quick Statistics (People Manager Mode)
- Total personnel count
- Assigned vs. unassigned
- Available spaces count
- Saved lists count

### Quick Actions
- **Sync Now**: Trigger immediate synchronization
- **View Spaces/People**: Navigate to main management view
- **View Lists**: Navigate to saved lists

---

## 5. Space Management

> **Note**: This section applies when People Manager Mode is disabled.

### Viewing Spaces

The Spaces tab displays all ESL labels from your AIMS store:

| Column | Description |
|--------|-------------|
| Article ID | Unique identifier |
| Name | Display name |
| Data 1-5 | Custom data fields |
| NFC URL | Associated NFC link |
| Sync Status | Current sync state |

### Filtering and Searching

- **Search**: Type in the search box to filter by any field
- **Status Filter**: Filter by sync status (All, Synced, Pending, Error)
- **Pagination**: Navigate through large datasets

### Editing Spaces

1. **Select** a row to view details
2. **Edit** fields in the detail panel
3. **Save** changes locally
4. **Sync** to push changes to AIMS

### Bulk Operations

1. **Select multiple rows** using checkboxes
2. Click **Bulk Actions** button
3. Choose an action:
   - Sync selected
   - Clear data
   - Export selected

---

## 6. People Manager

> **Note**: Enable People Manager Mode in Settings first.

### Overview

People Manager transforms electisSpace from a space management tool into a personnel assignment system. Use it to:

- Import personnel data from CSV
- Assign available spaces to people
- Sync assignments to AIMS
- Manage multiple configuration lists

### Enabling People Manager

1. Go to **Settings** → **SoluM API**
2. Toggle **Enable People Manager Mode**
3. Enter **Total Available Spaces** (the number of ESL labels available)
4. Click **Save**

### CSV Import

#### CSV Format Requirements

Your CSV file should follow the SoluM article format:

```csv
articleId,articleName,data1,data2,data3,data4,data5,nfcUrl
001,John Smith,Building A,Floor 2,Room 201,Manager,IT Dept,https://intranet/john
002,Jane Doe,Building A,Floor 3,Room 305,Developer,Engineering,https://intranet/jane
```

| Field | Description | Required |
|-------|-------------|----------|
| articleId | Unique person identifier | Yes |
| articleName | Person's display name | Yes |
| data1-data5 | Custom data fields | No |
| nfcUrl | NFC link URL | No |

#### Import Steps

1. Click **Upload CSV** button
2. Select your CSV file
3. Review the import preview
4. Confirm import

### Space Assignment

#### Individual Assignment

1. Select a person row
2. Click **Assign Space**
3. Choose an available space number
4. The assignment is recorded locally

#### Bulk Assignment

1. Select multiple people using checkboxes
2. Click **Bulk Assign**
3. Spaces will be assigned sequentially from available pool

#### Unassigning

1. Select assigned person(s)
2. Click **Unassign**
3. Space returns to available pool

### Syncing with AIMS

#### Send to AIMS

Push all local assignments to AIMS:

1. Click **Send to AIMS** button
2. Confirm the action
3. Wait for sync to complete
4. Check status indicators for results

#### Sync from AIMS

Import current AIMS data:

1. Click **Sync from AIMS** button
2. Confirm the action
3. Existing people will be updated with AIMS data
4. New articles from AIMS will be added

### Status Indicators

| Status | Icon | Meaning |
|--------|------|---------|
| Synced | ✓ | Data matches AIMS |
| Pending | ⏳ | Local changes not yet synced |
| Error | ⚠️ | Sync failed for this item |
| Not Assigned | — | Person has no space |

---

## 7. Conference Rooms

Manage conference room displays with specialized features.

### Room Configuration

1. Navigate to **Conference** tab
2. Click **Add Room** to create new
3. Configure room properties:
   - Room name
   - Capacity
   - Associated ESL label
   - Display template

### Room Display

Conference room ESL displays can show:
- Room name and number
- Current booking status
- Upcoming meetings
- Capacity information

### Booking Integration

> **Coming Soon**: Integration with calendar systems for real-time booking display.

---

## 8. Lists Management

Save and manage multiple configurations.

### Saving a List

1. Configure your people/spaces as desired
2. Navigate to **Lists** tab or use **Save List** action
3. Enter a descriptive name
4. Click **Save**

### Loading a List

1. Go to **Lists** tab
2. Find the desired list
3. Click **Load**
4. Confirm to replace current data

### Managing Lists

| Action | Description |
|--------|-------------|
| Rename | Change list name |
| Delete | Remove list permanently |
| Export | Download as file |
| Duplicate | Create a copy |

---

## 9. Synchronization

### Manual Sync

Trigger synchronization manually:

1. Click the **Sync** button in the toolbar
2. Or use **Dashboard** → **Sync Now**
3. Wait for completion
4. Review any errors in the status bar

### Auto-Sync

Configure automatic synchronization:

1. Go to **Settings** → **SoluM API**
2. Enable **Auto Sync**
3. Set **Sync Interval** (default: 5 minutes)
4. Auto-sync will run in the background

### Sync Status

Monitor sync health:

- **Green**: Successfully synced
- **Yellow**: Sync in progress or pending
- **Red**: Sync error occurred

---

## 10. Settings

### General Settings

| Setting | Description |
|---------|-------------|
| Language | Choose English or Hebrew |
| Theme | Light/Dark mode (coming soon) |
| Debug Mode | Enable verbose logging |

### SoluM API Settings

| Setting | Description |
|---------|-------------|
| Server URL | AIMS server address |
| Store ID | Your store identifier |
| Username | API username |
| Password | API password |
| Auto Sync | Enable automatic sync |
| Sync Interval | Minutes between syncs |
| People Manager Mode | Toggle feature mode |
| Total Available Spaces | ESL count for assignment |

### Application Info

- Current version
- Build information
- License details
- Check for updates

---

## 11. System Logs

View application logs for troubleshooting:

1. Go to **Settings**
2. Click **View Logs** or navigate to **System Logs**
3. Review log entries
4. Filter by:
   - Log level (Error, Warning, Info, Debug)
   - Date range
   - Component

### Log Export

1. Click **Export Logs**
2. Choose export format
3. Save the file for support requests

---

## 12. Troubleshooting

### Common Issues

#### Connection Failed

**Symptoms**: Cannot connect to AIMS, "Connection Error" message

**Solutions**:
1. Verify server URL is correct
2. Check network connectivity
3. Verify credentials
4. Ensure AIMS server is running

#### Sync Errors

**Symptoms**: Some items show error status after sync

**Solutions**:
1. Check individual item errors in detail view
2. Verify data format is correct
3. Check AIMS logs for server-side errors
4. Try syncing individual items

#### CSV Import Failed

**Symptoms**: Error message when importing CSV

**Solutions**:
1. Verify CSV format matches requirements
2. Check for special characters in data
3. Ensure articleId values are unique
4. Verify file encoding is UTF-8

#### Performance Issues

**Symptoms**: Application is slow or unresponsive

**Solutions**:
1. Clear application cache
2. Reduce sync interval
3. Limit items per page in settings
4. Close other applications

### Getting Help

If you encounter issues not covered here:

1. **Export Logs**: Save system logs
2. **Document the Issue**: Note steps to reproduce
3. **Contact Support**: Provide logs and description

---

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save current changes |
| Ctrl+R | Refresh data |
| Ctrl+F | Focus search field |
| Escape | Close dialog/panel |

---

## Appendix B: Data Fields Reference

### Article/Person Fields

| Field | Type | Max Length | Description |
|-------|------|------------|-------------|
| articleId | String | 50 | Unique identifier |
| articleName | String | 100 | Display name |
| data1 | String | 100 | Custom field 1 |
| data2 | String | 100 | Custom field 2 |
| data3 | String | 100 | Custom field 3 |
| data4 | String | 100 | Custom field 4 |
| data5 | String | 100 | Custom field 5 |
| nfcUrl | String | 500 | NFC URL link |

---

## Appendix C: API Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| 401 | Unauthorized | Check credentials |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Verify server URL |
| 500 | Server Error | Contact AIMS admin |
| NETWORK_ERROR | Connection failed | Check network |

---

**electisSpace** - ESL Management System  
© 2025 Aviv Electis
