# Frequently Asked Questions (FAQ)

**electisSpace v1.0.2**

Common questions and answers about electisSpace.

---

## General Questions

### What is electisSpace?

electisSpace is an ESL (Electronic Shelf Label) management system that integrates with SoluM AIMS. It allows you to manage, configure, and sync ESL displays across retail, office, and enterprise environments.

### What platforms does electisSpace support?

- **Windows**: Desktop application (Electron-based)
- **Android**: Mobile application (Capacitor-based)
- **Web**: Browser interface (for development)

### Is electisSpace free?

electisSpace is proprietary software. Please contact sales for licensing information.

### What languages are supported?

Currently, electisSpace supports:
- English (EN)
- Hebrew (HE) with full RTL support

---

## Installation & Setup

### Where can I download electisSpace?

Download the latest version from the official releases page or contact your administrator for installation files.

### Why does Windows show a security warning?

Windows SmartScreen may flag new applications. This is normal:
1. Click "More info"
2. Click "Run anyway"

The application is safe to install.

### Can I install on multiple computers?

Yes, depending on your license agreement. Each installation requires configuration with valid AIMS credentials.

### How do I update electisSpace?

The application checks for updates automatically. When an update is available:
1. A notification appears
2. Click "Download Update"
3. Click "Install and Restart"

---

## SoluM AIMS Integration

### What version of AIMS API is supported?

electisSpace v1.0.2 uses SoluM AIMS API v2.

### How do I find my Store ID?

Your Store ID can be found in the AIMS administration panel under Store Settings, or contact your AIMS administrator.

### Why can't I connect to AIMS?

Common causes:
1. **Incorrect URL**: Verify the server URL format
2. **Wrong credentials**: Check username and password
3. **Network issues**: Ensure firewall allows the connection
4. **Server down**: Verify AIMS server is running

### How often does sync occur?

- **Manual**: Whenever you click Sync
- **Auto-sync**: Configurable interval (1-60 minutes)

---

## People Manager

### What is People Manager Mode?

People Manager transforms electisSpace from managing shelf labels to managing personnel assignments. It's designed for office space allocation, desk assignments, and personnel display management.

### How do I enable People Manager?

1. Go to **Settings** → **SoluM API**
2. Toggle **Enable People Manager Mode**
3. Enter the number of available spaces
4. Click **Save**

### What CSV format should I use?

Use this format:
```csv
articleId,articleName,data1,data2,data3,data4,data5,nfcUrl
EMP001,John Smith,Building A,Floor 2,Room 201,Manager,IT,https://profile/john
```

See [Configuration Guide](CONFIGURATION_GUIDE.md#csv-format-specification) for details.

### Can I import from Excel?

Yes, export your Excel file as CSV (UTF-8) first, then import into electisSpace.

### What happens when I sync from AIMS?

The "Sync from AIMS" button downloads current articles from AIMS and populates your People table, allowing you to see the current state of AIMS data.

### What happens when I send to AIMS?

The "Send to AIMS" button pushes all your local people assignments to AIMS, updating the ESL displays.

---

## Spaces Management

### How do I edit a space?

1. Click on the space row
2. Edit fields in the detail panel
3. Click **Save**
4. Click **Sync** to push to AIMS

### Can I bulk edit spaces?

Yes, select multiple spaces using checkboxes, then use the Bulk Actions menu.

### What do the status icons mean?

| Icon | Meaning |
|------|---------|
| ✓ Green | Synced with AIMS |
| ⏳ Yellow | Pending sync |
| ⚠️ Red | Sync error |

---

## Lists Management

### What are Lists?

Lists let you save and load different configurations of people/spaces. Use them for:
- Different event setups
- Seasonal configurations
- Backup of current state

### How many lists can I save?

There is no practical limit to the number of saved lists.

### Are lists synced to AIMS?

No, lists are stored locally. They represent saved snapshots that you can load and then sync to AIMS.

---

## Troubleshooting

### The app is slow

Try these steps:
1. Clear application cache (Settings → Clear Cache)
2. Reduce items per page
3. Increase sync interval
4. Close other applications

### Sync keeps failing

1. Check network connection
2. Verify AIMS server is accessible
3. Check API credentials
4. Review error messages in System Logs

### Data disappeared after update

Check the lists - your data may have been saved there. If not:
1. Check if auto-sync pulled different data
2. Review System Logs for errors
3. Contact support with log files

### I can't see all my labels

1. Check pagination settings
2. Verify Store ID is correct
3. Try refreshing the data
4. Check filters aren't hiding data

---

## Data & Privacy

### Where is my data stored?

- **Local data**: On your device in the app storage folder
- **Synced data**: On your SoluM AIMS server
- **No cloud storage**: electisSpace doesn't use third-party cloud services

### Is my password stored securely?

Passwords are stored in encrypted form in local storage and transmitted securely over HTTPS.

### Can I export my data?

Yes, use the Export function in Lists to save your configurations as files.

---

## Support

### How do I report a bug?

1. Document the steps to reproduce
2. Export system logs
3. Contact support with details

### How do I request a feature?

Contact your account representative or submit through the official support channels.

### Where can I find more help?

- [User Manual](USER_MANUAL.md)
- [Configuration Guide](CONFIGURATION_GUIDE.md)
- [API Reference](API_REFERENCE.md)
- Contact support

---

**electisSpace** - ESL Management System  
© 2025 Aviv Electis
