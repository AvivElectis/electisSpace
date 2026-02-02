# electisSpace - Electron Installation Guide

> **Version**: 1.3.0  
> **Platform**: Windows (x64)  
> **Last Updated**: January 2026

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [For End Users (Installation)](#for-end-users-installation)
3. [For Developers](#for-developers)
4. [Production Build](#production-build)
5. [Auto-Update System](#auto-update-system)
6. [Project Structure](#project-structure)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### End Users
- **Operating System**: Windows 10/11 (64-bit)
- **RAM**: 4 GB minimum
- **Disk Space**: 200 MB for installation

### Developers
- **Node.js**: v18.0.0 or higher (LTS recommended)
- **npm**: v9.0.0 or higher
- **Git**: Latest version
- **Visual Studio Build Tools**: For native module compilation (optional)

---

## For End Users (Installation)

### Option 1: Download Installer
1. Go to [Releases](https://github.com/AvivElectis/electisSpace/releases)
2. Download `electisSpace.Setup.1.3.0.exe`
3. Run the installer
4. Choose installation directory (default: `C:\Program Files\electisSpace`)
5. Launch from Desktop shortcut or Start Menu

### Option 2: Portable Version
1. Download the `win-unpacked.zip` from Releases
2. Extract to desired location
3. Run `electisSpace.exe`

### Automatic Updates
The app checks for updates on startup. When an update is available:
1. A dialog prompts you to download
2. After download, choose "Restart Now" or "Later"
3. Update installs automatically on restart

---

## For Developers

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/AvivElectis/electisSpace.git
cd electisSpace

# Install dependencies
npm install
```

### Development Mode

Run the app with hot-reload:

```bash
npm run electron:dev
```

This command:
1. Starts Vite dev server on `http://localhost:5173`
2. Waits for the server to be ready
3. Launches Electron in development mode with DevTools open

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server only (web) |
| `npm run electron:dev` | Start Electron with Vite dev server |
| `npm run build` | Build TypeScript + Vite for production |
| `npm run electron:build` | Full production build with installer |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |

---

## Production Build

### Build Command

```bash
npm run electron:build
```

This executes:
1. `npm run build` - TypeScript compilation + Vite production build
2. `electron-builder` - Package the app with NSIS installer

### Build Output

```
dist-electron/
├── electisSpace.Setup.1.3.0.exe    # NSIS installer
├── win-unpacked/                    # Portable app folder
│   ├── electisSpace.exe
│   ├── resources/
│   │   └── app.asar                # Bundled app code
│   └── ...
└── builder-effective-config.yaml
```

### Build Configuration

The build is configured in `package.json` under the `"build"` key:

```json
{
  "build": {
    "appId": "com.electisspace.app",
    "productName": "electisSpace",
    "directories": {
      "output": "dist-electron",
      "buildResources": "build"
    },
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64"] }],
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": true,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

---

## Auto-Update System

### How It Works

electisSpace uses `electron-updater` with GitHub Releases:

1. **Check**: App checks GitHub for new releases on startup
2. **Download**: User can choose to download the update
3. **Install**: Update installs on app restart

### GitHub Release Setup

For updates to work, releases must be published to GitHub:

```bash
# Tag the release
git tag v1.3.0
git push origin v1.3.0

# Build and check the artifacts
npm run electron:build
```

Then upload `electisSpace.Setup.1.3.0.exe` to the GitHub Release.

### Configuration

Auto-updater is configured in `electron/main.cjs`:

```javascript
autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'AvivElectis',
    repo: 'electisSpace'
});

autoUpdater.autoDownload = false;  // Manual download control
autoUpdater.autoInstallOnAppQuit = true;
```

---

## Project Structure

### Electron Files

```
electisSpace/
├── electron/
│   ├── main.cjs        # Main process - window management, IPC handlers
│   └── preload.cjs     # Preload script - exposes safe APIs to renderer
├── public/
│   └── icon.ico        # Application icon
├── dist/               # Vite build output (web assets)
└── dist-electron/      # Electron-builder output (installers)
```

### Main Process (`electron/main.cjs`)

Handles:
- Window creation and management
- File system operations (read, write, save dialogs)
- Window controls (minimize, maximize, close)
- Auto-updater lifecycle

### Preload Script (`electron/preload.cjs`)

Exposes safe APIs via `window.electronAPI`:

| API | Description |
|-----|-------------|
| `readFile(path)` | Read file contents |
| `writeFile(path, data)` | Write data to file |
| `selectFile(options)` | Open file dialog |
| `saveFile(options)` | Save file dialog |
| `getAppVersion()` | Get app version |
| `checkForUpdates()` | Check for updates |
| `windowMinimize/Maximize/Close()` | Window controls |

---

## Troubleshooting

### Build Errors

**Error: `tsc` compilation fails**
```bash
# Clear TypeScript cache and rebuild
npx tsc --build --clean
npm run build
```

**Error: `electron-builder` fails**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm run electron:build
```

### Runtime Issues

**App shows blank white screen**
- Check if `dist/index.html` exists
- Verify Vite build completed: `npm run build`
- Check DevTools console for errors (Ctrl+Shift+I in dev mode)

**Updates not working**
- Ensure GitHub releases are published with correct assets
- Check logs at: `%APPDATA%\electisSpace\logs\`
- Verify `publish` config in `package.json` matches your repo

**"Windows protected your PC" warning**
- This appears for unsigned apps
- Click "More info" → "Run anyway"
- For production: Consider code signing with a certificate

### Logs Location

Electron logs are stored at:
```
%APPDATA%\electisSpace\logs\main.log
```

### DevTools in Production

To debug the packaged app:
1. Right-click the app window
2. Select "Inspect Element" (if enabled)
3. Or add keyboard shortcut in main.cjs

---

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Run in development | `npm run electron:dev` |
| Build for production | `npm run electron:build` |
| Run tests | `npm run test` |
| Check for TypeScript errors | `npx tsc --noEmit` |

---

## Support

- **Issues**: [GitHub Issues](https://github.com/AvivElectis/electisSpace/issues)
- **Documentation**: See `docs/app_book/` for feature documentation
