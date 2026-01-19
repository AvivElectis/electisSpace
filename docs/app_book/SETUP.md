# Development Environment Setup

> **Guide to setting up the `electisSpace` development environment.**

## Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v20+ recommended)
- **npm** (v10+ recommended)
- **Git**
- **VS Code** (highly recommended for TypeScript support)
- **Java 17+** (Required for Android builds)
- **Android Studio** (Required for Android builds)

## Quick Start

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd electisSpace
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start Development Server**
    ```bash
    npm run dev
    ```
    The app will run at `https://localhost:3001` (Note the HTTPS and port).

4.  **Run Electron Development Version**
    ```bash
    npm run electron:dev
    ```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `dev` | Runs Vite dev server for web |
| `build` | Type checks and builds for production |
| `test` | Runs Unit/Integration tests with Vitest |
| `test:e2e` | Runs E2E tests with Playwright |
| `electron:dev` | Runs Electron app in dev mode |
| `electron:build` | Builds Electron installer (Windows) |
| `android:build` | Builds Android APK/Bundle |

## Application Configuration

The application uses a configuration object typically loaded from local storage or defaults. 
Key configurations include:
- **Service Mode**: SFTP vs SoluM API
- **Space Type**: Configures terminology (Room, Desk, etc.)
- **CSV Mappings**: Maps CSV columns to internal fields

## Mobile Development (Android)

To run on an Android device/emulator:
```bash
# Sync Capacitor config
npm run cap:sync

# Open Android Studio
npm run cap:open:android
```
Then run the app from Android Studio.

## Troubleshooting

**Port Issues**
If port 3001 is in use, check `vite.config.ts`.

**Certificate Errors**
The dev server uses a self-signed certificate. You may need to accept the warning in your browser.

**Node Version**
If you encounter build errors, verify you are using Node 20+.
