# App Logic & Architecture Flow

This document details the logical flow of the **ElectisSpace** application, covering user connection, data management, SoluM integration, and space operations. It also highlights missing features and gaps in the current implementation.

## 1. User Connection & Authentication

The application uses a **Token-Based Authentication** system (JWT) with a separate backend server.

### Flow
1.  **Login**: User enters credentials (email/password) in `LoginPage`.
2.  **Request**: Frontend sends `POST /auth/login` to the backend.
3.  **Verification**: Backend verifies hash, generates `accessToken` (short-lived) and `refreshToken` (long-lived).
4.  **Storage**:
    *   Frontend stores tokens in memory/closure via `tokenManager` (not localStorage for security, typically, but code shows `tokenManager` logic).
    *   `useAuthStore` (Zustand) persists `User` object (email, name, role, organization) to `localStorage`.
5.  **Session Restoration**: On app reload, `useAuthStore` rehydrates. `ProtectedRoute` checks for token existence. If token exists but User is null, it attempts to restore session.

### Permission Levels (Roles)
The `User` model supports three roles:
*   **ADMIN**: Full access to Organization settings, Users, and all Data.
*   **MANAGER**: Can manage Spaces, People, and Lists.
*   **VIEWER**: Read-only access (likely).

## 2. Permissions & Admin Management

### Architecture
Permissions are tied to the `Role` enum in the database.
*   **Frontend**: `authStore` holds the current user's role.
*   **Backend**: Endpoints should be protected by role guards (e.g. `OnlyAdmin`).

### Current Implementation Status
*   **Role Definition**: Exists in DB (`schema.prisma`) and Types (`authService.ts`).
*   **Enforcement**:
    *   `ProtectedRoute` checks *Authentication* (is logged in?) but does NOT yet check *Authorization* (has specific role?).
    *   No UI logic currently explicitly hides "Settings" or "Admin" tabs based on role (needs validation).

## 3. Users Management (Admin)

### Logic (Backend)
*   **Multi-tenant**: Users belong to an `Organization`.
*   **Data**: `id`, `email`, `firstName`, `lastName`, `role`, `isActive`.

### Missing Features (Critical)
*   **Frontend UI**: There is **NO feature** or UI for:
    *   Creating new Users.
    *   Inviting users to the Organization.
    *   Editing user roles (Promoting to Admin).
    *   Deactivating/Deleting users.
    *   Password Reset flows (Admin reset or Forgot Password).
*   **Admin Dashboard**: A dedicated view for "Team Management" is missing.

## 4. Connecting to SoluM (AIMS)

### Logic
The app acts as a **Middleware** or **Controller** between the User and the SoluM AIMS Server.

### Connection Flow
1.  **Configuration**: Admin enters AIMS URL, Store Code, User, Password in `SolumSettingsTab`.
2.  **Storage**: Credentials are encrypted and stored in `Organization` settings in the DB.
3.  **Authentication**: App authenticates with AIMS to get an AIMS-specific token.
4.  **Data Mapping**:
    *   User maps App Fields (e.g., `space.name`) to SoluM Article Fields (e.g., `ArticleName`, `Reserved1`).
    *   Supports **Dynamic Field Mapping** via `SolumMappingConfig`.

### Sync Logic
*   **Push (App -> SoluM)**: When a space is executed/saved, the app constructs an AIMS `Article` object based on the mapping and pushes it via `SolumService`.
*   **Pull (SoluM -> App)**: `SolumSyncAdapter` fetches articles from AIMS, converts them to App `Spaces`, and updates the local DB.

## 5. Data Persistence (Database)

### Architecture
*   **Database**: **PostgreSQL** (via Prisma ORM).
*   **Structure**:
    *   **Organization**: Root entity for multi-tenancy.
    *   **User**: App access accounts.
    *   **Space**: Represents a Label/Desk/Room. Linked to `Organization`.
    *   **Person**: Represents an employee/user assigned to a space.
    *   **PeopleList**: Groups of people.

### Data Flow
1.  **Frontend Action** (e.g., "Save Space"): Calls `useSpaceController.addSpace`.
2.  **Validator**: Checks uniqueness and CSV rules.
3.  **API Call**: Sends Payload to Backend.
4.  **Prisma**: Writes to `spaces` table AND records audit log.
5.  **Side Effect**: Triggers SoluM Push (if configured).

## 6. Space Assignment & Editing Logic

### Core Logic (`useSpaceController`)
The app uses a **Server-First** architecture with an optional "SFTP Legacy" mode.

### Workflows
1.  **Creating a Space**:
    *   User clicks "Add Space" or interacts with UI.
    *   App generates `uuid`.
    *   Validates mandatory fields (based on CSV Config).
    *   **Step 1**: POST to Backend DB.
    *   **Step 2**: Pushes to AIMS (if SoluM connected).
    *   **Step 3**: Uploads to SFTP (if SFTP mode enabled).

2.  **Editing a Space**:
    *   User modifies fields (Name, Status, Custom Data).
    *   App merges updates with existing data.
    *   **Step 1**: PATCH to Backend DB.
    *   **Step 2**: Push update to AIMS (Dynamic Mapping applies here).

3.  **Assigning a Person**:
    *   A `Person` entity is linked to a `Space` entity via `assignedSpaceId`.
    *   On Assignment:
        *   Space status updates (e.g., "Occupied").
        *   SoluM Label is updated to show Person's Name (based on mapping).

## 7. Missing Features & Gaps Identification

Based on codebase analysis, the following areas are missing, incomplete, or need attention:

### A. Users Management (Major Gap)
*   **User List UI**: No interface to see who has access to the app.
*   **Invite/Create Flow**: Admin cannot add new managers/viewers.
*   **Profile Management**: "My Profile" page (Change Name/Password) is likely missing.

### B. Session & Logout
*   **Connected User Indicator**: UI needs to clearly show *who* is currently logged in (Avatar/Name in Header).
*   **Logout Flow**:
    *   Code exists (`authService.logout`), but needs verification if the backend properly blacklists the Refresh Token.
    *   UI placement of Logout button needs to be accessible.

### C. Role-Based Access Control (RBAC)
*   **Routing**: `ProtectedRoute` allows any logged-in user to access all routes. Needs optimization to restrict `/settings` to ADMINs only.
*   **UI Elements**: Hide "Delete" buttons for VIEWER role.

### D. Sync Status Visibility
*   **Sync Queue**: The DB has a `SyncQueue`, but the Frontend doesn't seem to have a "Sync Dashboard" to show failed pushes to SoluM or pending updates.
