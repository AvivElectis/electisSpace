# Shared Presentation Layer

> **Documentation for `src/shared/presentation` - The UI Kit.**

## Layouts

### **MainLayout**
The primary application shell.
- **Features**:
  - Responsive Navigation Drawer (collapsible sidebar).
  - Top AppBar with Title, Language Switcher, and Theme Toggle.
  - Integration with `CustomTitleBar` (Electron drag region).
  - Offline/Sync status indicators.

## Core Components

The application uses a set of shared, reusable components built on Material UI (MUI).

| Component | Description |
|-----------|-------------|
| **CustomTitleBar** | Custom window controls (Minimize, Maximize, Close) for Electron. |
| **ConfirmDialog** | Standardized dialog for destructive actions (Delete/Reset). |
| **DynamicFieldDisplay** | Renders key-value pairs from `data` objects based on mapping config. |
| **EmptyState** | Illustration + Text + Action button for empty lists/tables. |
| **ErrorBoundary** | Catches React rendering errors, displays fallback UI and logs error. |
| **ErrorDisplay** | Standardized inline error message alert. |
| **FilterDrawer** | Right-side drawer for complex filtering options. |
| **LanguageSwitcher** | Dropdown to toggle English/Hebrew (triggers RTL change). |
| **LoadingFallback** | Full-screen loading spinner with message. |
| **LoadingSpinner** | Inline loading indicator. |
| **NotificationContainer** | Toast notification manager (Snackbar). |
| **SyncStatusIndicator** | Visual indicator of connectivity and sync status (Cloud/Check icons). |

## Skeletons (Loading States)

Skeleton screens improve perceived performance during data fetching.
- `TableSkeleton`: Loading state for data tables.
- `CardSkeleton`: Loading state for card grids.
- `DialogSkeleton`: Loading state for modal content.

## Styling & Theming
- **Framework**: Material UI v6.
- **RTL Support**: Full bi-directional support using `stylis-plugin-rtl`.
- **Theme**: Custom theme defined in `src/theme.ts`, adapts to Light/Dark mode and LTR/RTL direction.
