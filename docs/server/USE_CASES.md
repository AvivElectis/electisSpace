# electisSpace Server - Use Cases

## Document Purpose
Detailed use case descriptions for all server features with actors, preconditions, flows, and postconditions.

---

## 1. Authentication Use Cases

### UC-AUTH-001: User Login

| Field | Value |
|-------|-------|
| **ID** | UC-AUTH-001 |
| **Name** | User Login |
| **Actor** | Any User |
| **Preconditions** | User account exists and is active |
| **Postconditions** | User receives valid tokens |

**Main Flow:**
1. User opens electisSpace client application
2. User enters email and password
3. System validates credentials
4. System generates JWT access token (15 min) and refresh token (7 days)
5. System stores refresh token hash in database
6. System logs login event in audit log
7. System returns tokens to client
8. Client stores tokens and navigates to dashboard

**Alternative Flows:**
- **A1**: Invalid credentials → Show error, increment failed attempts
- **A2**: Account locked → Show lockout message with unlock time
- **A3**: Rate limited → Show "too many attempts" with retry time

---

### UC-AUTH-002: Token Refresh

| Field | Value |
|-------|-------|
| **ID** | UC-AUTH-002 |
| **Name** | Token Refresh |
| **Actor** | Authenticated User |
| **Trigger** | Access token expires (15 min) |

**Main Flow:**
1. Client detects access token is expired
2. Client sends refresh token to server
3. Server validates refresh token
4. Server revokes old refresh token
5. Server generates new token pair
6. Server returns new tokens
7. Client updates stored tokens

---

### UC-AUTH-003: Secure Logout

| Field | Value |
|-------|-------|
| **ID** | UC-AUTH-003 |
| **Name** | Secure Logout |
| **Actor** | Authenticated User |

**Main Flow:**
1. User clicks logout button
2. Client sends logout request
3. Server revokes refresh token
4. Server clears HttpOnly cookie
5. Client clears local tokens
6. Client navigates to login page

---

## 2. User Management Use Cases

### UC-USER-001: Create User

| Field | Value |
|-------|-------|
| **ID** | UC-USER-001 |
| **Name** | Create New User |
| **Actor** | Admin |
| **Preconditions** | Admin is authenticated |

**Main Flow:**
1. Admin navigates to User Management
2. Admin clicks "Add User"
3. Admin enters: email, first name, last name, role
4. System validates email is unique
5. System generates temporary password
6. System hashes password with bcrypt
7. System creates user record
8. System logs action in audit log
9. System sends welcome email with temp password
10. System displays success message

**Business Rules:**
- Email must be unique within organization
- Role must be: admin, manager, or viewer
- Password: min 8 chars, 1 upper, 1 lower, 1 number

---

### UC-USER-002: Change User Permissions

| Field | Value |
|-------|-------|
| **ID** | UC-USER-002 |
| **Name** | Change User Role |
| **Actor** | Admin |

**Main Flow:**
1. Admin selects user from list
2. Admin clicks "Edit"
3. Admin changes role from dropdown
4. System validates admin has permission
5. System updates user record
6. System logs change in audit log
7. User's next request uses new permissions

**Validation:**
- Admin cannot demote themselves
- At least one admin must exist

---

### UC-USER-003: Deactivate User

| Field | Value |
|-------|-------|
| **ID** | UC-USER-003 |
| **Name** | Deactivate User |
| **Actor** | Admin |

**Main Flow:**
1. Admin selects user
2. Admin clicks "Deactivate"
3. System confirms action
4. System sets isActive = false
5. System revokes all user's refresh tokens
6. System logs action
7. User can no longer log in

---

## 3. Space Management Use Cases

### UC-SPACE-001: Create Space

| Field | Value |
|-------|-------|
| **ID** | UC-SPACE-001 |
| **Name** | Create Space |
| **Actor** | Manager, Admin |

**Main Flow:**
1. User navigates to Spaces page
2. User clicks "Add Space"
3. User enters: external ID, room name, other fields
4. System validates external ID is unique
5. System creates space with sync_status = 'pending'
6. System queues sync job to SoluM
7. System returns created space
8. Background: Worker pushes to SoluM AIMS
9. Background: On success, update sync_status = 'synced'

**Alternative Flows:**
- **A1**: SoluM unavailable → Keep in queue, retry later
- **A2**: SoluM rejects → Mark sync_status = 'error', notify user

---

### UC-SPACE-002: Assign Label to Space

| Field | Value |
|-------|-------|
| **ID** | UC-SPACE-002 |
| **Name** | Assign ESL Label |
| **Actor** | Manager, Admin |

**Main Flow:**
1. User selects space
2. User clicks "Assign Label"
3. User scans/enters label MAC address
4. System validates label format
5. System checks label not assigned elsewhere
6. System updates space.labelCode
7. System queues sync to link in SoluM
8. SoluM physically updates ESL display

---

### UC-SPACE-003: Bulk Import Spaces

| Field | Value |
|-------|-------|
| **ID** | UC-SPACE-003 |
| **Name** | Import Spaces from CSV |
| **Actor** | Manager, Admin |

**Main Flow:**
1. User clicks "Import CSV"
2. User selects CSV file
3. System validates file format
4. System parses CSV rows
5. System validates each row
6. System creates/updates spaces in batch
7. System queues bulk sync job
8. System shows import summary (success/errors)

---

## 4. People Management Use Cases

### UC-PEOPLE-001: Import People from CSV

| Field | Value |
|-------|-------|
| **ID** | UC-PEOPLE-001 |
| **Name** | Import People from CSV |
| **Actor** | Manager, Admin |

**Main Flow:**
1. User navigates to People page
2. User clicks "Import CSV"
3. User selects CSV file
4. System parses using configured mapping
5. For each person:
   - Generate stable UUID
   - Assign virtual POOL-ID
   - Create person record
6. System queues bulk sync to SoluM
7. System shows import results

---

### UC-PEOPLE-002: Assign Person to Space

| Field | Value |
|-------|-------|
| **ID** | UC-PEOPLE-002 |
| **Name** | Assign Person to Space |
| **Actor** | Manager, Admin |

**Main Flow:**
1. User selects person from list
2. User drags to space OR selects from dropdown
3. System validates space is available
4. System updates person.assignedSpaceId
5. System clears person.virtualSpaceId
6. System queues sync job:
   - Clear old POOL article
   - Write person data to space article
7. SoluM updates ESL display
8. UI shows person as "assigned"

---

### UC-PEOPLE-003: Bulk Assign from List

| Field | Value |
|-------|-------|
| **ID** | UC-PEOPLE-003 |
| **Name** | Load and Apply People List |
| **Actor** | Manager, Admin |

**Main Flow:**
1. User selects saved list
2. User clicks "Load List"
3. System retrieves list with assignments
4. System clears all current assignments
5. For each person in list:
   - Apply stored space assignment
6. System queues sync jobs
7. All ESLs update accordingly

---

## 5. Conference Room Use Cases

### UC-CONF-001: Toggle Meeting Status

| Field | Value |
|-------|-------|
| **ID** | UC-CONF-001 |
| **Name** | Toggle Meeting Status |
| **Actor** | Any authenticated user |

**Main Flow:**
1. User views conference room
2. User clicks "Toggle" button
3. If turning ON:
   - User enters meeting details (optional)
4. System updates hasMeeting flag
5. System queues sync to SoluM
6. SoluM flips ESL page (Available ↔ Occupied)

---

### UC-CONF-002: Flip ESL Page

| Field | Value |
|-------|-------|
| **ID** | UC-CONF-002 |
| **Name** | Manually Flip ESL Page |
| **Actor** | Manager, Admin |

**Main Flow:**
1. User selects conference room
2. User clicks "Flip Page"
3. System sends page flip command to SoluM
4. ESL displays alternate page
5. System logs action

---

## 6. Sync Engine Use Cases

### UC-SYNC-001: Manual Full Sync

| Field | Value |
|-------|-------|
| **ID** | UC-SYNC-001 |
| **Name** | Trigger Full Sync |
| **Actor** | Manager, Admin |

**Main Flow:**
1. User clicks "Sync Now"
2. System verifies SoluM connection
3. System downloads all articles from SoluM
4. System compares with local database
5. System resolves conflicts (newest-wins)
6. System updates local database
7. System pushes local changes to SoluM
8. System updates sync_status for all entities
9. UI shows sync completion summary

---

### UC-SYNC-002: Automatic Scheduled Sync

| Field | Value |
|-------|-------|
| **ID** | UC-SYNC-002 |
| **Name** | Automatic Sync |
| **Actor** | System (Scheduled Job) |
| **Trigger** | Configurable interval (default: 5 min) |

**Main Flow:**
1. Scheduler triggers sync job
2. System checks SoluM availability
3. System performs pull sync (download only)
4. System updates local database
5. System logs sync results

---

### UC-SYNC-003: Retry Failed Sync

| Field | Value |
|-------|-------|
| **ID** | UC-SYNC-003 |
| **Name** | Retry Failed Items |
| **Actor** | System (Automatic) |

**Main Flow:**
1. Sync job fails
2. System increments attempt count
3. System calculates exponential backoff
4. System re-queues job with delay
5. Worker retries on schedule
6. After max attempts: move to dead letter queue
7. System notifies admin of failed items

---

## 7. Audit Use Cases

### UC-AUDIT-001: View Audit Log

| Field | Value |
|-------|-------|
| **ID** | UC-AUDIT-001 |
| **Name** | View Audit Log |
| **Actor** | Admin |

**Main Flow:**
1. Admin navigates to Audit Logs
2. System displays recent logs
3. Admin can filter by:
   - User
   - Action type
   - Entity type
   - Date range
4. System applies filters
5. Admin can export to CSV

---

### UC-AUDIT-002: Track Entity History

| Field | Value |
|-------|-------|
| **ID** | UC-AUDIT-002 |
| **Name** | View Entity Change History |
| **Actor** | Manager, Admin |

**Main Flow:**
1. User views entity (space/person/room)
2. User clicks "History"
3. System retrieves all audit logs for entity
4. System displays timeline of changes
5. Each entry shows: who, what changed, when

---

## 8. Health Monitoring Use Cases

### UC-HEALTH-001: Monitor System Health

| Field | Value |
|-------|-------|
| **ID** | UC-HEALTH-001 |
| **Name** | View System Health |
| **Actor** | Admin |

**Main Flow:**
1. Admin navigates to Health Dashboard
2. System displays:
   - Server status (CPU, Memory)
   - Database connections
   - Redis status
   - SoluM connection status
   - Sync queue size
3. Dashboard auto-refreshes every 30 seconds

---

### UC-HEALTH-002: SoluM Connection Alert

| Field | Value |
|-------|-------|
| **ID** | UC-HEALTH-002 |
| **Name** | SoluM Disconnection Alert |
| **Actor** | System |
| **Trigger** | SoluM health check fails |

**Main Flow:**
1. Health check fails 3 consecutive times
2. System marks SoluM as "disconnected"
3. System pauses sync queue
4. System broadcasts WebSocket event
5. UI shows disconnection banner
6. When SoluM recovers:
   - Resume sync queue
   - Process pending items
   - Update UI status

---

## 9. Multi-Tenant Use Cases

### UC-TENANT-001: Organization Isolation

| Field | Value |
|-------|-------|
| **ID** | UC-TENANT-001 |
| **Name** | Data Isolation Between Organizations |
| **Actor** | System |

**Main Flow:**
1. User authenticates
2. JWT contains organization_id
3. All queries automatically filter by org_id
4. User can only see/modify own org data
5. Cross-org access is impossible

---

### UC-TENANT-002: Organization-Specific SoluM Config

| Field | Value |
|-------|-------|
| **ID** | UC-TENANT-002 |
| **Name** | Configure Organization SoluM |
| **Actor** | Organization Admin |

**Main Flow:**
1. Admin opens Organization Settings
2. Admin enters SoluM credentials:
   - API URL
   - Company Code
   - Store Number
   - Username/Password
3. System encrypts credentials
4. System tests connection
5. System stores encrypted config
6. Organization can now sync with their SoluM instance
