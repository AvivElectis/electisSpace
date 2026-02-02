# electisSpace Server Architecture - Documentation Hub

> **Created:** January 21, 2026  
> **Author:** Antigravity AI Assistant  
> **Status:** Draft - Pending Review

---

## 📋 Document Index

This directory contains comprehensive documentation for the proposed electisSpace server-side architecture.

| Document | Description |
|----------|-------------|
| [FEATURE_DOCUMENTATION.md](./FEATURE_DOCUMENTATION.md) | Detailed design for each server feature |
| [FLOW_CHARTS.md](./FLOW_CHARTS.md) | Mermaid diagrams for all major workflows |
| [API_SPECIFICATION.md](./API_SPECIFICATION.md) | Complete REST API endpoint documentation |
| [USE_CASES.md](./USE_CASES.md) | Use case descriptions with actors and flows |

---

## 🎯 Project Goals

### Primary Objectives

1. **Replace SFTP Mode** → Proper server-side API with database persistence
2. **Centralized Authentication** → JWT-based auth with user roles
3. **Multi-User Support** → Multiple users per organization with permissions
4. **Reliable Sync** → Queue-based sync with retry logic
5. **Operational Monitoring** → Health checks and Docker integration

### What This Enables

| Capability | Current (Client-Only) | With Server |
|------------|----------------------|-------------|
| Data Persistence | LocalStorage/IndexedDB | PostgreSQL |
| Multi-User | ❌ Single user | ✅ Multiple users |
| User Roles | ❌ None | ✅ Admin/Manager/Viewer |
| Cross-Device | ❌ Via SoluM only | ✅ Server acts as source of truth |
| Offline Queue | ❌ Manual retry | ✅ Automatic retry with backoff |
| Audit Trail | ❌ None | ✅ Full audit logging |
| Health Monitoring | ❌ None | ✅ Docker health checks |

---

## 🏗️ Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTISSPACE ECOSYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │Electron │  │  Web    │  │ Android │  │  Admin  │       │
│  │ Client  │  │ Client  │  │ Client  │  │Dashboard│       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
│       │            │            │            │             │
│       └────────────┴──────┬─────┴────────────┘             │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ELECTISSPACE SERVER                     │   │
│  │                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │   Auth   │ │  Users   │ │  Spaces  │            │   │
│  │  │ Service  │ │ Service  │ │ Service  │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │  People  │ │Conference│ │  Sync    │            │   │
│  │  │ Service  │ │ Service  │ │  Engine  │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  PostgreSQL  │  Redis  │  BullMQ             │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └─────────────────────────┬───────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   SOLUM AIMS API                     │   │
│  │           (Electronic Shelf Label Cloud)             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Overview

### Core Entities

| Table | Purpose | Key Relations |
|-------|---------|---------------|
| `organizations` | Multi-tenant organization data | Has many users, spaces, people |
| `users` | User accounts with roles | Belongs to organization |
| `spaces` | Room/desk entities | Belongs to organization |
| `people` | Personnel records | Belongs to organization, optionally assigned to space |
| `conference_rooms` | Meeting room entities | Belongs to organization |
| `people_lists` | Saved people groupings | Contains many people |
| `audit_logs` | Change tracking | References user and entity |
| `sync_queue` | Pending sync operations | References entity |
| `refresh_tokens` | JWT refresh token storage | Belongs to user |

---

## 🔐 Security Model

### Authentication Flow

```
Login → JWT Access Token (15 min) + Refresh Token (7 days)
        ↓
Every API Call → Validate Access Token
        ↓
Token Expired → Use Refresh Token → New Token Pair
        ↓
Logout → Revoke Refresh Token
```

### Permission Matrix

| Role | Spaces | People | Conference | Settings | Users |
|------|--------|--------|------------|----------|-------|
| Admin | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Manager | ✅ Full | ✅ Full | ✅ Full | 👁️ Read | ❌ |
| Viewer | 👁️ Read | 👁️ Read | 👁️ Read | ❌ | ❌ |

---

## 🔄 Sync Engine Overview

### Sync Strategies

| Type | Trigger | Direction | Use Case |
|------|---------|-----------|----------|
| **Push** | Immediate | Client → Server → SoluM | Real-time updates |
| **Pull** | Scheduled | SoluM → Server → Client | Periodic refresh |
| **Full** | Manual | Bidirectional | Recovery/initial sync |

### Queue Processing

```
Job Created → Worker Picks Up → Execute API Call
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
                Success                              Failure
                    ↓                                   ↓
            Update DB synced                  Retry (exponential backoff)
                                                       ↓
                                            Max attempts reached?
                                                       ↓
                                            Dead Letter Queue + Alert
```

---

## 🐳 Docker Deployment

### Services

| Service | Image | Port | Health Check |
|---------|-------|------|--------------|
| server | Custom Node.js | 3000 | `/health` |
| db | postgres:16 | 5432 | `pg_isready` |
| redis | redis:7-alpine | 6379 | `redis-cli ping` |

### Health Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health` | Liveness | Basic OK/Error |
| `GET /health/ready` | Readiness | DB + Redis + SoluM status |
| `GET /health/detailed` | Metrics | Full system stats |

---

## 📊 Key Metrics

### Expected Performance

| Metric | Target |
|--------|--------|
| API Response Time | < 100ms (p95) |
| Sync Job Processing | < 5 seconds |
| Database Queries | < 10ms |
| Max Concurrent Users | 100+ |
| People Records | 10,000+ |

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (2-3 weeks)
- [ ] Project setup (Express, TypeScript, Prisma)
- [ ] Database schema implementation
- [ ] Authentication system
- [ ] Basic CRUD APIs

### Phase 2: Sync Engine (1-2 weeks)
- [ ] BullMQ job queue
- [ ] SoluM API integration
- [ ] Retry logic and error handling

### Phase 3: User Management (1 week)
- [ ] User CRUD operations
- [ ] Role-based permissions
- [ ] Audit logging

### Phase 4: Docker & Health (1 week)
- [ ] Dockerfile creation
- [ ] Docker Compose setup
- [ ] Health check implementation
- [ ] SoluM alive monitoring

### Phase 5: Client Integration (1-2 weeks)
- [ ] Update client to use server API
- [ ] Remove SFTP mode code
- [ ] Add real-time WebSocket updates

---

## ❓ Open Questions for Review

1. **Scope**: Full implementation or MVP first?
2. **Database**: PostgreSQL confirmed? Any alternatives?
3. **Multi-tenancy**: Required from day one?
4. **Real-time**: WebSocket support priority?
5. **Admin UI**: Separate app or integrated?

---

## 📁 Related Documentation

### Existing Project Docs
- [README.md](../../README.md) - Project overview
- [WORKING_MODES_GUIDE.md](../WORKING_MODES_GUIDE.md) - Current modes
- [app_book/HIGH_LEVEL_DESIGN.md](../app_book/HIGH_LEVEL_DESIGN.md) - Client architecture

### New Server Docs (This Directory)
- [FEATURE_DOCUMENTATION.md](./FEATURE_DOCUMENTATION.md)
- [FLOW_CHARTS.md](./FLOW_CHARTS.md)
- [API_SPECIFICATION.md](./API_SPECIFICATION.md)
- [USE_CASES.md](./USE_CASES.md)
