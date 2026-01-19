# System Overview

> **High-level introduction to the `electisSpace` application.**

## Purpose & Value Proposition

**electisSpace** is a unified management system designed to bridge the physical world of office/venue spaces with the digital world of **Electronic Shelf Labels (ESL)**.

Its primary goal is to simplify the assignment of:
1.  **Spaces** (Rooms, Desks, Seats)
2.  **People** (Employees, Attendees)
3.  **Conference Rooms** (Meeting schedules)

...to SoluM ESL tags, effectively replacing paper signage with dynamic, digital displays.

## Core Features

-   **Space Management**: Create, update, and manage physical spaces. assign ESL tags to them.
-   **People Manager**: Import people (CSV), assign them to spaces, and push updates to ESL tags.
-   **Conference Room Manager**: Manage meeting room status, integration with calendar data (simulated/future), and display "Occupied/Available" status on ESL tags.
-   **Dual Operation Modes**:
    -   **SoluM API Mode**: Direct integration with SoluM AIMS server (Cloud/On-prem).
    -   **SFTP Mode**: File-based integration via CSV drop-zones (Legacy/Offline support).
-   **Mobile Support**: Fully responsive design with native Android capabilities via Capacitor.
-   **Offline First**: Local data persistence ensures the app works even with intermittent connectivity.

## Technology Stack

### Frontend Core
-   **React 19**: UI Library.
-   **Vite**: Build tool and dev server.
-   **TypeScript**: Type safety.

### State & Logic
-   **Zustand**: Global state management.
-   **React Query / Custom Hooks**: Data fetching and controller logic.
-   **Context API**: Dependency injection (for testing/mocking).

### UI Framework
-   **Material UI (MUI v6)**: Component library.
-   **Emotion**: CSS-in-JS styling.

### Platform Wrappers
-   **Electron**: Desktop wrapper (Windows installer).
-   **Capacitor**: Mobile wrapper (Android APK).

### persistence
-   **IndexedDB**: Browser-based database for large datasets (People/Spaces).
-   **LocalStorage**: User preferences and settings.
