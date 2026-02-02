# electisSpace Server - Detailed Feature Documentation

## Document Index

This document provides detailed design specifications for each server feature.

---

## 1. User Management System

### 1.1 User Entity

```typescript
interface User {
  id: string;           // UUID
  organizationId: string;
  email: string;        // Unique, validated
  passwordHash: string; // bcrypt, 12 rounds
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'viewer';
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 Role Permissions Matrix

```typescript
const PERMISSIONS = {
  admin: {
    spaces: ['create', 'read', 'update', 'delete'],
    people: ['create', 'read', 'update', 'delete', 'import', 'assign'],
    conference: ['create', 'read', 'update', 'delete', 'toggle'],
    settings: ['read', 'update'],
    users: ['create', 'read', 'update', 'delete'],
    audit: ['read'],
    sync: ['trigger', 'view']
  },
  manager: {
    spaces: ['create', 'read', 'update', 'delete'],
    people: ['create', 'read', 'update', 'delete', 'import', 'assign'],
    conference: ['create', 'read', 'update', 'delete', 'toggle'],
    settings: ['read'],
    sync: ['trigger', 'view']
  },
  viewer: {
    spaces: ['read'],
    people: ['read'],
    conference: ['read'],
    sync: ['view']
  }
};
```

### 1.3 Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Hashed with bcrypt (12 salt rounds)

### 1.4 User Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Create  │───▶│  Active  │───▶│ Disabled │───▶│ Deleted  │
│          │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │
     │               ▼               │
     │         ┌──────────┐         │
     └────────▶│  Login   │◀────────┘
               │  Audit   │
               └──────────┘
```

---

## 2. Authentication System

### 2.1 Token Structure

**Access Token (JWT)**
```json
{
  "sub": "user-uuid",
  "org": "org-uuid",
  "role": "manager",
  "iat": 1706000000,
  "exp": 1706000900
}
```

**Refresh Token**
```json
{
  "sub": "user-uuid",
  "jti": "token-uuid",
  "iat": 1706000000,
  "exp": 1706604800
}
```

### 2.2 Login Flow

```
1. Client: POST /auth/login { email, password }
2. Server: Validate credentials
3. Server: Generate tokens
4. Server: Store refresh token hash in DB
5. Server: Return { accessToken, refreshToken }
6. Client: Store accessToken in memory
7. Client: Store refreshToken in HttpOnly cookie
```

### 2.3 Token Refresh Flow

```
1. Client: POST /auth/refresh (with HttpOnly cookie)
2. Server: Validate refresh token hash
3. Server: Check not revoked
4. Server: Generate new token pair
5. Server: Revoke old refresh token
6. Server: Return new tokens
```

### 2.4 Logout Flow

```
1. Client: POST /auth/logout
2. Server: Revoke refresh token
3. Server: Clear cookie
4. Client: Clear memory token
```

### 2.5 Security Features
- Rate limiting: 5 login attempts per minute per IP
- Account lockout: After 10 failed attempts
- Secure headers: HSTS, CSP, X-Frame-Options
- CORS: Whitelist domains only

---

## 3. Sync Engine

### 3.1 Sync Queue Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │────▶│   Server     │────▶│  Sync Queue  │
│   Request    │     │   API        │     │  (BullMQ)    │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                            ┌─────────────────────┘
                            ▼
                     ┌──────────────┐     ┌──────────────┐
                     │   Worker     │────▶│  SoluM AIMS  │
                     │   Process    │     │     API      │
                     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Update     │
                     │   Database   │
                     └──────────────┘
```

### 3.2 Sync Job Types

| Job Type | Priority | Retry Policy |
|----------|----------|--------------|
| `space:create` | High | 5 retries, exponential backoff |
| `space:update` | High | 5 retries, exponential backoff |
| `space:delete` | High | 3 retries |
| `person:assign` | Critical | 10 retries |
| `person:unassign` | Critical | 10 retries |
| `conference:toggle` | Critical | 10 retries |
| `full:sync` | Low | 1 retry |

### 3.3 Conflict Resolution Strategy

```typescript
interface ConflictResolution {
  strategy: 'server-wins' | 'client-wins' | 'newest-wins' | 'merge';
  
  // For 'newest-wins'
  compareField: 'updatedAt';
  
  // For 'merge'
  mergeFields: string[]; // Fields to merge, others: server-wins
}
```

### 3.4 Sync Status Flow

```
pending → syncing → synced
    ↓         ↓
  error ←─────┘
    ↓
  retry (up to max_attempts)
    ↓
  failed (manual intervention required)
```

---

## 4. Docker Health Monitoring

### 4.1 Health Check Endpoints

**GET /health** (Liveness)
```json
{
  "status": "ok",
  "timestamp": "2026-01-21T12:00:00Z"
}
```

**GET /health/ready** (Readiness)
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

**GET /health/detailed** (Metrics)
```json
{
  "status": "ok",
  "uptime": 86400,
  "memory": {
    "used": 128,
    "total": 512,
    "unit": "MB"
  },
  "database": {
    "status": "ok",
    "connections": 5,
    "latency": 2
  },
  "redis": {
    "status": "ok",
    "memory": 64,
    "clients": 10
  },
  "solum": {
    "status": "ok",
    "lastPing": "2026-01-21T11:59:00Z",
    "latency": 150
  },
  "sync": {
    "queueSize": 0,
    "processing": 0,
    "failed": 0
  }
}
```

### 4.2 SoluM Alive Signal

```typescript
// Every 60 seconds
async function checkSolumAlive(): Promise<boolean> {
  try {
    const response = await fetch(SOLUM_API + '/health', {
      timeout: 5000
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

### 4.3 Docker Compose Configuration

```yaml
version: '3.8'

services:
  server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/electis
      - REDIS_URL=redis://redis:6379
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=electis
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d electis"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

---

## 5. Audit Logging

### 5.1 Audit Log Structure

```typescript
interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'sync';
  entityType: 'space' | 'person' | 'conference' | 'user' | 'settings';
  entityId: string;
  oldData: object | null;
  newData: object | null;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}
```

### 5.2 Automatic Audit Logging

```typescript
// Middleware for all mutating operations
const auditMiddleware = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      auditLogger.log({
        userId: req.user.id,
        action: getActionFromMethod(req.method),
        entityType: getEntityType(req.path),
        entityId: req.params.id,
        oldData: req.originalEntity,
        newData: JSON.parse(body),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    return originalSend.call(this, body);
  };
  
  next();
};
```

---

## 6. API Rate Limiting

### 6.1 Rate Limit Configuration

| Endpoint Pattern | Window | Max Requests |
|------------------|--------|--------------|
| `/auth/login` | 1 minute | 5 |
| `/auth/refresh` | 1 minute | 10 |
| `/api/*` (authenticated) | 1 minute | 100 |
| `/api/sync` | 1 minute | 5 |

### 6.2 Rate Limit Response

```json
{
  "error": "Too Many Requests",
  "retryAfter": 45,
  "limit": 5,
  "remaining": 0,
  "reset": 1706001000
}
```

---

## 7. Encryption Strategy

### 7.1 Data at Rest

| Data Type | Encryption |
|-----------|------------|
| Passwords | bcrypt (12 rounds) |
| SoluM Tokens | AES-256-GCM |
| Sensitive Settings | AES-256-GCM |
| Audit Logs | Plaintext (access controlled) |

### 7.2 Encryption Service

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string, key: Buffer): string {
  const [ivHex, tagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

## 8. WebSocket Real-time Updates (Optional)

### 8.1 Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `space:updated` | Space object | Space was modified |
| `person:assigned` | {personId, spaceId} | Person assigned to space |
| `conference:toggled` | {roomId, hasMeeting} | Meeting status changed |
| `sync:started` | {type} | Sync operation started |
| `sync:completed` | {type, count} | Sync finished |
| `sync:error` | {type, error} | Sync failed |

### 8.2 Socket.io Implementation

```typescript
io.on('connection', (socket) => {
  // Authenticate socket
  const token = socket.handshake.auth.token;
  const user = verifyToken(token);
  
  if (!user) {
    socket.disconnect();
    return;
  }
  
  // Join organization room
  socket.join(`org:${user.organizationId}`);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', user.id);
  });
});

// Broadcast to organization
function broadcastToOrg(orgId: string, event: string, data: any) {
  io.to(`org:${orgId}`).emit(event, data);
}
```
