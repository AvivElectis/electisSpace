# Build Instructions - electisSpace v1.1.0

**Version:** 1.1.0  
**Platform:** Windows (Electron)  
**Date:** December 30, 2025

---

## 📋 Prerequisites

### Required Software
- **Node.js:** v18+ LTS (recommended: v20 LTS)
- **npm:** v9+ (included with Node.js)
- **Git:** For version control

### Verify Installation
```powershell
node --version   # Should be v18+
npm --version    # Should be v9+
git --version    # Any recent version
```

---

## 🔧 Development Setup

### 1. Clone Repository
```powershell
git clone https://github.com/AvivElectis/electisSpace.git
cd electisSpace
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Run Development Server
```powershell
# Web only
npm run dev

# Electron development mode
npm run electron:dev
```

---

## 🏗️ Production Build

### Build for Windows (Electron)

```powershell
# Build web assets and package with Electron Builder
npm run electron:build
```

### Build Output
```
dist-electron/
├── electisSpace.Setup.1.1.0.exe    # Installer
├── electisSpace.Setup.1.1.0.exe.blockmap
├── latest.yml                       # Auto-update manifest
└── win-unpacked/                    # Portable version
```

---

## 📦 Build Configuration

### package.json Build Section
```json
{
  "build": {
    "appId": "com.electisspace.app",
    "productName": "electisSpace",
    "directories": {
      "output": "dist-electron",
      "buildResources": "build"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": true,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "artifactName": "${productName}.Setup.${version}.${ext}"
    },
    "publish": {
      "provider": "github",
      "owner": "AvivElectis",
      "repo": "electisSpace"
    }
  }
}
```

---

## 🧪 Running Tests

### Unit Tests
```powershell
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### E2E Tests
```powershell
# Run Playwright tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run headed (visible browser)
npm run test:e2e:headed
```

---

## 📱 Android Build (Capacitor)

### Setup
```powershell
# Sync with Capacitor
npm run cap:sync

# Open in Android Studio
npm run cap:open:android
```

### Full Android Build
```powershell
npm run android:build
```

---

## 🔐 Code Signing (Optional)

For signed releases, set environment variables:
```powershell
$env:CSC_LINK = "path/to/certificate.pfx"
$env:CSC_KEY_PASSWORD = "your-password"
```

---

## 📤 Publishing Release

### GitHub Release
1. Update version in `package.json`
2. Build the application
3. Create GitHub release with tag `v1.1.0`
4. Upload build artifacts:
   - `electisSpace.Setup.1.1.0.exe`
   - `latest.yml`

### Auto-Update
The `latest.yml` file enables automatic updates:
```yaml
version: 1.1.0
files:
  - url: electisSpace.Setup.1.1.0.exe
    sha512: <hash>
    size: <bytes>
path: electisSpace.Setup.1.1.0.exe
sha512: <hash>
releaseDate: '2025-12-30T00:00:00.000Z'
```

---

## 🐛 Troubleshooting

### Common Issues

#### Build Fails with Memory Error
```powershell
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run electron:build
```

#### Electron Not Found
```powershell
npm install electron --save-dev
```

#### Permission Denied (Windows)
Run PowerShell as Administrator

---

## 📁 Project Structure

```
electisSpace/
├── src/                    # React source code
├── electron/               # Electron main/preload
│   ├── main.cjs           # Main process
│   └── preload.cjs        # Preload script
├── public/                 # Static assets
├── dist/                   # Vite build output
├── dist-electron/          # Electron build output
├── docs/                   # Documentation
│   └── 1_1_0/             # v1.1.0 release docs
└── scripts/               # Build scripts
```

---

## ✅ Pre-Release Checklist

- [ ] Update version in `package.json` to `1.1.0`
- [ ] Run all tests: `npm run test`
- [ ] Build successfully: `npm run electron:build`
- [ ] Test installer on clean Windows machine
- [ ] Verify auto-update from previous version
- [ ] Create GitHub release with proper tag
- [ ] Upload artifacts and `latest.yml`

---

**© 2025 Electis. All rights reserved.**
