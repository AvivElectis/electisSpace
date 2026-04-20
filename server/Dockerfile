# ============================================
# electisSpace — Server (API Only)
# ============================================
# Multi-stage: builds Express API.
# Build context must be the project root (context: .)
# ============================================

# Stage 1: Build server (TypeScript)
FROM node:22-alpine AS server-builder

WORKDIR /app

# Harden npm against transient CI network failures (ECONNRESET on the registry).
ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=180000 \
    NPM_CONFIG_FETCH_TIMEOUT=300000

COPY server/package*.json ./
COPY server/prisma ./prisma/

RUN npm ci || (echo "npm ci retry 1/2" && sleep 15 && npm ci) || (echo "npm ci retry 2/2" && sleep 45 && npm ci)
RUN npx prisma generate

COPY server/prisma.config.ts ./prisma.config.ts
COPY server/tsconfig.json ./
COPY server/src ./src/

RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY server/package*.json ./

# Inherit the same retry envs via ENV so npm ci below benefits from them too.
ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=180000 \
    NPM_CONFIG_FETCH_TIMEOUT=300000

# Install production dependencies only
RUN npm ci --omit=dev || (echo "npm ci retry 1/2" && sleep 15 && npm ci --omit=dev) || (echo "npm ci retry 2/2" && sleep 45 && npm ci --omit=dev)

# Copy Prisma schema, config, and generated client
COPY --from=server-builder /app/prisma ./prisma
COPY --from=server-builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=server-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=server-builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built server
COPY --from=server-builder /app/dist ./dist

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
