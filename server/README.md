# electisSpace Server

Node.js backend server for electisSpace ESL management system.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker (optional)

## Quick Start

### Development Setup

```bash
# Install dependencies
npm install

# Start development database and Redis
npm run dev:docker

# Copy development environment file
cp .env.development .env.development.local
# Edit .env.development.local with your settings if needed

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server (with hot reload)
npm run dev
```

### Production Setup

```bash
# Copy and configure production environment
cp .env.production .env.production.local
# IMPORTANT: Edit .env.production.local with real secrets!

# Start production containers
npm run prod:docker

# Run database migrations
npm run db:migrate:deploy
```

## Environment Configuration

The server supports environment-specific configuration files:

| File | Purpose | Git Tracked |
|------|---------|-------------|
| `.env.development` | Development defaults | No |
| `.env.production` | Production template | No |
| `.env.local` | Local overrides (highest priority) | No |
| `.env.example` | Example template | Yes |

**Loading Priority**: `.env` → `.env.{NODE_ENV}` → `.env.local`

### Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Database | `electisspace_dev` on port 5433 | `electisspace_prod` on port 5432 |
| Redis | Port 6380 | Port 6379 |
| Logging | `debug` level | `info` level |
| Rate Limiting | Relaxed (1000 req/min) | Strict (100 req/min) |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript for production |
| `npm start` | Start production server |
| **Docker (Development)** | |
| `npm run dev:docker` | Start dev DB and Redis containers |
| `npm run dev:docker:down` | Stop dev containers |
| `npm run dev:docker:logs` | View dev container logs |
| **Docker (Production)** | |
| `npm run prod:docker` | Start production containers |
| `npm run prod:docker:down` | Stop production containers |
| `npm run prod:docker:logs` | View production logs |
| **Database** | |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Run migrations (development) |
| `npm run db:migrate:deploy` | Run migrations (production) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed database with test data |
| **Testing** | |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript types |

## Project Structure

```
server/
├── src/
│   ├── app.ts              # Express app setup
│   ├── server.ts           # Entry point
│   ├── config/             # Configuration
│   │   ├── env.ts          # Environment variables
│   │   ├── database.ts     # Prisma client
│   │   └── redis.ts        # Redis client
│   ├── features/           # Feature modules
│   │   ├── auth/           # Authentication
│   │   ├── users/          # User management
│   │   ├── spaces/         # Space CRUD
│   │   ├── people/         # People management
│   │   ├── conference/     # Conference rooms
│   │   ├── sync/           # Sync engine
│   │   └── health/         # Health checks
│   └── shared/             # Shared utilities
│       └── middleware/     # Express middleware
├── prisma/
│   └── schema.prisma       # Database schema
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## API Endpoints

### Health
- `GET /health` - Liveness check
- `GET /health/ready` - Readiness check
- `GET /health/detailed` - Detailed metrics

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh tokens
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/change-password` - Change password

### Users (Admin only)
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Spaces
- `GET /api/v1/spaces` - List spaces
- `POST /api/v1/spaces` - Create space
- `GET /api/v1/spaces/:id` - Get space
- `PATCH /api/v1/spaces/:id` - Update space
- `DELETE /api/v1/spaces/:id` - Delete space
- `POST /api/v1/spaces/:id/assign-label` - Assign ESL label
- `POST /api/v1/spaces/sync` - Force sync

### People
- `GET /api/v1/people` - List people
- `POST /api/v1/people` - Create person
- `GET /api/v1/people/:id` - Get person
- `PATCH /api/v1/people/:id` - Update person
- `DELETE /api/v1/people/:id` - Delete person
- `POST /api/v1/people/:id/assign` - Assign to space
- `DELETE /api/v1/people/:id/unassign` - Unassign
- `GET /api/v1/people/lists` - Get lists
- `POST /api/v1/people/import` - Bulk import

### Conference
- `GET /api/v1/conference` - List rooms
- `POST /api/v1/conference` - Create room
- `PATCH /api/v1/conference/:id` - Update room
- `DELETE /api/v1/conference/:id` - Delete room
- `POST /api/v1/conference/:id/toggle` - Toggle meeting
- `POST /api/v1/conference/:id/flip-page` - Flip ESL page

### Sync
- `GET /api/v1/sync/status` - Get sync status
- `POST /api/v1/sync/trigger` - Trigger sync
- `GET /api/v1/sync/jobs/:id` - Get job status
- `GET /api/v1/sync/queue` - View queue
- `POST /api/v1/sync/queue/:id/retry` - Retry failed

## Environment Variables

See `.env.example` for all available options.

## License

Proprietary - 2026 Aviv Ben Waiss
