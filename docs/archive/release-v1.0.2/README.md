# electisSpace

<p align="center">
  <img src="../../public/logos/logo.png" alt="electisSpace Logo" width="120" height="120">
</p>

<p align="center">
  <strong>ESL Management System</strong><br>
  A comprehensive solution for managing Electronic Shelf Labels with SoluM AIMS integration
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#development">Development</a>
</p>

---

## Overview

**electisSpace** is a cross-platform ESL (Electronic Shelf Label) management application that integrates with SoluM AIMS to provide seamless label management for retail, office, and enterprise environments.

Whether you're managing retail shelf prices, office space assignments, or conference room displays, electisSpace provides an intuitive interface to handle all your ESL needs.

## Features

### 🏷️ Space Management
- View and manage all ESL labels from your AIMS store
- Edit label content with custom data fields
- Bulk operations for efficient management
- Real-time sync status tracking

### 👥 People Manager
- **CSV Import**: Bulk upload personnel data
- **Space Assignment**: Assign people to available ESL displays
- **Bi-directional Sync**: Push to and pull from AIMS
- **Lists Management**: Save and load configurations

### 🏢 Conference Rooms
- Specialized conference room display management
- Room capacity and status configuration
- Meeting display integration (coming soon)

### 🔄 Synchronization
- **Manual Sync**: On-demand data synchronization
- **Auto-Sync**: Configurable automatic sync intervals
- **Status Tracking**: Visual sync status indicators
- **Error Handling**: Detailed error reporting

### 🌐 Multi-Platform
- **Windows**: Full desktop experience with Electron
- **Android**: Mobile application with Capacitor
- **Web**: Browser-based interface

### 🌍 Internationalization
- English (EN) support
- Hebrew (HE) with RTL layout
- Easy to add additional languages

## Installation

### Windows

Download the latest installer from the releases page:

```
electisSpace Setup 1.0.2.exe
```

Run the installer and follow the setup wizard. The application will be installed to Program Files by default.

### Android

Download the APK file and install on your Android device:

1. Enable "Install from Unknown Sources" in Settings
2. Open the downloaded APK
3. Follow the installation prompts

### From Source

```bash
# Clone the repository
git clone https://github.com/your-org/electisSpace.git
cd electisSpace

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Quick Start

### 1. Configure AIMS Connection

1. Open electisSpace
2. Navigate to **Settings**
3. Enter your SoluM AIMS server details:
   - Server URL
   - Store ID
   - Username/Password
4. Click **Test Connection**
5. Save settings

### 2. View Your Spaces

1. Navigate to **Spaces** tab
2. Your ESL labels will be loaded from AIMS
3. Use search and filters to find specific labels
4. Click on a row to view/edit details

### 3. Enable People Manager (Optional)

1. Go to **Settings** → **SoluM API**
2. Enable **People Manager Mode**
3. Set **Total Available Spaces**
4. Import personnel via CSV
5. Assign spaces and sync to AIMS

## Documentation

| Document | Description |
|----------|-------------|
| [User Manual](USER_MANUAL.md) | Complete usage guide |
| [Release Notes](RELEASE_NOTES.md) | What's new in v1.0.2 |
| [Changelog](CHANGELOG.md) | Version history |
| [Installation Guide](INSTALLATION_GUIDE.md) | Detailed installation |
| [Configuration Guide](CONFIGURATION_GUIDE.md) | Settings reference |

## Requirements

### System Requirements

| Platform | Minimum | Recommended |
|----------|---------|-------------|
| Windows | Windows 10 | Windows 11 |
| Android | Android 8.0 | Android 12+ |
| RAM | 2 GB | 4 GB |
| Storage | 200 MB | 500 MB |

### Network Requirements

- HTTPS access to SoluM AIMS server
- Stable internet connection for sync
- Firewall exceptions for AIMS endpoints

## Development

### Tech Stack

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Material-UI v7
- **State Management**: Zustand
- **Build Tool**: Vite
- **Desktop**: Electron
- **Mobile**: Capacitor
- **Testing**: Vitest + Playwright

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build

# Build Electron app
npm run build:electron

# Build Android app
npm run build:android
```

### Project Structure

```
electisSpace/
├── src/
│   ├── features/           # Feature modules
│   │   ├── dashboard/      # Dashboard feature
│   │   ├── space/          # Space management
│   │   ├── people/         # People Manager
│   │   ├── conference/     # Conference rooms
│   │   ├── lists/          # Lists management
│   │   ├── sync/           # Synchronization
│   │   ├── settings/       # Application settings
│   │   └── ...
│   ├── shared/             # Shared utilities
│   ├── locales/            # i18n translations
│   └── components/         # Shared components
├── electron/               # Electron main process
├── android/                # Capacitor Android
├── public/                 # Static assets
└── docs/                   # Documentation
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

### Code Style

- TypeScript strict mode
- ESLint recommended rules
- Prettier formatting
- Conventional Commits

## License

This project is proprietary software. All rights reserved.

## Support

For support inquiries, please contact:

- **Email**: support@electis.com
- **Documentation**: See the docs folder
- **Issues**: GitHub Issues (for authorized users)

---

<p align="center">
  <strong>electisSpace</strong> - ESL Management System<br>
  Version 1.0.2 | © 2025 Aviv Electis
</p>
