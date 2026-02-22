# Appendix B — Environment Variable Reference

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | HTTP listen port |
| `API_VERSION` | No | `v1` | API version prefix |
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `DB_POOL_MAX` | No | `20` | Max database connections |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | -- | JWT signing secret (32+ chars) |
| `JWT_REFRESH_SECRET` | Yes | -- | Refresh token signing secret (32+ chars) |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `180d` | Refresh token lifetime |
| `ENCRYPTION_KEY` | Yes | -- | AES encryption key (32+ chars) |
| `CORS_ORIGINS` | No | `https://localhost:3000` | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Global rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Global max requests per window |
| `AUTH_RATE_LIMIT_MAX` | No | `10` | Auth endpoint max attempts |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No | `900000` | Auth rate limit window (15min) |
| `TWOFA_RATE_LIMIT_MAX` | No | `5` | 2FA verification max attempts |
| `TWOFA_RATE_LIMIT_WINDOW_MS` | No | `300000` | 2FA rate limit window (5min) |
| `RESET_RATE_LIMIT_MAX` | No | `3` | Password reset max attempts |
| `RESET_RATE_LIMIT_WINDOW_MS` | No | `3600000` | Reset rate limit window (1hr) |
| `LOG_LEVEL` | No | `info` | Logging level |
| `SOLUM_DEFAULT_API_URL` | No | -- | Default AIMS API base URL |
| `SOLUM_DEFAULT_CLUSTER` | No | `common` | Default AIMS cluster |
| `ADMIN_EMAIL` | No | -- | Platform admin email (auto-created) |
| `ADMIN_PASSWORD` | No | -- | Platform admin password |
