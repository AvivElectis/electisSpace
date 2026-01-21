# electisSpace Server - API Specification

## API Overview

**Base URL:** `http://localhost:3000/api`  
**Version:** v1  
**Authentication:** Bearer JWT Token

---

## Authentication Endpoints

### POST /auth/login
Authenticate user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "manager"
  }
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials
- `429 Too Many Requests` - Rate limited

---

### POST /auth/refresh
Refresh access token using refresh token.

**Headers:**
```
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIs...
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

---

### POST /auth/logout
Invalidate current session.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response 204:** No Content

---

### POST /auth/change-password
Change current user's password.

**Request:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewSecurePass456"
}
```

**Response 200:**
```json
{
  "message": "Password changed successfully"
}
```

---

## User Endpoints

### GET /users
List all users in organization. **Admin only.**

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `role` | string | Filter by role |
| `search` | string | Search by name/email |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "manager",
      "isActive": true,
      "lastLogin": "2026-01-21T10:00:00Z",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### POST /users
Create new user. **Admin only.**

**Request:**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "viewer",
  "password": "TempPass123"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "viewer",
  "isActive": true,
  "createdAt": "2026-01-21T12:00:00Z"
}
```

---

### GET /users/:id
Get user details.

**Response 200:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "manager",
  "isActive": true,
  "lastLogin": "2026-01-21T10:00:00Z",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-15T08:00:00Z"
}
```

---

### PATCH /users/:id
Update user. **Admin only.**

**Request:**
```json
{
  "firstName": "Jonathan",
  "role": "admin",
  "isActive": false
}
```

**Response 200:** Updated user object

---

### DELETE /users/:id
Delete user. **Admin only.**

**Response 204:** No Content

---

## Space Endpoints

### GET /spaces
List all spaces.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `search` | string | Search by ID/name |
| `hasLabel` | boolean | Filter by label assignment |
| `syncStatus` | string | Filter by sync status |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "externalId": "ROOM-101",
      "labelCode": "E4:5F:01:23:45:67",
      "templateName": "office_template",
      "data": {
        "roomName": "Meeting Room A",
        "floor": "3",
        "capacity": "10"
      },
      "syncStatus": "synced",
      "lastSyncedAt": "2026-01-21T11:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### POST /spaces
Create new space.

**Request:**
```json
{
  "externalId": "ROOM-102",
  "templateName": "office_template",
  "data": {
    "roomName": "Conference Room B",
    "floor": "2",
    "capacity": "8"
  }
}
```

**Response 201:** Created space object

---

### GET /spaces/:id
Get space details.

---

### PATCH /spaces/:id
Update space.

---

### DELETE /spaces/:id
Delete space.

---

### POST /spaces/:id/assign-label
Assign ESL label to space.

**Request:**
```json
{
  "labelCode": "E4:5F:01:23:45:67"
}
```

---

### POST /spaces/sync
Force sync all spaces with SoluM.

**Response 202:**
```json
{
  "message": "Sync started",
  "jobId": "sync-job-uuid"
}
```

---

## People Endpoints

### GET /people
List all people.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `search` | string | Search by name |
| `assigned` | boolean | Filter by assignment status |
| `listId` | string | Filter by list membership |

---

### POST /people
Create new person.

**Request:**
```json
{
  "data": {
    "name": "John Doe",
    "department": "Engineering",
    "title": "Senior Developer"
  }
}
```

---

### POST /people/import
Bulk import from CSV.

**Request:** `multipart/form-data`
```
file: <CSV file>
options: {"replaceExisting": false}
```

**Response 202:**
```json
{
  "message": "Import started",
  "jobId": "import-job-uuid",
  "totalRows": 150
}
```

---

### POST /people/:id/assign
Assign person to space.

**Request:**
```json
{
  "spaceId": "uuid"
}
```

---

### DELETE /people/:id/unassign
Remove person from assigned space.

---

### GET /people/lists
Get all people lists.

---

### POST /people/lists
Create new list.

**Request:**
```json
{
  "name": "Engineering Team",
  "peopleIds": ["uuid1", "uuid2"]
}
```

---

### POST /people/lists/:id/load
Load list and apply assignments.

---

## Conference Endpoints

### GET /conference
List all conference rooms.

---

### POST /conference
Create conference room.

**Request:**
```json
{
  "externalId": "C01",
  "roomName": "Board Room"
}
```

---

### POST /conference/:id/toggle
Toggle meeting status.

**Request:**
```json
{
  "meetingName": "Project Review",
  "startTime": "14:00",
  "endTime": "15:00",
  "participants": ["Alice", "Bob"]
}
```

---

### POST /conference/:id/flip-page
Flip ESL label page (Available/Occupied).

---

## Health Endpoints

### GET /health
Basic liveness check.

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-21T12:00:00Z"
}
```

---

### GET /health/ready
Readiness check with dependencies.

**Response 200:**
```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "solum": "ok"
  }
}
```

**Response 503:**
```json
{
  "status": "degraded",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "solum": "error"
  }
}
```

---

### GET /health/detailed
Detailed health metrics.

**Response 200:**
```json
{
  "status": "ok",
  "uptime": 86400,
  "version": "1.0.0",
  "memory": {
    "used": 128,
    "total": 512,
    "unit": "MB"
  },
  "database": {
    "status": "ok",
    "connections": 5,
    "latencyMs": 2
  },
  "redis": {
    "status": "ok",
    "memoryMB": 64,
    "clients": 10
  },
  "solum": {
    "status": "ok",
    "lastPing": "2026-01-21T11:59:00Z",
    "latencyMs": 150
  },
  "syncQueue": {
    "pending": 0,
    "processing": 0,
    "failed": 0
  }
}
```

---

## Sync Endpoints

### GET /sync/status
Get current sync status.

**Response 200:**
```json
{
  "status": "idle",
  "lastSync": "2026-01-21T11:00:00Z",
  "pendingItems": 0,
  "failedItems": 0,
  "solumConnected": true
}
```

---

### POST /sync/trigger
Manually trigger sync.

**Request:**
```json
{
  "type": "full",
  "entities": ["spaces", "people", "conference"]
}
```

**Response 202:**
```json
{
  "message": "Sync triggered",
  "jobId": "sync-job-uuid"
}
```

---

### GET /sync/jobs/:id
Get sync job status.

**Response 200:**
```json
{
  "jobId": "sync-job-uuid",
  "status": "completed",
  "type": "full",
  "startedAt": "2026-01-21T11:00:00Z",
  "completedAt": "2026-01-21T11:01:30Z",
  "stats": {
    "downloaded": 150,
    "uploaded": 5,
    "errors": 0
  }
}
```

---

## Audit Endpoints

### GET /audit
Get audit logs. **Admin only.**

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `userId` | string | Filter by user |
| `action` | string | Filter by action |
| `entityType` | string | Filter by entity type |
| `from` | date | Start date |
| `to` | date | End date |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "action": "update",
      "entityType": "space",
      "entityId": "uuid",
      "changes": {
        "roomName": {
          "old": "Room A",
          "new": "Room Alpha"
        }
      },
      "ipAddress": "192.168.1.100",
      "createdAt": "2026-01-21T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  }
}
```

### Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | VALIDATION_ERROR | Input validation failed |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 401 | TOKEN_EXPIRED | Access token expired |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 422 | BUSINESS_ERROR | Business rule violation |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 502 | BAD_GATEWAY | External service error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily down |
