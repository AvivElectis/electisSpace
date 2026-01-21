# electisSpace Server

Node.js backend server for electisSpace ESL management system.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker (optional)

## Quick Start

### Development (Local)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Development (Docker)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f server

# Stop services
docker-compose down
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript for production |
| `npm start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio GUI |
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
