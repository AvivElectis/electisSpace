# Installation Guide

**electisSpace v1.0.2**

This guide provides detailed installation instructions for all supported platforms.

---

## Table of Contents

1. [Windows Installation](#windows-installation)
2. [Android Installation](#android-installation)
3. [Building from Source](#building-from-source)
4. [Updating the Application](#updating-the-application)
5. [Uninstallation](#uninstallation)

---

## Windows Installation

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Windows 10 (64-bit) | Windows 11 |
| RAM | 2 GB | 4 GB |
| Storage | 200 MB | 500 MB |
| Display | 1280x720 | 1920x1080 |
| Network | Internet connection | Stable broadband |

### Installation Steps

#### Standard Installation

1. **Download** the installer:
   - File: `electisSpace Setup 1.0.2.exe`
   - Size: ~100 MB

2. **Run** the installer:
   - Right-click and select "Run as administrator" (recommended)
   - Or double-click to run normally

3. **Setup Wizard**:
   
   **Welcome Screen**
   - Click "Next" to continue

   **License Agreement**
   - Read the license terms
   - Select "I accept the agreement"
   - Click "Next"

   **Installation Location**
   - Default: `C:\Program Files\electisSpace`
   - Click "Browse" to change location
   - Click "Next"

   **Start Menu Folder**
   - Default: `electisSpace`
   - Click "Next"

   **Additional Tasks**
   - ☑️ Create a desktop shortcut
   - ☑️ Create a Start Menu entry
   - Click "Next"

   **Ready to Install**
   - Review your selections
   - Click "Install"

4. **Complete Installation**:
   - Wait for files to be copied
   - Click "Finish" to launch electisSpace

#### Silent Installation

For enterprise deployment, use silent installation:

```powershell
# Silent install with default options
electisSpace-Setup-1.0.2.exe /S

# Silent install to custom directory
electisSpace-Setup-1.0.2.exe /S /D=D:\Apps\electisSpace
```

### Post-Installation

1. **Launch** electisSpace from:
   - Desktop shortcut
   - Start Menu → electisSpace
   - `C:\Program Files\electisSpace\electisSpace.exe`

2. **Configure** the application:
   - Enter AIMS server details
   - Test connection
   - Save settings

3. **Windows Defender**:
   - electisSpace may trigger SmartScreen on first run
   - Click "More info" → "Run anyway"
   - This is normal for new applications

---

## Android Installation

### Device Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Android 8.0 (API 26) | Android 12+ |
| RAM | 2 GB | 4 GB |
| Storage | 100 MB | 200 MB |
| Network | WiFi/Mobile data | WiFi preferred |

### Installation Steps

#### From APK File

1. **Download** the APK:
   - File: `electisSpace-1.0.2.apk`
   - Size: ~30 MB

2. **Enable Unknown Sources**:
   
   **Android 8-9:**
   - Settings → Security → Unknown Sources → Enable
   
   **Android 10+:**
   - When opening APK, you'll be prompted
   - Tap "Settings" → Enable for your file manager/browser
   - Go back and tap "Install"

3. **Install the APK**:
   - Open the downloaded APK file
   - Tap "Install"
   - Wait for installation to complete
   - Tap "Open" or find the app in your app drawer

#### From Google Play (Coming Soon)

electisSpace will be available on Google Play Store in a future release.

### Permissions

electisSpace requires the following permissions:

| Permission | Purpose |
|------------|---------|
| Internet | Connect to AIMS server |
| Network State | Check connectivity |
| Storage | Save configurations |

---

## Building from Source

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm | 9+ | Package manager |
| Git | 2.30+ | Version control |
| Java JDK | 17 | Android builds |
| Android Studio | Latest | Android SDK |

### Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/electisSpace.git

# Navigate to project directory
cd electisSpace
```

### Install Dependencies

```bash
# Install npm packages
npm install
```

### Development Mode

```bash
# Start Vite development server
npm run dev

# Application will open at http://localhost:5173
```

### Production Build

```bash
# Build web assets
npm run build

# Files will be in dist/ directory
```

### Electron Build (Windows)

```bash
# Build Electron application
npm run build:electron

# Or with specific target
npm run electron:build -- --win

# Output: dist-electron/electisSpace Setup 1.0.2.exe
```

### Android Build

```bash
# Sync Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android

# Or build from command line
cd android
./gradlew assembleRelease
```

---

## Updating the Application

### Windows Update

#### Automatic Update (In-App)

1. electisSpace checks for updates on startup
2. If available, you'll see a notification
3. Click "Download Update"
4. Click "Install and Restart"
5. Application will update and restart

#### Manual Update

1. Download the new installer
2. Run the installer
3. It will automatically uninstall the old version
4. Complete installation as normal

### Android Update

1. Download the new APK
2. Install over the existing application
3. Your data and settings will be preserved

---

## Uninstallation

### Windows Uninstall

#### From Settings

1. Open **Settings** → **Apps** → **Apps & features**
2. Search for "electisSpace"
3. Click on the app
4. Click **Uninstall**
5. Confirm uninstallation

#### From Control Panel

1. Open **Control Panel**
2. Go to **Programs** → **Programs and Features**
3. Find "electisSpace"
4. Right-click → **Uninstall**
5. Follow the uninstall wizard

#### Silent Uninstall

```powershell
# Silent uninstall
"C:\Program Files\electisSpace\Uninstall electisSpace.exe" /S
```

### Clean Uninstall

To completely remove electisSpace including settings:

1. Uninstall the application (as above)
2. Delete user data folder:
   ```
   %APPDATA%\electisSpace
   ```
3. Delete local storage:
   ```
   %LOCALAPPDATA%\electisSpace
   ```

### Android Uninstall

1. Long-press the electisSpace icon
2. Tap "Uninstall" or drag to "Uninstall" area
3. Confirm uninstallation

---

## Troubleshooting Installation

### Windows Issues

#### "Windows protected your PC"

This is Windows SmartScreen. The app is safe:
1. Click "More info"
2. Click "Run anyway"

#### Installation Fails

1. Run as Administrator
2. Disable antivirus temporarily
3. Check disk space
4. Download installer again

#### Missing Visual C++ Runtime

Download and install:
- [Microsoft Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)

### Android Issues

#### "App not installed"

- Check available storage space
- Uninstall previous version first
- Enable "Unknown Sources"

#### "Parse Error"

- Download APK again (may be corrupted)
- Check Android version compatibility

---

## Support

If you encounter installation issues:

1. Check this guide's troubleshooting section
2. Review system requirements
3. Contact support with:
   - Operating system and version
   - Error messages
   - Installation logs

---

**electisSpace** - ESL Management System  
© 2025 Aviv Electis
